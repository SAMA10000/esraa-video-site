<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';

function normalize_text(string $text): string {
    return (string) preg_replace('/\s+/u', ' ', trim($text));
}

function bot_context_values(): array {
    try {
        $stmt = db()->query('SELECT setting_key, setting_value FROM bot_settings WHERE setting_key IN ("bot_directive","season_override","mood_override","feed_enabled","polling_interval") LIMIT 10');
        $rows = $stmt->fetchAll() ?: [];
        $out = [];
        foreach ($rows as $r) { $out[$r['setting_key']] = $r['setting_value']; }
        return $out;
    } catch (Throwable $e) { return []; }
}

function bot_time_context(): array {
    $tz = new DateTimeZone('Africa/Cairo');
    $now = new DateTime('now', $tz);
    $h = (int)$now->format('G');
    $period = match(true) {
        $h >= 5 && $h < 12 => 'صباح',
        $h >= 12 && $h < 17 => 'ظهر',
        $h >= 17 && $h < 21 => 'مساء',
        default => 'ليل',
    };
    $season = match((int)$now->format('n')) {
        12, 1, 2 => 'شتاء',
        3, 4, 5 => 'ربيع',
        6, 7, 8 => 'صيف',
        default => 'خريف',
    };
    $ctx = bot_context_values();
    $season = (string)($ctx['season_override'] ?? $season);
    return ['hour'=>$h, 'period'=>$period, 'season'=>$season, 'day_name'=>$now->format('l'), 'date'=>$now->format('Y-m-d')];
}

function bot_domain_from_text(string $text, int $steering = 15): string {
    $n = normalize_text($text);
    $ctx = bot_context_values();
    $directive = trim((string)($ctx['bot_directive'] ?? ''));

    if ($directive !== '') {
        if (preg_match('/ترشيح|رشح|اقترح|اكشن|رومانسي|خيانة|غموض|صعود|انتقام/u', $directive)) {
            if (preg_match('/(رشح|ترشيح|اقترح|عايز|عايزه|عاوز|حاجة|انتقام|رومانسي|خيانة|اكشن|غموض|صعود)/u', $n)) return 'drama_content';
        }
    }

    if ($text !== '') {
        if (preg_match('/(فين|باقي|الباقي|حلقة|الحلقة|الحلقات|كامل|ناقص|افتح|يتفتح|اشوف|شاهد)/u', $n)) return 'episode_links';
        if (preg_match('/(رشح|اقترح|عايز|عايزه|عاوز|حاجة|انتقام|رومانسي|خيانة|اكشن|غموض|صعود)/u', $n)) return 'drama_content';
        if (preg_match('/(جامد|حلو|تحفة|رهيب|عجبني|حماس|قوي|طرش|نار|فشخ|عظمة|خامة)/u', $n)) return 'drama_content';
        if (preg_match('/(وحش|ممل|مش عاجب|مش شغال|بايظ|غلط|زفت|خرا|تافه)/u', $n)) return 'drama_content';
        if (preg_match('/(حد هنا|موجود|مين|الو|هاي|سلام|صباح|مساء|ليل|نهار)/u', $n)) return 'general_chat';
        if (preg_match('/(امان|أمان|نصب|حقيقي|شغال|رقم|لينك|رابط|واتساب|تليجرام|انستا|تيك)/u', $n)) return 'trust_security';
        if (preg_match('/(لعبة|جيم|تطبيق|موبايل|تلفون)/u', $n)) return random_int(1,100) <= max(8, min(22,$steering)) ? 'games_apps' : 'general_chat';
        return 'general_chat';
    }
    $roll = random_int(1,100);
    if ($roll <= max(0, min(18, $steering))) return 'games_apps';
    $domains = ['general_chat','drama_content','drama_content','episode_links','trust_security','general_chat'];
    return $domains[array_rand($domains)];
}

