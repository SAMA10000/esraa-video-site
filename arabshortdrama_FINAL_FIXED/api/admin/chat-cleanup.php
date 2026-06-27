<?php
require_once __DIR__ . '/../config/bootstrap.php';
$admin = require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

$action = $_POST['action'] ?? 'clean_short';

try {
    if ($action === 'clean_short') {
        // Remove messages shorter than 10 chars (like "G", "Hi", "8")
        $stmt = db()->prepare("DELETE FROM chat_messages WHERE LENGTH(message) < 10 AND is_bot = 0");
        $stmt->execute();
        $deleted = $stmt->rowCount();

        // Remove repetitive single-character patterns
        $stmt = db()->prepare("DELETE FROM chat_messages WHERE message REGEXP '^[A-Za-z0-9\s]{1,5}$' AND is_bot = 0");
        $stmt->execute();
        $deleted += $stmt->rowCount();

        json_response(['success'=>true,'message'=>'Cleaned ' . $deleted . ' short messages']);
    }

    if ($action === 'clean_bots') {
        // Remove bot messages that are too short or repetitive
        $stmt = db()->prepare("DELETE FROM chat_messages WHERE is_bot = 1 AND (LENGTH(message) < 15 OR message REGEXP '^[A-Za-z0-9\s]{1,8}$')");
        $stmt->execute();
        $deleted = $stmt->rowCount();

        json_response(['success'=>true,'message'=>'Cleaned ' . $deleted . ' bot messages']);
    }

    if ($action === 'clean_all') {
        // Remove ALL messages (use with caution)
        $stmt = db()->query("DELETE FROM chat_messages WHERE is_bot = 0");
        $deleted = $stmt->rowCount();

        json_response(['success'=>true,'message'=>'Deleted ' . $deleted . ' user messages']);
    }
} catch (Throwable $e) {
    safe_error('Cleanup failed: ' . $e->getMessage(), 500);
}
