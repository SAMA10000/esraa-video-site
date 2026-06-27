<?php
declare(strict_types=1);
require_once __DIR__ . '/api/config/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');

// One-time setup: Create first admin if none exists
// Delete this file after use!

try {
    $stmt = db()->query("SELECT COUNT(*) as count FROM admin_users WHERE status='active'");
    $row = $stmt->fetch();
    $adminCount = (int)($row['count'] ?? 0);

    if ($adminCount > 0) {
        json_response(['success'=>false,'error'=>'Admin already exists. Delete this file immediately.']);
        exit;
    }

    $body = request_json();
    $username = trim((string)($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($username === '' || $password === '' || strlen($password) < 6) {
        json_response(['success'=>false,'error'=>'Username and password (min 6 chars) required']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    db()->prepare("INSERT INTO admin_users (username, password_hash, role, status, created_at, updated_at) VALUES (?, ?, 'super_admin', 'active', NOW(), NOW())")
        ->execute([$username, $hash]);

    json_response(['success'=>true,'message'=>'Admin created successfully. DELETE THIS FILE NOW!']);
} catch (Throwable $e) {
    json_response(['success'=>false,'error'=>'Setup failed: ' . $e->getMessage()]);
}