function bot_fetch_reply_templates(string $domain, string $sentiment = 'neutral', ?string $dialect = null, int $limit = 12): array {
    try {
        $params = [$domain, $sentiment, 'general'];
        $dialectFilter = '';
        if ($dialect && $dialect !== 'general') {
            $dialectFilter = ' OR dialect=?';
            $params[] = $dialect;
        }
        $sql = "SELECT id, template FROM reply_templates 
                WHERE domain=? AND sentiment=? AND is_active=1 AND (dialect=? $dialectFilter)
                ORDER BY use_count ASC, id DESC 
                LIMIT " . (int)$limit;
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll() ?: [];
        if (!empty($rows)) {
            $ids = array_map(fn($r) => (int)($r['id'] ?? 0), $rows);
            $ids = array_filter($ids);
            if (!empty($ids)) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                db()->prepare("UPDATE reply_templates SET use_count = use_count + 1 WHERE id IN ($in)")->execute($ids);
            }
            return array_map(fn($r) => $r['template'], $rows);
        }
    } catch (Throwable $e) {}
    return [];
}

function bot_dialect_phrases(string $dialect): array {
    return match($dialect) {
        'egyptian' => ['يا عم', 'جدع', 'فشخ', 'مش هينفع', 'واللهي', 'بجد', 'يعني', 'كده', 'أصل', 'يا نهار'],
        'gulf' => ['يا بعد حيي', 'الله يخليك', 'صافي', 'يالله', 'هلا', 'والله', 'يا حبيبي', 'طيب', 'هلا والله'],
        'sham' => ['يا عمري', 'والله يا', 'صحيح', 'مظبوط', 'يلا', 'شو', 'كتير', 'حلو', 'يا حياتي'],
        'maghreb' => ['صافي', 'يا سلام', 'واخا', 'هاني', 'شحال', 'بزاف', 'خويا', 'راه', 'يا سيدي'],
        default => [],
    };
}

function bot_inject_dialect(string $text, string $dialect): string {
    $phrases = bot_dialect_phrases($dialect);
    if (empty($phrases)) return $text;
    if (random_int(1, 100) <= 25) {
        $phrase = $phrases[array_rand($phrases)];
        if (random_int(1, 100) <= 50) {
            $text = $phrase . '، ' . $text;
        } else {
            $text = preg_replace('/^(.*?[،,.])\s+/u', '$1 ' . $phrase . '، ', $text, 1);
            if ($text === null || $text === '') $text = $phrase . '، ' . $text;
        }
    }
    return $text;
}

function bot_get_active_thread(?int $categoryId = null): ?array {
    try {
        $sql = 'SELECT * FROM bot_threads WHERE is_active=1 ORDER BY last_used_at IS NULL DESC, last_used_at ASC LIMIT 1';
        if ($categoryId) {
            $sql = 'SELECT * FROM bot_threads WHERE is_active=1 AND (category_id IS NULL OR category_id=?) ORDER BY last_used_at IS NULL DESC, last_used_at ASC LIMIT 1';
            $stmt = db()->prepare($sql);
            $stmt->execute([$categoryId]);
        } else {
            $stmt = db()->query($sql);
        }
        $row = $stmt->fetch();
        if (!$row) return null;
        $messages = json_decode((string)$row['messages_json'], true);
        if (!is_array($messages) || empty($messages)) return null;
        return [
            'id' => (int)$row['id'],
            'title' => $row['title'],
            'messages' => $messages,
            'index' => (int)$row['current_index'],
            'category_id' => $row['category_id'] ? (int)$row['category_id'] : null,
        ];
    } catch (Throwable $e) { return null; }
}

function bot_advance_thread(int $threadId, int $newIndex): void {
    try {
        db()->prepare('UPDATE bot_threads SET current_index=?, last_used_at=NOW() WHERE id=?')->execute([$newIndex, $threadId]);
    } catch (Throwable $e) {}
}

