<?php
require_once __DIR__ . '/../config/bootstrap.php';

// Save push subscription
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $visitor = visitor_identity();

    $endpoint = $data['endpoint'] ?? '';
    $p256dh = $data['keys']['p256dh'] ?? '';
    $auth = $data['keys']['auth'] ?? '';

    if (!$endpoint || !$p256dh || !$auth) {
        json_response(['success' => false, 'error' => 'Missing subscription data'], 400);
    }

    try {
        // Deactivate old subscriptions for this visitor
        db()->prepare("UPDATE push_subscriptions SET is_active=0 WHERE visitor_id=?")
            ->execute([$visitor['visitor_id']]);

        // Insert new subscription
        db()->prepare("INSERT INTO push_subscriptions (visitor_id, endpoint, p256dh, auth, is_active, created_at) VALUES (?, ?, ?, ?, 1, NOW())")
            ->execute([$visitor['visitor_id'], $endpoint, $p256dh, $auth]);

        json_response(['success' => true, 'message' => 'Subscription saved']);
    } catch (Throwable $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }
}

// Send push notification (admin only)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'send') {
    $admin = require_admin();

    $title = $_GET['title'] ?? 'ArabShortDrama';
    $body = $_GET['body'] ?? 'New update!';
    $url = $_GET['url'] ?? '/';

    try {
        $stmt = db()->query("SELECT * FROM push_subscriptions WHERE is_active=1");
        $subs = $stmt->fetchAll() ?: [];

        $sent = 0;
        foreach ($subs as $sub) {
            // Use web-push library here (requires composer install)
            // For now, log the notification
            db()->prepare("INSERT INTO visitor_events (visitor_id, event_type, event_data, created_at) VALUES (?, 'push_sent', ?, NOW())")
                ->execute([$sub['visitor_id'], json_encode(['title' => $title, 'body' => $body])]);
            $sent++;
        }

        json_response(['success' => true, 'sent' => $sent]);
    } catch (Throwable $e) {
        json_response(['success' => false, 'error' => $e->getMessage()], 500);
    }
}
