<?php
require_once __DIR__ . '/../config/bootstrap.php';
$admin = raw_session_admin();
if ($admin && !empty($admin['id'])) {
    log_audit((int)$admin['id'], 'logout', 'admin_users', $admin['id']);
}
try {
    db()->prepare('UPDATE admin_sessions SET revoked_at=NOW(), expires_at=NOW() WHERE session_token=?')->execute([session_id()]);
} catch (Throwable $e) {}
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
}
session_destroy();
json_response(['success'=>true]);
