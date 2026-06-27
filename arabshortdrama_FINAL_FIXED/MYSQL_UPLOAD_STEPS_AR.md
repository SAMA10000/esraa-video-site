# خطوات الرفع على السيرفر

## 1) جهزي قاعدة البيانات
- افتحي MySQL من لوحة السيرفر.
- أنشئي قاعدة باسم مثل: `arabshortdrama`.
- نفذي SQL من:
  - `database/schema_mysql.sql`
  - `database/seed_mysql.sql`

## 2) عدلي اتصال قاعدة البيانات
افتحي:
`api/config/database.php`

وعدلي:
- host
- database
- username
- password

## 3) ارفعي ملفات الموقع
ارفعي محتوى `dist/` إلى public_html أو فولدر الموقع.
ارفعي فولدر `api/` بجانب `index.html`.
ارفعي `.htaccess` بجانب `index.html`.

الشكل النهائي يكون تقريباً:

```text
public_html/
  index.html
  assets/
  api/
    admin/
    chat/
    public/
    config/
  .htaccess
```

## 4) افتحي الموقع
- الصفحة الرئيسية: `/`
- دخول الأدمن: `/esraa`
- لوحة الأدمن: `/esraa/dashboard`

## 5) اختبار سريع
- افتحي `/api/public/home.php` لازم يرجع JSON.
- افتحي `/esraa` وسجلي دخول بـ admin / esraam1919.
- غيري الباسورد فوراً.
