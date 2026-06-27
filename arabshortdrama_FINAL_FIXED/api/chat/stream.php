<?php
require_once __DIR__ . '/../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

try {
    $visitor = visitor_identity();
    require_not_banned($visitor);
    $dramaId = isset($_GET['drama_id']) ? (int)$_GET['drama_id'] : (isset($_GET['dramaId']) ? (int)$_GET['dramaId'] : 0);
    $dramaSlug = trim((string)($_GET['drama_slug'] ?? $_GET['dramaSlug'] ?? ''));
    if ($dramaId <= 0 && $dramaSlug !== '') {
        $s = db()->prepare('SELECT id FROM dramas WHERE slug=? LIMIT 1');
        $s->execute([$dramaSlug]);
        $dramaId = (int)($s->fetchColumn() ?: 0);
    }
        // Long Polling support
    $lastId = isset($_GET['last_id']) ? (int)$_GET['last_id'] : null;
    $longPoll = isset($_GET['long_poll']) && $_GET['long_poll'] === '1';

    if ($longPoll && $lastId) {
        $startTime = time();
        $maxWait = 25;

        while (time() - $startTime < $maxWait) {
            $params = [];
            $where = "status IN ('visible','reviewed') AND id > ?";
            $params[] = $lastId;
            if ($dramaId > 0) { $where .= ' AND (drama_id=? OR drama_id IS NULL)'; $params[] = $dramaId; }
            $sql = "SELECT id, username, message, session_id, visitor_id, drama_id, category_id, reply_to_message_id, bot_profile_id, is_bot, status, created_at FROM chat_messages WHERE $where ORDER BY id ASC LIMIT " . (int)$limit;
            $stmt = db()->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll() ?: [];

            if (!empty($rows)) {
                $messages = [];
                foreach ($rows as $r) {
                    $messages[] = [
                        'id' => (string)$r['id'],
                        'dbId' => (int)$r['id'],
                        'username' => (string)$r['username'],
                        'text' => (string)$r['message'],
                        'sessionId' => (string)$r['session_id'],
                        'visitorId' => (string)$r['visitor_id'],
                        'dramaId' => $r['drama_id'] ? (int)$r['drama_id'] : null,
                        'categoryId' => $r['category_id'] ? (int)$r['category_id'] : null,
                        'replyToMessageId' => $r['reply_to_message_id'] ? (int)$r['reply_to_message_id'] : null,
                        'botProfileId' => $r['bot_profile_id'] ? (int)$r['bot_profile_id'] : null,
                        'isBot' => (bool)$r['is_bot'],
                        'status' => (string)$r['status'],
                        'created_at' => $r['created_at'],
                    ];
                }
                json_response(['success' => true, 'messages' => $messages, 'source' => 'long_poll']);
                exit;
            }

            sleep(1);
        }

        json_response(['success' => true, 'messages' => [], 'source' => 'long_poll_timeout']);
        exit;
    }

$limit = max(5, min(80, (int)($_GET['limit'] ?? 40)));
    $params = [];
    $where = "status IN ('visible','reviewed')";
    if ($dramaId > 0) { $where .= ' AND (drama_id=? OR drama_id IS NULL)'; $params[] = $dramaId; }
    $sql = "SELECT id, username, message, session_id, visitor_id, drama_id, category_id, reply_to_message_id, bot_profile_id, status, is_bot, created_at
            FROM chat_messages
            WHERE $where
            ORDER BY id ASC LIMIT $limit";
    $st = db()->prepare($sql);
    $st->execute($params);
    $rows = array_reverse($st->fetchAll() ?: []);
    $messages = array_map(function($r) use ($visitor) {
        return [
            'id' => 'chat-' . (int)$r['id'],
            'dbId' => (int)$r['id'],
            'username' => (string)$r['username'],
            'text' => (string)$r['message'],
            'isBot' => (int)$r['is_bot'] === 1,
            'isMine' => !empty($r['visitor_id']) && $r['visitor_id'] === ($visitor['visitor_id'] ?? ''),
            'replyToMessageId' => $r['reply_to_message_id'] ? (int)$r['reply_to_message_id'] : null,
            'dramaId' => $r['drama_id'] ? (int)$r['drama_id'] : null,
            'status' => (string)$r['status'],
            'timestamp' => strtotime((string)$r['created_at']) ? strtotime((string)$r['created_at']) * 1000 : round(microtime(true)*1000),
            'created_at' => (string)$r['created_at'],
        ];
    }, $rows);
    // Simulate crowd activity
    bot_simulate_crowd();

    // Get crowd count (inflated for display)
    $crowdCount = bot_get_crowd_count();

    // Simulate typing indicator
    $typing = bot_simulate_typing();

    json_response([
        'success'=>true,
        'messages'=>$messages,
        'visitorId'=>$visitor['visitor_id'],
        'crowd_count'=>$crowdCount,
        'typing'=>$typing,
    ]);
} catch (Throwable $e) {
    safe_error('تعذر تحميل رسائل الشات', 500);
}
