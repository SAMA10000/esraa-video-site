<?php
require_once __DIR__ . '/../config/bootstrap.php';
$visitor = visitor_identity();

// Track page view
try {
    $pageType = match(basename(__FILE__)) {
        'home.php' => 'home',
        'drama.php' => 'watch',
        'search.php' => 'search',
        default => 'other',
    };
    $dramaId = $_GET['id'] ?? $_GET['drama_id'] ?? null;
    db()->prepare("INSERT INTO visitor_page_views (visitor_id, page_url, page_type, drama_id, created_at) VALUES (?, ?, ?, ?, NOW())")
        ->execute([$visitor['visitor_id'], $_SERVER['REQUEST_URI'], $pageType, $dramaId]);
} catch (Throwable $e) {}
try {
    $q = trim((string)($_GET['q'] ?? ''));
    if ($q === '') json_response([]);
    $like = '%' . $q . '%';
    json_response(fetch_dramas("d.status='published' AND (d.title LIKE ? OR d.description LIKE ?)", [$like, $like], 'd.view_count DESC', 30));
} catch (Throwable $e) { json_response(['success'=>false,'error'=>'فشل البحث'], 500); }
