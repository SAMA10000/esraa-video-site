<?php
require_once __DIR__ . '/../config/bootstrap.php';

// Track CTA click
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $visitor = visitor_identity();

    try {
        db()->prepare("INSERT INTO cta_tracking (visitor_id, cta_type, cta_location, drama_id, clicked_at) VALUES (?, ?, ?, ?, NOW())")
            ->execute([
                $visitor['visitor_id'],
                $data['cta_type'] ?? 'other',
                $data['cta_location'] ?? 'unknown',
                $data['drama_id'] ?? null
            ]);

        // Also track as visitor event
        db()->prepare("INSERT INTO visitor_events (visitor_id, event_type, event_data, drama_id, created_at) VALUES (?, 'cta_click', ?, ?, NOW())")
            ->execute([
                $visitor['visitor_id'],
                json_encode(['cta_type' => $data['cta_type'] ?? 'other', 'location' => $data['cta_location'] ?? 'unknown']),
                $data['drama_id'] ?? null
            ]);

        json_response(['success' => true]);
    } catch (Throwable $e) {
        json_response(['success' => false, 'error' => $e->getMessage()]);
    }
}

// Get CTA stats (admin only)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $admin = require_admin();
    $period = $_GET['period'] ?? '7d';

    $dateFilter = match($period) {
        '24h' => 'clicked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        '7d' => 'clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        '30d' => 'clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        default => 'clicked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    };

    try {
        $totalClicks = db()->query("SELECT COUNT(*) as c FROM cta_tracking WHERE $dateFilter")->fetch()['c'] ?? 0;
        $totalConversions = db()->query("SELECT COUNT(*) as c FROM cta_tracking WHERE converted=1 AND $dateFilter")->fetch()['c'] ?? 0;
        $conversionRate = $totalClicks > 0 ? round(($totalConversions / $totalClicks) * 100, 2) : 0;

        $byType = db()->query("SELECT cta_type, COUNT(*) as clicks, SUM(converted) as conversions FROM cta_tracking WHERE $dateFilter GROUP BY cta_type")->fetchAll() ?: [];
        $byLocation = db()->query("SELECT cta_location, COUNT(*) as clicks FROM cta_tracking WHERE $dateFilter GROUP BY cta_location ORDER BY clicks DESC LIMIT 10")->fetchAll() ?: [];
        $hourly = db()->query("SELECT HOUR(clicked_at) as hour, COUNT(*) as clicks FROM cta_tracking WHERE $dateFilter GROUP BY HOUR(clicked_at) ORDER BY hour")->fetchAll() ?: [];

        json_response([
            'success' => true,
            'data' => [
                'overview' => [
                    'totalClicks' => (int)$totalClicks,
                    'totalConversions' => (int)$totalConversions,
                    'conversionRate' => $conversionRate,
                ],
                'byType' => $byType,
                'byLocation' => $byLocation,
                'hourly' => $hourly,
            ]
        ]);
    } catch (Throwable $e) {
        json_response(['success' => false, 'error' => $e->getMessage()]);
    }
}
