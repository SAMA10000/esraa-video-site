<?php
require_once __DIR__ . '/../config/bootstrap.php';

// CPA Postback endpoint - receives conversions from CPA networks
// Supports: PropellerAds, Adsterra, Push.House, and generic postbacks

$clickId = $_GET['clickid'] ?? $_GET['subid'] ?? $_GET['sub_id'] ?? $_GET['visitor_id'] ?? $_GET['cid'] ?? null;
$payout = $_GET['payout'] ?? $_GET['amount'] ?? $_GET['cost'] ?? $_GET['revenue'] ?? 0;
$status = $_GET['status'] ?? 'approved';
$campaignId = $_GET['campaign_id'] ?? $_GET['camp'] ?? null;

if (!$clickId) {
    json_response(['success' => false, 'error' => 'Missing click ID'], 400);
}

if ($status === 'rejected' || $status === 'hold') {
    json_response(['success' => true, 'message' => 'Conversion not counted (status: ' . $status . ')']);
}

try {
    // Find the click
    $stmt = db()->prepare('SELECT * FROM cpa_clicks WHERE click_id = ? LIMIT 1');
    $stmt->execute([$clickId]);
    $click = $stmt->fetch();

    if (!$click) {
        // Log unknown conversion
        db()->prepare("INSERT INTO visitor_events (visitor_id, event_type, event_data, created_at) VALUES (?, 'cpa_conversion_unknown', ?, NOW())")
            ->execute([null, json_encode(['click_id' => $clickId, 'payout' => $payout, 'source' => 'postback'])]);
        json_response(['success' => false, 'error' => 'Click not found'], 404);
    }

    // Update click as converted
    db()->prepare('UPDATE cpa_clicks SET converted = 1, conversion_value = ?, converted_at = NOW() WHERE id = ?')
        ->execute([$payout, $click['id']]);

    // Update campaign stats
    if ($click['campaign_id']) {
        db()->prepare('UPDATE cpa_campaigns SET conversions = conversions + 1, revenue = revenue + ? WHERE id = ?')
            ->execute([$payout, $click['campaign_id']]);
    }

    // Update CTA tracking if linked
    db()->prepare("UPDATE cta_tracking SET converted = 1, conversion_source = 'cpa_postback' WHERE visitor_id = ? AND converted = 0 ORDER BY clicked_at DESC LIMIT 1")
        ->execute([$click['visitor_id']]);

    // Log conversion
    db()->prepare("INSERT INTO visitor_events (visitor_id, event_type, event_data, created_at) VALUES (?, 'cpa_conversion', ?, NOW())")
        ->execute([$click['visitor_id'], json_encode(['click_id' => $clickId, 'payout' => $payout, 'campaign_id' => $click['campaign_id']])]);

    json_response(['success' => true, 'message' => 'Conversion recorded']);
} catch (Throwable $e) {
    json_response(['success' => false, 'error' => $e->getMessage()], 500);
}
