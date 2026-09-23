from datetime import datetime
from typing import List

from pydantic import BaseModel, Field, ConfigDict


class WorkExperience(BaseModel):
    """Structured professional experience extracted from a resume."""

    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""


class Project(BaseModel):
    """Structured project information extracted from a resume."""

    name: str = ""
    description: str = ""
    technologies: List[str] = Field(default_factory=list)


class ResumeData(BaseModel):
    """
    Normalized resume information used by the application.

    This is independent of Firebase; Firestore will store this
    structure inside the authenticated user's resume document.
    """

    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""

    skills: List[str] = Field(default_factory=list)

    work_experience: List[WorkExperience] = Field(
        default_factory=list
    )

    projects: List[Project] = Field(
        default_factory=list
    )

    education: List[str] = Field(
        default_factory=list
    )

    certifications: List[str] = Field(
        default_factory=list
    )

    achievements: List[str] = Field(
        default_factory=list
    )

    others: List[str] = Field(
        default_factory=list
    )


class ResumeCreate(BaseModel):
    """Data received when creating/updating a resume record."""

    title: str = Field(
        default="My Resume",
        min_length=1,
        max_length=100,
    )

    parsed_data: ResumeData


class ResumeResponse(ResumeCreate):
    """Resume returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    resume_id: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ResumeJDMatchRequest(BaseModel):
    """Request for comparing a resume against a job description."""

    resume_id: str
    job_description: str = Field(
        min_length=20,
        max_length=30_000,
    )


class ResumeJDMatchResponse(BaseModel):
    """Result of resume-to-job-description analysis."""

    match_score: float = Field(
        ge=0,
        le=100,
    )

    matched_skills: List[str] = Field(
        default_factory=list
    )

    missing_skills: List[str] = Field(
        default_factory=list
    )

    relevant_projects: List[str] = Field(
        default_factory=list
    )

    experience_gaps: List[str] = Field(
        default_factory=list
    )

    recommended_topics: List[str] = Field(
        default_factory=list
    )

    summary: str = ""