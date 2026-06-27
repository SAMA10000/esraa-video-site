<?php
require_once __DIR__ . '/../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);
$body = request_json();
$eventType = trim((string)($body['event_type'] ?? ''));
$allowed = ['page_open','series_open','video_start','video_complete','locker_impression','cta_click','unmute_click','chat_gate_passed'];
if (!in_array($eventType, $allowed, true)) json_response(['success'=>false,'error'=>'نوع الحدث غير مسموح'], 400);
$entityType = trim((string)($body['entity_type'] ?? '')) ?: null;
$entityId = trim((string)($body['entity_id'] ?? '')) ?: null;
$source = trim((string)($body['source'] ?? ($_GET['source'] ?? '')));
if ($source === '') {
    $ref = $_SERVER['HTTP_REFERER'] ?? '';
    $source = $ref !== '' ? 'referrer' : 'direct';
}
try {
    $stmt = db()->prepare('INSERT INTO analytics_events (event_type, entity_type, entity_id, source, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $eventType,
        $entityType,
        $entityId,
        substr($source, 0, 120),
        $_SERVER['REMOTE_ADDR'] ?? null,
        substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
    ]);
    json_response(['success'=>true]);
} catch (Throwable $e) {
    json_response(['success'=>false,'error'=>'فشل تسجيل التحليل'], 500);
}
