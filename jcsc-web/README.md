# Jordan Census 2026 — Support Operations Center

مركز عمليات دعم التعداد الوطني — نظام إدارة الملاحظات الميدانية والمسائل التقنية.

## المتطلبات

- Node.js 20+
- npm

## التشغيل السريع

```bash
cd jcsc-web
npm install
npm run db:setup
npm run dev
```

افتح [http://localhost:3000/login](http://localhost:3000/login)

**كلمة المرور الافتراضية لجميع المستخدمين:** `jcsc2026`

| الدور | البريد |
|-------|--------|
| مدير النظام | admin@jcsc.gov.jo |
| مدير الدعm | manager@jcsc.gov.jo |
| مشرف ميداني | supervisor@jcsc.gov.jo |
| مطور | dev@jcsc.gov.jo |

## دورة العمل

1. **المشرف** يقدّم **ملاحظة** (Report) مع عدد المستخدمين المتأثرين
2. **مدير الدعm** يراجع كل ملاحظة — يرفض / يصنّف / يحوّل لـ **مسألة** (Issue)
3. **الفريق** يعمل على المسألة عبر الطوابير
4. **لا يُغلق شيء تلقائياً** — يتطلب تأكيد المدير

## البيئات

- **محلي (SQLite):** `file:./dev.db` — افتراضي
- **Staging/Production (PostgreSQL):** غيّر `DATABASE_URL` في `.env`

## المراحل المنجزة

- [x] Phase 1: نموذج البيانات، المصادقة، مصفوفة الصلاحيات
- [x] Phase 2: استقبال الملاحظات (نص + مرفقات + عدد المتأثرين)
- [x] Phase 3: شاشة مراجعة المدير + اقتراح AI + تحويل لمسألة
- [ ] Phase 4: دورة حياة المسائل الكاملة + طوابير الفرق
- [ ] Phase 5: محرك الإشعارات (debounce + escalation)
- [ ] Phase 6: قاعدة المعرفة
- [ ] Phase 7: مساعد AI متقدم
- [ ] Phase 8: لوحة القرارات النهائية

## أوامر مفيدة

```bash
npm run db:push      # تطبيق schema
npm run db:seed      # بيانات تجريبية
npm run db:studio    # واجهة Prisma
npm run build        # بناء الإنتاج
```
