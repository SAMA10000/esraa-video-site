# تنصيب سريع MySQL بدون phpMyAdmin

تمت إضافة ملف:

```text
install.php
```

الاستخدام:

1. ارفعي محتوى المشروع على السيرفر.
2. افتحي:

```text
https://your-domain.com/install.php
```

3. اكتبي بيانات MySQL:
   - DB Host
   - DB Name
   - DB User
   - DB Password
4. اكتبي أدمن جديد قوي.
5. اضغطي زر التنصيب.
6. بعد النجاح افتحي:

```text
/esraa
```

7. احذفي `install.php` فوراً من السيرفر.

## مهم

هذا ليس pgLoader. pgLoader ليس مناسباً لتشغيل موقع MySQL بضغطة زر. هذا Installer خاص بالمشروع يقوم بإنشاء الجداول والتصنيفات والأدمن ويحفظ إعدادات الاتصال.
