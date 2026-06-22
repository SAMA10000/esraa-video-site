<?php
require_once __DIR__ . '/../config/bootstrap.php';
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
