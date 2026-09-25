# InterviewYou

Resume-aware adaptive interview practice with continuous voice transcription, Firebase authentication, Firestore history, Gemini/Groq support, detailed evaluations, and analytics.

Read [DOCUMENTATION.md](DOCUMENTATION.md) for the complete feature list, architecture, data flow, setup, Firebase security rules, API overview, and validation commands.

## Quick start

```powershell
npm install
npm run dev
```

Start the FastAPI service from `backend/` after configuring `backend/.env`:

```powershell
uvicorn app.main:app --reload --port 8001
```

Deploy [firestore.rules](firestore.rules) before using Firebase-saved API keys.
