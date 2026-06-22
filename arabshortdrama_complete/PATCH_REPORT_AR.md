# تقرير QA وإصلاح Minimal Full Fix

تم فحص النسخة بعد آخر Prompt وتم تنفيذ إصلاحات إضافية Minimal بدون إعادة بناء المشروع من الصفر وبدون تغيير الهوية العامة.

## نتيجة الفحص التقني

- TypeScript typecheck: PASS
- Production build: PASS
- ESLint: PASS مع تحذيرين React Hooks فقط، بدون أخطاء.
- لا يوجد `node_modules` مطلوب داخل النسخة المضغوطة.

## الإصلاحات المؤكدة في الكود

1. زر `شاهد الحلقات كاملة`
   - أصبح `<button type="button">` حقيقي.
   - click handler على الزر نفسه.
   - النص والأيقونة لا يمنعان الضغط.
   - يفتح `OfferModal` مباشرة.

2. المودال والـ Bottom Nav
   - عند فتح المودال يتم إضافة `locker-modal-open` إلى body.
   - الـ nav يصبح `pointer-events: none` و opacity صفر.
   - المودال أعلى z-index.
   - CTA داخل المودال له z-index و pointer-events واضحين.

3. راوتات الأدمن
   - `/esraa` هو مدخل تسجيل الدخول.
   - `/esraa/dashboard` هو الداشبورد.
   - `/admin-login`, `/admin-setup`, `/admin`, `/login`, `/setup` يتم تحويلهم إلى `/esraa`.
   - `/admin-dashboard`, `/dashboard` يتم تحويلهم إلى `/esraa/dashboard` ثم يحميه منطق الجلسة.

4. Failed to fetch / Preview fallback
   - تم تحسين fallback داخل Bolt/localhost فقط.
   - `admin / esraam1919` يعمل كجلسة معاينة فقط على hostnames الخاصة بالمعاينة إذا كانت Edge Functions غير متاحة.
   - الإنتاج لا يعتمد على fallback.

5. حماية الأدمن
   - عمليات الأدمن الحساسة تمر عبر `admin-data` Edge Function.
   - `admin-data` تتحقق من cookie session عبر RPC قبل تنفيذ العمليات.
   - تم إضافة migration لتقوية RLS وجعل جداول الأدمن/audit تعمل فقط من service_role.

6. Password hashing
   - تم استبدال إنشاء كلمات المرور الجديدة بـ PBKDF2-SHA256 مع salt و iterations.
   - تم الاحتفاظ بدعم قراءة hashes القديمة SHA-256 salted كـ legacy compatibility فقط حتى لا تكسر حسابات قديمة.
   - أي كلمة مرور جديدة أو admin جديد يتم تخزينها بصيغة PBKDF2.

7. الشات واسم المستخدم
   - لم يعد `confirmedName` يعتمد على localStorage عند فتح الشات.
   - localStorage يتذكر الاسم للواجهة فقط.
   - خانة التعليق وزر الإرسال يظلان معطلين حتى تأكيد الاسم من backend.
   - لو backend غير متاح لا يتم تأكيد الاسم كأنه حقيقي.

8. فلترة الشات
   - frontend يمنع الأرقام والروابط والحسابات والكلمات المخالفة قبل الإرسال.
   - backend `chat-message` يعيد فحص الرسالة قبل التخزين.
   - لو backend غير متاح لا يتم نشر الرسالة.

9. Dailymotion
   - إدارة الفيديو تقبل Dailymotion ID فقط.
   - iframe يتم توليده داخلياً من ID.
   - IDs يتم التحقق منها في backend.
   - تم إزالة `loop=1` من iframe حتى يمكن استقبال حدث نهاية الفيديو.

10. الفيديو المشابه
   - عند انتهاء الفيديو يتم اختيار فيديو آخر من نفس القسم إذا موجود.
   - إذا لا يوجد فيديو مناسب يظهر fallback recommendation بدلاً من الخطأ أو السلوك المكسور.

11. إزالة روابط التفعيل/الشركاء
   - لا توجد وحدات dashboard باسم روابط التفعيل والشركاء أو allowed domains أو sponsor links أو activation_url.
   - تم ترك منع الروابط داخل رسائل الشات لأنه جزء أمان الشات وليس نظام شركاء.

12. لوحة الأدمن
   - موجودة كتحسين minimal: نظرة عامة، المسلسلات، الفيديوهات، التصنيفات، البوسترات، التحليلات، الدردشة، البوتات، المسؤولون، الأمان، سجل العمليات، صحة النظام، الإعدادات.
   - لا يتم إظهار save وهمي عند فشل backend.
   - عند عدم توفر backend يتم عرض رسائل واضحة بدلاً من fake success.

## ملفات رئيسية تم تعديلها

- src/App.tsx
- src/pages/WatchPage.tsx
- src/components/OfferModal.tsx
- src/components/ChatInputSheet.tsx
- src/pages/AdminLoginPage.tsx
- src/pages/AdminDashboard.tsx
- src/lib/adminAuth.ts
- src/lib/adminApi.ts
- supabase/functions/admin-login/index.ts
- supabase/functions/admin-password-change/index.ts
- supabase/functions/admin-setup/index.ts
- supabase/functions/admin-data/index.ts
- supabase/functions/chat-username/index.ts
- supabase/functions/chat-message/index.ts
- supabase/migrations/20260618112000_chat_username_and_events.sql
- supabase/migrations/20260618124500_harden_admin_rls.sql

## ملاحظات مهمة قبل الرفع

- لازم migrations الجديدة تتطبق على Supabase.
- لازم Edge Functions الجديدة/المعدلة تتنشر:
  - admin-data
  - admin-login
  - admin-session
  - admin-logout
  - admin-password-change
  - chat-username
  - chat-message
- لو Edge Functions لا تعمل في Bolt Preview، fallback خاص بالمعاينة قد يفتح الداشبورد للاختبار فقط، لكنه لا يحفظ تغييرات وهمية.
- الاختبار النهائي الحقيقي للـ backend لا يكتمل إلا بعد نشر functions والمigrations.
