"""Database seed data for demo and initial setup."""

from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    EnumeratorJourney,
    EventDomain,
    EventSeverity,
    Incident,
    IncidentPriority,
    IncidentStatus,
    IncidentTimeline,
    JourneyStage,
    KnowledgeArticle,
    OperationalEvent,
    SystemHealth,
    User,
    UserRole,
)


GOVERNORATES = [
    "Amman", "Irbid", "Zarqa", "Balqa", "Mafraq",
    "Jerash", "Ajloun", "Madaba", "Karak", "Tafilah",
    "Ma'an", "Aqaba",
]

DEMO_USERS = [
    ("admin", "admin@jcocc.gov.jo", "System Administrator", "مدير النظام", UserRole.SYSADMIN, None, "admin123"),
    ("support.manager", "som@jcocc.gov.jo", "Ahmad Al-Rashid", "أحمد الراشد", UserRole.SUPPORT_MANAGER, None, "manager123"),
    ("support.l1", "l1@jcocc.gov.jo", "Sara Hassan", "سارة حسن", UserRole.SUPPORT_L1, "Amman", "support123"),
    ("support.l2", "l2@jcocc.gov.jo", "Omar Khaled", "عمر خالد", UserRole.SUPPORT_L2, None, "support123"),
    ("devops.lead", "devops@jcocc.gov.jo", "Khalid Nasser", "خالد ناصر", UserRole.DEVOPS, None, "devops123"),
    ("dba.lead", "dba@jcocc.gov.jo", "Layla Ahmad", "ليلى أحمد", UserRole.DBA, None, "dba123"),
    ("gis.lead", "gis@jcocc.gov.jo", "Yousef Ali", "يوسف علي", UserRole.GIS, None, "gis123"),
    ("executive", "exec@jcocc.gov.jo", "Dr. Fatima Zahran", "د. فاطمة زهران", UserRole.EXECUTIVE, None, "exec123"),
]


def seed_database(db: Session) -> None:
    if db.query(User).first():
        return

    for username, email, name, name_ar, role, gov, password in DEMO_USERS:
        db.add(User(
            username=username,
            email=email,
            full_name=name,
            full_name_ar=name_ar,
            hashed_password=hash_password(password),
            role=role,
            governorate=gov,
        ))

    articles = [
        ("Sync Failure Resolution", "حل فشل المزامنة",
         "Check API gateway health, verify DB connection pool, restart sync service if needed.",
         "فحص صحة بوابة API، التحقق من مجموعة اتصالات DB، إعادة تشغيل خدمة المزامنة",
         EventDomain.SYNC, ["sync_failure", "sync_timeout"]),
        ("Login Issues Guide", "دليل مشاكل تسجيل الدخول",
         "Verify credentials, check account lockout status, reset password via self-service.",
         "التحقق من بيانات الاعتماد، فحص حالة قفل الحساب، إعادة تعيين كلمة المرور",
         EventDomain.IDENTITY, ["login_failure", "account_lockout"]),
        ("GIS Data Missing", "بيانات GIS مفقودة",
         "Verify EA code mapping, refresh spatial layers, contact GIS team for data update.",
         "التحقق من ربط رمز EA، تحديث الطبقات المكانية، التواصل مع فريق GIS",
         EventDomain.GIS, ["missing_buildings", "map_load_failure"]),
    ]
    for title, title_ar, content, content_ar, domain, tags in articles:
        db.add(KnowledgeArticle(
            title=title, title_ar=title_ar, content=content, content_ar=content_ar,
            domain=domain, event_types=tags, tags=tags, is_validated=True,
            usage_count=random.randint(5, 50), success_rate=random.uniform(0.7, 0.95),
        ))

    services = [
        ("API Gateway", "healthy", 45.2, 0.01),
        ("Auth Service", "healthy", 23.1, 0.0),
        ("Sync Service", "degraded", 890.5, 0.08),
        ("Database Primary", "healthy", 12.3, 0.001),
        ("GIS Service", "healthy", 156.7, 0.02),
        ("Self-Enum Portal", "healthy", 67.8, 0.005),
        ("Notification Service", "healthy", 34.2, 0.0),
        ("Field Management API", "healthy", 89.4, 0.01),
    ]
    for name, status, rt, err in services:
        db.add(SystemHealth(service_name=name, status=status, response_time_ms=rt, error_rate=err))

    stages = list(JourneyStage)
    for i in range(1, 51):
        enum_id = f"ENUM-{i:05d}"
        stage = random.choice(stages)
        blocked = random.random() < 0.15
        db.add(EnumeratorJourney(
            enumerator_id=enum_id,
            enumerator_name=f"Enumerator {i}",
            governorate=random.choice(GOVERNORATES),
            current_stage=stage,
            is_blocked=blocked,
            blocked_since=datetime.utcnow() - timedelta(minutes=random.randint(5, 120)) if blocked else None,
            blocked_reason=random.choice(["Sync failure", "Login issue", "GPS problem", "Form crash"]) if blocked else None,
            forms_completed=random.randint(0, 45),
            last_activity_at=datetime.utcnow() - timedelta(minutes=random.randint(1, 60)),
        ))

    demo_incidents = [
        ("INC-20260801-00001", "Mass sync failure in Amman", "فشل مزامنة جماعي في عمان",
         EventDomain.SYNC, IncidentPriority.P2, IncidentStatus.IN_PROGRESS, "Amman", 47, False),
        ("INC-20260801-00002", "Login failures spike — Irbid", "ارتفاع فشل تسجيل الدخول — إربد",
         EventDomain.IDENTITY, IncidentPriority.P3, IncidentStatus.DIAGNOSING, "Irbid", 12, False),
        ("INC-20260801-00003", "Database timeout on assignment download", "انتهاء مهلة DB عند تحميل التكليف",
         EventDomain.INFRASTRUCTURE, IncidentPriority.P1, IncidentStatus.MAJOR, None, 523, True),
        ("INC-20260801-00004", "Missing buildings — Zarqa EA-2045", "مباني مفقودة — Zarqa EA-2045",
         EventDomain.GIS, IncidentPriority.P4, IncidentStatus.IN_PROGRESS, "Zarqa", 1, False),
        ("INC-20260801-00005", "Self-enumeration portal slow", "بطء بوابة التعداد الذاتي",
         EventDomain.CITIZEN, IncidentPriority.P3, IncidentStatus.CLASSIFIED, None, 8, False),
    ]
    for num, title, title_ar, domain, priority, status, gov, affected, major in demo_incidents:
        inc = Incident(
            incident_number=num, title=title, title_ar=title_ar, domain=domain,
            priority=priority, status=status, governorate=gov,
            affected_users_count=affected, is_major=major,
            detected_at=datetime.utcnow() - timedelta(minutes=random.randint(10, 180)),
            root_cause="Under investigation" if status != IncidentStatus.CLASSIFIED else None,
        )
        db.add(inc)
        db.flush()
        db.add(IncidentTimeline(
            incident_id=inc.id, action="Incident created", actor="JCOCC Engine",
            details=f"Demo incident {num}",
        ))

    db.commit()
