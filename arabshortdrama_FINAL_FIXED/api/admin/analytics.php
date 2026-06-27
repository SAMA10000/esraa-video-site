<?php
require_once __DIR__ . '/../config/bootstrap.php';
$admin = require_admin();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_response(['success'=>false,'error'=>'Method not allowed'], 405);

try {
    $period = $_GET['period'] ?? '7d';
    $dramaId = isset($_GET['drama_id']) ? (int)$_GET['drama_id'] : null;

    $dateFilter = match($period) {
        '24h' => 'created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        '7d' => 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
        '30d' => 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        default => 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
    };

    // Real visitor stats
    $totalVisitors = db()->query("SELECT COUNT(DISTINCT visitor_id) as c FROM visitor_sessions WHERE $dateFilter")->fetch()['c'] ?? 0;
    $totalSessions = db()->query("SELECT COUNT(*) as c FROM visitor_sessions WHERE $dateFilter")->fetch()['c'] ?? 0;
    $avgDuration = db()->query("SELECT AVG(total_duration) as avg FROM visitor_sessions WHERE $dateFilter")->fetch()['avg'] ?? 0;

    // Country breakdown
    $countries = db()->query("SELECT country, COUNT(DISTINCT visitor_id) as visitors FROM visitor_sessions WHERE $dateFilter GROUP BY country ORDER BY visitors DESC LIMIT 10")->fetchAll() ?: [];

    // Device breakdown
    $devices = db()->query("SELECT device_type, COUNT(*) as count FROM visitor_sessions WHERE $dateFilter GROUP BY device_type")->fetchAll() ?: [];

    // Top dramas
    $topDramas = db()->query("SELECT d.title, d.id, COUNT(*) as views FROM visitor_page_views v LEFT JOIN dramas d ON d.id=v.drama_id WHERE v.$dateFilter AND v.drama_id IS NOT NULL GROUP BY v.drama_id ORDER BY views DESC LIMIT 10")->fetchAll() ?: [];

    // Chat analytics
    $totalMessages = db()->query("SELECT COUNT(*) as c FROM chat_analytics WHERE $dateFilter")->fetch()['c'] ?? 0;
    $sentimentBreakdown = db()->query("SELECT sentiment, COUNT(*) as count FROM chat_analytics WHERE $dateFilter GROUP BY sentiment")->fetchAll() ?: [];

    // Top chatters
    $topChatters = db()->query("SELECT username, COUNT(*) as messages, AVG(message_length) as avg_length FROM chat_analytics WHERE $dateFilter GROUP BY username ORDER BY messages DESC LIMIT 10")->fetchAll() ?: [];

    // CPA tracking
    $ctaClicks = db()->query("SELECT COUNT(*) as c FROM visitor_events WHERE event_type='cta_click' AND $dateFilter")->fetch()['c'] ?? 0;
    $conversions = db()->query("SELECT COUNT(*) as c FROM visitor_events WHERE event_type='cta_click' AND event_data->>'$.converted' = '1' AND $dateFilter")->fetch()['c'] ?? 0;

    // Hourly activity
    $hourly = db()->query("SELECT HOUR(created_at) as hour, COUNT(*) as count FROM visitor_sessions WHERE $dateFilter GROUP BY HOUR(created_at) ORDER BY hour")->fetchAll() ?: [];

    json_response([
        'success' => true,
        'data' => [
            'overview' => [
                'totalVisitors' => (int)$totalVisitors,
                'totalSessions' => (int)$totalSessions,
                'avgDuration' => round((float)$avgDuration, 1),
                'totalMessages' => (int)$totalMessages,
                'ctaClicks' => (int)$ctaClicks,
                'conversions' => (int)$conversions,
            ],
            'countries' => $countries,
            'devices' => $devices,
            'topDramas' => $topDramas,
            'sentimentBreakdown' => $sentimentBreakdown,
            'topChatters' => $topChatters,
            'hourlyActivity' => $hourly,
        ]
    ]);
} catch (Throwable $e) {
    safe_error('فشل جلب التحليلات', 500);
}
