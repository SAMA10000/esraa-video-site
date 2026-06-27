<?php
require_once __DIR__ . '/../config/bootstrap.php';
try {
    $stmt = db()->query("SELECT id, name, slug FROM categories WHERE status='active' ORDER BY sort_order ASC, name ASC");
    json_response($stmt->fetchAll());
} catch (Throwable $e) { json_response(['success'=>false,'error'=>'فشل تحميل التصنيفات'], 500); }
