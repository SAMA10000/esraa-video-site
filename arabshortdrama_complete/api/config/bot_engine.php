<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';



function bot_detect_unknown_terms(string $message, ?string $visitorId, int $messageId): void {
    try {
        $words = preg_split('/\s+/u', normalize_text($message));
        if (empty($words)) return;

        // Check which words are NOT in slang_dictionary
        $placeholders = implode(',', array_fill(0, count($words), '?'));
        $stmt = db()->prepare("SELECT term FROM slang_dictionary WHERE term IN ($placeholders)");
        $stmt->execute($words);
        $known = array_map(fn($r) => $r['term'], $stmt->fetchAll() ?: []);

        $unknown = array_diff($words, $known);
        foreach ($unknown as $term) {
            if (mb_strlen($term, 'UTF-8') < 2) continue;
            if (preg_match('/^[0-9]+$/', $term)) continue;
            // Check if already pending
            $check = db()->prepare('SELECT id FROM unknown_chat_terms WHERE term=? AND status="pending" LIMIT 1');
            $check->execute([$term]);
            if ($check->fetch()) continue;

            db()->prepare('INSERT INTO unknown_chat_terms (term, context, visitor_id, message_id, status, created_at) VALUES (?, ?, ?, ?, "pending", NOW())')
                ->execute([$term, mb_substr($message, 0, 200, 'UTF-8'), $visitorId, $messageId]);
        }
    } catch (Throwable $e) {}
}

function bot_detect_slang_domain(string $text): ?string {
    try {
        $words = preg_split('/\s+/u', normalize_text($text));
        $in = implode(',', array_fill(0, count($words), '?'));
        if (empty($words)) return null;
        $stmt = db()->prepare("SELECT term, sentiment FROM slang_dictionary WHERE term IN ($in) LIMIT 5");
        $stmt->execute($words);
        $rows = $stmt->fetchAll();
        if (empty($rows)) return null;

        $positive = 0; $negative = 0; $question = 0;
        foreach ($rows as $row) {
            $sent = $row['sentiment'] ?? 'neutral';
            if ($sent === 'positive') $positive++;
            elseif ($sent === 'negative') $negative++;
            elseif ($sent === 'question') $question++;
        }

        if ($question > 0) return 'episode_links';
        if ($positive > 0) return 'drama_content';
        if ($negative > 0) return 'drama_content';
        return 'general_chat';
    } catch (Throwable $e) { return null; }
}

function bot_domain_from_text(string $text, int $steering = 15): string {
    $n = normalize_text($text);
    $ctx = bot_context_values();
    $directive = trim((string)($ctx['bot_directive'] ?? ''));

    // Check slang dictionary for domain hints
    $slangDomain = bot_detect_slang_domain($text);
    if ($slangDomain) return $slangDomain;

    // Directive can override domain when active
    if ($directive !== '') {
        if (preg_match('/ترشيح|رشح|اقترح|اكشن|رومانسي|خيانة|غموض|صعود|انتقام/u', $directive)) {
            if (preg_match('/(رشح|ترشيح|اقترح|عايز|عايزه|عاوز|حاجة|انتقام|رومانسي|خيانة|اكشن|غموض|صعود)/u', $n)) return 'drama_content';
        }
        if (preg_match('/ليل|سهرة|مساء/u', $directive) && preg_match('/(حد هنا|موجود|مين|سلام|هاي|ازيك|ازيكم|الو|شات)/u', $n)) return 'general_chat';
    }

    if ($text !== '') {
        if (preg_match('/(فين|باقي|الباقي|حلقة|الحلقة|الحلقات|كامل|ناقص|افتح|يتفتح|اشوف|شاهد)/u', $n)) return 'episode_links';
        if (preg_match('/(رشح|ترشيح|اقترح|عايز|عايزه|عاوز|حاجة|انتقام|رومانسي|خيانة|اكشن|غموض|صعود)/u', $n)) return 'drama_content';
        if (preg_match('/(جامد|حلو|عجبني|تحفة|رهيب|وحش|مش عاجب|النهاية|البطل|البطلة|مشهد|قصة|صدمة)/u', $n)) return 'drama_content';
        if (preg_match('/(حد هنا|موجود|مين|سلام|هاي|ازيك|ازيكم|الو|شات)/u', $n)) return 'general_chat';
        if (preg_match('/(امان|أمان|نصب|حقيقي|شغال|رقم|لينك|رابط|واتساب|تليجرام|انستا|تيك)/u', $n)) return 'trust_security';
        if (preg_match('/(لعبة|جيم|تطبيق|موبايل|تلفون)/u', $n)) return random_int(1,100) <= max(8, min(22,$steering)) ? 'games_apps' : 'general_chat';
        return 'general_chat';
    }
    $roll = random_int(1,100);
    if ($roll <= max(0, min(18, $steering))) return 'games_apps';
    $domains = ['general_chat','drama_content','drama_content','episode_links','trust_security','general_chat'];
    return $domains[array_rand($domains)];
}

