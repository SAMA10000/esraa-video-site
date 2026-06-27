# BOT CHAT CORE ADVANCED REPLY MYSQL

تم تحويل البوت من طبقة متقدمة مقطعة إلى مسار واحد متماسك:

visitor identity -> username confirmation -> unified chat stream -> visitor message saved -> contextual bot reply saved -> optional bot-to-bot reply saved -> both ChatOverlay and ChatInputSheet read the same MySQL stream.

## الملفات الأساسية
- api/config/bot_engine.php
- api/chat/stream.php
- api/chat/message.php
- api/chat/bot-reply.php
- api/public/bot-message.php
- src/lib/chatEngine.ts
- src/components/ChatOverlay.tsx
- src/components/ChatInputSheet.tsx
- src/pages/WatchPage.tsx

## إصلاحات المنطق
- لم يعد ChatOverlay يولد 5 رسائل بوت عند فتح الصفحة.
- لم يعد ChatInputSheet عالم منفصل؛ يقرأ نفس chat_messages.
- رد البوت على الزائر يتم من backend ويحفظ في MySQL.
- يوجد رد بوت على بوت آخر بنسبة محدودة حتى يظهر الشات حي بدون إزعاج.
- البان مربوط بـ visitor_id و ip_hash وليس الاسم فقط.
- أسماء bot_profiles محجوزة تلقائيًا في username.php عبر bot_reserved_names().
- الذاكرة أصبحت scoped بدل OR مفتوح يخلط السياقات.
- bot_directive يستخدم كسلوك ناعم أثناء توليد الردود.
- /api/public/bot-message.php عليه rate limit للأمبينت.

## ملاحظة صدق
الفحص المحلي يثبت build/syntax فقط. الاختبار العملي النهائي يحتاج نشر السكريبت على VPS وقراءة نتائج smoke tests.
