<?php
require_once __DIR__ . '/../config/bootstrap.php';
try {
    $slug = trim((string)($_GET['slug'] ?? ''));
    if ($slug === '') json_response(['drama'=>null,'sameCategory'=>[],'trending'=>[]], 400);
    $items = fetch_dramas("d.status='published' AND d.slug = ?", [$slug], 'd.created_at DESC', 1);
    $drama = $items[0] ?? null;
    if (!$drama) json_response(['drama'=>null,'sameCategory'=>[],'trending'=>[]]);
    $same = fetch_dramas("d.status='published' AND d.category_id = ? AND d.id <> ?", [$drama['category_id'], $drama['id']], 'd.view_count DESC', 10);
    $trending = fetch_dramas("d.status='published'", [], 'd.view_count DESC', 10);
    try { $st = db()->prepare('UPDATE dramas SET view_count = view_count + 1 WHERE id = ?'); $st->execute([$drama['id']]); } catch (Throwable $e) {}
    json_response(['drama'=>$drama,'sameCategory'=>$same,'trending'=>$trending]);
} catch (Throwable $e) { json_response(['success'=>false,'error'=>'فشل تحميل المسلسل'], 500); }
