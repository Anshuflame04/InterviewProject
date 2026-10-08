"""Authenticated, server-side proxies for real-time speech providers."""

import asyncio
import logging
from collections.abc import AsyncIterator

import httpx
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials
from websockets.asyncio.client import connect as connect_to_assemblyai

from app.core.config import settings
from app.core.security import get_current_user, verify_firebase_token


router = APIRouter(prefix="/speech", tags=["Speech"])
logger = logging.getLogger(__name__)


def _require_provider_key(key: str, provider: str) -> None:
    if not key or key.startswith("YOUR_"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{provider} has not been configured on the server.",
        )


@router.post("/tts")
async def stream_tts(
    payload: dict[str, str],
    _user: dict = Depends(get_current_user),
):
    """Stream ElevenLabs MP3 bytes without disclosing the provider key."""
    _require_provider_key(settings.elevenlabs_api_key, "ElevenLabs")
    text = payload.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text is required.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}/stream"
    request_payload = {
        "text": text,
        "model_id": settings.elevenlabs_model_id,
        "output_format": "mp3_44100_128",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.75},
    }
    client = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    try:
        response = await client.send(
            client.build_request(
                "POST", url,
                headers={"xi-api-key": settings.elevenlabs_api_key, "accept": "audio/mpeg"},
                json=request_payload,
            ),
            stream=True,
        )
    except httpx.HTTPError as exc:
        await client.aclose()
        logger.warning("ElevenLabs TTS connection failed: %s", exc)
        raise HTTPException(status_code=502, detail="ElevenLabs TTS connection failed.") from exc
    if response.status_code >= 400:
        detail = (await response.aread()).decode("utf-8", errors="replace")
        await response.aclose()
        await client.aclose()
        logger.warning("ElevenLabs TTS returned status %s", response.status_code)
        raise HTTPException(status_code=response.status_code, detail=f"ElevenLabs: {detail[:300]}")

    async def audio_bytes() -> AsyncIterator[bytes]:
        try:
            async for chunk in response.aiter_bytes(16_384):
                if chunk:
                    yield chunk
        except httpx.HTTPError as exc:
            logger.warning("ElevenLabs TTS stream interrupted: %s", exc)
        finally:
            await response.aclose()
            await client.aclose()

    return StreamingResponse(audio_bytes(), media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


@router.websocket("/stt")
async def stream_stt(websocket: WebSocket):
    """Relay browser PCM audio to AssemblyAI's streaming API securely."""
    requested_protocols = [
        value.strip()
        for value in websocket.headers.get("sec-websocket-protocol", "").split(",")
        if value.strip()
    ]
    origin = websocket.headers.get("origin", "<missing>")
    token = ""
    if requested_protocols and requested_protocols[0] == "firebase-auth" and len(requested_protocols) >= 2:
        token = requested_protocols[1]
    else:
        logger.warning(
            "STT handshake rejected: missing firebase-auth subprotocol "
            "(origin=%s, protocol_count=%d, has_auth_protocol=%s)",
            origin,
            len(requested_protocols),
            "firebase-auth" in requested_protocols,
        )
        await websocket.close(code=4401)
        return

    try:
        verify_firebase_token(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    except HTTPException as exc:
        logger.warning(
            "STT handshake rejected: Firebase token verification failed "
            "(origin=%s, status=%d, protocol_count=%d)",
            origin,
            exc.status_code,
            len(requested_protocols),
        )
        await websocket.close(code=4401)
        return

    if not settings.assemblyai_api_key or settings.assemblyai_api_key.startswith("YOUR_"):
        await websocket.close(code=1013, reason="AssemblyAI is not configured")
        return

    await websocket.accept(subprotocol="firebase-auth")
    logger.info("STT handshake accepted (origin=%s)", origin)
    assemblyai_url = (
        "wss://streaming.assemblyai.com/v3/ws?sample_rate=16000"
        "&speech_model=u3-rt-pro&format_turns=true"
    )

    try:
        async with connect_to_assemblyai(
            assemblyai_url,
            additional_headers={"Authorization": settings.assemblyai_api_key},
            ping_interval=20,
            ping_timeout=20,
            close_timeout=5,
        ) as assemblyai:
            logger.info("AssemblyAI STT relay connected")
            async def forward_audio() -> None:
                try:
                    while True:
                        message = await websocket.receive()
                        if message["type"] == "websocket.disconnect":
                            return
                        if message.get("bytes") is not None:
                            await assemblyai.send(message["bytes"])
                        elif message.get("text") == "close":
                            await assemblyai.send('{"type":"Terminate"}')
                            return
                except WebSocketDisconnect:
                    return

            async def forward_transcripts() -> None:
                async for message in assemblyai:
                    await websocket.send_text(message)

            client_task = asyncio.create_task(forward_audio())
            assemblyai_task = asyncio.create_task(forward_transcripts())
            done, pending = await asyncio.wait({client_task, assemblyai_task}, return_when=asyncio.FIRST_COMPLETED)
            for task in pending:
                task.cancel()
            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                task.result()
    except Exception:
        logger.exception("AssemblyAI STT relay failed")
        if websocket.client_state.name == "CONNECTED":
            await websocket.close(code=1011, reason="Speech transcription connection failed")