function bot_create_thread_message(array $thread, ?array $drama, array $visitor): ?array {
    $messages = $thread['messages'];
    $idx = $thread['index'];
    if ($idx >= count($messages)) {
        bot_advance_thread($thread['id'], 0);
        return null;
    }
    $msg = $messages[$idx];
    $botName = (string)($msg['bot_name'] ?? 'زائر الدراما');
    $text = (string)($msg['text'] ?? '');
    if ($text === '') return null;

    $profile = ['display_name'=>$botName, 'persona'=>'زائر متابع', 'speech_style'=>'عامي', 'dialect'=>'general', 'memory_weight'=>50, 'response_delay_min'=>5, 'response_delay_max'=>12];
    try {
        $stmt = db()->prepare('SELECT * FROM bot_profiles WHERE display_name=? AND active=1 LIMIT 1');
        $stmt->execute([$botName]);
        $row = $stmt->fetch();
        if ($row) $profile = array_merge($profile, $row);
    } catch (Throwable $e) {}

    bot_advance_thread($thread['id'], $idx + 1);

    $drId = $drama ? (int)$drama['id'] : null;
    $catId = $drama ? (int)$drama['category_id'] : null;
    $sessionId = 'bot_thread_' . bin2hex(random_bytes(6));
    $stmt = db()->prepare("INSERT INTO chat_messages (username, message, session_id, visitor_id, drama_id, category_id, reply_to_message_id, bot_profile_id, status, is_bot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'visible', 1, NOW())");
    $stmt->execute([$botName, $text, $sessionId, $visitor['visitor_id'] ?? null, $drId, $catId, null, $profile['id'] ?? null]);
    $id = (int)db()->lastInsertId();

    return [
        'id' => 'chat-'.$id,
        'dbId' => $id,
        'username' => $botName,
        'text' => $text,
        'isBot' => true,
        'domain' => 'general_chat',
        'humanDelay' => random_int(3, 8),
        'profile' => ['id'=>$profile['id'] ?? null, 'persona'=>$profile['persona'] ?? '', 'speechStyle'=>$profile['speech_style'] ?? ''],
        'timeContext' => bot_time_context(),
        'created_at' => date('c'),
    ];
}

function bot_fetch_recommendation_drama(?array $currentDrama, string $directive): ?array {
    try {
        $catId = $currentDrama ? (int)$currentDrama['category_id'] : 0;
        $drId = $currentDrama ? (int)$currentDrama['id'] : 0;

        $genreHints = [];
        if (preg_match('/اكشن|انتقام|صعود|قوة|نفوذ/u', $directive)) $genreHints[] = 'قوة ونفوذ';
        if (preg_match('/رومانسي|حب|عاطفة/u', $directive)) $genreHints[] = 'دراما آسيوية';
        if (preg_match('/غموض|سر|خيانة/u', $directive)) $genreHints[] = 'أسرار العائلات';
        if (preg_match('/متخفي|بطل|أبطال/u', $directive)) $genreHints[] = 'أبطال متخفون';

        if (empty($genreHints)) {
            if ($catId > 0) {
                $s = db()->prepare('SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE d.category_id=? AND d.id<>? AND d.status="published" ORDER BY d.view_count DESC LIMIT 1');
                $s->execute([$catId, $drId]);
                return $s->fetch() ?: null;
            }
            return null;
        }

        $in = implode(',', array_fill(0, count($genreHints), '?'));
        $s = db()->prepare("SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE c.name IN ($in) AND d.id<>? AND d.status='published' ORDER BY d.rating DESC, d.view_count DESC LIMIT 1");
        $params = $genreHints;
        $params[] = $drId;
        $s->execute($params);
        return $s->fetch() ?: null;
    } catch (Throwable $e) { return null; }
}

function bot_detect_slang_domain(string $text): ?string {
    $n = normalize_text($text);
    try {
        $stmt = db()->prepare('SELECT domain, sentiment FROM slang_dictionary WHERE term=? AND is_active=1 LIMIT 1');
        $stmt->execute([$n]);
        $row = $stmt->fetch();
        if ($row) return (string)$row['domain'];
    } catch (Throwable $e) {}
    return null;
}

function bot_detect_unknown_terms(string $text, ?string $visitorId, int $messageId): void {
    try {
        $words = preg_split('/[\s,.!?؛،]+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        foreach ($words as $w) {
            $w = trim($w);
            if (mb_strlen($w, 'UTF-8') < 2 || is_numeric($w)) continue;
            $stmt = db()->prepare('SELECT id FROM slang_dictionary WHERE term=? LIMIT 1');
            $stmt->execute([$w]);
            if (!$stmt->fetch()) {
                db()->prepare('INSERT IGNORE INTO unknown_chat_terms (term, context, visitor_id, message_id) VALUES (?, ?, ?, ?)')
                    ->execute([$w, $text, $visitorId, $messageId]);
            }
        }
    } catch (Throwable $e) {}
}

