# InterviewYou — Project Documentation

## Purpose

InterviewYou is a resume-aware practice interview application. A signed-in candidate selects an LLM provider, uploads a resume, configures an interview, answers questions by voice or text, and receives adaptive questions plus detailed feedback. The platform is designed for technical, behavioral, coding, and system-design practice.

## Features

- Firebase email/password authentication and per-user data isolation.
- Resume upload, parsing, and Firestore-backed resume history.
- Gemini and Groq provider selection, model selection, and per-provider API keys.
- API settings saved for the signed-in user in Firestore and cached locally for a fast reload.
- Resume- and job-description-grounded initial questions.
- Adaptive next questions that adjust topic and difficulty from the prior evaluation.
- Browser text-to-speech interviewer voice and continuous speech-to-text transcription.
- Speech recognition stays active across natural pauses and browser recognition segments. It ends only when the candidate mutes the microphone, selects Next Question, submits the interview, or leaves the interview.
- Optional typed answers, camera preview, microphone/camera controls, elapsed timer, and spoken question replay.
- Per-question feedback including dimension scores, strengths, missing points, and a substantial ideal answer.
- Final results, interview history, and analytics.
- A first-entry usage guide that remains visible for five seconds before it can be dismissed.

## Architecture

```text
React + Vite browser client
  ├─ Firebase Authentication → signed-in user / ID token
  ├─ Firestore → user settings document (direct, owner-only rules)
  ├─ Web Speech API → recognition and interviewer voice
  └─ FastAPI API → Firebase token + selected provider/model/API key headers
                         ├─ Firebase Admin / Firestore → resumes, interviews, analytics
                         ├─ LangGraph → interview state and adaptive flow
                         └─ Gemini or Groq → parsing, questions, evaluations, recommendations
```

The frontend never chooses another user's Firestore path: it writes API configuration only at `users/{authenticatedUid}/private/llmSettings`. The FastAPI server verifies the Firebase ID token and uses its UID to scope every backend data operation.

## User journey

1. On page entry, read the five-second quick-start guide.
2. Register or sign in.
3. Go to **API Settings**, choose Gemini or Groq, select a model, paste a key, and save it.
4. Upload a resume from **Resume**.
5. Open interview setup, select the resume, mode, difficulty, question count, and optional job description.
6. Start the interview. The question is read aloud when voice is enabled, then listening starts automatically.
7. Speak freely or type an answer. A pause does not submit or stop listening. Use **Next Question** only after the answer is complete; use **Submit Interview** for the final answer.
8. Review the final report, individual ideal answers, history, and analytics.

## Frontend

The React application lives in `src/`.

| Area | Responsibility |
| --- | --- |
| `pages/` | Authentication, dashboard, resume, setup, interview, results, history, analytics, and API settings screens. |
| `components/interview/` | Interviewer visual, controls, live transcript, question header, and feedback presentation. |
| `hooks/useSpeech.ts` | Connects browser speech synthesis and recognition to React state. |
| `services/speech/speechRecognition.ts` | Starts continuous recognition and immediately restarts browser-created recognition segments until explicitly stopped. |
| `services/llmSettings.ts` | Local cache and Firestore synchronization for provider/model/key settings. |
| `services/api.ts` | Adds Firebase ID token and selected LLM settings to backend requests. |
| `context/AuthContext.tsx` | Tracks Firebase auth state and hydrates the user's saved LLM settings after sign-in. |

### Voice transcription behavior

`SpeechRecognition.continuous` and interim results are enabled. Chromium-based browsers can still stop one recognition segment after silence or a service time limit, so `SpeechRecognitionSession` restarts that segment automatically. The transcript is accumulated rather than reset. The interview page calls `stopListening` only for manual microphone mute, answer submission, or page cleanup.

Speech recognition depends on the Web Speech API. Chrome and Edge provide the most complete support; the user must allow microphone permission. If the service is unavailable, candidates can use the typed-answer control.

## Backend

The FastAPI application is in `backend/app/`.

