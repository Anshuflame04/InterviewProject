# AI Interview Platform — Project Reference

## Purpose

This is a full-stack, authenticated AI interview-practice application. A candidate uploads a resume, configures an interview, answers spoken or typed questions, and receives an interview-level report with answer-by-answer feedback and analytics.

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons |
| Authentication | Firebase Authentication (email/password) |
| API | FastAPI on port 8001 |
| Persistence | Cloud Firestore, scoped below `users/{firebase_uid}` |
| AI workflow | LangGraph state machine with a configurable LLM provider (Gemini by default) |
| Speech | Browser Web Speech synthesis and recognition APIs |
| AI provider choice | User-selected Gemini or Groq model and API key |

## Running the application

- Frontend: `npm run dev`
- Frontend verification: `npm run build` and `npm run lint`
- Backend: from `backend`, run the FastAPI app with Uvicorn (configuration is read from `backend/.env` or environment variables).
- Required backend configuration: Google/Gemini settings, Firebase service-account path, and allowed CORS origins. Never commit keys or service-account credentials.

## Frontend architecture

`src/App.tsx` owns routing. `/auth` is public; the dashboard, resume, setup, history and aggregate analytics pages are inside `AppShell` and protected by `ProtectedRoute`. The live interview and results report are protected but intentionally use a distraction-free full-page layout.

| Area | Main files | Responsibility |
| --- | --- | --- |
| Authentication | `firebase.ts`, `context/AuthContext.tsx`, `hooks/useAuth.ts`, `routes/ProtectedRoute.tsx` | Firebase app/auth initialization, sign-in, registration, logout and route protection. |
| API access | `services/api.ts` | Adds Firebase ID token as `Authorization: Bearer ...`, normalizes JSON errors, defines endpoint paths. |
| Resume and setup | `pages/Resume.tsx`, `pages/InterviewSetup.tsx` | Resume management and creation of interview sessions. |
| Live interview | `pages/Interview.tsx`, `hooks/useInterview.ts`, `hooks/useSpeech.ts`, `hooks/useMediaDevices.ts` | Question lifecycle, browser microphone/camera, speech recognition/synthesis, timer, answer submission. |
| Interview UI | `components/interview/*` | Header, interviewer avatar, transcript, media controls. No evaluation component is rendered in the live page. |
| Reporting | `pages/Results.tsx` | Fetches persisted session, question history and aggregates; presents detailed review and allows a local report download. |
| Long-term views | `pages/History.tsx`, `pages/Analytics.tsx`, `pages/Dashboard.tsx` | History browsing, score trends/aggregates and dashboard metrics. |

## Backend architecture

`backend/app/main.py` configures FastAPI, CORS, lifecycle cleanup and routers.

| Router | Endpoint family | Purpose |
| --- | --- | --- |
| `auth.py` | `/auth` | Authenticated user identity operations. |
| `resumes.py` | `/resumes` | Upload, parse, list and retrieve resumes. |
| `interviews.py` | `/interviews` | Creates and retrieves sessions; supports pause/resume. |
| `questions.py` | `/questions/{id}/current`, `/questions/{id}/history` | Retrieves current question and persisted answer/evaluation history. |
| `evaluation.py` | `/evaluation/answer` | Validates active question, runs adaptive graph, saves answer/evaluation, updates session scores/state. |
| `analytics.py` | `/analytics/overview`, `/analytics/history` | User-wide totals and session list. |

### Adaptive interview state machine

`app/graph.py` uses LangGraph.

1. `start` always generates Question 1: **Tell me about yourself** with index `0`.
2. `answer` evaluates the current answer (behavioral STAR or technical evaluator).
3. The graph records covered/weak topics and selects next difficulty when appropriate.
4. If questions remain, it generates exactly one next question and increments the index.
5. On the last answer it completes the interview; `evaluation.py` aggregates and persists final scores.

`evaluation.py` returns `should_continue` and `current_question_index` with each answer response. The client uses those server-authoritative values, preventing an interview from skipping Question 1 or navigating to results before the last answer.

## Firestore data model

All access is isolated by the authenticated Firebase UID.

```text
users/{uid}
  resumes/{resume_id}
  interviews/{interview_id}
    answers.{question_id}
      question_id, question, topic, expected_points
      answer, duration_seconds, order
      evaluation (score, ideal_answer, feedback dimensions, recommendations)
  analytics/{analytics_id}  # reserved collection; current overview is computed from interviews
```

An interview document also contains session configuration, current question/index, status, covered/weak topics, total duration, per-dimension scores, overall score, strengths, weaknesses and recommendations. This means detailed reports and analytics remain available after refresh, logout/login and in interview history.

## AI API setup

The shared backend `.env` key is no longer used for AI requests. Each user configures a provider, model and key from **API Setup**. The browser stores this configuration locally and includes it only with authenticated requests to the app backend; API keys are intentionally never written to Firestore or returned by the backend.

Available current production choices are Gemini `gemini-3.8-flash`, and Groq `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, and `qwen/qwen3.8-27b`. Groq execution uses `langchain_groq.ChatGroq`. Final reports also persist personalized resume, answer-delivery and general-success recommendations with an encouraging closing.

The API Setup page has a reveal/hide control for the entered key and displays the currently saved provider/model. Every newly created interview persists its provider and model with the session, and the live interview header shows that session's selected model.

## Performance and pagination

- History and analytics initially request only five sessions; a **Load 5 more** button requests the next page only when needed.
- Overview metrics use only the most recent five interviews, avoiding a full Firestore collection scan.
- The dashboard, history, and analytics reuse a 30-second in-memory cache for their read-only API responses. Cache entries are invalidated after starting or completing an interview.
- PDF code remains lazy loaded, and the browser requests camera/microphone together first, falling back to independent device requests only when necessary.

## Live interview UX contract

- The interviewer reads every newly loaded question aloud when voice is enabled.
- When that speech ends (or voice is muted), speech recognition starts automatically; no repeated microphone click is required after the browser has granted permission.
- Candidates can still manually pause/resume the microphone, switch to typed input, repeat a question, mute the interviewer or disable camera.
- Browser recognition segments are immediately restarted after a pause and their finalized text is accumulated, allowing candidates to give longer answers without losing the earlier portion.
- The primary button is **Next Question** for all non-final questions and **Submit Interview** for the last one.
- Individual scores, ideal answers and AI feedback are deliberately hidden until the interview has ended.

## Results and downloads

The results page first renders the answer-by-answer review in chronological order:

- Question number and rating
- Original question
- Candidate answer
- Ideal answer

The existing overall score, dimension scores, strengths, improvements and recommendations follow it. **Download report** creates a PDF export of the persisted report. The PDF library is loaded only after the user clicks download, so it does not slow the live interview. History opens the same report; query-string support also makes reports resilient to refresh/direct navigation.

## Layout

On desktop, the application shell starts as a 76px icon navigation rail and expands to the full navigation labels from its menu button. The interview workspace uses a three-column composition: interviewer at left, question/response controls in the center, and candidate camera at right. It collapses to a single-column layout on smaller screens.

## Important maintenance notes

- `backend/firebase-service-account.json` and `.env` are sensitive and must not be committed or copied into documentation.
- Browser speech recognition support and microphone permission vary by browser; Chrome/Edge generally provide the most complete Web Speech support.
- The provided backend README describes an older nested `questions` collection, while the implementation currently stores answer history in the interview document's `answers` map. The implementation is the source of truth.
- The root README is the default Vite template and does not yet document this application; use this file as the working project reference.
