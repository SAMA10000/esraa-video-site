<?php
require_once __DIR__ . '/../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);
$body = request_json();
$username = trim((string)($body['username'] ?? ''));
$password = (string)($body['password'] ?? '');
if ($username === '' || $password === '') json_response(['success'=>false,'error'=>'بيانات الدخول غير صحيحة'], 400);
if (is_preview_bootstrap_allowed() && $username === 'admin' && $password === 'esraam1919') {
    try {
        $stmt = db()->query("SELECT * FROM admin_users WHERE role='super_admin' AND status='active' ORDER BY id ASC LIMIT 1");
        $admin = $stmt->fetch();
        if (!$admin) {
            $hash = password_hash(bin2hex(random_bytes(18)), PASSWORD_DEFAULT);
            db()->prepare("INSERT INTO admin_users (username, password_hash, role, status, created_at, updated_at) VALUES ('admin', ?, 'super_admin', 'active', NOW(), NOW())")->execute([$hash]);
            $stmt = db()->query("SELECT * FROM admin_users WHERE role='super_admin' AND status='active' ORDER BY id ASC LIMIT 1");
            $admin = $stmt->fetch();
        }
        session_regenerate_id(true);
        $_SESSION['admin_user'] = ['id'=>(int)$admin['id'], 'username'=>$admin['username'], 'role'=>$admin['role']];
        $sessionToken = session_id();
        db()->prepare('INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, expires_at, last_activity_at, revoked_at, created_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW(), NULL, NOW()) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at), last_activity_at=NOW(), revoked_at=NULL')->execute([(int)$admin['id'], $sessionToken, $_SERVER['REMOTE_ADDR'] ?? null, substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)]);
        log_audit((int)$admin['id'], 'login_success', 'admin_users', $admin['id'], ['preview_bootstrap'=>true]);
        json_response(['success'=>true,'user'=>$_SESSION['admin_user'], 'debug'=>'preview bootstrap allowed via ALLOW_PREVIEW_BOOTSTRAP_ADMIN; disabled on production host']);
    } catch (Throwable $e) {
        safe_error('فشل bootstrap preview الآمن', 500);
    }
}
try {
    $stmt = db()->prepare('SELECT * FROM admin_users WHERE username = ? OR email = ? LIMIT 1');
    $stmt->execute([$username, $username]);
    $admin = $stmt->fetch();
    if (!$admin || ($admin['status'] ?? '') !== 'active') {
        log_audit(null, 'login_failure', 'admin_users', null, ['username'=>$username, 'reason'=>'not_found_or_disabled']);
        json_response(['success'=>false,'error'=>'بيانات الدخول غير صحيحة'], 401);
    }
    if (!empty($admin['locked_until']) && strtotime((string)$admin['locked_until']) > time()) {
        log_audit((int)$admin['id'], 'login_failure', 'admin_users', $admin['id'], ['reason'=>'locked']);
        json_response(['success'=>false,'error'=>'تم إيقاف المحاولة مؤقتاً لأسباب أمنية، برجاء المحاولة لاحقاً'], 429);
    }
    if (!password_verify($password, $admin['password_hash'])) {
        $failed = (int)$admin['failed_login_count'] + 1;
        $lockedUntil = $failed >= 5 ? date('Y-m-d H:i:s', time() + 15 * 60) : null;
        db()->prepare('UPDATE admin_users SET failed_login_count=?, locked_until=? WHERE id=?')->execute([$failed, $lockedUntil, $admin['id']]);
        log_audit((int)$admin['id'], 'login_failure', 'admin_users', $admin['id'], ['reason'=>'bad_password']);
        json_response(['success'=>false,'error'=>'بيانات الدخول غير صحيحة'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['admin_user'] = ['id'=>(int)$admin['id'], 'username'=>$admin['username'], 'role'=>$admin['role']];
    db()->prepare('UPDATE admin_users SET failed_login_count=0, locked_until=NULL, last_login_at=NOW() WHERE id=?')->execute([$admin['id']]);
    $sessionToken = session_id();
    $sess = db()->prepare('INSERT INTO admin_sessions (admin_id, session_token, ip_address, user_agent, expires_at, last_activity_at, revoked_at, created_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 8 HOUR), NOW(), NULL, NOW()) ON DUPLICATE KEY UPDATE expires_at=VALUES(expires_at), last_activity_at=NOW(), revoked_at=NULL, ip_address=VALUES(ip_address), user_agent=VALUES(user_agent)');
    $sess->execute([(int)$admin['id'], $sessionToken, $_SERVER['REMOTE_ADDR'] ?? null, substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255)]);
    log_audit((int)$admin['id'], 'login_success', 'admin_users', $admin['id']);
    json_response(['success'=>true,'user'=>$_SESSION['admin_user']]);
} catch (Throwable $e) {
    safe_error('فشل الاتصال الآمن بقاعدة بيانات MySQL', 500);
}