| Area | Responsibility |
| --- | --- |
| `routers/` | HTTP endpoints for auth, resumes, interviews, questions, evaluation, and analytics. |
| `core/security.py` | Verifies Firebase ID tokens. |
| `core/llm_context.py` | Validates the provider/model/key request headers for the current request. |
| `services/resume_service.py` | Parses and stores a resume. |
| `services/question_service.py` | Builds resume-aware initial/adaptive questions. |
| `services/evaluation_service.py` | Scores answers, generates long ideal answers, aggregates scores, and produces the final report. |
| `services/llm_service.py` | Provider adapter for Gemini and Groq, including structured Pydantic responses. |
| `graph.py` | LangGraph workflow that evaluates an answer, chooses difficulty, asks the next question, or completes the interview. |
| `db/firestore.py` | Firebase Admin initialization and per-user Firestore collection helpers. |

### Main API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Backend health check. |
| `GET` | `/auth/me` | Validates token and returns/creates user profile. |
| `POST` | `/resumes/upload` | Uploads, parses, and stores a resume. |
| `GET` | `/resumes` | Lists current user's resumes. |
| `POST` | `/interviews` | Creates interview and its first question. |
| `GET` | `/interviews/{id}` | Retrieves the current user's interview. |
| `GET` | `/questions/{id}/current` | Fetches active question. |
| `GET` | `/questions/{id}/history` | Fetches answered questions and evaluations. |
| `POST` | `/evaluation/answer` | Evaluates an answer and returns the next question or completion result. |
| `GET` | `/analytics/overview` | Returns dashboard analytics. |

All protected requests include `Authorization: Bearer <Firebase ID token>`. LLM-enabled backend requests also include `X-LLM-Provider`, `X-LLM-Model`, and `X-LLM-API-Key`.

## Data model

```text
users/{uid}
  ├─ profile fields
  ├─ private/llmSettings
  │   ├─ settings: { gemini?: { provider, model, apiKey }, groq?: ... }
  │   ├─ activeProvider
  │   └─ updatedAt
  ├─ resumes/{resumeId}
  ├─ interviews/{interviewId}
  │   ├─ current question, answers, graph state, scores, recommendations
  │   └─ provider/model used for the interview
  └─ analytics/{analyticsId}
```

## LLM response size and context

The backend has increased token budgets for structured responses: up to 6,144 tokens by default, 6,000 for technical evaluations, 4,500 for behavioral evaluations, and 2,400 for final recommendations. Resume context retained for question generation is 16,000 characters, and final report input retains 60,000 characters of answer/evaluation context.

This is an application-side capacity increase, not a change to a provider's fixed context-window limit. A provider/model can still reject a request above its own limit, so select a model with adequate context in API Settings.

## Setup and local development

### Prerequisites

- Node.js 20+ and npm.
- Python 3.11+.
- A Firebase project with Email/Password auth and Firestore enabled.
- A Firebase Admin service-account credential for the backend.
- A Gemini or Groq API key.

### Frontend

Create `.env` in the repository root with `VITE_API_URL` and all `VITE_FIREBASE_*` values. Then run:

```powershell
npm install
npm run dev
```

### Backend

Create `backend/.env` from `backend/.env.example`, configure Firebase Admin credentials and CORS, then run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

The frontend defaults to `http://127.0.0.1:8001` when `VITE_API_URL` is not supplied.

## Firebase security requirement

API keys are sensitive. Deploy [firestore.rules](firestore.rules) before enabling cloud-saved keys. Its `users/{uid}/private/**` match permits only the signed-in owner to read or write their settings. Do not use public Firestore rules, do not log API-key headers, and do not commit `.env` or service-account files.

For production, a stronger architecture is to store an encrypted key or provider token server-side and make LLM calls through a user-authorized backend session. The current design follows the requested Firestore storage approach, but it depends on correct owner-only Firestore rules.

## Validation

Run frontend checks with:

```powershell
npm run lint
npm run build
```

Run backend tests from `backend/` with:

```powershell
pytest
```
