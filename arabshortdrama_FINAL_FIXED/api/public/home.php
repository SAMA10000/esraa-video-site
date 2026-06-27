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
    $catStmt = db()->query("SELECT id, name, slug FROM categories WHERE status='active' ORDER BY sort_order ASC, name ASC");
    $categories = $catStmt->fetchAll();
    $dramas = fetch_dramas("d.status='published'", [], 'd.view_count DESC');
    $latest = fetch_dramas("d.status='published'", [], 'd.created_at DESC', 12);
    $hero = fetch_dramas("d.status='published' AND d.featured=1", [], 'd.sort_order ASC, d.view_count DESC', 3);
    if (!$hero) $hero = array_slice($dramas, 0, 3);
    json_response([
        'categories' => $categories,
        'dramas' => $dramas,
        'trending' => array_slice($dramas, 0, 12),
        'latest' => $latest,
        'hero' => $hero,
    ]);
} catch (Throwable $e) { json_response(['success'=>false,'error'=>'فشل تحميل الصفحة الرئيسية'], 500); }