function bot_recent_reply_count(?string $visitorId, ?int $dramaId, string $source, int $seconds): int {
    try {
        $sql = 'SELECT COUNT(*) AS c FROM bot_message_logs WHERE source=? AND created_at >= DATE_SUB(NOW(), INTERVAL '.(int)$seconds.' SECOND)';
        $params = [$source];
        if ($visitorId) { $sql .= ' AND visitor_id=?'; $params[] = $visitorId; }
        if ($dramaId) { $sql .= ' AND drama_id=?'; $params[] = $dramaId; }
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return (int)($row['c'] ?? 0);
    } catch (Throwable $e) { return 0; }
}

function bot_log_message(array $msg, string $source, ?string $visitorId, ?int $dramaId): void {
    try {
        db()->prepare('INSERT INTO bot_message_logs (bot_profile_id, source, visitor_id, drama_id, message_preview, created_at) VALUES (?, ?, ?, ?, ?, NOW())')
            ->execute([
                $msg['profile']['id'] ?? null,
                $source,
                $visitorId,
                $dramaId,
                mb_substr($msg['text'] ?? '', 0, 120, 'UTF-8')
            ]);
    } catch (Throwable $e) {}
}


function bot_quality_filter(string $text, array $profile): string {
    // ONE RULE ONLY: Reject single character messages
    if (mb_strlen($text, 'UTF-8') <= 1) return '';

    return $text;
}

