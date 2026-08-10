"""Pydantic schemas for API validation."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models import (
    EventDomain,
    EventSeverity,
    IncidentPriority,
    IncidentStatus,
    JourneyStage,
    UserRole,
)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    full_name_ar: str | None
    role: UserRole
    governorate: str | None

    model_config = {"from_attributes": True}


class EventIngestRequest(BaseModel):
    event_type: str
    domain: EventDomain
    severity: EventSeverity = EventSeverity.ERROR
    source_system: str
    title: str
    title_ar: str | None = None
    description: str | None = None
    enumerator_id: str | None = None
    governorate: str | None = None
    journey_stage: JourneyStage | None = None
    device_info: dict[str, Any] | None = None
    location: dict[str, Any] | None = None
    extra_data: dict[str, Any] | None = None


class OperationalEventOut(BaseModel):
    id: int
    event_type: str
    domain: EventDomain
    severity: EventSeverity
    source_system: str
    title: str
    title_ar: str | None
    enumerator_id: str | None
    governorate: str | None
    journey_stage: JourneyStage | None
    incident_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentOut(BaseModel):
    id: int
    incident_number: str
    title: str
    title_ar: str | None
    description: str | None
    domain: EventDomain
    priority: IncidentPriority
    status: IncidentStatus
    is_major: bool
    affected_users_count: int
    governorate: str | None
    journey_stage: JourneyStage | None
    root_cause: str | None
    root_cause_confidence: float | None
    recommended_team: str | None
    recommended_action: str | None
    auto_resolved: bool
    assignee_id: int | None
    sla_deadline: datetime | None
    detected_at: datetime
    resolved_at: datetime | None
    events_count: int = 0

    model_config = {"from_attributes": True}


class IncidentUpdateRequest(BaseModel):
    status: IncidentStatus | None = None
    assignee_id: int | None = None
    root_cause: str | None = None
    recommended_action: str | None = None


class AIDiagnosisOut(BaseModel):
    id: int
    root_cause: str
    root_cause_ar: str | None
    confidence: float
    recommended_team: str
    recommended_action: str
    recommended_action_ar: str | None
    preventive_actions: str | None
    model_used: str
    created_at: datetime

    model_config = {"from_attributes": True}


class KnowledgeArticleOut(BaseModel):
    id: int
    title: str
    title_ar: str
    content: str
    content_ar: str
    domain: EventDomain
    tags: list | None
    usage_count: int
    success_rate: float
    is_validated: bool

    model_config = {"from_attributes": True}


class EnumeratorJourneyOut(BaseModel):
    id: int
    enumerator_id: str
    enumerator_name: str | None
    governorate: str | None
    current_stage: JourneyStage
    is_blocked: bool
    blocked_since: datetime | None
    blocked_reason: str | None
    forms_completed: int
    last_activity_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_incidents: int
    open_incidents: int
    major_incidents: int
    auto_resolved_today: int
    affected_enumerators: int
    blocked_enumerators: int
    avg_resolution_minutes: float
    sla_compliance_rate: float
    events_last_hour: int
    proactive_detection_rate: float


class AIAssistantRequest(BaseModel):
    question: str
    incident_id: int | None = None
    locale: str = "ar"


class AIAssistantResponse(BaseModel):
    answer: str
    answer_ar: str | None = None
    sources: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class NotificationOut(BaseModel):
    id: int
    title: str
    title_ar: str
    message: str
    message_ar: str
    notification_type: str
    is_broadcast: bool
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SystemHealthOut(BaseModel):
    service_name: str
    status: str
    response_time_ms: float | None
    error_rate: float | None
    last_check_at: datetime

    model_config = {"from_attributes": True}
