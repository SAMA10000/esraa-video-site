# تقرير فحص الكود قبل النشر — arabshortdrama PHP + MySQL

## نتيجة فنية مختصرة
- PHP syntax check: PASSED لكل ملفات api و install.php.
- npm run lint: PASSED بدون أخطاء أو تحذيرات.
- npm run typecheck: PASSED.
- npm run build: PASSED.
- Backend runtime المستهدف: PHP + MySQL فقط.
- لا يوجد Supabase/Firebase/Deno/Bolt Database في runtime.

## أهم إصلاح إضافي تم بعد الفحص
تم تعديل ردود البوت داخل ChatInputSheet بحيث لا تُولّد برد Frontend محلي غير محفوظ. الآن الرد بعد رسالة الزائر يطلب رسالة بوت من `/api/public/bot-message.php`، والرسالة تُحفظ في MySQL داخل `chat_messages` و `bot_message_logs`.

## البوتات كأنها بشر — ما تم إثباته من الكود
- أسماء بوتات كثيرة ومتنوعة.
- منع تكرار أسماء حديثة في backend عبر قراءة آخر أسماء من `bot_message_logs`.
- منع تكرار نصوص بوت حديثة عبر قراءة آخر رسائل من `bot_message_logs`.
- رسائل مرتبطة بسياق المسلسل والقسم.
- رسائل رد بعد تعليق الزائر تمر من backend وتتأخر بزمن عشوائي قبل الظهور.
- توقيت رسائل ChatOverlay فيه jitter عشوائي حول polling interval.
- البوتات لا تتكلم بلغة روابط/شركاء/تفعيل.
- البوتات تلتزم بمنع أرقام وروابط عبر `message_violation` قبل التخزين.

## حدود لم يتم اختبارها بدون سيرفر
لا يمكن تأكيد الاتصال الحقيقي بـ MySQL أو تسجيل الدخول أو الضغط الفعلي في المتصفح قبل النشر على VPS، لكن الكود والـ build والـ syntax جاهزة للاختبار على السيرفر.
