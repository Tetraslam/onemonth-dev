from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CurriculumBase(BaseModel):
    title: str
    description: Optional[str] = None
    learning_goal: str
    difficulty_level: Literal["beginner", "intermediate", "advanced"]
    estimated_duration_days: int = 30
    prerequisites: Optional[str] = None
    daily_time_commitment_minutes: Optional[int] = None
    learning_style: Optional[str] = None
    is_public: bool = False
    is_prebuilt: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Curriculum(CurriculumBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CurriculumCreate(CurriculumBase):
    pass


class CurriculumUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    learning_goal: Optional[str] = None
    difficulty_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None
    estimated_duration_days: Optional[int] = None
    prerequisites: Optional[str] = None
    daily_time_commitment_minutes: Optional[int] = None
    learning_style: Optional[str] = None
    is_public: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class CurriculumDay(BaseModel):
    id: UUID
    curriculum_id: UUID
    day_number: int
    title: str
    content: Dict[str, Any]  # Rich text content
    resources: List[Dict[str, Any]] = Field(default_factory=list)
    estimated_hours: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CurriculumDayCreate(BaseModel):
    day_number: int
    title: str
    content: Dict[str, Any]
    resources: List[Dict[str, Any]] = Field(default_factory=list)
    estimated_hours: Optional[float] = None


class CurriculumDayUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    resources: Optional[List[Dict[str, Any]]] = None
    estimated_hours: Optional[float] = None 