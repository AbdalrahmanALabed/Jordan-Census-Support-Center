"""Escalation engine for incident routing."""

from sqlalchemy.orm import Session

from app.models import Incident, IncidentPriority, IncidentStatus, IncidentTimeline, User, UserRole

ESCALATION_MAP = {
    IncidentPriority.P1: UserRole.SUPPORT_MANAGER,
    IncidentPriority.P2: UserRole.SUPPORT_L2,
    IncidentPriority.P3: UserRole.SUPPORT_L1,
    IncidentPriority.P4: UserRole.SUPPORT_L1,
}

TEAM_ROLE_MAP = {
    "support_l1": UserRole.SUPPORT_L1,
    "support_l2": UserRole.SUPPORT_L2,
    "devops": UserRole.DEVOPS,
    "dba": UserRole.DBA,
    "gis": UserRole.GIS,
    "frontend_dev": UserRole.FRONTEND_DEV,
    "backend_dev": UserRole.BACKEND_DEV,
    "call_center": UserRole.CALL_CENTER,
}


class EscalationEngine:
    def evaluate(self, db: Session, incident: Incident) -> None:
        if incident.status in (IncidentStatus.AUTO_RESOLVED, IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
            return

        if incident.is_major:
            incident.status = IncidentStatus.MAJOR
            self._assign_by_role(db, incident, UserRole.SUPPORT_MANAGER)
            self._log(db, incident, "Major incident escalation", "Escalation Engine")
            return

        if incident.recommended_team:
            role = TEAM_ROLE_MAP.get(incident.recommended_team, UserRole.SUPPORT_L1)
            self._assign_by_role(db, incident, role)
        else:
            role = ESCALATION_MAP.get(incident.priority, UserRole.SUPPORT_L1)
            self._assign_by_role(db, incident, role)

        if incident.priority in (IncidentPriority.P1, IncidentPriority.P2):
            incident.status = IncidentStatus.ESCALATED
            self._log(db, incident, f"Escalated to {incident.priority.value.upper()}", "Escalation Engine")

        db.commit()

    def _assign_by_role(self, db: Session, incident: Incident, role: UserRole) -> None:
        query = db.query(User).filter(User.role == role, User.is_active.is_(True))
        if incident.governorate and role in (UserRole.SUPPORT_L1, UserRole.SUPPORT_L2):
            gov_user = query.filter(User.governorate == incident.governorate).first()
            if gov_user:
                incident.assignee_id = gov_user.id
                return
        user = query.first()
        if user:
            incident.assignee_id = user.id

    def _log(self, db: Session, incident: Incident, action: str, actor: str) -> None:
        db.add(IncidentTimeline(incident_id=incident.id, action=action, actor=actor))
