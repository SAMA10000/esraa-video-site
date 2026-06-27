# تقرير إصلاح صارم PHP + MySQL

تم تعديل النسخة المرفوعة فقط: `project-bolt-sb1-5rgzbrdc-mysql-realdata-full-prompt-fix.zip`.
لم يتم تحويل المشروع إلى Bolt Database أو Supabase أو Firebase أو Deno.

## أهم ما تم إصلاحه

1. **البوتات أصبحت تقرأ إعداداتها من MySQL** عبر `/api/public/bot-settings.php` بدل الاعتماد على localStorage.
2. **feedEnabled و pollingInterval أصبحا مؤثرين فعليًا** في `ChatOverlay`.
3. **قائمة أسماء البوتات المحجوزة أصبحت كبيرة ومشتركة** بين Backend و Frontend.
4. **جلسات الأدمن أصبحت تتحقق من جدول MySQL `admin_sessions`** وليس PHP session فقط.
5. **تغيير كلمة المرور يدعم تغيير username اختياريًا** ويلغي الجلسات القديمة.
6. **إدارة المسؤولين زادت**: reset password، unlock admin، منع تعطيل/خفض آخر super_admin.
7. **CRUD المسلسلات أصبح يدعم كل الحقول الأساسية**: description/year/rating/views/status/featured/sort_order.
8. **إدارة الفيديو لها action مستقل** `updateVideoId` ويسجل `update_dailymotion_id`.
9. **إدارة البوستر لها action مستقل** `updatePoster` ويسجل `update_poster`.
10. **تمت إضافة CRUD للحلقات** عبر MySQL/PHP.
11. **الشات أصبح يطبق cooldown/rate-limit/repeated-message من Backend**.
12. **لوحة الأدمن فيها moderation للرسائل**: review/hide/delete.
13. **تم تعطيل install.php إنتاجيًا** حتى لا يبقى public installer.
14. **تمت إزالة debug raw من أغلب APIs العامة والحساسة** واستبدالها برسائل آمنة.
15. **تم تحديث dist build** بعد التعديلات.

## ملفات مهمة أضيفت أو تغيرت

- `api/config/bootstrap.php`
- `api/public/bot-settings.php`
- `api/admin/login.php`
- `api/admin/session.php`
- `api/admin/logout.php`
- `api/admin/change-password.php`
- `api/admin/data.php`
- `api/chat/username.php`
- `api/chat/message.php`
- `database/schema_mysql.sql`
- `database/strict_mysql_repair_migration.sql`
- `src/lib/chatEngine.ts`
- `src/components/ChatOverlay.tsx`
- `src/components/ChatInputSheet.tsx`
- `src/pages/AdminDashboard.tsx`
- `src/types/index.ts`
- `src/index.css`
- `install.php`
- `dist/*`

## الاختبارات التي تم تشغيلها محليًا

- PHP syntax check لجميع ملفات API الأساسية: Passed.
- TypeScript typecheck: Passed.
- Vite production build: Passed.
- ESLint: Passed with 3 React hook warnings only, no errors.

## ما يحتاج اختبار على VPS بعد النشر

- تسجيل دخول `/esraa`.
- حماية `/esraa/dashboard` بدون Login.
- رفض `/admin-login` و `/admin-setup` كمسارات مستقلة بعد تنظيف فولدرات السيرفر.
- حفظ إعدادات البوتات ثم التأكد أن `/api/public/bot-settings.php` يقرأها.
- إيقاف bot feed من الداشبورد والتأكد من توقف رسائل البوتات للزائر.
- اختبار cooldown/rate-limit للشات.
- اختبار hide/delete chat message من الداشبورد.
- اختبار تعديل كل حقول المسلسل.
- اختبار updateVideoId و updatePoster.

## حدود صريحة

- رسائل البوتات نفسها لا تُحفظ كلها في MySQL تلقائيًا بعد؛ الداشبورد يعرض ذلك بوضوح ولا يدعي أنها مؤرشفة بالكامل.
- first-free gate ما زال يعتمد على localStorage في الواجهة؛ تم تركه كما هو حتى لا نغير تصميم/منطق monetization فجأة، ويجب اعتباره limitation وليس حماية قوية.
