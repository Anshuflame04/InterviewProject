import json


RESUME_SCHEMA = {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "skills": ["string"],
    "work_experience": [
        {
            "title": "string",
            "company": "string",
            "duration": "string",
            "description": "string",
        }
    ],
    "projects": [
        {
            "name": "string",
            "description": "string",
            "technologies": ["string"],
        }
    ],
    "education": ["string"],
    "certifications": ["string"],
    "achievements": ["string"],
    "others": ["string"],
}


def build_resume_extraction_prompt(resume_text: str) -> str:
    """
    Build a structured resume extraction prompt.

    The model must return JSON only so the response can be validated
    before being stored in Firestore.
    """

    return f"""
You are an expert resume parser.

Extract factual information from the resume below.

Rules:
1. Do not invent information.
2. Do not infer missing details.
3. Preserve important technical terminology.
4. If information is missing, return an empty string or empty list.
5. Separate projects from professional experience.
6. Extract technologies explicitly mentioned.
7. Return ONLY valid JSON.
8. Do not wrap the JSON in markdown fences.

Required JSON structure:

{json.dumps(RESUME_SCHEMA, indent=2)}

Resume:
--------------------
{resume_text}
--------------------
"""