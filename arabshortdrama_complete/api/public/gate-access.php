<?php
require_once __DIR__ . '/../config/bootstrap.php';

function viewer_id(): string {
    $cookieName = 'asd_viewer_id';
    $id = $_COOKIE[$cookieName] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $id)) {
        $id = bin2hex(random_bytes(16));
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        setcookie($cookieName, $id, [
            'expires' => time() + 60*60*24*365,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
    return $id;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $body = $method === 'POST' ? request_json() : [];
    $action = (string)($_GET['action'] ?? $body['action'] ?? 'status');
    $slug = trim((string)($_GET['slug'] ?? $body['slug'] ?? ''));
    if ($slug === '') json_response(['success'=>false,'error'=>'slug مطلوب'], 400);

    $stmt = db()->prepare('SELECT id, slug FROM dramas WHERE slug=? LIMIT 1');
    $stmt->execute([$slug]);
    $drama = $stmt->fetch();
    if (!$drama) json_response(['success'=>false,'error'=>'المسلسل غير موجود'], 404);

    $viewer = viewer_id();
    $dramaId = (int)$drama['id'];

    if ($action === 'complete') {
        $up = db()->prepare('INSERT INTO viewer_series_access (viewer_id, drama_id, visit_count, first_seen_at, last_seen_at) VALUES (?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE visit_count=visit_count+1, last_seen_at=NOW()');
        $up->execute([$viewer, $dramaId]);
        json_response(['success'=>true,'isFreeEpisode'=>false,'source'=>'mysql_cookie']);
    }

    $s = db()->prepare('SELECT visit_count FROM viewer_series_access WHERE viewer_id=? AND drama_id=? LIMIT 1');
    $s->execute([$viewer, $dramaId]);
    $row = $s->fetch();
    $visits = (int)($row['visit_count'] ?? 0);
    json_response(['success'=>true,'isFreeEpisode'=>$visits === 0,'visitCount'=>$visits,'source'=>'mysql_cookie']);
} catch (Throwable $e) {
    safe_error('تعذر فحص حالة المشاهدة المجانية من MySQL', 500);
}
