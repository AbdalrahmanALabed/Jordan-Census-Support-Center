# JCOCC — Jordan Census Operations Control Center

منصة ذكية لإدارة عمليات التعداد الوطني — Operations Intelligence Platform

## المتطلبات

- Python 3.11+
- pip

## التشغيل السريع

```bash
# 1. إنشاء بيئة افتراضية
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# 2. تثبيت المتطلبات
pip install -r requirements.txt

# 3. إعداد البيئة
copy .env.example .env       # Windows
# cp .env.example .env       # Linux/Mac

# 4. تشغيل المنصة
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## الوصول

- **الواجهة:** http://localhost:8000
- **تسجيل الدخول:** http://localhost:8000/login
- **API Docs:** http://localhost:8000/docs

## حسابات تجريبية

| المستخدم | كلمة المرور | الدور |
|----------|-------------|-------|
| `support.manager` | `manager123` | مدير العمليات |
| `support.l1` | `support123` | دعم L1 |
| `support.l2` | `support123` | دعم L2 |
| `devops.lead` | `devops123` | DevOps |
| `admin` | `admin123` | مدير النظام |
| `executive` | `exec123` | الإدارة التنفيذية |

## الوحدات المُنفّذة

| الوحدة | الحالة | الوصف |
|--------|--------|-------|
| Operations Control Tower | ✅ | لوحة تحكم مباشرة مع KPIs |
| Event Ingestion Engine | ✅ | استقبال وتصنيف الأحداث التشغيلية |
| Correlation Engine | ✅ | دمج الأحداث المتكررة في حادث واحد |
| AI Diagnosis Engine | ✅ | تشخيص ذكي (Rule-based + OpenAI optional) |
| Automation Engine | ✅ | حل تلقائي للمشاكل المعروفة |
| Escalation Engine | ✅ | تصعيد وتوجيه حسب الأولوية |
| SLA Engine | ✅ | حساب SLA والامتثال |
| Incident Management | ✅ | دورة حياة الحادث الكاملة |
| Major Incident Center | ✅ | مركز الحوادث الجسيمة |
| Enumerator Journey Tracking | ✅ | تتبع مراحل رحلة المEnumerator |
| Device Health / System Health | ✅ | مراقبة صحة الأنظمة |
| Knowledge Base | ✅ | قاعدة المعرفة |
| AI Assistant | ✅ | مساعد ذكي للعمليات |
| Notification Engine | ✅ | إشعارات وتنبيهات |
| WebSocket Real-Time | ✅ | تحديثات مباشرة |
| RBAC | ✅ | صلاحيات حسب الدور |
| Arabic RTL UI | ✅ | واجهة عربية |

## API — إرسال حدث تشغيلي

```bash
curl -X POST http://localhost:8000/api/events/ingest/public \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "sync_failure",
    "domain": "sync",
    "severity": "error",
    "source_system": "enumerator_app",
    "title": "Sync failed for enumerator",
    "title_ar": "فشل المزامنة للمEnumerator",
    "enumerator_id": "ENUM-00001",
    "governorate": "Amman",
    "journey_stage": "synchronization"
  }'
```

## البنية

```
app/
├── main.py              # FastAPI application
├── config.py            # Configuration
├── database.py          # SQLAlchemy setup
├── models.py            # Domain models
├── schemas.py           # Pydantic schemas
├── seed.py              # Demo data
├── api/routes.py        # REST endpoints
├── core/security.py     # Auth & RBAC
├── services/
│   ├── event_ingestion.py
│   ├── ai_diagnosis.py
│   ├── automation.py
│   ├── escalation.py
│   ├── sla.py
│   └── notifications.py
├── websockets/manager.py
templates/               # HTML (Arabic RTL)
static/                  # CSS & JS
```

## AI (اختياري)

لتفعيل تشخيص OpenAI، أضف مفتاح API في `.env`:

```
OPENAI_API_KEY=sk-...
```

بدون المفتاح، يعمل محرك التشخيص القائم على القواعد (Rule Engine).

## التوسع المستقبلي

- [ ] PostgreSQL للإنتاج
- [ ] Redis + Kafka للأحداث
- [ ] تكامل Enumerator App SDK
- [ ] تكامل Call Center / FMS
- [ ] Live Operations Map (GIS)
- [ ] Broadcast Center
- [ ] Shift Management
