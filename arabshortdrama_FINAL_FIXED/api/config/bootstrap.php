

function bot_update_presence(): void {
    try {
        $now = new DateTime('now', new DateTimeZone('Africa/Cairo'));
        $hour = (int)$now->format('G');
        $current_time = $now->format('Y-m-d H:i:s');

        // Time-based probability modifiers (organic feel)
        $time_mod = match(true) {
            $hour >= 6 && $hour < 12 => ['day' => 0.8, 'night' => 0.1, 'evening' => 0.3, 'all' => 0.6],  // Morning
            $hour >= 12 && $hour < 17 => ['day' => 0.9, 'night' => 0.15, 'evening' => 0.5, 'all' => 0.8], // Afternoon
            $hour >= 17 && $hour < 22 => ['day' => 0.4, 'night' => 0.7, 'evening' => 0.95, 'all' => 0.9], // Evening (PEAK)
            default => ['day' => 0.1, 'night' => 0.9, 'evening' => 0.6, 'all' => 0.7], // Night
        };

        $bots = db()->query('SELECT id, display_name, activity_pattern, avg_session_minutes, entries_per_day, is_online, session_end_time, next_entry_time, personality_intensity FROM bot_profiles WHERE active=1')->fetchAll();

        foreach ($bots as $bot) {
            $pattern = (string)$bot['activity_pattern'];
            $currently_online = (int)$bot['is_online'];
            $session_end = $bot['session_end_time'];
            $next_entry = $bot['next_entry_time'];
            $avg_mins = (int)$bot['avg_session_minutes'];
            $entries = (int)$bot['entries_per_day'];

            // Determine base probability from pattern and time
            $base_prob = match($pattern) {
                'night_owl' => $time_mod['night'],
                'day_person' => $time_mod['day'],
                'evening' => $time_mod['evening'],
                'all_day' => $time_mod['all'],
                'weekend_warrior' => (date('N') >= 6) ? 0.9 : 0.3,
                'random' => random_int(30, 90) / 100,
                default => 0.5,
            };

            // If bot has a scheduled session end, check if it should leave
            if ($currently_online && $session_end && $current_time >= $session_end) {
                // 70% chance to actually leave (30% extends session - feels human)
                if (random_int(1, 100) <= 70) {
                    db()->prepare('UPDATE bot_profiles SET is_online=0, session_end_time=NULL, next_entry_time=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id=?')
                        ->execute([random_int(10, 120), (int)$bot['id']]);
                    $leave_msg = bot_get_leave_message($bot['display_name']);
                    db()->prepare("INSERT INTO chat_messages (username, message, session_id, is_bot, status, created_at) VALUES (?, ?, 'system_leave', 1, 'visible', NOW())")
                        ->execute([$bot['display_name'], $leave_msg]);
                    continue;
                } else {
                    // Extend session by 10-30 minutes
                    db()->prepare('UPDATE bot_profiles SET session_end_time=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id=?')
                        ->execute([random_int(10, 30), (int)$bot['id']]);
                }
            }

            // If bot is offline and has next_entry_time, check if it should enter
            if (!$currently_online && $next_entry && $current_time >= $next_entry) {
                // Calculate session length (avg ± 30% variance)
                $session_mins = max(10, (int)($avg_mins * (random_int(70, 130) / 100)));
                db()->prepare('UPDATE bot_profiles SET is_online=1, last_seen_at=NOW(), session_end_time=DATE_ADD(NOW(), INTERVAL ? MINUTE), next_entry_time=NULL WHERE id=?')
                    ->execute([$session_mins, (int)$bot['id']]);
                $join_msg = bot_get_join_message($bot['display_name']);
                db()->prepare("INSERT INTO chat_messages (username, message, session_id, is_bot, status, created_at) VALUES (?, ?, 'system_join', 1, 'visible', NOW())")
                    ->execute([$bot['display_name'], $join_msg]);
                continue;
            }

            // If bot is offline and NO next_entry_time, decide if it should enter now
            if (!$currently_online && !$next_entry) {
                // 20% chance per call to decide to enter (spread entries throughout day)
                if (random_int(1, 100) <= (int)($base_prob * 20)) {
                    $session_mins = max(10, (int)($avg_mins * (random_int(70, 130) / 100)));
                    db()->prepare('UPDATE bot_profiles SET is_online=1, last_seen_at=NOW(), session_end_time=DATE_ADD(NOW(), INTERVAL ? MINUTE), next_entry_time=NULL WHERE id=?')
                        ->execute([$session_mins, (int)$bot['id']]);
                    $join_msg = bot_get_join_message($bot['display_name']);
                    db()->prepare("INSERT INTO chat_messages (username, message, session_id, is_bot, status, created_at) VALUES (?, ?, 'system_join', 1, 'visible', NOW())")
                        ->execute([$bot['display_name'], $join_msg]);
                }
            }
        }
    } catch (Throwable $e) {}
}

