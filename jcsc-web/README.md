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

## الوصول من جهاز آخر (نفس الشبكة)

1. على **جهاز السيرفر** (الذي يشغّل `npm run dev`)، اعرف عنوان IP:
   ```powershell
   ipconfig
   ```
   مثال: `10.109.10.13`

2. في ملف `jcsc-web/.env` غيّر:
   ```
   NEXTAUTH_URL="http://10.109.10.13:3000"
   ```
   (استبدل بالـ IP الفعلي لجهازك)

3. أعد تشغيل السيرفر:
   ```bash
   npm run dev
   ```
   السيرفر يستمع الآن على كل الواجهات (`0.0.0.0`) وليس `localhost` فقط.

4. من الجهاز الآخر افتح في المتصفح:
   ```
   http://10.109.10.13:3000/login
   ```
   **لا تستخدم `localhost` من جهاز ثانٍ** — `localhost` يعني ذلك الجهاز نفسه.

5. إذا لم تفتح الصفحة، اسمح لـ Node.js عبر **جدار حماية Windows** (منفذ 3000):
   ```powershell
   netsh advfirewall firewall add rule name="JCSC Dev 3000" dir=in action=allow protocol=TCP localport=3000
   ```

**كلمة المرور الافتراضية لجميع المستخدمين:** `jcsc2026`

| الدور | البريد |
|-------|--------|
| مدير النظام | admin@jcsc.gov.jo |
| مدير الدعm | manager@jcsc.gov.jo |
| الدعم الفني المراكز | supervisor@jcsc.gov.jo |
| مطور | dev@jcsc.gov.jo |

## دورة العمل

1. **الدعم الفني المراكز** يقدّم **ملاحظة** (Report) مع عدد المستخدمين المتأثرين
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
