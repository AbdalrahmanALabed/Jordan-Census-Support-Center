"""SQLAlchemy domain models for JCOCC."""

import enum
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    ENUMERATOR = "enumerator"
    SUPERVISOR = "supervisor"
    COORDINATOR = "coordinator"
    GOVERNORATE_MANAGER = "governorate_manager"
    SUPPORT_L1 = "support_l1"
    SUPPORT_L2 = "support_l2"
    SUPPORT_MANAGER = "support_manager"
    BACKEND_DEV = "backend_dev"
    FRONTEND_DEV = "frontend_dev"
    DBA = "dba"
    DEVOPS = "devops"
    GIS = "gis"
    CALL_CENTER = "call_center"
    EXECUTIVE = "executive"
    SYSADMIN = "sysadmin"


class EventDomain(str, enum.Enum):
    IDENTITY = "identity"
    FIELD_DEVICE = "field_device"
    SYNC = "sync"
    GIS = "gis"
    INFRASTRUCTURE = "infrastructure"
    CITIZEN = "citizen"
    FIELD_MGMT = "field_mgmt"


class EventSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class IncidentPriority(str, enum.Enum):
    P1 = "p1"
    P2 = "p2"
    P3 = "p3"
    P4 = "p4"
    P5 = "p5"


class IncidentStatus(str, enum.Enum):
    DETECTED = "detected"
    CLASSIFIED = "classified"
    DIAGNOSING = "diagnosing"
    IN_PROGRESS = "in_progress"
    AUTO_RESOLVED = "auto_resolved"
    RESOLVED = "resolved"
    ESCALATED = "escalated"
    MAJOR = "major"
    CLOSED = "closed"


class JourneyStage(str, enum.Enum):
    LOGIN = "login"
    DOWNLOAD_ASSIGNMENT = "download_assignment"
    BUILDINGS = "buildings"
    HOUSEHOLDS = "households"
    RUNTIME_FORMS = "runtime_forms"
    SYNCHRONIZATION = "synchronization"
    COMPLETION = "completion"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    full_name_ar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), index=True)
    governorate: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    assigned_incidents: Mapped[list["Incident"]] = relationship(back_populates="assignee")


class OperationalEvent(Base):
    __tablename__ = "operational_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), index=True)
    domain: Mapped[EventDomain] = mapped_column(Enum(EventDomain), index=True)
    severity: Mapped[EventSeverity] = mapped_column(Enum(EventSeverity), index=True)
    source_system: Mapped[str] = mapped_column(String(100), index=True)
    title: Mapped[str] = mapped_column(String(500))
    title_ar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    enumerator_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    governorate: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    journey_stage: Mapped[JourneyStage | None] = mapped_column(Enum(JourneyStage), nullable=True)
    device_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    location: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    incident: Mapped["Incident | None"] = relationship(back_populates="events")


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    incident_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    title_ar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    domain: Mapped[EventDomain] = mapped_column(Enum(EventDomain), index=True)
    priority: Mapped[IncidentPriority] = mapped_column(Enum(IncidentPriority), index=True)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.DETECTED, index=True)
    is_major: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    affected_users_count: Mapped[int] = mapped_column(Integer, default=1)
    governorate: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    journey_stage: Mapped[JourneyStage | None] = mapped_column(Enum(JourneyStage), nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    root_cause_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    recommended_team: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    auto_resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    sla_deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    events: Mapped[list["OperationalEvent"]] = relationship(back_populates="incident")
    assignee: Mapped["User | None"] = relationship(back_populates="assigned_incidents")
    timeline: Mapped[list["IncidentTimeline"]] = relationship(back_populates="incident")
    diagnoses: Mapped[list["AIDiagnosis"]] = relationship(back_populates="incident")


class IncidentTimeline(Base):
    __tablename__ = "incident_timeline"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    action: Mapped[str] = mapped_column(String(200))
    action_ar: Mapped[str | None] = mapped_column(String(200), nullable=True)
    actor: Mapped[str] = mapped_column(String(200))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incident: Mapped["Incident"] = relationship(back_populates="timeline")


class AIDiagnosis(Base):
    __tablename__ = "ai_diagnoses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), index=True)
    root_cause: Mapped[str] = mapped_column(Text)
    root_cause_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float)
    recommended_team: Mapped[str] = mapped_column(String(100))
    recommended_action: Mapped[str] = mapped_column(Text)
    recommended_action_ar: Mapped[str | None] = mapped_column(Text, nullable=True)
    preventive_actions: Mapped[str | None] = mapped_column(Text, nullable=True)
    model_used: Mapped[str] = mapped_column(String(100), default="rule-engine")
    accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incident: Mapped["Incident"] = relationship(back_populates="diagnoses")


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    title_ar: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    content_ar: Mapped[str] = mapped_column(Text)
    domain: Mapped[EventDomain] = mapped_column(Enum(EventDomain), index=True)
    event_types: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EnumeratorJourney(Base):
    __tablename__ = "enumerator_journeys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    enumerator_id: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    enumerator_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    governorate: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    current_stage: Mapped[JourneyStage] = mapped_column(Enum(JourneyStage), default=JourneyStage.LOGIN)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    blocked_since: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    blocked_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    device_info: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    forms_completed: Mapped[int] = mapped_column(Integer, default=0)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    title_ar: Mapped[str] = mapped_column(String(500))
    message: Mapped[str] = mapped_column(Text)
    message_ar: Mapped[str] = mapped_column(Text)
    notification_type: Mapped[str] = mapped_column(String(50), index=True)
    target_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_governorate: Mapped[str | None] = mapped_column(String(100), nullable=True)
    incident_id: Mapped[int | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    is_broadcast: Mapped[bool] = mapped_column(Boolean, default=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class SystemHealth(Base):
    __tablename__ = "system_health"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    service_name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(50), index=True)
    response_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    error_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_check_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    extra_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
