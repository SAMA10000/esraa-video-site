<?php
require_once __DIR__ . '/../config/bot_engine.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

try {
    $body = request_json();
    $visitor = visitor_identity();
    require_not_banned($visitor);

    // Update bot presence before generating replies
    bot_update_presence();
    $drama = bot_drama_from_payload($body);
    $drId = $drama ? (int)$drama['id'] : null;
    $userText = trim((string)($body['user_text'] ?? $body['userText'] ?? ''));
    $replyTo = isset($body['reply_to_message_id']) ? (int)$body['reply_to_message_id'] : (isset($body['replyToMessageId']) ? (int)$body['replyToMessageId'] : null);
    if ($userText === '') json_response(['success'=>false,'error'=>'لا توجد رسالة للرد عليها'], 400);
    if (message_violation($userText)) json_response(['success'=>false,'error'=>'لا يمكن إنشاء رد على رسالة مخالفة','reason'=>'unsafe_user_text'], 400);

    // Direct replies should feel responsive but still protected from loops/spam.
    if (bot_recent_reply_count($visitor['visitor_id'], $drId, 'bot_direct_reply', 18) >= 2) {
        json_response(['success'=>true,'messages'=>[],'skipped'=>'direct_reply_rate_limited']);
    }

    // Silence mode: 10% chance the bot does not reply at all (feels more human/natural)
    if (random_int(1, 100) <= 10) {  // 10% silence
        json_response(['success'=>true,'messages'=>[],'skipped'=>'silence_mode']);
    }

    $body['drama_id'] = $drId;
    $first = bot_create_contextual_message($body, 'bot_direct_reply', $replyTo, 'reply');
    $messages = [];
    if ($first) $messages[] = $first;

    // Bot-to-bot: not every time. It makes the room feel alive without stealing focus from the visitor.
    $shouldSecond = $first && random_int(1,100) <= 20;  // 20% bot-to-bot
    if ($shouldSecond && bot_recent_reply_count($visitor['visitor_id'], $drId, 'bot_to_bot_reply', 50) < 1) {
        $body['user_text'] = $first['text'] ?? $userText;
        $second = bot_create_contextual_message($body, 'bot_to_bot_reply', isset($first['dbId']) ? (int)$first['dbId'] : null, 'bot_to_bot', $first['username'] ?? '');
        if ($second) {
            $second['humanDelay'] = max((int)($first['humanDelay'] ?? 4) + random_int(4, 9), (int)($second['humanDelay'] ?? 6));
            $messages[] = $second;
        }
    }

    json_response(['success'=>true,'messages'=>$messages]);
} catch (Throwable $e) {
    safe_error('تعذر إنشاء الرد', 500);
}
