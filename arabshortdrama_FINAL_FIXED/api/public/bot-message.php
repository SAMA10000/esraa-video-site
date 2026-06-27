<?php
require_once __DIR__ . '/../config/bot_engine.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

try {
    $body = request_json();
    $visitor = visitor_identity();
    require_not_banned($visitor);

    // Update bot presence before generating message
    bot_update_presence();
    $drama = bot_drama_from_payload($body);
    $drId = $drama ? (int)$drama['id'] : null;
    $userText = trim((string)($body['user_text'] ?? $body['userText'] ?? ''));
    $source = $userText !== '' ? 'bot_reply_legacy' : 'ambient_bot';

    // Public ambient generation must not flood MySQL. One ambient bot line per visitor/drama window is enough.
    if ($userText === '' && bot_recent_reply_count($visitor['visitor_id'], $drId, 'ambient_bot', 60) >= 3) {
        json_response(['success'=>true,'message'=>null,'skipped'=>'ambient_rate_limited']);
    }
    if ($userText !== '' && bot_recent_reply_count($visitor['visitor_id'], $drId, 'bot_reply_legacy', 20) >= 2) {
        json_response(['success'=>true,'message'=>null,'skipped'=>'reply_rate_limited']);
    }

    $body['drama_id'] = $drId;

    // For ambient messages (no user text), try conversation threads first
    if ($userText === '') {
        $thread = bot_get_active_thread($drama ? (int)$drama['category_id'] : null);
        if ($thread) {
            $msg = bot_create_thread_message($thread, $drama, $visitor);
            if ($msg) {
                json_response(['success'=>true,'message'=>$msg,'source'=>'thread']);
            }
        }
    }

    $msg = bot_create_contextual_message($body, $source, null, $userText !== '' ? 'reply' : 'ambient');
    json_response(['success'=>true,'message'=>$msg]);
} catch (Throwable $e) {
    safe_error('تعذر إنشاء الرسالة', 500);
}