function bot_drama_from_payload(array $body): ?array {
    $dramaId = isset($body['drama_id']) ? (int)$body['drama_id'] : (isset($body['dramaId']) ? (int)$body['dramaId'] : 0);
    $dramaSlug = trim((string)($body['drama_slug'] ?? $body['dramaSlug'] ?? ''));
    try {
        if ($dramaId > 0) {
            $s = db()->prepare('SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE d.id=? LIMIT 1');
            $s->execute([$dramaId]);
            $row = $s->fetch();
            return $row ?: null;
        }
        if ($dramaSlug !== '') {
            $s = db()->prepare('SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE d.slug=? LIMIT 1');
            $s->execute([$dramaSlug]);
            $row = $s->fetch();
            return $row ?: null;
        }
    } catch (Throwable $e) {}
    return null;
}

function chat_recent_messages(?int $dramaId, ?string $visitorId, int $limit = 18): array {
    try {
        $params = [];
        $where = "status IN ('visible','reviewed')";
        if ($dramaId) { $where .= ' AND (drama_id=? OR drama_id IS NULL)'; $params[] = $dramaId; }
        $sql = "SELECT id, username, message, is_bot, visitor_id, bot_profile_id, reply_to_message_id, drama_id, created_at
                FROM chat_messages
                WHERE $where
                ORDER BY id DESC LIMIT " . (int)$limit;
        $st = db()->prepare($sql);
        $st->execute($params);
        $rows = array_reverse($st->fetchAll() ?: []);
        if ($visitorId) {
            // Keep the same public room, but mark same visitor context in metadata when needed.
            foreach ($rows as &$row) $row['same_visitor'] = (($row['visitor_id'] ?? '') === $visitorId);
        }
        return $rows;
    } catch (Throwable $e) { return []; }
}

function bot_safe_summary_for_context(array $recent): string {
    $snips = [];
    foreach (array_slice($recent, -6) as $r) {
        $name = trim((string)($r['username'] ?? ''));
        $msg = trim((string)($r['message'] ?? ''));
        if ($name !== '' && $msg !== '') $snips[] = $name . ': ' . mb_substr($msg, 0, 65, 'UTF-8');
    }
    return implode(' | ', $snips);
}

function bot_recent_reply_count(string $visitorId, ?int $dramaId, string $source, int $seconds): int {
    try {
        $params = [$visitorId, $source];
        $where = 'visitor_id=? AND source=? AND created_at >= DATE_SUB(NOW(), INTERVAL '.(int)$seconds.' SECOND)';
        if ($dramaId) { $where .= ' AND drama_id=?'; $params[] = $dramaId; }
        $st = db()->prepare("SELECT COUNT(*) FROM bot_message_logs WHERE $where");
        $st->execute($params);
        return (int)$st->fetchColumn();
    } catch (Throwable $e) { return 0; }
}

