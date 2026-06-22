<?php
require_once __DIR__ . '/../config/bot_engine.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

$body = request_json();
$username = trim((string)($body['username'] ?? ''));
$message = trim((string)($body['message'] ?? ''));
$sessionId = trim((string)($body['sessionId'] ?? $body['session_id'] ?? session_id()));
if ($username === '' || $message === '' || $sessionId === '') json_response(['success'=>false,'error'=>'بيانات الدردشة غير مكتملة'], 400);

$violation = message_violation($message);
if ($violation) json_response(['success'=>false,'error'=>'⚠️ لا يمكن إرسال هذه الرسالة لأنها تحتوي على رقم هاتف أو رابط أو محتوى مخالف. من فضلك عدّل الرسالة قبل الإرسال.','reason'=>$violation], 400);

try {
    $visitor = visitor_identity();
    require_not_banned($visitor);
    $drama = bot_drama_from_payload($body);
    $drId = $drama ? (int)$drama['id'] : null;
    $catId = $drama ? (int)$drama['category_id'] : null;
    db()->prepare('DELETE FROM chat_active_usernames WHERE expires_at < NOW()')->execute();
    $normalized = normalized_name($username);
    $stmt = db()->prepare('SELECT id FROM chat_active_usernames WHERE normalized_username=? AND session_id=? AND visitor_id=? AND expires_at>=NOW() LIMIT 1');
    $stmt->execute([$normalized, $sessionId, $visitor['visitor_id']]);
    if (!$stmt->fetch()) json_response(['success'=>false,'error'=>'يجب تأكيد اسمك قبل إرسال أي تعليق.'], 401);

    $cooldown = max(0, min(3600, (int)setting_value('chat_cooldown_seconds', '12')));
    $rate = max(1, min(60, (int)setting_value('chat_rate_limit_per_minute', '6')));
    $recent = db()->prepare('SELECT message, created_at FROM chat_messages WHERE visitor_id=? AND is_bot=0 ORDER BY id DESC LIMIT 20');
    $recent->execute([$visitor['visitor_id']]);
    $rows = $recent->fetchAll();
    $now = time();
    if ($rows) {
        $lastAt = strtotime((string)$rows[0]['created_at']);
        if ($cooldown > 0 && $lastAt && ($now - $lastAt) < $cooldown) {
            json_response(['success'=>false,'error'=>'برجاء الانتظار قليلاً قبل إرسال رسالة جديدة.','reason'=>'cooldown'], 429);
        }
        foreach ($rows as $r) {
            if (normalized_name((string)$r['message']) === normalized_name($message) && (time() - strtotime((string)$r['created_at'])) < 600) {
                json_response(['success'=>false,'error'=>'تم منع الرسالة لأنها مكررة. اكتبي تعليقاً مختلفاً.','reason'=>'duplicate'], 429);
            }
        }
    }
    $rateStmt = db()->prepare('SELECT COUNT(*) AS c FROM chat_messages WHERE visitor_id=? AND is_bot=0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)');
    $rateStmt->execute([$visitor['visitor_id']]);
    if ((int)($rateStmt->fetch()['c'] ?? 0) >= $rate) json_response(['success'=>false,'error'=>'تم تقييد الإرسال مؤقتاً بسبب كثرة الرسائل.','reason'=>'rate_limit'], 429);

    db()->prepare('UPDATE chat_active_usernames SET last_seen_at=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL 20 MINUTE) WHERE session_id=? AND visitor_id=?')->execute([$sessionId, $visitor['visitor_id']]);
    db()->prepare('UPDATE chat_visitor_identities SET current_username=?, normalized_username=?, last_seen_at=NOW() WHERE visitor_id=?')->execute([$username, $normalized, $visitor['visitor_id']]);
    $ins = db()->prepare('INSERT INTO chat_messages (username, message, session_id, visitor_id, drama_id, category_id, status, is_bot, created_at) VALUES (?, ?, ?, ?, ?, ?, "visible", 0, NOW())');
    $ins->execute([$username, $message, $sessionId, $visitor['visitor_id'], $drId, $catId]);
    $id = (int)db()->lastInsertId();
    record_bot_memory_event(null, $visitor['visitor_id'], $drId, $catId, 'visitor_message', $username.': '.$message, 55, ['session_id'=>$sessionId]);
        update_bot_conversation_summary($drId, $catId, $message, 'visitor_chat');

    // Detect unknown slang terms for admin review
    bot_detect_unknown_terms($message, $visitor['visitor_id'] ?? null, $id);
    json_response(['success'=>true,'message'=>[
        'id'=>'chat-'.$id,
        'dbId'=>$id,
        'username'=>$username,
        'text'=>$message,
        'isBot'=>false,
        'isMine'=>true,
        'dramaId'=>$drId,
        'timestamp'=>round(microtime(true)*1000),
        'created_at'=>date('c'),
    ]]);
} catch (Throwable $e) { safe_error('تعذر فحص الرسالة من الباك إند حالياً. لم يتم نشر الرسالة.', 500); }
