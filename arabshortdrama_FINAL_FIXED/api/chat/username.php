<?php
require_once __DIR__ . '/../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

$body = request_json();
$username = trim((string)($body['username'] ?? ''));
$sessionId = trim((string)($body['sessionId'] ?? $body['session_id'] ?? session_id()));
if ($sessionId === '') $sessionId = bin2hex(random_bytes(16));

if ($username === '') json_response(['success'=>false,'error'=>'اكتبي اسمك الظاهر في الدردشة أولاً.'], 400);
if (mb_strlen($username, 'UTF-8') < 2 || mb_strlen($username, 'UTF-8') > 24) json_response(['success'=>false,'error'=>'الاسم يجب أن يكون من 2 إلى 24 حرف.'], 400);
if (!preg_match('/^[\p{Arabic}a-zA-Z0-9_ ]+$/u', $username)) json_response(['success'=>false,'error'=>'الاسم يسمح بحروف عربية/إنجليزية وأرقام ومسافات وشرطة سفلية فقط.'], 400);
if (message_violation($username)) json_response(['success'=>false,'error'=>'هذا الاسم غير مناسب للدردشة.'], 400);

$normalized = normalized_name($username);
foreach (bot_reserved_names() as $bot) {
    if (normalized_name($bot) === $normalized) json_response(['success'=>false,'error'=>'هذا الاسم محجوز للبوتات، اختاري اسمًا آخر.'], 409);
}

try {
    $visitor = visitor_identity();
    require_not_banned($visitor);
    db()->prepare('DELETE FROM chat_active_usernames WHERE expires_at < NOW()')->execute();

    // Same visitor may change display name safely. Another active visitor cannot take the same active name.
    $stmt = db()->prepare('SELECT session_id, visitor_id FROM chat_active_usernames WHERE normalized_username=? AND expires_at>=NOW() AND session_id<>? AND (visitor_id IS NULL OR visitor_id<>?) LIMIT 1');
    $stmt->execute([$normalized, $sessionId, $visitor['visitor_id']]);
    if ($stmt->fetch()) {
        json_response(['success'=>false,'error'=>'عذراً يا غالي، هذا الاسم نشط حالياً في المحادثة، يرجى اختيار اسم آخر.'], 409);
    }

    db()->prepare('UPDATE chat_visitor_identities SET current_username=?, normalized_username=?, last_seen_at=NOW() WHERE visitor_id=?')->execute([$username, $normalized, $visitor['visitor_id']]);
    $up = db()->prepare('INSERT INTO chat_active_usernames (username, normalized_username, session_id, visitor_id, last_seen_at, expires_at) VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 20 MINUTE)) ON DUPLICATE KEY UPDATE username=VALUES(username), normalized_username=VALUES(normalized_username), visitor_id=VALUES(visitor_id), last_seen_at=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL 20 MINUTE)');
    $up->execute([$username, $normalized, $sessionId, $visitor['visitor_id']]);
    record_bot_memory_event(null, $visitor['visitor_id'], null, null, 'username_confirmed', 'الزائر أكد اسمه في الشات: '.$username, 35, ['session_id'=>$sessionId]);
    json_response(['success'=>true,'username'=>$username,'sessionId'=>$sessionId,'visitorId'=>$visitor['visitor_id']]);
} catch (Throwable $e) { safe_error('تعذر تأكيد الاسم من الخادم', 500); }