function bot_get_join_message(string $name): string {
    $messages = [
        'يوسف_99' => ['يوسف_99 دخل — جاهز للأكشن 🔥', 'يوسف_99 ظهر — مين عايز يتكلم أكشن؟', 'يوسف_99 رجع — النهاردة فيه حلقة جديدة'],
        'ملكة_الشات' => ['ملكة_الشات دخلت — يا هلا والله 💕', 'ملكة_الشات رجعت — مين شاف الدراما الجديدة؟', 'ملكة_الشات هنا — النهاردة نتكلم رومانس'],
        'كينج_الدراما' => ['كينج_الدراما دخل — مين عايز ترشيح؟', 'كينج_الدراما ظهر — النهاردة عندي قائمة جديدة', 'كينج_الدراما رجع — جاهز للنقاش'],
        'دكتورة_نور' => ['دكتورة_نور دخلت — هدوء وسلام 🌙', 'دكتورة_نور هنا — مين محتاج نصيحة؟', 'دكتورة_نور رجعت — النهاردة نتكلم بعقل'],
        'برنس_المصري' => ['برنس_المصري دخل — النهاردة هنتكلم بجد', 'برنس_المصري ظهر — مين عايز يشوف الأكشن', 'برنس_المصري رجع — جاهز للمعارك'],
        'بنوتة_كول' => ['بنوتة_كول دخلت — يلا نتكلم 📱', 'بنوتة_كول هنا — مين شاف الترند الجديد؟', 'بنوتة_كول رجعت — النهاردة فيه كلام كتير'],
        'سوليفان_الأسطوري' => ['سوليفان_الأسطوري ظهر — الغموض بيجي 🌑', 'سوليفان_الأسطوري دخل — محدش يتوقع اللي جاي', 'سوليفان_الأسطوري هنا — فيه أسرار كتيرة'],
        'ست_الكل' => ['ست_الكل دخلت — الحكمة وصلت 👑', 'ست_الكل هنا — مين محتاج نصيحة حكيمة؟', 'ست_الكل رجعت — النهاردة نتكلم بعقل'],
        'فنان_العرب' => ['فنان_العرب دخل — النهاردة نتكلم فن 🎭', 'فنان_العرب ظهر — مين شاف الأداء التمثيلي؟', 'فنان_العرب رجع — جاهز للنقاش الفني'],
    ];
    if (isset($messages[$name])) {
        return $messages[$name][array_rand($messages[$name])];
    }
    $generic = ['دخل الشات', 'رجع — جاهز للكلام', 'ظهر — مين هنا؟', 'هنا — يلا نتكلم', 'دخل — النهاردة فيه أخبار؟'];
    return $name . ' ' . $generic[array_rand($generic)];
}

function bot_get_leave_message(string $name): string {
    $messages = [
        'يوسف_99' => ['يوسف_99 خرج — رايح أشوف حلقة أكشن', 'يوسف_99 مشي — بكرا نكمل', 'يوسف_99 خرج — أشوفكم على خير'],
        'ملكة_الشات' => ['ملكة_الشات خرجت — باي باي يا حبايب 💕', 'ملكة_الشات مشيت — ناموا بكير', 'ملكة_الشات خرجت — بكرا نتكلم'],
        'كينج_الدراما' => ['كينج_الدراما خرج — أشوفكم على خير', 'كينج_الدراما مشي — بكرا عندي ترشيحات جديدة', 'كينج_الدراما خرج — ناموا بكير'],
        'دكتورة_نور' => ['دكتورة_نور خرجت — ناموا بكير 🌙', 'دكتورة_نور مشيت — أحلام سعيدة', 'دكتورة_نور خرجت — بكرا نتكلم'],
        'برنس_المصري' => ['برنس_المصري خرج — رايح أنام بقى', 'برنس_المصري مشي — بكرا نكمل', 'برنس_المصري خرج — أشوفكم على خير'],
        'بنوتة_كول' => ['بنوتة_كول خرجت — باي باي 👋', 'بنوتة_كول مشيت — بكرا نتكلم', 'بنوتة_كول خرجت — رايح أتابع الترند'],
        'سوليفان_الأسطوري' => ['سوليفان_الأسطوري اختفى — زي ما ظهر 🌑', 'سوليفان_الأسطوري مشي — محدش يعرف ليه', 'سوليفان_الأسطوري خرج — الغموض مستمر'],
        'ست_الكل' => ['ست_الكل خرجت — الحكمة تستريح 👑', 'ست_الكل مشيت — بكرا نتكلم', 'ست_الكل خرجت — ناموا بكير'],
        'فنان_العرب' => ['فنان_العرب خرج — رايح أتفرج على فيلم 🎬', 'فنان_العرب مشي — بكرا نتكلم فن', 'فنان_العرب خرج — أشوفكم على خير'],
    ];
    if (isset($messages[$name])) {
        return $messages[$name][array_rand($messages[$name])];
    }
    $generic = ['خرج من الشات', 'مشي — بكرا نكمل', 'خرج — أشوفكم على خير', 'مشي — ناموا بكير', 'خرج — باي باي'];
    return $name . ' ' . $generic[array_rand($generic)];
}

