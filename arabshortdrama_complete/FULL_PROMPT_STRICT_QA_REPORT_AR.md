# تقرير تنفيذ البرومبت الصارم — Strict Full Prompt Minimal Fix

## الحكم
تمت مراجعة التنفيذ السابق لأن شكل لوحة الأدمن كان غير مقبول وبه تبويبات/رسائل عامة. تم تنفيذ إصلاح جديد Minimal Fix بدون إعادة بناء الموقع من الصفر وبدون تغيير تصميم الواجهة العامة.

## ما تم إصلاحه في هذه النسخة

1. **لوحة الأدمن**
   - تم تحويل شكل لوحة الأدمن من تبويبات أفقية مكسورة إلى تخطيط احترافي: Header + Sidebar/Navigation نظيف.
   - لا يوجد شريط أفقي قبيح في لوحة التحكم.
   - كل تبويب ظاهر له وظيفة عملية أو يقرأ/يحفظ من MySQL API.
   - تمت إضافة تبويب `الإعدادات العامة` بشكل حقيقي محفوظ في `admin_settings`.

2. **إزالة الجلسات الوهمية**
   - تم إلغاء فتح لوحة الأدمن اعتماداً على `sessionStorage` preview admin session.
   - `/esraa/dashboard` يعتمد على `/api/admin/session.php` فقط.
   - `localStorage/sessionStorage` لا يفتحان الأدمن ولا يمنحان role.

3. **تسجيل الدخول**
   - `/esraa` يستخدم MySQL API فقط.
   - تم حذف fallback القديم الذي كان ينشئ admin session من المتصفح.
   - أي فشل اتصال يظهر كخطأ MySQL API واضح، وليس fake success.

4. **الإعدادات العامة**
   - `site_title`
   - `site_subtitle`
   - `site_maintenance_mode`
   - `site_homepage_limit`
   - `site_analytics_enabled`
   - كلها محفوظة في `admin_settings` عبر `saveSiteSettings`.

5. **نطاق روابط التفعيل/الشركاء**
   - غير موجود كقسم في لوحة التحكم.
   - لا يوجد sponsor / allowlist / activation_url في src أو api أو dist.
   - منع الروابط داخل الشات مستمر لأنه من فلترة الرسائل وليس إدارة شركاء.

6. **الصحة والتقارير**
   - `health` يفحص جداول حقيقية: admin, sessions, audit, categories, dramas, episodes, chat, analytics, admin_settings.
   - لا يعرض قسم روابط تفعيل/شركاء.

7. **Seed MySQL**
   - يحتوي 9 categories.
   - يحتوي 22 dramas.
   - episodes مقصود 0 rows.
   - يحتوي admin مؤقت.
   - يحتوي إعدادات بوتات/شات/إعدادات عامة في admin_settings.

## اختبارات تم تشغيلها

```bash
npm run typecheck
npm run build
npm run lint
php -l api/**/*.php
php -l install.php
```

## النتائج

- Typecheck: PASS
- Build: PASS
- Lint: PASS
- PHP syntax: PASS

## حدود ما لم يتم اختباره محلياً

لم يتم اختبار دخول `/esraa` على قاعدة MySQL حقيقية لأن بيانات VPS/DB ليست متاحة داخل بيئة العمل. الاختبار الحقيقي المطلوب بعد الرفع:

1. تشغيل install.php أو استيراد schema/seed.
2. فتح `/esraa`.
3. تسجيل الدخول.
4. التأكد من أن لوحة الأدمن تقرأ البيانات من MySQL.
5. تجربة إضافة/تعديل/حذف مسلسل.
6. تجربة إعدادات البوتات والشات والإعدادات العامة.

## الملفات المهمة المعدلة

- `src/pages/AdminDashboard.tsx`
- `src/pages/AdminLoginPage.tsx`
- `src/lib/adminAuth.ts`
- `src/lib/adminApi.ts`
- `api/admin/data.php`
- `database/seed_mysql.sql`
- `dist/`

