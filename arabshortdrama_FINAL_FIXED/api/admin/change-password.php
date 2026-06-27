<?php
require_once __DIR__ . '/../config/bootstrap.php';
$admin = require_admin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);
$body = request_json();
$current = (string)($body['currentPassword'] ?? '');
$newUsername = trim((string)($body['newUsername'] ?? ''));
$new = (string)($body['newPassword'] ?? '');
$confirm = (string)($body['confirmPassword'] ?? '');
if ($current === '') json_response(['success'=>false,'error'=>'كلمة المرور الحالية مطلوبة'], 400);
if ($new !== $confirm) json_response(['success'=>false,'error'=>'كلمتا المرور غير متطابقتين'], 400);
if (!validate_password_strength($new)) json_response(['success'=>false,'error'=>'كلمة المرور يجب أن تكون 12 حرف وحرف كبير وصغير ورقم ورمز'], 400);
if ($newUsername !== '' && !preg_match('/^[a-zA-Z0-9_]{3,40}$/', $newUsername)) json_response(['success'=>false,'error'=>'اسم المستخدم الجديد غير صالح'], 400);
try {
    $stmt = db()->prepare('SELECT * FROM admin_users WHERE id=? LIMIT 1');
    $stmt->execute([$admin['id']]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($current, $row['password_hash'])) json_response(['success'=>false,'error'=>'كلمة المرور الحالية غير صحيحة'], 401);
    if ($newUsername !== '') {
        $check = db()->prepare('SELECT id FROM admin_users WHERE username=? AND id<>? LIMIT 1');
        $check->execute([$newUsername, $admin['id']]);
        if ($check->fetch()) json_response(['success'=>false,'error'=>'اسم المستخدم مستخدم بالفعل'], 409);
    }
    $hash = password_hash($new, PASSWORD_DEFAULT);
    if ($newUsername !== '') db()->prepare('UPDATE admin_users SET username=?, password_hash=?, updated_at=NOW() WHERE id=?')->execute([$newUsername, $hash, $admin['id']]);
    else db()->prepare('UPDATE admin_users SET password_hash=?, updated_at=NOW() WHERE id=?')->execute([$hash, $admin['id']]);
    db()->prepare('UPDATE admin_sessions SET revoked_at=NOW(), expires_at=NOW() WHERE admin_id=?')->execute([$admin['id']]);
    log_audit((int)$admin['id'], 'password_change', 'admin_users', $admin['id'], ['username_changed'=>$newUsername !== '']);
    $_SESSION = [];
    session_destroy();
    json_response(['success'=>true]);
} catch (Throwable $e) { safe_error('فشل تغيير بيانات الدخول الحساسة', 500); }