function bot_get_online_profiles(): array {
    try {
        // Update presence first (lightweight, runs every call)
        bot_update_presence();
        $stmt = db()->prepare('SELECT * FROM bot_profiles WHERE active=1 AND is_online=1 AND is_online=1 ORDER BY last_spoke_at DESC');
        $stmt->execute();
        return $stmt->fetchAll() ?: [];
    }

function bot_simulate_crowd(): void {
    try {
        $hour = (int)date('G');
        // Fake users activity varies by time (more active in evening)
        $join_chance = match(true) {
            $hour >= 17 && $hour < 22 => 45, // Evening: high activity
            $hour >= 22 || $hour < 6 => 35,  // Night: medium-high
            $hour >= 12 && $hour < 17 => 30, // Afternoon: medium
            default => 20,                    // Morning: lower
        };

        $leave_chance = match(true) {
            $hour >= 17 && $hour < 22 => 30, // Evening: less leaving (sticky)
            $hour >= 22 || $hour < 6 => 25,  // Night: medium leaving
            $hour >= 12 && $hour < 17 => 35, // Afternoon: more leaving
            default => 40,                    // Morning: high leaving
        };

        // Fake users join with organic session lengths (5-40 min)
        if (random_int(1, 100) <= $join_chance) {
            $stmt = db()->prepare('SELECT * FROM fake_active_users WHERE is_online=0 ORDER BY RAND() LIMIT 1');
            $stmt->execute();
            $user = $stmt->fetch();
            if ($user) {
                $session_mins = random_int(5, 40);
                db()->prepare('UPDATE fake_active_users SET is_online=1, last_seen_at=NOW(), session_end_time=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id=?')
                    ->execute([$session_mins, (int)$user['id']]);
                // Only show join message 50% of the time (not every time - feels more organic)
                if (random_int(1, 100) <= 50) {
                    db()->prepare("INSERT INTO chat_messages (username, message, session_id, is_bot, status, created_at) VALUES (?, ?, 'crowd_join', 1, 'visible', NOW())")
                        ->execute([$user['username'], $user['join_message']]);
                }
            }
        }

        // Fake users leave when session ends or randomly
        $stmt = db()->prepare('SELECT * FROM fake_active_users WHERE is_online=1 AND (session_end_time < NOW() OR last_seen_at < DATE_SUB(NOW(), INTERVAL 40 MINUTE)) ORDER BY RAND() LIMIT 2');
        $stmt->execute();
        $users = $stmt->fetchAll();
        foreach ($users as $user) {
            if (random_int(1, 100) <= $leave_chance) {
                db()->prepare('UPDATE fake_active_users SET is_online=0, last_seen_at=NOW(), session_end_time=NULL WHERE id=?')
                    ->execute([(int)$user['id']]);
                // Only show leave message 30% of the time
                if (random_int(1, 100) <= 30) {
                    db()->prepare("INSERT INTO chat_messages (username, message, session_id, is_bot, status, created_at) VALUES (?, ?, 'crowd_leave', 1, 'visible', NOW())")
                        ->execute([$user['username'], $user['leave_message']]);
                }
            }
        }
    } catch (Throwable $e) {}
}

function bot_get_crowd_count(): int {
    try {
        $hour = (int)date('G');
        $bots = db()->query('SELECT COUNT(*) as c FROM bot_profiles WHERE active=1 AND is_online=1')->fetch()['c'] ?? 0;
        $fake = db()->query('SELECT COUNT(*) as c FROM fake_active_users WHERE is_online=1')->fetch()['c'] ?? 0;
        $real = db()->query('SELECT COUNT(DISTINCT visitor_id) as c FROM chat_active_usernames WHERE last_active > DATE_SUB(NOW(), INTERVAL 5 MINUTE)')->fetch()['c'] ?? 0;
        $actual = (int)$bots + (int)$fake + (int)$real;

        // Realistic time-based crowd count (feels organic, not static)
        $base_count = match(true) {
            $hour >= 6 && $hour < 12 => random_int(85, 165),   // Morning: quiet
            $hour >= 12 && $hour < 17 => random_int(160, 310),  // Afternoon: building up
            $hour >= 17 && $hour < 22 => random_int(290, 520),  // Evening: PEAK (most realistic)
            default => random_int(210, 390),                     // Night: still active but less
        };

        // Add some variance so number changes slightly every refresh
        $variance = random_int(-15, 15);
        return max(80, $base_count + $variance);
    } catch (Throwable $e) { return 200; }
}

function bot_simulate_typing(): ?array {
    try {
        // 40% chance someone is typing
        if (random_int(1, 100) > 40) return null;

        $stmt = db()->prepare('SELECT display_name FROM bot_profiles WHERE active=1 AND is_online=1 ORDER BY RAND() LIMIT 1');
        $stmt->execute();
        $bot = $stmt->fetch();
        if ($bot) {
            return ['username' => $bot['display_name'], 'duration' => random_int(2000, 5000)];
        }

        $stmt = db()->prepare('SELECT username FROM fake_active_users WHERE is_online=1 ORDER BY RAND() LIMIT 1');
        $stmt->execute();
        $user = $stmt->fetch();
        if ($user) {
            return ['username' => $user['username'], 'duration' => random_int(2000, 5000)];
        }
        return null;
    } catch (Throwable $e) { return null; }
}

 catch (Throwable $e) { return []; }
}

