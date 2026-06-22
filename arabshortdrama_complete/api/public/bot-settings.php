<?php
require_once __DIR__ . '/../config/bootstrap.php';
try {
    $settings = public_bot_settings();
    try {
        $row = db()->query("SELECT MAX(updated_at) AS last_updated_at FROM admin_settings WHERE setting_key LIKE 'bot_%'")->fetch();
        $settings['lastUpdatedAt'] = $row['last_updated_at'] ?? null;
    } catch (Throwable $e) {}
    json_response(['success'=>true, 'data'=>$settings]);
} catch (Throwable $e) {
    safe_error('تعذر تحميل إعدادات البوتات العامة', 500);
}
