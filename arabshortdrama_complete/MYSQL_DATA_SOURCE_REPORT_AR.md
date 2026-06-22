# تقرير مصدر الداتا

الداتا الأساسية لم تُخترع من الصفر. تم أخذ seed من ملفات Supabase migrations الموجودة داخل المشروع الأصلي:

- `supabase/migrations/20260614170557_create_initial_schema.sql`
- `supabase/migrations/20260614171737_update_categories_and_dramas.sql`
- `supabase/migrations/20260617204458_20260617_create_admin_auth.sql`
- `supabase/migrations/20260617173135_20260617_create_audit_log.sql`

المطابقة مع Screenshot Bolt Tables:

- categories: 9 rows
- dramas: 22 rows
- episodes: 0 rows
- admin/audit/rate/session tables: empty عند البداية

تم تحويل هذه البنية إلى MySQL في:

- `database/schema_mysql.sql`
- `database/seed_mysql.sql`

ملاحظة: أي بيانات تمت إضافتها يدويًا لاحقًا داخل Bolt/Supabase بعد تصدير المشروع لن تكون موجودة في الملفات، ولا يمكن سحبها إلا بتصدير CSV/SQL من واجهة Bolt/Supabase أو API. أما الداتا الظاهرة في الصورة الحالية، فهي مطابقة للـ migrations الموجودة في الملفات.
