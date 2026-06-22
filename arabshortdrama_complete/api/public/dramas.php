<?php
require_once __DIR__ . '/../config/bootstrap.php';
try {
    json_response(fetch_dramas("d.status='published'", [], 'd.view_count DESC'));
} catch (Throwable $e) { json_response(['success'=>false,'error'=>'فشل تحميل المسلسلات'], 500); }