function bot_compose_text(string $domain, string $userText, ?array $drama, array $profile, array $memories, ?array $summary, string $mode = 'ambient', ?string $targetName = null, string $targetGame = 'لعبة خفيفة'): string {
    $title = $drama ? (string)($drama['title'] ?? 'المسلسل') : 'المسلسل';
    $cat = $drama ? (string)($drama['category_name'] ?? 'الدراما') : 'الدراما';
    $tc = bot_time_context();
    $day = $tc['period'];
    $season = $tc['season'];
    $n = normalize_text($userText);

    // Sentiment detection
    $sentiment = 'neutral';
    if (preg_match('/(جامد|حلو|تحفة|رهيب|عجبني|حماس|قوي|طرش|نار|فشخ|عظمة|خامة|ممتاز|روعه|روعة)/u', $n)) $sentiment = 'positive';
    elseif (preg_match('/(وحش|ممل|مش عاجب|مش شغال|بايظ|غلط|زفت|خرا|تافه|سيء|مقرف)/u', $n)) $sentiment = 'negative';
    elseif (preg_match('/\?|؟|ايه|ازاي|ليه|مين|فين|امتى|هل|هل|ليش/u', $n)) $sentiment = 'question';

    $dialect = (string)($profile['dialect'] ?? 'general');
    $templates = bot_fetch_reply_templates($domain, $sentiment, $dialect, 12);

    if (!empty($templates)) {
        $text = $templates[array_rand($templates)];
        $text = str_replace(['{title}', '{cat}', '{day}', '{targetName}', '{targetGame}'], [$title, $cat, $day, $targetName, $targetGame], $text);
    } else {
        // DIVERSE PERSONALITY-BASED POOLS - each bot has unique style
        $persona = (string)($profile['persona'] ?? '');
        $speechStyle = (string)($profile['speech_style'] ?? '');

        if ($mode === 'bot_to_bot') {
            $pool = [
                "متفق معاك يا $targetName، بس برضه $title ليه لحظات مالهاش حل",
                "أنا شايف كلام $targetName صح، بس اللي جاي في $title غالباً أقوى",
                "بالظبط يا $targetName، بس تصنيف $cat دايمًا بيخبّي مفاجآت",
                "حلوة ملاحظتك يا $targetName، بس أنا شايفها من زاوية تانية",
                "أنا مختلف معاك شوية يا $targetName، بس $title يستاهل المتابعة",
                "مش متفق 100% يا $targetName، بس لازم نعترف إن $title متماسك",
                "صح يا $targetName، بس فيه تفاصيل صغيرة في $title بتفرق",
            ];
        } elseif (preg_match('/(حد هنا|موجود|مين|الو|هاي|سلام|صباح|مساء|ليل|نهار)/u', $n)) {
            $pool = [
                "موجودين، قول بتحب $cat ولا عايز ترشيح مختلف؟",
                "أيوه موجودين، الشات صاحي. إيه رأيك في الأحداث؟",
                "معاك، لو محتار أبدأ بـ $title",
                "هلا، فيه ناس بتتفرج على $title دلوقتي",
                "أهلاً، $day ده وقت حلو للدراما",
            ];
        } elseif (preg_match('/(فين|باقي|الحلقات|كامل|ناقص|افتح|اشوف|شاهد)/u', $n)) {
            $pool = [
                "الحلقات مترتبة في الصفحة، ركز في $title وهتلاقي الباقي",
                "تابع من نفس الصفحة، $title كفاية تعرفك الجو",
                "من غير ما تكتب أرقام أو روابط، كده الشات يفضل آمن",
                "اللي فات مهم بس اللي جاي في $title أهم",
            ];
        } elseif (preg_match('/(رشح|اقترح|عايز|عايزه|عاوز|انتقام|رومانسي|خيانة|اكشن|غموض)/u', $n)) {
            $pool = [
                "لو بتحب النوع ده، $title مناسب جدًا",
                "ترشيحي: كمل $title وبعدها اختار حاجة من نفس $cat",
                "ذوقك رايح ناحية $cat. خليك مع $title",
                "$title فيه حاجات مش هتلاقيها في أي مسلسل تاني",
                "جرب $title الأول، بعدين قولي إيه رأيك",
            ];
        } elseif (preg_match('/(جامد|حلو|تحفة|رهيب|عجبني|حماس|قوي|طرش|نار|فشخ)/u', $n)) {
            $pool = [
                "فعلاً، $title داخل بقوة. الأحداث بتسخن من غير مطّ",
                "أنا معاك، $title من النوع اللي يخليك تقول حلقة كمان",
                "بالذات في $cat، $title طالع متماسك",
                "مشهد الأكشن في $title كان نار 🔥",
                "$title ده مستوى مختلف عن اللي فات",
            ];
        } elseif (preg_match('/(وحش|ممل|مش عاجب|مش شغال|بايظ|غلط)/u', $n)) {
            $pool = [
                "فاهمك، ممكن البداية ما تمسكش. جرّب تكمل شوية",
                "لو $title مش داخل دماغك، شوف حاجة تانية من نفس القسم",
                "ممكن يكون المشهد الأول هادي، بس النوع ده بيقلب",
                "كلنا بنختلف في الذوق، جرب حاجة تانية من $cat",
            ];
        } elseif ($domain === 'trust_security') {
            $pool = [
                "خلينا من غير أرقام أو روابط، كده الشات يفضل آمن",
                "أي رقم أو لينك هيتمنع، خلينا في رأينا",
                "الأمان أهم حاجة، دردشة عن المسلسل فقط",
            ];
        } elseif ($domain === 'games_apps') {
            $pool = [
                "بين الحلقات ممكن تجربة $targetGame تكون لطيفة",
                "مش هطول في $targetGame، خلينا مع $title",
                "الفواصل محتاجة حاجة خفيفة",
            ];
        } else {
            // AMBIENT / GENERAL - diverse, not always recommendations
            $pool = [
                "أنا متابع معاكم، $title واخد الجو",
                "اللي داخل جديد يركز في تفاصيل $title",
                "الشات حلو لما الناس تكتب رأيها",
                "إيه أكتر مشهد شدكم في $title؟",
                "$day ده مناسب لحلقة من $title",
                "أنا لسه مصدوم من اللي حصل في الحلقة اللي فاتت",
                "مين منكم شاف النهاية؟ أنا مش مصدق",
                "التمثيل في $title مستوى تاني",
                "ساعات بفكر في الشخصيات بتاعت $title",
                "لو $title كان فيلم، هيكون أطول فيلم في التاريخ 😂",
                "أنا بتابع $title من أول يوم ولسه متحمس",
                "مشهد البارحة في $title كان قوي",
                "الإخراج في $title بياخد العقل",
                "مين فاكر أول حلقة من $title؟ كانت نار",
                "أنا بشوف $title تاني مرة ولسه بكتشف حاجات جديدة",
            ];
        }
        $text = $pool[array_rand($pool)];
    }

    // Time context injection (varies by time of day)
    if (random_int(1,100) <= 30) {
        $timePhrases = match($tc['period']) {
            'صباح' => ['$day ده وقت حلو للدراما', 'صباح الدراما مع $title', 'الصبح بدري والدراما مش بتنتهي'],
            'ظهر' => ['$day ده وقت راحة ودراما', 'الظهر مع $title بيكون مختلف', 'وقت الغدى و$title'],
            'مساء' => ['$day ده أحلى وقت للدراما', 'المساء مع $title حاجة تانية', 'السهرة مع $title'],
            default => ['$day ده وقت الدراما التقيلة', 'الليل مع $title بيكون أحلى', 'سهرة $title'],
        };
        $text = $text . ' — ' . $timePhrases[array_rand($timePhrases)];
    }

    // Memory context (weighted)
    $memoryHint = '';
    $memorySource = '';
    if ($memories && is_array($memories)) {
        $roll = random_int(1, 100);
        $selected = null;
        if ($roll <= 40 && !empty($memories['visitor'])) {
            $selected = $memories['visitor'][array_rand($memories['visitor'])];
            $memorySource = 'visitor';
        } elseif ($roll <= 70 && !empty($memories['drama'])) {
            $selected = $memories['drama'][array_rand($memories['drama'])];
            $memorySource = 'drama';
        } elseif ($roll <= 90 && !empty($memories['bot'])) {
            $selected = $memories['bot'][array_rand($memories['bot'])];
            $memorySource = 'bot';
        } elseif (!empty($memories['global'])) {
            $selected = $memories['global'][array_rand($memories['global'])];
            $memorySource = 'global';
        }
        if ($selected && random_int(1,100) <= min(70, (int)($profile['memory_weight'] ?? 50))) {
            $memoryHint = mb_substr((string)($selected['event_text'] ?? ''), 0, 75, 'UTF-8');
        }
    }
    if ($memoryHint === '' && $summary && !empty($summary['summary_text']) && random_int(1,100) <= 30) {
        $memoryHint = mb_substr((string)$summary['summary_text'], 0, 75, 'UTF-8');
        $memorySource = 'summary';
    }

    if ($memoryHint !== '' && random_int(1,100) <= 25) {
        $memoryPrefix = match($memorySource) {
            'visitor' => '— فاكرين لما ',
            'drama' => '— وفي نفس السياق: ',
            'bot' => '— فاكر: ',
            'global' => '— الناس بتتكلم عن: ',
            default => '— وفاكرين: ',
        };
        $text .= ' ' . $memoryPrefix . $memoryHint;
    }

    // Directive influence (60%)
    $ctx = bot_context_values();
    $directive = trim((string)($ctx['bot_directive'] ?? ''));
    if ($directive !== '' && random_int(1,100) <= 60) {
        if (preg_match('/ترشيح|رشح/u', $directive)) {
            $recDrama = bot_fetch_recommendation_drama($drama, $directive);
            if ($recDrama) {
                $text = 'لو عايزين ترشيح، أقولكم على ' . $recDrama['title'] . ' — ' . ($recDrama['category_name'] ?? 'نفس النوع') . ' ونار 🔥';
            } else {
                $text .= '، ولو عايزين ترشيح أقولكم على حاجة شبهه';
            }
        }
        if (preg_match('/ليل|سهرة/u', $directive)) $text .= '، والسهرة دي مناسبة للدراما التقيلة';
        if (preg_match('/صباح|نهار/u', $directive)) $text .= '، والنهار ده وقت مناسب للحكايات الخفيفة';
    }

    // Dialect injection
    $dialect = (string)($profile['dialect'] ?? 'general');
    if ($dialect !== 'general') {
        $text = bot_inject_dialect($text, $dialect);
    }

    $text = preg_replace('/\s+/u', ' ', trim($text));

    // Minimum length check - reject very short messages
    if (mb_strlen($text, 'UTF-8') < 15) {
        // Use a fallback template if too short
        $fallbacks = [
            'والله الحلقة دي مش طبيعية، حد شاف التصعيد في الآخر؟ 🔥',
            'أنا بقالي ساعة مش مصدق اللي بيحصل في المسلسل ده 😱',
            'يا جماعة، البطلة هنا مختلفة... عندها كاريزما مش طبيعية 💪',
            'مشهد الانتقام في الحلقة ٨... والله العظيم جامد جداً',
            'اللي ماشي ورا الدراما دي لسه؟ أنا مجنون فيها من أول يوم',
            'صراحة التصنيف هنا ظالم المسلسل... يستاهل أعلى بكتير',
            'حد جرب يشوف المسلسل ده لحد الآخر؟ أنا خايف على البطل 😅',
            'الإخراج في المشهد ده... يا جماعة فيه إخراج كده؟ 🎬',
            'مين هنا بيحب الأكشن؟ عشان عندي ترشيح هيفجر دماغك',
            'بصوا... المسلسل ده مش بس دراما، ده تجربة كاملة',
        ];
        $text = $fallbacks[array_rand($fallbacks)];
    }

    return mb_substr($text, 0, 240, 'UTF-8');
}

