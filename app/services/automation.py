"""Automated resolution engine for known operational patterns."""

from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Incident, IncidentStatus, IncidentTimeline


AUTO_RESOLVE_PATTERNS = {
    "login_failure": {
        "condition": lambda inc: inc.affected_users_count == 1,
        "action": "Trigger password reset flow and notify enumerator",
        "action_ar": "تفعيل إعادة تعيين كلمة المرور وإشعار المEnumerator",
    },
    "no_internet": {
        "condition": lambda inc: inc.affected_users_count <= 3,
        "action": "Enable offline mode and queue sync for reconnect",
        "action_ar": "تفعيل الوضع دون اتصال وقائمة انتظار المزامنة",
    },
    "password_reset_request": {
        "condition": lambda _inc: True,
        "action": "Send password reset link via SMS",
        "action_ar": "إرسال رابط إعادة تعيين كلمة المرور عبر SMS",
    },
    "device_storage_full": {
        "condition": lambda inc: inc.affected_users_count == 1,
        "action": "Push cache cleanup command to device",
        "action_ar": "إرسال أمر مسح الذاكرة المؤقتة للجهاز",
    },
}


class AutomationEngine:
    def try_auto_resolve(self, db: Session, incident: Incident) -> bool:
        if incident.priority.value in ("p1", "p2"):
            return False
        if incident.root_cause_confidence and incident.root_cause_confidence < 0.70:
            return False

        events = incident.events
        if not events:
            return False

        event_type = events[0].event_type
        pattern = AUTO_RESOLVE_PATTERNS.get(event_type)
        if not pattern or not pattern["condition"](incident):
            return False

        incident.status = IncidentStatus.AUTO_RESOLVED
        incident.auto_resolved = True
        incident.resolved_at = datetime.utcnow()
        incident.recommended_action = pattern["action"]

        db.add(IncidentTimeline(
            incident_id=incident.id,
            action="Auto-resolved",
            action_ar="تم الحل تلقائياً",
            actor="Automation Engine",
            details=pattern["action"],
        ))
        db.commit()
        return True
