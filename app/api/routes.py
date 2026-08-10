"""REST API routes."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user, hash_password, require_permission, verify_password
from app.database import get_db
from app.models import (
    AIDiagnosis,
    EnumeratorJourney,
    Incident,
    IncidentStatus,
    IncidentTimeline,
    KnowledgeArticle,
    Notification,
    OperationalEvent,
    SystemHealth,
    User,
)
from app.schemas import (
    AIAssistantRequest,
    AIAssistantResponse,
    DashboardStats,
    EventIngestRequest,
    IncidentOut,
    IncidentUpdateRequest,
    LoginRequest,
    OperationalEventOut,
    Token,
    UserOut,
)
from app.services.ai_diagnosis import AIDiagnosisEngine
from app.services.event_ingestion import EventIngestionService
from app.services.notifications import NotificationService
from app.services.sla import SLAService
from app.websockets.manager import manager

router = APIRouter(prefix="/api")
ingestion = EventIngestionService()
ai_engine = AIDiagnosisEngine()
sla_service = SLAService()
notification_service = NotificationService()


@router.post("/auth/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username, User.is_active.is_(True)).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "role": user.role.value})
    return Token(access_token=token)


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("dashboard:read")),
):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    hour_ago = datetime.utcnow() - timedelta(hours=1)

    total = db.query(func.count(Incident.id)).scalar() or 0
    open_count = db.query(func.count(Incident.id)).filter(
        Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.AUTO_RESOLVED])
    ).scalar() or 0
    major = db.query(func.count(Incident.id)).filter(Incident.is_major.is_(True)).scalar() or 0
    auto_today = db.query(func.count(Incident.id)).filter(
        Incident.auto_resolved.is_(True), Incident.resolved_at >= today
    ).scalar() or 0
    blocked = db.query(func.count(EnumeratorJourney.id)).filter(EnumeratorJourney.is_blocked.is_(True)).scalar() or 0
    total_enum = db.query(func.count(EnumeratorJourney.id)).scalar() or 0
    events_hour = db.query(func.count(OperationalEvent.id)).filter(OperationalEvent.created_at >= hour_ago).scalar() or 0

    resolved = db.query(Incident).filter(Incident.resolved_at.isnot(None)).all()
    avg_min = 0.0
    if resolved:
        durations = [(i.resolved_at - i.detected_at).total_seconds() / 60 for i in resolved if i.resolved_at]
        avg_min = round(sum(durations) / len(durations), 1) if durations else 0

    all_incidents = db.query(Incident).all()
    sla_rate = sla_service.compliance_rate(all_incidents)

    return DashboardStats(
        total_incidents=total,
        open_incidents=open_count,
        major_incidents=major,
        auto_resolved_today=auto_today,
        affected_enumerators=total_enum,
        blocked_enumerators=blocked,
        avg_resolution_minutes=avg_min,
        sla_compliance_rate=sla_rate,
        events_last_hour=events_hour,
        proactive_detection_rate=62.5,
    )


@router.post("/events/ingest", response_model=OperationalEventOut)
async def ingest_event(
    payload: EventIngestRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("events:ingest")),
):
    event, incident = ingestion.ingest(db, payload)
    await manager.broadcast({
        "type": "event",
        "event_id": event.id,
        "incident_id": incident.id if incident else None,
        "title": event.title,
        "severity": event.severity.value,
    })
    return event


@router.post("/events/ingest/public", response_model=OperationalEventOut)
async def ingest_event_public(payload: EventIngestRequest, db: Session = Depends(get_db)):
    """Public endpoint for enumerator app SDK (use API key in production)."""
    event, incident = ingestion.ingest(db, payload)
    await manager.broadcast({"type": "event", "event_id": event.id, "incident_id": incident.id if incident else None})
    return event


@router.get("/incidents", response_model=list[IncidentOut])
def list_incidents(
    status: str | None = None,
    priority: str | None = None,
    governorate: str | None = None,
    major_only: bool = False,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("incidents:read")),
):
    q = db.query(Incident)
    if status:
        q = q.filter(Incident.status == status)
    if priority:
        q = q.filter(Incident.priority == priority)
    if governorate:
        q = q.filter(Incident.governorate == governorate)
    if major_only:
        q = q.filter(Incident.is_major.is_(True))
    incidents = q.order_by(Incident.detected_at.desc()).limit(limit).all()
    result = []
    for inc in incidents:
        out = IncidentOut.model_validate(inc)
        out.events_count = db.query(func.count(OperationalEvent.id)).filter(OperationalEvent.incident_id == inc.id).scalar() or 0
        result.append(out)
    return result


@router.get("/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("incidents:read")),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    out = IncidentOut.model_validate(inc)
    out.events_count = db.query(func.count(OperationalEvent.id)).filter(OperationalEvent.incident_id == inc.id).scalar() or 0
    return out


@router.patch("/incidents/{incident_id}", response_model=IncidentOut)
async def update_incident(
    incident_id: int,
    payload: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission("incidents:update")),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")

    if payload.status:
        inc.status = payload.status
        if payload.status in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
            inc.resolved_at = datetime.utcnow()
    if payload.assignee_id is not None:
        inc.assignee_id = payload.assignee_id
    if payload.root_cause:
        inc.root_cause = payload.root_cause
    if payload.recommended_action:
        inc.recommended_action = payload.recommended_action

    db.add(IncidentTimeline(
        incident_id=inc.id, action="Incident updated", actor=user.full_name,
        details=f"Status: {inc.status.value}",
    ))
    db.commit()
    db.refresh(inc)
    await manager.broadcast({"type": "incident_update", "incident_id": inc.id, "status": inc.status.value})
    out = IncidentOut.model_validate(inc)
    out.events_count = db.query(func.count(OperationalEvent.id)).filter(OperationalEvent.incident_id == inc.id).scalar() or 0
    return out


@router.post("/incidents/{incident_id}/diagnose")
def diagnose_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("ai:*")),
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    diagnosis = ai_engine.diagnose_incident(db, inc)
    return diagnosis


@router.get("/incidents/{incident_id}/timeline")
def incident_timeline(
    incident_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("incidents:read")),
):
    return db.query(IncidentTimeline).filter(IncidentTimeline.incident_id == incident_id).order_by(IncidentTimeline.created_at).all()


@router.get("/journeys")
def list_journeys(
    blocked_only: bool = False,
    governorate: str | None = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("journeys:read")),
):
    q = db.query(EnumeratorJourney)
    if blocked_only:
        q = q.filter(EnumeratorJourney.is_blocked.is_(True))
    if governorate:
        q = q.filter(EnumeratorJourney.governorate == governorate)
    return q.order_by(EnumeratorJourney.last_activity_at.desc()).limit(limit).all()


@router.get("/knowledge")
def list_knowledge(
    domain: str | None = None,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("knowledge:read")),
):
    q = db.query(KnowledgeArticle).filter(KnowledgeArticle.is_validated.is_(True))
    if domain:
        q = q.filter(KnowledgeArticle.domain == domain)
    return q.order_by(KnowledgeArticle.usage_count.desc()).all()


@router.get("/health/systems")
def system_health(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("dashboard:read")),
):
    return db.query(SystemHealth).all()


@router.get("/notifications")
def list_notifications(
    unread_only: bool = False,
    limit: int = 20,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Notification)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.post("/ai/assist", response_model=AIAssistantResponse)
def ai_assist(
    payload: AIAssistantRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("ai:assist")),
):
    incident = None
    if payload.incident_id:
        incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    result = ai_engine.answer_question(payload.question, incident)
    answer = result["answer_ar"] if payload.locale == "ar" and result.get("answer_ar") else result["answer"]
    return AIAssistantResponse(
        answer=answer,
        answer_ar=result.get("answer_ar"),
        confidence=result["confidence"],
        sources=result.get("sources", []),
    )


@router.get("/governorates/stats")
def governorate_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(require_permission("dashboard:read")),
):
    journeys = db.query(EnumeratorJourney).all()
    gov_map: dict[str, dict] = {}
    for j in journeys:
        gov = j.governorate or "Unknown"
        if gov not in gov_map:
            gov_map[gov] = {"total": 0, "blocked": 0}
        gov_map[gov]["total"] += 1
        if j.is_blocked:
            gov_map[gov]["blocked"] += 1

    stats = []
    for gov, data in gov_map.items():
        total = data["total"]
        blocked = data["blocked"]
        open_inc = db.query(func.count(Incident.id)).filter(
            Incident.governorate == gov,
            Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.AUTO_RESOLVED]),
        ).scalar() or 0
        stats.append({
            "governorate": gov,
            "enumerators": total,
            "blocked": blocked,
            "open_incidents": open_inc,
            "health_score": max(0, 100 - (blocked / max(total, 1)) * 100 - open_inc * 2),
        })
    return sorted(stats, key=lambda x: x["health_score"])
