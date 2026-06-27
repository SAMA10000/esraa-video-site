# تقرير تحويل المشروع إلى MySQL / PHP API — Minimal Fix

## الخلاصة
تم تحويل مسار البيانات من Supabase/Edge Functions إلى MySQL + PHP API بشكل Minimal Fix بدون تغيير التصميم العام.

## ما تم تغييره
- إزالة اعتماد الواجهة على `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY`.
- حذف اعتماد `@supabase/supabase-js` من `package.json`.
- إضافة طبقة API أمامية:
  - `src/lib/apiClient.ts`
  - `src/lib/dataApi.ts`
- تحويل الصفحات العامة إلى MySQL API:
  - Home
  - Browse
  - Search
  - Watch
  - hooks/useContinueWatching
- تحويل لوحة الأدمن إلى PHP API:
  - login
  - session
  - logout
  - change password
  - dashboard data
  - create/update/delete drama
  - create admin
  - health
- تحويل الشات إلى PHP API:
  - username reservation
  - message moderation
- إضافة MySQL schema + seed:
  - `database/schema_mysql.sql`
  - `database/seed_mysql.sql`

## ملفات الرفع المهمة
ارفع على السيرفر:
- `dist/` محتوى الموقع المبني
- `api/` ملفات PHP API
- `.htaccess` لو السيرفر Apache
- `database/schema_mysql.sql` و `database/seed_mysql.sql` للتنفيذ مرة واحدة داخل MySQL

## إعداد قاعدة البيانات
1. أنشئي قاعدة بيانات MySQL.
2. نفذي:
   - `database/schema_mysql.sql`
   - `database/seed_mysql.sql`
3. عدلي بيانات الاتصال في:
   - `api/config/database.php`

## دخول الأدمن الأول
الـ seed يضيف أدمن مؤقت للتجربة الأولى فقط:

- username: `admin`
- password: `esraam1919`

بعد أول دخول افتحي:
`/esraa/dashboard`
ثم غيري كلمة المرور فوراً من:
`🔒 إدارة بيانات الدخول الحساسة`

## اختبارات تمت محلياً
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run lint`: PASS
- `php -l` لكل ملفات API: PASS

## حدود الاختبار
لم يتم اختبار الاتصال بقاعدة MySQL حقيقية هنا لأن بيانات سيرفرك غير موجودة داخل البيئة. لكن تم فحص TypeScript/build/PHP syntax وتم تجهيز API ومساراته.