function bot_pick_summary(?int $dramaId, ?int $categoryId): ?array {
    try {
        $keys = [];
        if ($dramaId) $keys[] = 'drama_'.$dramaId;
        if ($categoryId) $keys[] = 'cat_'.$categoryId;
        $keys[] = 'global';
        $in = implode(',', array_fill(0, count($keys), '?'));
        $st = db()->prepare("SELECT * FROM bot_conversation_summaries WHERE conversation_key IN ($in) ORDER BY updated_at DESC LIMIT 1");
        $st->execute($keys);
        $row = $st->fetch();
        return $row ?: null;
    } catch (Throwable $e) { return null; }
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
        // Reset thread when finished
        bot_advance_thread($thread['id'], 0);
        return null;
    }
    $msg = $messages[$idx];
    $botName = (string)($msg['bot_name'] ?? 'زائر الدراما');
    $text = (string)($msg['text'] ?? '');
    if ($text === '') return null;

    // Find or create bot profile for this name
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

        // Parse directive for genre hints
        $genreHints = [];
        if (preg_match('/اكشن|انتقام|صعود|قوة|نفوذ/u', $directive)) $genreHints[] = 'قوة ونفوذ';
        if (preg_match('/رومانسي|حب|عاطفة/u', $directive)) $genreHints[] = 'دراما آسيوية';
        if (preg_match('/غموض|سر|خيانة/u', $directive)) $genreHints[] = 'أسرار العائلات';
        if (preg_match('/متخفي|بطل|أبطال/u', $directive)) $genreHints[] = 'أبطال متخفون';

        if (empty($genreHints)) {
            // Same category, different drama
            if ($catId > 0) {
                $s = db()->prepare('SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE d.category_id=? AND d.id<>? AND d.status="published" ORDER BY d.view_count DESC LIMIT 1');
                $s->execute([$catId, $drId]);
                return $s->fetch() ?: null;
            }
            return null;
        }

        // Find drama matching genre hints
        $in = implode(',', array_fill(0, count($genreHints), '?'));
        $s = db()->prepare("SELECT d.*, c.name AS category_name FROM dramas d LEFT JOIN categories c ON c.id=d.category_id WHERE c.name IN ($in) AND d.id<>? AND d.status='published' ORDER BY d.rating DESC, d.view_count DESC LIMIT 1");
        $params = $genreHints;
        $params[] = $drId;
        $s->execute($params);
        return $s->fetch() ?: null;
    } catch (Throwable $e) { return null; }
}


function bot_dialect_phrases(string $dialect): array {
    return match($dialect) {
        'egyptian' => ['يا عم', 'جدع', 'فشخ', 'مش هينفع', 'واللهي', 'بجد', 'يعني', 'كده', 'أصل'],
        'gulf' => ['يا بعد حيي', 'الله يخليك', 'صافي', 'يالله', 'هلا', 'والله', 'يا حبيبي', 'طيب'],
        'sham' => ['يا عمري', 'والله يا', 'صحيح', 'مظبوط', 'يلا', 'شو', 'كتير', 'حلو'],
        'maghreb' => ['صافي', 'يا سلام', 'واخا', 'هاني', 'شحال', 'بزاف', 'خويا', 'راه'],
        default => [],
    };
}

function bot_inject_dialect(string $text, string $dialect): string {
    $phrases = bot_dialect_phrases($dialect);
    if (empty($phrases)) return $text;
    if (random_int(1, 100) <= 18) {
        $phrase = $phrases[array_rand($phrases)];
        // Inject at beginning or middle naturally
        if (random_int(1, 100) <= 50) {
            $text = $phrase . '، ' . $text;
        } else {
            $text = preg_replace('/^(.*?[،,.])\s+/u', '$1 ' . $phrase . '، ', $text, 1);
            if ($text === null || $text === '') $text = $phrase . '، ' . $text;
        }
    }
    return $text;
}