function bot_create_contextual_message(array $body, string $source, ?int $replyToMessageId, string $mode = 'ambient'): ?array {
    $drId = isset($body['drama_id']) && $body['drama_id'] !== null ? (int)$body['drama_id'] : null;
    $drSlug = isset($body['drama_slug']) ? (string)$body['drama_slug'] : '';
    $userText = isset($body['user_text']) ? (string)$body['user_text'] : '';
    $steering = isset($body['client_steering_weight']) ? max(0, min(100, (int)$body['client_steering_weight'])) : 15;
    $visitor = visitor_identity();
    $drama = null;
    if ($drId) { try { $s = db()->prepare('SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE d.id=? LIMIT 1'); $s->execute([$drId]); $drama = $s->fetch() ?: null; } catch (Throwable $e) {} }
    if (!$drama && $drSlug) { try { $s = db()->prepare('SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE d.slug=? LIMIT 1'); $s->execute([$drSlug]); $drama = $s->fetch() ?: null; } catch (Throwable $e) {} }
    $catId = $drama ? (int)$drama['category_id'] : null;
    $domain = bot_detect_slang_domain($userText) ?: bot_domain_from_text($userText, $steering);
    $profiles = [];
    try { $stmt = db()->prepare('SELECT * FROM bot_profiles WHERE active=1 ORDER BY last_spoke_at IS NULL ASC, last_spoke_at ASC, RAND() LIMIT 10'); $stmt->execute(); $profiles = $stmt->fetchAll() ?: []; } catch (Throwable $e) {}
    if (empty($profiles)) return null;
    $profile = $profiles[array_rand($profiles)];
    $profileId = (int)($profile['id'] ?? 0);
    $memories = recent_bot_memories($profileId, $visitor['visitor_id'] ?? null, $drId, 8);
    $summary = null;
    try { $stmt = db()->prepare('SELECT summary_text FROM bot_conversation_summaries WHERE bot_profile_id=? AND drama_id=? ORDER BY created_at DESC LIMIT 1'); $stmt->execute([$profileId, $drId]); $summary = $stmt->fetch() ?: null; } catch (Throwable $e) {}

    $targetName = null;
    if ($replyToMessageId) {
        try { $stmt = db()->prepare('SELECT username FROM chat_messages WHERE id=? LIMIT 1'); $stmt->execute([$replyToMessageId]); $row = $stmt->fetch(); if ($row) $targetName = $row['username']; } catch (Throwable $e) {}
    }

    $text = bot_compose_text($domain, $userText, $drama, $profile, $memories, $summary, $mode, $targetName);
    if ($text === '') return null;

    db()->prepare('UPDATE bot_profiles SET last_spoke_at=NOW() WHERE id=?')->execute([$profileId]);

    $sessionId = 'bot_' . bin2hex(random_bytes(8));
    $stmt = db()->prepare("INSERT INTO chat_messages (username, message, session_id, visitor_id, drama_id, category_id, reply_to_message_id, bot_profile_id, status, is_bot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'visible', 1, NOW())");
    $stmt->execute([$profile['display_name'], $text, $sessionId, $visitor['visitor_id'] ?? null, $drId, $catId, $replyToMessageId, $profileId]);
    $id = (int)db()->lastInsertId();

    bot_log_message(['text'=>$text,'profile'=>$profile], $source, $visitor['visitor_id'] ?? null, $drId);

    return [
        'id' => 'chat-'.$id,
        'dbId' => $id,
        'username' => $profile['display_name'],
        'text' => $text,
        'isBot' => true,
        'domain' => $domain,
        'humanDelay' => random_int((int)($profile['response_delay_min'] ?? 5), (int)($profile['response_delay_max'] ?? 14)),
        'profile' => ['id'=>$profileId, 'persona'=>$profile['persona'] ?? '', 'speechStyle'=>$profile['speech_style'] ?? ''],
        'timeContext' => bot_time_context(),
        'memoryUsed' => count($memories),
        'replyToMessageId' => $replyToMessageId,
        'dramaId' => $drId,
        'created_at' => date('c'),
    ];
}
