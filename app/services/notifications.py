"""Notification service for operational alerts."""

from sqlalchemy.orm import Session

from app.models import Incident, IncidentPriority, Notification


class NotificationService:
    def notify_incident(self, db: Session, incident: Incident) -> None:
        if incident.is_major or incident.priority == IncidentPriority.P1:
            db.add(Notification(
                title=f"MAJOR INCIDENT: {incident.title}",
                title_ar=f"حادث جسيم: {incident.title_ar or incident.title}",
                message=f"{incident.incident_number} — {incident.affected_users_count} users affected",
                message_ar=f"{incident.incident_number} — {incident.affected_users_count} مستخدم متأثر",
                notification_type="major_incident",
                target_role="support_manager",
                incident_id=incident.id,
                is_broadcast=False,
            ))
        elif incident.auto_resolved:
            db.add(Notification(
                title=f"Auto-resolved: {incident.title}",
                title_ar=f"تم الحل تلقائياً: {incident.title_ar or incident.title}",
                message=f"{incident.incident_number} resolved automatically",
                message_ar=f"تم حل {incident.incident_number} تلقائياً",
                notification_type="auto_resolve",
                target_role="support_l1",
                incident_id=incident.id,
            ))
        db.commit()

    def create_broadcast(
        self, db: Session, title: str, title_ar: str, message: str, message_ar: str, governorate: str | None = None
    ) -> Notification:
        notification = Notification(
            title=title,
            title_ar=title_ar,
            message=message,
            message_ar=message_ar,
            notification_type="broadcast",
            target_governorate=governorate,
            is_broadcast=True,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification
