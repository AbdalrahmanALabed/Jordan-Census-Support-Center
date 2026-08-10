"""AI Diagnosis Engine — rule-based with optional LLM enhancement."""

from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import AIDiagnosis, EventDomain, Incident, OperationalEvent

settings = get_settings()


@dataclass
class DiagnosisResult:
    root_cause: str
    root_cause_ar: str
    confidence: float
    recommended_team: str
    recommended_action: str
    recommended_action_ar: str
    preventive_actions: str
    model_used: str


DIAGNOSIS_RULES: dict[str, DiagnosisResult] = {
    "login_failure": DiagnosisResult(
        root_cause="Authentication service failure or invalid credentials",
        root_cause_ar="فشل خدمة المصادقة أو بيانات اعتماد غير صحيحة",
        confidence=0.85,
        recommended_team="support_l1",
        recommended_action="Verify credentials, check auth service health, reset password if needed",
        recommended_action_ar="التحقق من بيانات الاعتماد، فحص صحة خدمة المصادقة، إعادة تعيين كلمة المرور إذا لزم",
        preventive_actions="Monitor auth service; enable self-service password reset",
        model_used="rule-engine",
    ),
    "sync_failure": DiagnosisResult(
        root_cause="API timeout or database connection pool exhaustion",
        root_cause_ar="انتهاء مهلة API أو استنفاد مجموعة اتصالات قاعدة البيانات",
        confidence=0.92,
        recommended_team="devops",
        recommended_action="Check API gateway metrics, scale DB connection pool, verify network connectivity",
        recommended_action_ar="فحص مقاييس بوابة API، توسيع مجموعة اتصالات DB، التحقق من الاتصال",
        preventive_actions="Enable connection pool auto-scaling; add sync retry with exponential backoff",
        model_used="rule-engine",
    ),
    "sync_timeout": DiagnosisResult(
        root_cause="Network latency or server overload causing sync timeout",
        root_cause_ar="زمن استجابة الشبكة أو تحميل زائد على الخادم",
        confidence=0.88,
        recommended_team="devops",
        recommended_action="Check server load, network latency by governorate, enable edge caching",
        recommended_action_ar="فحص حمل الخادم، زمن الشبكة حسب المحافظة، تفعيل التخزين المؤقت",
        preventive_actions="Deploy regional sync endpoints; implement offline queue",
        model_used="rule-engine",
    ),
    "runtime_form_crash": DiagnosisResult(
        root_cause="Form schema mismatch or insufficient device memory",
        root_cause_ar="عدم تطابق مخطط النموذج أو ذاكرة الجهاز غير كافية",
        confidence=0.78,
        recommended_team="frontend_dev",
        recommended_action="Check form version compatibility, clear app cache, verify device storage",
        recommended_action_ar="التحقق من توافق إصدار النموذج، مسح ذاكرة التطبيق، فحص مساحة الجهاز",
        preventive_actions="Add form version validation; implement graceful degradation for low-memory devices",
        model_used="rule-engine",
    ),
    "missing_buildings": DiagnosisResult(
        root_cause="GIS data not synced for assigned EA code or incomplete spatial dataset",
        root_cause_ar="بيانات GIS غير متزامنة لرمز EA أو مجموعة بيانات مكانية غير مكتملة",
        confidence=0.82,
        recommended_team="gis",
        recommended_action="Verify GIS layer for EA code, trigger spatial data refresh, check assignment mapping",
        recommended_action_ar="التحقق من طبقة GIS لرمز EA، تحديث البيانات المكانية، فحص ربط التكليف",
        preventive_actions="Pre-sync GIS data before assignment release; add spatial data validation",
        model_used="rule-engine",
    ),
    "gps_problem": DiagnosisResult(
        root_cause="Device GPS disabled or poor satellite signal in indoor/urban canyon",
        root_cause_ar="GPS معطل على الجهاز أو إشارة ضعيفة في المناطق المغلقة",
        confidence=0.75,
        recommended_team="support_l1",
        recommended_action="Guide enumerator to enable GPS, move to open area, or use manual location entry",
        recommended_action_ar="توجيه المEnumerator لتفعيل GPS أو الانتقال لمنطقة مفتوحة أو الإدخال اليدوي",
        preventive_actions="Add GPS health check on app launch; allow manual coordinate override",
        model_used="rule-engine",
    ),
    "no_internet": DiagnosisResult(
        root_cause="Device has no network connectivity",
        root_cause_ar="الجهاز بدون اتصال بالشبكة",
        confidence=0.95,
        recommended_team="support_l1",
        recommended_action="Verify mobile data/WiFi, check regional carrier outage, enable offline mode",
        recommended_action_ar="التحقق من بيانات الجوال/WiFi، فحص انقطاع المشغل، تفعيل الوضع دون اتصال",
        preventive_actions="Implement robust offline mode with automatic sync on reconnect",
        model_used="rule-engine",
    ),
    "database_timeout": DiagnosisResult(
        root_cause="Database query timeout due to lock contention or missing index",
        root_cause_ar="انتهاء مهلة استعلام DB بسبب تزاحم القفل أو فهرس مفقود",
        confidence=0.90,
        recommended_team="dba",
        recommended_action="Check active queries, identify blocking locks, review slow query log",
        recommended_action_ar="فحص الاستعلامات النشطة، تحديد الأقفال، مراجعة سجل الاستعلامات البطيئة",
        preventive_actions="Add query timeout alerts; optimize indexes for census peak load",
        model_used="rule-engine",
    ),
    "server_outage": DiagnosisResult(
        root_cause="Backend service unavailable or infrastructure failure",
        root_cause_ar="خدمة Backend غير متاحة أو فشل في البنية التحتية",
        confidence=0.93,
        recommended_team="devops",
        recommended_action="Check service health, restart failed pods, activate DR failover if needed",
        recommended_action_ar="فحص صحة الخدمة، إعادة تشغيل الحاويات، تفعيل DR إذا لزم",
        preventive_actions="Implement health checks with auto-restart; maintain hot standby",
        model_used="rule-engine",
    ),
    "self_enum_failure": DiagnosisResult(
        root_cause="Self-enumeration portal session expired or SMS link invalid",
        root_cause_ar="انتهت جلسة التعداد الذاتي أو رابط SMS غير صالح",
        confidence=0.80,
        recommended_team="call_center",
        recommended_action="Resend SMS link, verify citizen identity, complete form via call center",
        recommended_action_ar="إعادة إرسال رابط SMS، التحقق من هوية المواطن، إكمال النموذج عبر مركز الاتصال",
        preventive_actions="Extend SMS link validity; add portal status page for citizens",
        model_used="rule-engine",
    ),
}