function bot_compose_text(array $profile, string $domain, ?array $drama, array $settings, array $time, array $memories, ?array $summary, array $recent, string $userText = '', string $targetName = '', string $mode = 'reply'): string {
    $botName = (string)($profile['display_name'] ?? 'زائر الدراما');
    $title = $drama['title'] ?? 'المسلسل ده';
    $cat = $drama['category_name'] ?? 'القسم ده';
    $day = $time['daypart'] ?? 'الوقت ده';
    $season = $time['season'] ?? '';
    $occasion = trim((string)($time['occasion'] ?? ''));
    $directive = trim((string)($time['directive'] ?? ''));
    $targetGame = trim((string)($settings['targetGame'] ?? 'لعبة خفيفة'));
    $recentHint = bot_safe_summary_for_context($recent);
    $memoryHint = '';
    $memorySource = '';
    // Weighted memory selection: visitor(40%) > drama(30%) > bot(20%) > global(10%)
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

    $n = normalize_text($userText);
    if ($mode === 'bot_to_bot') {
        $pool = [
            "متفق معاك يا $targetName، $title فعلاً بيشد الواحد واحدة واحدة",
            "أنا شايف كلام $targetName صح، بس اللي جاي في $title غالباً أقوى",
            "بالظبط يا $targetName، تصنيف $cat دايمًا بيخبّي مفاجآت",
            "حلوة ملاحظتك يا $targetName، وخصوصًا إن آخر كام رسالة كلها حوالين نفس النقطة",
            "أنا مختلف معاك شوية يا $targetName، بس متفق إن $title يستاهل المتابعة",
        ];
    } elseif (preg_match('/(حد هنا|موجود|مين|الو|هاي|سلام)/u', $n)) {
        $pool = [
            "موجودين يا غالي، قول بتحب $cat ولا عايز ترشيح مختلف؟",
            "أيوه موجودين، الشات صاحي مع $title. إيه رأيك في الأحداث؟",
            "معاك يا نجم، لو محتار أبدأ بـ $title وكمل من الترشيحات اللي شبهه",
        ];
    } elseif (preg_match('/(فين|باقي|الحلقات|كامل|ناقص|افتح|اشوف|شاهد)/u', $n)) {
        $pool = [
            "الحلقات والترشيحات مترتبة في الصفحة يا غالي، ركز في $title وهتلاقي اللي شبهه ظاهر قدامك",
            "الباقي بيظهر حسب ترتيب الصفحة، بس أول حلقة من $title كفاية تعرفك الجو العام",
            "تابع من نفس صفحة $title، ومن غير ما تكتب أرقام أو روابط في الشات عشان المكان يفضل آمن",
        ];
    } elseif (preg_match('/(رشح|اقترح|عايز|عايزه|عاوز|انتقام|رومانسي|خيانة|اكشن|غموض)/u', $n)) {
        $pool = [
            "لو بتحب النوع ده، ابدأ بـ $cat. $title مناسب جدًا لو عايز أحداث تشدك بسرعة",
            "ترشيحي ليك: كمل $title وبعدها اختار حاجة من نفس $cat، غالبًا هتعجبك",
            "حسب كلامك، أنت ذوقك رايح ناحية $cat. خليك مع $title وهتلاقي نفس المود في الترشيحات",
        ];
    } elseif (preg_match('/(جامد|حلو|تحفة|رهيب|عجبني|حماس|قوي)/u', $n)) {
        $pool = [
            "فعلاً، $title داخل بقوة. أكتر حاجة حلوة إن الأحداث بتسخن من غير مطّ",
            "أنا معاك، $title من النوع اللي يخليك تقول حلقة كمان وخلاص",
            "بالذات في $cat، $title طالع متماسك ومشاعره واضحة",
        ];
    } elseif (preg_match('/(وحش|ممل|مش عاجب|مش شغال|بايظ|غلط)/u', $n)) {
        $pool = [
            "فاهمك، ممكن البداية ما تمسكش كل الناس. جرّب تكمل شوية أو شوف ترشيح من نفس $cat",
            "لو $title مش داخل دماغك، شوف حاجة تانية من نفس القسم، ساعات المزاج بيفرق",
            "ممكن يكون المشهد الأول هادي، بس النوع ده غالبًا بيقلب فجأة بعد شوية",
        ];
    } elseif ($domain === 'trust_security') {
        $pool = [
            "خلينا من غير أرقام أو روابط يا جماعة، كده الشات يفضل آمن ومريح",
            "أي رقم أو لينك هيتمنع تلقائيًا، خلينا في رأينا عن $title",
            "الأمان أهم حاجة هنا، دردشة عن المسلسل وترشيحات فقط",
        ];
    } elseif ($domain === 'games_apps') {
        $pool = [
            "بين الحلقات ممكن تجربة $targetGame تكون لطيفة، بس $title لسه واخد الجو",
            "مش هطول في $targetGame، خلينا مع $title لأن الأحداث داخلة على سخونة",
            "الفواصل محتاجة حاجة خفيفة، بس الشات هنا أحلى لما يفضل عن $title",
        ];
    } else {
        $pool = [
            "أنا متابع معاكم، $title واخد الجو خصوصًا في تصنيف $cat",
            "اللي داخل جديد يركز في تفاصيل $title، في حاجات صغيرة هتفرق بعدين",
            "الشات حلو لما الناس تكتب رأيها في الأحداث، إيه أكتر مشهد شدكم؟",
            "حاسس إن $day ده مناسب لحلقة من $title، خصوصًا مع مود $cat",
        ];
    }
    $text = $pool[array_rand($pool)];

    if ($memoryHint !== '' && random_int(1,100) <= 25) {
        $memoryPrefix = match($memorySource) {
            'visitor' => '— فاكرين لما ',
            'drama' => '— وفي نفس السياق: ',
            'bot' => '— البوت فاكر: ',
            'global' => '— الناس بتتكلم عن: ',
            default => '— وفاكرين: ',
        };
        $text .= ' ' . $memoryPrefix . $memoryHint;
    }
    if ($recentHint !== '' && random_int(1,100) <= 18) $text .= ' — واضح إن الكلام في الشات حوالين نفس المود';
    if ($directive !== '' && random_int(1,100) <= 60) {
        // Admin directive is now a strong behavioral signal, not just a soft hint.
        if (preg_match('/ترشيح|رشح/u', $directive)) {
            // Try to fetch an actual drama recommendation based on directive
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
    if ($day === 'ليل' && random_int(1,100) <= 16) $text = 'الليل ده معمول للدراما التقيلة، ' . $text;
    if ($day === 'صباح' && random_int(1,100) <= 12) $text = 'صباح الحماس، ' . $text;
    if ($season === 'شتاء' && random_int(1,100) <= 10) $text .= '، وجو الشتاء لايق على الحكايات دي';
    if ($season === 'صيف' && random_int(1,100) <= 8) $text .= '، والجو حر بس الأحداث أسخن';
    if ($occasion !== '' && random_int(1,100) <= 10) $text .= '، وبالمناسبة: ' . mb_substr($occasion, 0, 40, 'UTF-8');

    $dialect = (string)($profile['dialect'] ?? 'general');
    if ($dialect !== 'general') {
        $text = bot_inject_dialect($text, $dialect);
    }
    $text = preg_replace('/\s+/u', ' ', trim($text));
    return mb_substr($text, 0, 240, 'UTF-8');
}

function bot_save_message(array $profile, string $text, string $domain, ?array $drama, array $visitor, string $source, ?int $replyToMessageId = null): array {
    if (message_violation($text)) {
        $text = 'خلينا في الكلام عن المسلسل من غير روابط أو أرقام، الشات كده يبقى ألطف للجميع';
        $domain = 'trust_security';
    }
    $profileId = isset($profile['id']) ? (int)$profile['id'] : null;
    $username = (string)($profile['display_name'] ?? 'زائر الدراما');
    $drId = $drama ? (int)$drama['id'] : null;
    $catId = $drama ? (int)$drama['category_id'] : null;
    $sessionId = 'bot_engine_' . bin2hex(random_bytes(8));
    $stmt = db()->prepare("INSERT INTO chat_messages (username, message, session_id, visitor_id, drama_id, category_id, reply_to_message_id, bot_profile_id, status, is_bot, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'visible', 1, NOW())");
    $stmt->execute([$username, $text, $sessionId, $visitor['visitor_id'] ?? null, $drId, $catId, $replyToMessageId, $profileId]);
    $id = (int)db()->lastInsertId();
    $time = bot_time_context();
    db()->prepare('INSERT INTO bot_message_logs (bot_profile_id, visitor_id, drama_id, category_id, username, message, domain, source, mood, time_context, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())')
        ->execute([$profileId, $visitor['visitor_id'] ?? null, $drId, $catId, $username, $text, $domain, $source, $time['siteMood'] ?? '', ($time['daypart'] ?? '').' / '.($time['season'] ?? '')]);
    if ($profileId) db()->prepare('UPDATE bot_profiles SET last_spoke_at=NOW() WHERE id=?')->execute([$profileId]);
    record_bot_memory_event($profileId, $visitor['visitor_id'] ?? null, $drId, $catId, $source, $username.': '.$text, 65, ['domain'=>$domain, 'reply_to'=>$replyToMessageId]);
    update_bot_conversation_summary($drId, $catId, $text, $domain);
    $minDelay = max(2, (int)($profile['response_delay_min'] ?? 5));
    $maxDelay = max($minDelay, (int)($profile['response_delay_max'] ?? 14));
    return [
        'id' => 'chat-'.$id,
        'dbId' => $id,
        'username' => $username,
        'text' => $text,
        'isBot' => true,
        'domain' => $domain,
        'humanDelay' => random_int($minDelay, $maxDelay),
        'profile' => ['id'=>$profileId, 'persona'=>$profile['persona'] ?? '', 'speechStyle'=>$profile['speech_style'] ?? ''],
        'timeContext' => $time,
        'created_at' => date('c'),
    ];
}

function bot_create_contextual_message(array $body, string $source = 'bot_reply', ?int $replyToMessageId = null, string $mode = 'reply', string $targetName = ''): ?array {
    $settings = public_bot_settings();
    if (empty($settings['feedEnabled'])) return null;
    $visitor = visitor_identity();
    require_not_banned($visitor);
    $drama = bot_drama_from_payload($body);
    $drId = $drama ? (int)$drama['id'] : null;
    $catId = $drama ? (int)$drama['category_id'] : null;
    $userText = trim((string)($body['user_text'] ?? $body['userText'] ?? ''));
    if ($userText !== '' && message_violation($userText)) json_response(['success'=>false,'error'=>'لا يمكن إنشاء رد بوت على رسالة مخالفة','reason'=>'unsafe_user_text'], 400);

    $steering = max(0, min(100, (int)($settings['steeringWeight'] ?? 15)));
    $domain = bot_domain_from_text($userText, $steering);
    $profile = choose_bot_profile($drama, $domain);
    if ($targetName !== '') {
        // Try to avoid the same bot replying to itself.
        for ($i=0; $i<4 && normalized_name((string)($profile['display_name'] ?? '')) === normalized_name($targetName); $i++) {
            $profile = choose_bot_profile($drama, $domain);
        }
    }
    $profileId = isset($profile['id']) ? (int)$profile['id'] : null;
    $time = bot_time_context();
    $recent = chat_recent_messages($drId, $visitor['visitor_id'] ?? null, 18);
    $memories = recent_bot_memories($profileId, $visitor['visitor_id'] ?? null, $drId, 8);
    $summary = bot_pick_summary($drId, $catId);

    $recentTexts = [];
    try { $recentTexts = db()->query('SELECT message FROM bot_message_logs ORDER BY id DESC LIMIT 100')->fetchAll(PDO::FETCH_COLUMN) ?: []; } catch (Throwable $e) {}
    $text = '';
    for ($attempt=0; $attempt<8; $attempt++) {
        $candidate = bot_compose_text($profile, $domain, $drama, $settings, $time, $memories, $summary, $recent, $userText, $targetName, $mode);
        if (!in_array($candidate, $recentTexts, true)) { $text = $candidate; break; }
        $text = $candidate;
    }
    return bot_save_message($profile, $text, $domain, $drama, $visitor, $source, $replyToMessageId);
}
