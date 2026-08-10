"""SLA calculation and compliance tracking."""

from datetime import datetime, timedelta

from app.models import IncidentPriority


SLA_MINUTES = {
    IncidentPriority.P1: 60,
    IncidentPriority.P2: 240,
    IncidentPriority.P3: 480,
    IncidentPriority.P4: 1440,
    IncidentPriority.P5: 2880,
}


class SLAService:
    def calculate_deadline(self, priority: IncidentPriority) -> datetime:
        minutes = SLA_MINUTES.get(priority, 480)
        return datetime.utcnow() + timedelta(minutes=minutes)

    def is_breached(self, deadline: datetime | None) -> bool:
        if not deadline:
            return False
        return datetime.utcnow() > deadline

    def compliance_rate(self, incidents: list) -> float:
        if not incidents:
            return 100.0
        resolved = [i for i in incidents if i.resolved_at and i.sla_deadline]
        if not resolved:
            return 100.0
        compliant = sum(1 for i in resolved if i.resolved_at <= i.sla_deadline)
        return round((compliant / len(resolved)) * 100, 1)