DOMAIN_TEAM_MAP = {
    EventDomain.IDENTITY: "support_l1",
    EventDomain.FIELD_DEVICE: "support_l2",
    EventDomain.SYNC: "devops",
    EventDomain.GIS: "gis",
    EventDomain.INFRASTRUCTURE: "devops",
    EventDomain.CITIZEN: "call_center",
    EventDomain.FIELD_MGMT: "support_l1",
}


class AIDiagnosisEngine:
    def diagnose_incident(self, db: Session, incident: Incident) -> AIDiagnosis:
        events = db.query(OperationalEvent).filter(OperationalEvent.incident_id == incident.id).all()
        event_types = [e.event_type for e in events]

        result = None
        for et in event_types:
            if et in DIAGNOSIS_RULES:
                result = DIAGNOSIS_RULES[et]
                break

        if not result:
            team = DOMAIN_TEAM_MAP.get(incident.domain, "support_l2")
            result = DiagnosisResult(
                root_cause=f"Unclassified issue in {incident.domain.value} domain",
                root_cause_ar=f"مشكلة غير مصنفة في مجال {incident.domain.value}",
                confidence=0.50,
                recommended_team=team,
                recommended_action="Manual investigation required — review event logs and user context",
                recommended_action_ar="يتطلب تحقيقاً يدوياً — مراجعة سجلات الأحداث وسياق المستخدم",
                preventive_actions="Add classification rule for this event pattern",
                model_used="rule-engine-fallback",
            )

        if settings.openai_api_key and result.confidence < 0.85:
            llm_result = self._enhance_with_llm(incident, events, result)
            if llm_result:
                result = llm_result

        diagnosis = AIDiagnosis(
            incident_id=incident.id,
            root_cause=result.root_cause,
            root_cause_ar=result.root_cause_ar,
            confidence=result.confidence,
            recommended_team=result.recommended_team,
            recommended_action=result.recommended_action,
            recommended_action_ar=result.recommended_action_ar,
            preventive_actions=result.preventive_actions,
            model_used=result.model_used,
        )
        db.add(diagnosis)

        incident.root_cause = result.root_cause
        incident.root_cause_confidence = result.confidence
        incident.recommended_team = result.recommended_team
        incident.recommended_action = result.recommended_action
        from app.models import IncidentStatus
        if incident.status == IncidentStatus.DETECTED:
            incident.status = IncidentStatus.DIAGNOSING

        db.commit()
        db.refresh(diagnosis)
        return diagnosis

    def _enhance_with_llm(
        self, incident: Incident, events: list[OperationalEvent], base: DiagnosisResult
    ) -> DiagnosisResult | None:
        try:
            event_summary = "\n".join(
                f"- {e.event_type}: {e.title} ({e.severity.value})" for e in events[:10]
            )
            prompt = (
                f"You are an expert census operations diagnostician.\n"
                f"Incident: {incident.title}\n"
                f"Domain: {incident.domain.value}\n"
                f"Affected users: {incident.affected_users_count}\n"
                f"Governorate: {incident.governorate}\n"
                f"Events:\n{event_summary}\n"
                f"Initial diagnosis: {base.root_cause}\n"
                f"Provide improved root cause, recommended action, and confidence (0-1)."
            )
            with httpx.Client(timeout=15) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                    json={
                        "model": settings.openai_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 500,
                    },
                )
                if resp.status_code == 200:
                    content = resp.json()["choices"][0]["message"]["content"]
                    return DiagnosisResult(
                        root_cause=content[:500],
                        root_cause_ar=base.root_cause_ar,
                        confidence=min(base.confidence + 0.1, 0.95),
                        recommended_team=base.recommended_team,
                        recommended_action=content[500:1000] if len(content) > 500 else base.recommended_action,
                        recommended_action_ar=base.recommended_action_ar,
                        preventive_actions=base.preventive_actions,
                        model_used=f"hybrid:{settings.openai_model}",
                    )
        except Exception:
            pass
        return None

    def answer_question(self, question: str, incident: Incident | None = None) -> dict:
        q_lower = question.lower()
        if incident and incident.root_cause:
            return {
                "answer": f"Based on incident {incident.incident_number}: {incident.root_cause}. "
                          f"Recommended action: {incident.recommended_action or 'Under investigation'}.",
                "answer_ar": f"بناءً على الحادث {incident.incident_number}: {incident.root_cause}. "
                           f"الإجراء الموصى به: {incident.recommended_action or 'قيد التحقيق'}.",
                "confidence": incident.root_cause_confidence or 0.7,
                "sources": [f"Incident {incident.incident_number}"],
            }

        for key, rule in DIAGNOSIS_RULES.items():
            if key.replace("_", " ") in q_lower or key in q_lower:
                return {
                    "answer": rule.recommended_action,
                    "answer_ar": rule.recommended_action_ar,
                    "confidence": rule.confidence,
                    "sources": [f"Knowledge: {key}"],
                }

        return {
            "answer": "I can help with census operational issues. Please describe the problem or reference an incident number.",
            "answer_ar": "يمكنني المساعدة في مشاكل عمليات التعداد. يرجى وصف المشكلة أو ذكر رقم الحادث.",
            "confidence": 0.5,
            "sources": [],
        }
