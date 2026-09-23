import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

export interface MediaDeviceState {
    stream: MediaStream | null;

    cameraEnabled: boolean;
    microphoneEnabled: boolean;

    cameraAvailable: boolean;
    microphoneAvailable: boolean;

    loading: boolean;
    error: string | null;
}

export function useMediaDevices() {
    const streamRef =
        useRef<MediaStream | null>(null);

    const [state, setState] =
        useState<MediaDeviceState>({
            stream: null,
            cameraEnabled: false,
            microphoneEnabled: false,
            cameraAvailable: true,
            microphoneAvailable: true,
            loading: false,
            error: null,
        });

    const stopStream =
        useCallback(() => {
            const stream =
                streamRef.current;

            if (!stream) {
                return;
            }

            stream
                .getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current = null;

            setState((current) => ({
                ...current,
                stream: null,
                cameraEnabled: false,
                microphoneEnabled: false,
            }));
        }, []);

    const requestAccess =
        useCallback(async () => {
            if (
                typeof navigator ===
                "undefined" ||
                !navigator.mediaDevices
                    ?.getUserMedia
            ) {
                setState((current) => ({
                    ...current,
                    cameraAvailable: false,
                    microphoneAvailable: false,
                    error:
                        "Camera and microphone access are not available in this browser.",
                }));

                return null;
            }

            setState((current) => ({
                ...current,
                loading: true,
                error: null,
            }));

            /*
             * Stop any previous stream.
             */
            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) => {
                        track.stop();
                    });

                streamRef.current = null;
            }

            let cameraStream:
                MediaStream | null = null;

            let microphoneStream:
                MediaStream | null = null;

            try {
                /* Prefer one combined request. Some browsers/hardware reject
                 * two parallel media requests, which was the main cause of a
                 * blank camera preview. Fall back to independent tracks when
                 * either device is unavailable. */
                try {
                    const combined = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    });
                    cameraStream = combined;
                    microphoneStream = combined;
                } catch (combinedError) {
                    console.warn("Combined media access failed; trying devices separately.", combinedError);
                    try {
                        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
                    } catch (cameraError) {
                        console.error("Camera access error:", cameraError);
                    }
                    try {
                        microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
                    } catch (microphoneError) {
                        console.error("Microphone access error:", microphoneError);
                    }
                }

                /*
                 * Combine the successful tracks into one stream.
                 */
                const tracks: MediaStreamTrack[] =
                    [];

                if (cameraStream) {
                    tracks.push(
                        ...cameraStream.getVideoTracks(),
                    );
                }

                if (microphoneStream) {
                    tracks.push(
                        ...microphoneStream.getAudioTracks(),
                    );
                }

                if (
                    tracks.length ===
                    0
                ) {
                    let message =
                        "Unable to access your camera or microphone.";

                    try {
                        const devices =
                            await navigator.mediaDevices.enumerateDevices();

                        const hasCamera =
                            devices.some(
                                (device) =>
                                    device.kind ===
                                    "videoinput",
                            );

                        const hasMicrophone =
                            devices.some(
                                (device) =>
                                    device.kind ===
                                    "audioinput",
                            );

                        if (
                            !hasCamera &&
                            !hasMicrophone
                        ) {
                            message =
                                "No camera or microphone was found on this device.";
                        } else {
                            message =
                                "Camera and microphone access was denied or unavailable. Please check browser permissions.";
                        }
                    } catch {
                        // Keep default message.
                    }

                    setState((current) => ({
                        ...current,
                        stream: null,
                        cameraEnabled: false,
                        microphoneEnabled: false,
                        cameraAvailable: false,
                        microphoneAvailable: false,
                        loading: false,
                        error: message,
                    }));

                    return null;
                }

                // A combined request has the same stream in both variables;
                // de-duplicate tracks before attaching the preview.
                const stream = new MediaStream([...new Map(tracks.map((track) => [track.id, track])).values()]);

                streamRef.current =
                    stream;

                const cameraTrack =
                    stream.getVideoTracks()[0];

                const microphoneTrack =
                    stream.getAudioTracks()[0];

                setState({
                    stream,

                    cameraEnabled:
                        Boolean(
                            cameraTrack,
                        ),

                    microphoneEnabled:
                        Boolean(
                            microphoneTrack,
                        ),

                    cameraAvailable:
                        Boolean(
                            cameraTrack,
                        ),

                    microphoneAvailable:
                        Boolean(
                            microphoneTrack,
                        ),

                    loading: false,
                    error: null,
                });

                return stream;
            } catch (error) {
                console.error(
                    "Media initialization error:",
                    error,
                );

                cameraStream
                    ?.getTracks()
                    .forEach((track) =>
                        track.stop(),
                    );

                microphoneStream
                    ?.getTracks()
                    .forEach((track) =>
                        track.stop(),
                    );

                setState((current) => ({
                    ...current,
                    stream: null,
                    cameraEnabled: false,
                    microphoneEnabled: false,
                    loading: false,
                    error:
                        "Unable to initialize camera and microphone.",
                }));

                return null;
            }
        }, []);

    const toggleCamera =
        useCallback(() => {
            const stream =
                streamRef.current;

            if (!stream) {
                return false;
            }

            const tracks =
                stream.getVideoTracks();

            if (!tracks.length) {
                return false;
            }

            const nextState =
                !tracks[0].enabled;

            tracks.forEach(
                (track) => {
                    track.enabled =
                        nextState;
                },
            );

            setState((current) => ({
                ...current,
                cameraEnabled:
                    nextState,
            }));

            return nextState;
        }, []);

    const toggleMicrophone =
        useCallback(() => {
            const stream =
                streamRef.current;

            if (!stream) {
                return false;
            }

            const tracks =
                stream.getAudioTracks();

            if (!tracks.length) {
                return false;
            }

            const nextState =
                !tracks[0].enabled;

            tracks.forEach(
                (track) => {
                    track.enabled =
                        nextState;
                },
            );

            setState((current) => ({
                ...current,
                microphoneEnabled:
                    nextState,
            }));

            return nextState;
        }, []);

    useEffect(() => {
        return () => {
            streamRef.current
                ?.getTracks()
                .forEach((track) => {
                    track.stop();
                });

            streamRef.current =
                null;
        };
    }, []);

    return {
        ...state,
        requestAccess,
        toggleCamera,
        toggleMicrophone,
        stopStream,
    };
}
