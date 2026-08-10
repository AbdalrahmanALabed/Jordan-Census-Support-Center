"""Event ingestion, correlation, and incident creation engine."""

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    EnumeratorJourney,
    EventSeverity,
    Incident,
    IncidentPriority,
    IncidentStatus,
    IncidentTimeline,
    JourneyStage,
    OperationalEvent,
)
from app.schemas import EventIngestRequest
from app.services.ai_diagnosis import AIDiagnosisEngine
from app.services.automation import AutomationEngine
from app.services.escalation import EscalationEngine
from app.services.notifications import NotificationService
from app.services.sla import SLAService


class EventIngestionService:
    def __init__(self) -> None:
        self.ai_engine = AIDiagnosisEngine()
        self.automation = AutomationEngine()
        self.escalation = EscalationEngine()
        self.notifications = NotificationService()
        self.sla = SLAService()

    def ingest(self, db: Session, payload: EventIngestRequest) -> tuple[OperationalEvent, Incident | None]:
        event = OperationalEvent(
            event_type=payload.event_type,
            domain=payload.domain,
            severity=payload.severity,
            source_system=payload.source_system,
            title=payload.title,
            title_ar=payload.title_ar,
            description=payload.description,
            enumerator_id=payload.enumerator_id,
            governorate=payload.governorate,
            journey_stage=payload.journey_stage,
            device_info=payload.device_info,
            location=payload.location,
            extra_data=payload.extra_data,
        )
        db.add(event)
        db.flush()

        if payload.enumerator_id:
            self._update_journey(db, payload)

        incident = self._correlate_and_create_incident(db, event)
        if incident:
            event.incident_id = incident.id
            self.ai_engine.diagnose_incident(db, incident)
            auto_resolved = self.automation.try_auto_resolve(db, incident)
            if not auto_resolved:
                self.escalation.evaluate(db, incident)
            self.notifications.notify_incident(db, incident)

        db.commit()
        db.refresh(event)
        return event, incident

    def _update_journey(self, db: Session, payload: EventIngestRequest) -> None:
        journey = db.query(EnumeratorJourney).filter(
            EnumeratorJourney.enumerator_id == payload.enumerator_id
        ).first()

        is_blocking = payload.severity in (EventSeverity.ERROR, EventSeverity.CRITICAL)

        if not journey:
            journey = EnumeratorJourney(
                enumerator_id=payload.enumerator_id,
                governorate=payload.governorate,
                current_stage=payload.journey_stage or JourneyStage.LOGIN,
                device_info=payload.device_info,
            )
            db.add(journey)
        else:
            if payload.journey_stage:
                journey.current_stage = payload.journey_stage
            journey.last_activity_at = datetime.utcnow()
            if payload.governorate:
                journey.governorate = payload.governorate

        if is_blocking:
            journey.is_blocked = True
            journey.blocked_since = journey.blocked_since or datetime.utcnow()
            journey.blocked_reason = payload.title
        elif payload.event_type.endswith("_success") or payload.event_type == "sync_complete":
            journey.is_blocked = False
            journey.blocked_since = None
            journey.blocked_reason = None

    def _correlate_and_create_incident(self, db: Session, event: OperationalEvent) -> Incident | None:
        if event.severity == EventSeverity.INFO:
            return None

        window = datetime.utcnow() - timedelta(minutes=5)
        similar = (
            db.query(OperationalEvent)
            .filter(
                OperationalEvent.event_type == event.event_type,
                OperationalEvent.governorate == event.governorate,
                OperationalEvent.created_at >= window,
                OperationalEvent.incident_id.isnot(None),
            )
            .first()
        )

        if similar and similar.incident_id:
            incident = db.query(Incident).filter(Incident.id == similar.incident_id).first()
            if incident and incident.status not in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED, IncidentStatus.AUTO_RESOLVED):
                incident.affected_users_count = (
                    db.query(func.count(func.distinct(OperationalEvent.enumerator_id)))
                    .filter(OperationalEvent.incident_id == incident.id)
                    .scalar()
                    or 0
                ) + (1 if event.enumerator_id else 0)
                incident.updated_at = datetime.utcnow()
                self._add_timeline(db, incident.id, "Event correlated", "JCOCC Engine", f"New event: {event.title}")
                self._reevaluate_priority(db, incident)
                return incident

        priority = self._calculate_priority(db, event)
        incident_number = self._generate_incident_number(db)

        incident = Incident(
            incident_number=incident_number,
            title=event.title,
            title_ar=event.title_ar,
            description=event.description,
            domain=event.domain,
            priority=priority,
            status=IncidentStatus.CLASSIFIED,
            is_major=priority == IncidentPriority.P1,
            affected_users_count=1,
            governorate=event.governorate,
            journey_stage=event.journey_stage,
            sla_deadline=self.sla.calculate_deadline(priority),
        )
        db.add(incident)
        db.flush()

        self._add_timeline(db, incident.id, "Incident created", "JCOCC Engine", f"From event: {event.event_type}")
        return incident

    def _calculate_priority(self, db: Session, event: OperationalEvent) -> IncidentPriority:
        if event.severity == EventSeverity.CRITICAL:
            return IncidentPriority.P1

        window = datetime.utcnow() - timedelta(minutes=5)
        similar_count = (
            db.query(func.count(OperationalEvent.id))
            .filter(
                OperationalEvent.event_type == event.event_type,
                OperationalEvent.created_at >= window,
            )
            .scalar()
            or 0
        )

        if similar_count >= 100:
            return IncidentPriority.P1
        if similar_count >= 20:
            return IncidentPriority.P2
        if similar_count >= 5:
            return IncidentPriority.P3
        if event.severity == EventSeverity.ERROR:
            return IncidentPriority.P3
        return IncidentPriority.P4

    def _reevaluate_priority(self, db: Session, incident: Incident) -> None:
        if incident.affected_users_count >= 500:
            incident.priority = IncidentPriority.P1
            incident.is_major = True
            incident.status = IncidentStatus.MAJOR
        elif incident.affected_users_count >= 100:
            incident.priority = IncidentPriority.P2
        elif incident.affected_users_count >= 20:
            incident.priority = IncidentPriority.P3

    def _generate_incident_number(self, db: Session) -> str:
        today = datetime.utcnow().strftime("%Y%m%d")
        count = db.query(func.count(Incident.id)).scalar() or 0
        return f"INC-{today}-{count + 1:05d}"

    def _add_timeline(self, db: Session, incident_id: int, action: str, actor: str, details: str | None = None) -> None:
        db.add(IncidentTimeline(incident_id=incident_id, action=action, actor=actor, details=details))
