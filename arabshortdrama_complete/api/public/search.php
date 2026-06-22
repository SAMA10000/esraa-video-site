<?php
require_once __DIR__ . '/../config/bootstrap.php';
try {
    $q = trim((string)($_GET['q'] ?? ''));
    if ($q === '') json_response([]);
    $like = '%' . $q . '%';
    json_response(fetch_dramas("d.status='published' AND (d.title LIKE ? OR d.description LIKE ?)", [$like, $like], 'd.view_count DESC', 30));
} catch (Throwable $e) { json_response(['success'=>false,'error'=>'فشل البحث'], 500); }
