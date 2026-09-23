users/
└── {firebase_uid}/
    │
    ├── profile
    │
    ├── resumes/
    │   └── {resume_id}
    │
    ├── interviews/
    │   └── {interview_id}
    │       └── questions/
    │           └── {question_id}
    │
    └── analytics/
        └── {analytics_id}




                            ┌──────────────┐
                    │    Prompt    │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │     LLM      │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
                    │ Pydantic     │
                    │   Schemas    │
                    └──────┬───────┘
                           ↓
              ┌────────────┴────────────┐
              ↓                         ↓
         LangGraph                 Firestore
              ↓                         ↓
           Next Q                    History