<?php
declare(strict_types=1);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function json_response(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function request_json(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $cfg = require __DIR__ . '/database.php';
    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', $cfg['host'], $cfg['port'], $cfg['database'], $cfg['charset']);
    $pdo = new PDO($dsn, $cfg['username'], $cfg['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function safe_error(string $publicMessage = 'حدث خطأ آمن في الخادم', int $status = 500): never {
    $id = 'err_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3));
    error_log("[$id] " . $publicMessage);
    try {
        $stmt = db()->prepare('INSERT INTO admin_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW()');
        $stmt->execute(['last_safe_backend_error', json_encode(['id'=>$id,'message'=>$publicMessage,'status'=>$status,'time'=>date('c')], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    } catch (Throwable $e) {}
    json_response(['success' => false, 'error' => $publicMessage, 'error_id' => $id], $status);
}

function is_truthy_env(string $name): bool {
    $v = strtolower(trim((string)getenv($name)));
    return in_array($v, ['1','true','yes','on'], true);
}

function is_production_host(): bool {
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    return $host === 'arabshortdrama.cloud' || str_ends_with($host, '.arabshortdrama.cloud');
}

function is_preview_bootstrap_allowed(): bool {
    if (!is_truthy_env('ALLOW_PREVIEW_BOOTSTRAP_ADMIN')) return false;
    if (is_production_host()) return false;
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    return PHP_SAPI === 'cli-server'
        || str_contains($host, 'localhost')
        || str_contains($host, '127.0.0.1')
        || str_contains($host, 'bolt')
        || str_contains($host, 'stackblitz')
        || str_contains($host, 'webcontainer');
}

function current_admin(): ?array {
    $sessionAdmin = $_SESSION['admin_user'] ?? null;
    if (!$sessionAdmin || empty($sessionAdmin['id'])) return null;
    try {
        $stmt = db()->prepare(
            "SELECT u.id, u.username, u.role, u.status, u.locked_until, s.session_token, s.expires_at, s.revoked_at
             FROM admin_sessions s
             JOIN admin_users u ON u.id = s.admin_id
             WHERE s.session_token = ? AND s.admin_id = ?
             LIMIT 1"
        );
        $stmt->execute([session_id(), (int)$sessionAdmin['id']]);
        $row = $stmt->fetch();
        if (!$row) return null;
        if (($row['status'] ?? '') !== 'active') return null;
        if (!empty($row['locked_until']) && strtotime((string)$row['locked_until']) > time()) return null;
        if (!empty($row['revoked_at'])) return null;
        if (empty($row['expires_at']) || strtotime((string)$row['expires_at']) <= time()) return null;
        db()->prepare('UPDATE admin_sessions SET last_activity_at=NOW(), expires_at=DATE_ADD(NOW(), INTERVAL 8 HOUR) WHERE session_token=?')->execute([session_id()]);
        $_SESSION['admin_user'] = [
            'id' => (int)$row['id'],
            'username' => $row['username'],
            'role' => $row['role'],
        ];
        return $_SESSION['admin_user'];
    } catch (Throwable $e) {
        return null;
    }
}

function raw_session_admin(): ?array {
    return $_SESSION['admin_user'] ?? null;
}

function require_admin(): array {
    $admin = current_admin();
    if (!$admin || empty($admin['id'])) json_response(['success' => false, 'error' => 'غير مصرح'], 401);
    return $admin;
}

function require_super_admin(): array {
    $admin = require_admin();
    if (($admin['role'] ?? '') !== 'super_admin') json_response(['success' => false, 'error' => 'هذه العملية متاحة للمدير الرئيسي فقط'], 403);
    return $admin;
}

function safe_slug(string $title): string {
    $slug = trim(mb_strtolower($title, 'UTF-8'));
    $slug = preg_replace('/\s+/u', '-', $slug);
    $slug = preg_replace('/[^\p{Arabic}a-z0-9\-]/u', '', $slug);
    $slug = trim($slug ?: 'series-' . time(), '-');
    return mb_substr($slug, 0, 120, 'UTF-8');
}

function validate_dailymotion_id(string $id): bool {
    $id = trim($id);
    if (preg_match('/<|>|script|iframe|javascript:|data:/i', $id)) return false;
    return (bool) preg_match('/^[A-Za-z0-9_-]{3,80}$/', $id);
}

function validate_safe_url(string $url): bool {
    $url = trim($url);
    if ($url === '') return true;
    if (preg_match('/<|>|script|javascript:|data:/i', $url)) return false;
    return (bool) preg_match('#^https?://#i', $url);
}

function validate_password_strength(string $password): bool {
    return strlen($password) >= 12
        && preg_match('/[A-Z]/', $password)
        && preg_match('/[a-z]/', $password)
        && preg_match('/[0-9]/', $password)
        && preg_match('/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]/', $password);
}

function log_audit(?int $adminId, string $action, ?string $entityType = null, $entityId = null, array $metadata = []): void {
    try {
        unset($metadata['password'], $metadata['password_hash'], $metadata['token'], $metadata['cookie'], $metadata['secret']);
        $stmt = db()->prepare('INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $adminId,
            $action,
            $entityType,
            $entityId === null ? null : (string)$entityId,
            $_SERVER['REMOTE_ADDR'] ?? null,
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        ]);
    } catch (Throwable $e) {}
}

function normalize_digits(string $input): string {
    return strtr($input, [
        '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
        '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
    ]);
}

function normalize_text(string $input): string {
    $s = normalize_digits($input);
    $s = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $s);
    $s = str_replace('ـ', '', $s);
    $s = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $s);
    return mb_strtolower($s, 'UTF-8');
}

function message_violation(string $message): ?string {
    $normalized = normalize_text($message);
    $compact = preg_replace('/[^A-Za-z0-9\p{Arabic}+@.]/u', '', $normalized) ?: '';
    $digits = preg_replace('/\D+/', '', $normalized) ?: '';
    if (preg_match('/01\d{9}/', $digits) || preg_match('/201\d{9}/', $digits) || preg_match('/05\d{8,}/', $digits) || preg_match('/\d{10,}/', $digits)) return 'phone_number';
    if (preg_match('/(https?:\/\/|www\.|\.com|\.net|\.org|hxxp|\[\.\]| dot |دوت)/iu', $normalized)) return 'external_link';
    if (preg_match('/(instagram|insta|tiktok|telegram|whatsapp|snapchat|facebook|واتساب|تليجرام)/iu', $compact)) return 'external_link';
    if (preg_match('/@[a-z0-9_.]{3,}/i', $normalized)) return 'social_handle';
    if (preg_match('/(كسم|احا|متناك|شرموط|زب|نيك)/iu', $compact)) return 'profanity';
    if (preg_match('/([!?؟!.,،])\1{4,}/u', $normalized)) return 'spam';
    if (mb_strlen(trim($message), 'UTF-8') > 280) return 'spam';
    return null;
}

function bot_reserved_names(): array {
    $names = [
        'أحمد المصري','كريم السلام','سلطان الغالي','يوسف حبيب','محمد السيد','عمر الفنان','خالد المعلم','فهد الكبير','ماجد الروح','راشد الحلو','سعد البرنس','ناصر القاهري','عبدالله الجن','حمد الشاطر','زياد المحظوظ','طارق الملك','بدر النجم','فاروق البطل','سمير الحب','علي الزعيم','فاطمة ست الدار','نور السهر','سارة القمر','هدى العسل','مريم الفنانة','ليلى الشرق','دينا الروح','رنا الحلوة','منى القلب','أميرة الدينا','أكمل العرب','حمزة الصقر','إسلام النمر','مصطفى الأسد','عادل الحقيقي','سيف العدل','رمضان الصايم','حسام الفارس','وليد المالك','هشام الراشد','طه الهدى','زين العابدين','كامل التام','راغب الحب','منصور النصر','نادر النادر','صلاح الدين','ياسر السلام','جمال الجمال','حازم الحازم','شريف الشريف','مجدي المجد','كمال الكمال','عزت العزة','فتحي الفتوح','رضا الراضي','حسني الحسن','جمال الدين','أنور النور','بهاء البهاء','هند الجميلة','شيماء الشمس','أسماء النجوم','إيمان الإيمان','روان الروح','دانا الدلوعة','لمياء الليل','بسمة الفرحة','زينب الزينة','آية المعجزة','وسام الوسام','هاني الهانى','جلال الجلال','دكتور أيمن','مهند المهندس','عمرو عمرو','تامر التامر','شادي الشادي','حبيب الحبيب','صلاح الصلاح','مريم البتول','ياسمين الياسمين','وردة الورد','عبير العبير','حلاوة الحلاوة','ريم الريم','غادة الغادة','نجلاء النجلاء','شيرين الشيرين','إسراء الإسراء','فادي الفادي','نديم النديم','رامي الرامي','سامي السامي','نايم النعيم','فوزي الفوزي','جمعة الجمعة','سيد السيد','عبد الرحمن','محمدين المصري','أبو خالد','أبو يوسف','أبو سلطان','أبو محمد','أبو عمر','أبو خالد الحجازي','يوسف_99','بنوتة_كول','كينج_الدراما','سوليفان_الأسطوري','برنس_المصري','دكتورة_نور','ست_الكل','ملكة_الشات','فنان_العرب','محمد','أحمد','محمود','كريم','سارة','منى','نور','مايكل','جرجس'
    ];
    try {
        $rows = db()->query('SELECT display_name FROM bot_profiles WHERE active=1')->fetchAll(PDO::FETCH_COLUMN);
        foreach ($rows ?: [] as $row) {
            $row = trim((string)$row);
            if ($row !== '') $names[] = $row;
        }
    } catch (Throwable $e) {}
    $seen = [];
    $out = [];
    foreach ($names as $name) {
        $key = normalized_name((string)$name);
        if ($key !== '' && !isset($seen[$key])) { $seen[$key] = true; $out[] = (string)$name; }
    }
    return $out;
}

function normalized_name(string $name): string {
    return preg_replace('/\s+/u', ' ', trim(normalize_text($name))) ?: '';
}

function setting_value(string $key, $default = '') {
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        try {
            $rows = db()->query('SELECT setting_key, setting_value FROM admin_settings')->fetchAll();
            foreach ($rows as $row) $cache[$row['setting_key']] = $row['setting_value'];
        } catch (Throwable $e) {}
    }
    return array_key_exists($key, $cache) ? $cache[$key] : $default;
}

function save_setting(string $key, string $value, int $adminId): void {
    $stmt = db()->prepare('INSERT INTO admin_settings (setting_key, setting_value, updated_by, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_by=VALUES(updated_by), updated_at=NOW()');
    $stmt->execute([$key, $value, $adminId]);
}

function get_setting(string $key, string $default = ''): string {
    try {
        $stmt = db()->prepare('SELECT setting_value FROM admin_settings WHERE setting_key=? LIMIT 1');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        return $row ? (string)$row['setting_value'] : $default;
    } catch (Throwable $e) { return $default; }
}

function public_bot_settings(): array {
    $brain = bot_brain_snapshot();
    return [
        'feedEnabled' => setting_value('bot_feed_enabled', '1') === '1',
        'pollingInterval' => max(5, min(60, (int)setting_value('bot_polling_interval', '10'))),
        'knowledgeBase' => (string)setting_value('bot_knowledge_base', ''),
        'targetGame' => (string)setting_value('bot_target_game', 'لعبة ببجي الجديدة'),
        'steeringWeight' => max(0, min(100, (int)setting_value('bot_steering_weight', '15'))),
        'reservedNames' => bot_reserved_names(),
        'lastUpdatedAt' => (function(){ try { $r=db()->query("SELECT MAX(updated_at) AS u FROM admin_settings WHERE setting_key LIKE 'bot_%'")->fetch(); return $r['u'] ?? null; } catch (Throwable $e) { return null; } })(),
        'timeContext' => $brain['timeContext'],
        'brain' => [
            'contextState' => $brain['contextState'],
            'profilesCount' => count($brain['profiles']),
            'memoryCount' => $brain['memoryCount'],
            'summaries' => $brain['summaries'],
        ],
    ];
}



function client_ip_value(): string {
    return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function private_hash(string $value): string {
    $salt = (string)setting_value('security_hash_salt', 'arabshortdrama_mysql_private_salt_v1');
    return hash_hmac('sha256', $value, $salt);
}


function detect_spam_behavior(array $visitor, string $message): ?string {
    try {
        $visitorId = $visitor['visitor_id'] ?? null;
        if (!$visitorId) return null;

        // Check 1: Too many messages in last minute (10 messages/minute)
        $stmt = db()->prepare("SELECT COUNT(*) as c FROM chat_messages WHERE visitor_id=? AND is_bot=0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
        $stmt->execute([$visitorId]);
        $count = (int)($stmt->fetch()['c'] ?? 0);
        if ($count >= 10) return 'rate_limit:10_per_minute';

        // Check 2: Same message repeated 5 times in last 10 minutes
        $stmt = db()->prepare("SELECT COUNT(*) as c FROM chat_messages WHERE visitor_id=? AND message=? AND is_bot=0 AND created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
        $stmt->execute([$visitorId, $message]);
        $repeatCount = (int)($stmt->fetch()['c'] ?? 0);
        if ($repeatCount >= 5) return 'repeat_message:5_times';

        // Check 3: Message too long (500+ chars)
        if (mb_strlen($message, 'UTF-8') > 500) return 'message_too_long:500_chars';

        // Check 4: Blacklisted words
        $blacklist = ['http://', 'https://', 'www.', '.com', 'انضم', 'اضغط هنا', 'فلوس', 'ربح', 'سحب', 'تواصل'];
        foreach ($blacklist as $word) {
            if (mb_stripos($message, $word) !== false) return 'blacklisted_word:' . $word;
        }

        return null; // No spam detected
    } catch (Throwable $e) { return null; }
}

function auto_ban_visitor(array $visitor, string $reason): void {
    try {
        $visitorId = $visitor['visitor_id'] ?? null;
        if (!$visitorId) return;

        // Check if already banned
        $stmt = db()->prepare("SELECT id FROM chat_bans WHERE visitor_id=? AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1");
        $stmt->execute([$visitorId]);
        if ($stmt->fetch()) return; // Already banned

        // Determine ban duration based on severity
        $duration = match(true) {
            str_contains($reason, 'rate_limit') => '+1 hour',
            str_contains($reason, 'repeat') => '+2 hours',
            str_contains($reason, 'blacklisted') => '+24 hours',
            default => '+1 hour',
        };

        db()->prepare("INSERT INTO chat_bans (visitor_id, ip_hash, username, reason, banned_by, expires_at, created_at) VALUES (?, ?, ?, 'auto_spam_filter', 0, DATE_ADD(NOW(), INTERVAL ?), NOW())")
            ->execute([$visitorId, $visitor['ip_hash'] ?? '', $visitor['username'] ?? 'unknown', $duration]);

        // Log the ban
        db()->prepare("INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, created_at) VALUES (0, 'auto_ban', 'visitor', ?, ?, NOW())")
            ->execute([$visitorId, json_encode(['reason' => $reason, 'duration' => $duration])]);
    } catch (Throwable $e) {}
}

function visitor_identity(): array {
    $cookieName = 'asd_vid';
    $visitorId = $_COOKIE[$cookieName] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $visitorId)) {
        $visitorId = bin2hex(random_bytes(16));
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        setcookie($cookieName, $visitorId, [
            'expires' => time() + 86400 * 365,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        $_COOKIE[$cookieName] = $visitorId;
    }
    $ipHash = private_hash(client_ip_value());
    $uaHash = private_hash($_SERVER['HTTP_USER_AGENT'] ?? 'unknown');
    try {
        $stmt = db()->prepare('INSERT INTO chat_visitor_identities (visitor_id, ip_hash, user_agent_hash, first_seen_at, last_seen_at) VALUES (?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE ip_hash=VALUES(ip_hash), user_agent_hash=VALUES(user_agent_hash), last_seen_at=NOW()');
        $stmt->execute([$visitorId, $ipHash, $uaHash]);
    } catch (Throwable $e) {}
    return ['visitor_id'=>$visitorId, 'ip_hash'=>$ipHash, 'user_agent_hash'=>$uaHash];
}

function chat_ban_info(array $visitor): ?array {
    try {
        $stmt = db()->prepare("SELECT * FROM chat_bans WHERE active=1 AND ((visitor_id IS NOT NULL AND visitor_id=?) OR (ip_hash IS NOT NULL AND ip_hash=?)) AND (banned_until IS NULL OR banned_until > NOW()) ORDER BY id DESC LIMIT 1");
        $stmt->execute([$visitor['visitor_id'] ?? '', $visitor['ip_hash'] ?? '']);
        $row = $stmt->fetch();
        return $row ?: null;
    } catch (Throwable $e) { return null; }
}

function require_not_banned(array $visitor): void {
    $ban = chat_ban_info($visitor);
    if ($ban) {
        $until = $ban['banned_until'] ? (' حتى ' . $ban['banned_until']) : '';
        json_response(['success'=>false,'error'=>'تم تقييد هذا الزائر من الدردشة'.$until,'reason'=>'visitor_banned'], 403);
    }
}

function bot_context_values(): array {
    $defaults = [
        'site_mood' => 'دراما، تشويق، ترشيحات ذكية، شات آمن',
        'season_override' => 'auto',
        'occasion' => '',
        'bot_directive' => 'اتكلم كزائر طبيعي متابع للمسلسل. لا تكتب روابط أو أرقام أو وعود وهمية. نوّع الكلام ولا تكرر نفسك.',
    ];
    try {
        $rows = db()->query('SELECT context_key, context_value FROM bot_context_state')->fetchAll();
        foreach ($rows as $row) $defaults[$row['context_key']] = (string)$row['context_value'];
    } catch (Throwable $e) {}
    return $defaults;
}

function bot_time_context(): array {
    $tz = new DateTimeZone('Africa/Cairo');
    $now = new DateTime('now', $tz);
    $hour = (int)$now->format('G');
    if ($hour >= 5 && $hour < 11) $daypart = 'صباح';
    elseif ($hour >= 11 && $hour < 16) $daypart = 'ظهر';
    elseif ($hour >= 16 && $hour < 20) $daypart = 'مساء';
    else $daypart = 'ليل';
    $month = (int)$now->format('n');
    if (in_array($month, [12,1,2], true)) $season = 'شتاء';
    elseif (in_array($month, [3,4,5], true)) $season = 'ربيع';
    elseif (in_array($month, [6,7,8], true)) $season = 'صيف';
    else $season = 'خريف';
    $ctx = bot_context_values();
    if (($ctx['season_override'] ?? 'auto') !== 'auto' && trim((string)$ctx['season_override']) !== '') $season = trim((string)$ctx['season_override']);
    return [
        'timezone' => 'Africa/Cairo',
        'iso' => $now->format(DateTime::ATOM),
        'hour' => $hour,
        'daypart' => $daypart,
        'season' => $season,
        'month' => $month,
        'weekday' => $now->format('l'),
        'occasion' => trim((string)($ctx['occasion'] ?? '')),
        'siteMood' => trim((string)($ctx['site_mood'] ?? '')),
        'directive' => trim((string)($ctx['bot_directive'] ?? '')),
    ];
}

function active_bot_profiles(): array {
    try {
        $rows = db()->query('SELECT * FROM bot_profiles WHERE active=1 AND is_online=1 ORDER BY last_spoke_at IS NULL DESC, activity_level DESC, RAND() LIMIT 80')->fetchAll();
        if ($rows) return $rows;
    } catch (Throwable $e) {}
    return array_map(fn($name)=>['id'=>null,'display_name'=>$name,'persona'=>'زائر متابع للدراما','speech_style'=>'عامي طبيعي','preferred_domains'=>json_encode(['general_chat','drama_content'], JSON_UNESCAPED_UNICODE),'activity_level'=>50,'memory_weight'=>50,'response_delay_min'=>7,'response_delay_max'=>22,'active'=>1], array_slice(bot_reserved_names(), 0, 20));
}

function choose_bot_profile(?array $drama = null, string $domain = 'general_chat'): array {
    $profiles = active_bot_profiles();
    $weighted = [];
    foreach ($profiles as $p) {
        $weight = max(1, (int)($p['activity_level'] ?? 50));
        $prefs = [];
        if (!empty($p['preferred_domains'])) {
            $decoded = json_decode((string)$p['preferred_domains'], true);
            if (is_array($decoded)) $prefs = $decoded;
        }
        if (in_array($domain, $prefs, true)) $weight += 35;
        if ($drama && !empty($p['preferred_category_id']) && (int)$p['preferred_category_id'] === (int)($drama['category_id'] ?? 0)) $weight += 25;
        for ($i=0; $i<min(120,$weight); $i++) $weighted[] = $p;
    }
    return $weighted ? $weighted[random_int(0, count($weighted)-1)] : $profiles[array_rand($profiles)];
}

function record_bot_memory_event(?int $botProfileId, ?string $visitorId, ?int $dramaId, ?int $categoryId, string $type, string $text, int $importance = 50, array $metadata = []): void {
    try {
        $stmt = db()->prepare('INSERT INTO bot_memory_events (bot_profile_id, visitor_id, drama_id, category_id, event_type, event_text, importance, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 45 DAY), NOW())');
        $stmt->execute([$botProfileId, $visitorId, $dramaId, $categoryId, $type, mb_substr($text,0,600,'UTF-8'), max(1,min(100,$importance)), $metadata ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null]);
    } catch (Throwable $e) {}
}

function recent_bot_memories(?int $botProfileId, ?string $visitorId, ?int $dramaId, int $limit = 8): array {
    $result = ['visitor'=>[], 'drama'=>[], 'bot'=>[], 'global'=>[]];

    // Visitor memory (40% weight): events tied to this visitor
    if ($visitorId) {
        try {
            $sql = 'SELECT id, event_type, event_text, importance, created_at FROM bot_memory_events WHERE visitor_id=? AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY importance DESC, id DESC LIMIT '.(int)$limit;
            $stmt = db()->prepare($sql);
            $stmt->execute([$visitorId]);
            $result['visitor'] = $stmt->fetchAll() ?: [];
        } catch (Throwable $e) {}
    }

    // Drama memory (30% weight): events tied to this drama, no specific visitor
    if ($dramaId) {
        try {
            $sql = 'SELECT id, event_type, event_text, importance, created_at FROM bot_memory_events WHERE drama_id=? AND visitor_id IS NULL AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY importance DESC, id DESC LIMIT '.(int)$limit;
            $stmt = db()->prepare($sql);
            $stmt->execute([$dramaId]);
            $result['drama'] = $stmt->fetchAll() ?: [];
        } catch (Throwable $e) {}
    }

    // Bot memory (20% weight): events tied to this bot profile
    if ($botProfileId) {
        try {
            $sql = 'SELECT id, event_type, event_text, importance, created_at FROM bot_memory_events WHERE bot_profile_id=? AND visitor_id IS NULL AND drama_id IS NULL AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY importance DESC, id DESC LIMIT '.(int)$limit;
            $stmt = db()->prepare($sql);
            $stmt->execute([$botProfileId]);
            $result['bot'] = $stmt->fetchAll() ?: [];
        } catch (Throwable $e) {}
    }

    // Global memory (10% weight): no visitor, no drama, no bot
    try {
        $sql = 'SELECT id, event_type, event_text, importance, created_at FROM bot_memory_events WHERE visitor_id IS NULL AND drama_id IS NULL AND bot_profile_id IS NULL AND (expires_at IS NULL OR expires_at>NOW()) ORDER BY importance DESC, id DESC LIMIT '.(int)$limit;
        $stmt = db()->prepare($sql);
        $stmt->execute([]);
        $result['global'] = $stmt->fetchAll() ?: [];
    } catch (Throwable $e) {}

    return $result;
}

function update_bot_conversation_summary(?int $dramaId, ?int $categoryId, string $newText, string $mood = 'neutral'): void {
    $key = $dramaId ? ('drama_'.$dramaId) : ($categoryId ? ('cat_'.$categoryId) : 'global');
    $snippet = mb_substr(trim($newText), 0, 160, 'UTF-8');
    try {
        $stmt = db()->prepare('INSERT INTO bot_conversation_summaries (conversation_key, drama_id, category_id, summary_text, dominant_mood, message_count, last_message_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW(), NOW()) ON DUPLICATE KEY UPDATE summary_text=CONCAT(LEFT(summary_text, 700), " | ", VALUES(summary_text)), dominant_mood=VALUES(dominant_mood), message_count=message_count+1, last_message_at=NOW(), updated_at=NOW()');
        $stmt->execute([$key, $dramaId, $categoryId, $snippet, $mood]);
    } catch (Throwable $e) {}
}

function bot_brain_snapshot(): array {
    $time = bot_time_context();
    try { $profiles = db()->query('SELECT id, display_name, persona, speech_style, activity_level, memory_weight, response_delay_min, response_delay_max, active, last_spoke_at FROM bot_profiles ORDER BY active DESC, display_name ASC')->fetchAll(); } catch (Throwable $e) { $profiles=[]; }
    try { $summaries = db()->query('SELECT conversation_key, summary_text, dominant_mood, message_count, last_message_at FROM bot_conversation_summaries ORDER BY updated_at DESC LIMIT 10')->fetchAll(); } catch (Throwable $e) { $summaries=[]; }
    try { $memoryCount = (int)(db()->query('SELECT COUNT(*) FROM bot_memory_events')->fetchColumn() ?: 0); } catch (Throwable $e) { $memoryCount=0; }
    return ['timeContext'=>$time, 'contextState'=>bot_context_values(), 'profiles'=>$profiles, 'summaries'=>$summaries, 'memoryCount'=>$memoryCount];
}

function map_drama_row(array $row): array {
    return [
        'id' => (string)$row['id'],
        'title' => $row['title'],
        'slug' => $row['slug'],
        'description' => $row['description'] ?? '',
        'thumbnail_url' => $row['thumbnail_url'] ?? '',
        'video_id' => $row['video_id'] ?? '',
        'category_id' => (string)$row['category_id'],
        'view_count' => (int)($row['view_count'] ?? 0),
        'rating' => (float)($row['rating'] ?? 0),
        'year' => (int)($row['year'] ?? date('Y')),
        'episodes_count' => (int)($row['episodes_count'] ?? 1),
        'status' => $row['status'] ?? 'published',
        'featured' => (bool)($row['featured'] ?? false),
        'sort_order' => (int)($row['sort_order'] ?? 0),
        'created_at' => $row['created_at'] ?? date('c'),
        'category' => [
            'id' => (string)($row['cat_id'] ?? $row['category_id']),
            'name' => $row['cat_name'] ?? '',
            'slug' => $row['cat_slug'] ?? '',
        ],
    ];
}

function fetch_dramas(string $where = '', array $params = [], string $order = 'd.sort_order ASC, d.view_count DESC', ?int $limit = null): array {
    $sql = 'SELECT d.*, c.id AS cat_id, c.name AS cat_name, c.slug AS cat_slug FROM dramas d LEFT JOIN categories c ON c.id = d.category_id';
    if ($where) $sql .= ' WHERE ' . $where;
    $sql .= ' ORDER BY ' . $order;
    if ($limit !== null) $sql .= ' LIMIT ' . (int)$limit;
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return array_map('map_drama_row', $stmt->fetchAll());
}
