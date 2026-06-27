<?php
require_once __DIR__ . '/../config/bootstrap.php';
$admin = require_admin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_response(['success'=>false,'error'=>'Method not allowed'], 405);
$body = request_json();
$action = (string)($body['action'] ?? '');

function analytics_count(string $eventType): int {
    try { $stmt = db()->prepare('SELECT COUNT(*) AS c FROM analytics_events WHERE event_type=?'); $stmt->execute([$eventType]); return (int)($stmt->fetch()['c'] ?? 0); }
    catch (Throwable $e) { return 0; }
}
function build_analytics(): array {
    $locker = analytics_count('locker_impression'); $cta = analytics_count('cta_click');
    try { $totalViews = (int)(db()->query('SELECT COALESCE(SUM(view_count),0) AS total FROM dramas')->fetch()['total'] ?? 0); } catch(Throwable $e){ $totalViews = 0; }
    try { $rows = db()->query("SELECT COALESCE(NULLIF(source,''),'direct') AS source, COUNT(*) AS count FROM analytics_events GROUP BY COALESCE(NULLIF(source,''),'direct') ORDER BY count DESC LIMIT 8")->fetchAll(); }
    catch(Throwable $e){ $rows = []; }
    return [
        'totalVisits'=>analytics_count('page_open'), 'totalSeriesViews'=>max(analytics_count('series_open'), $totalViews),
        'totalVideoStarts'=>analytics_count('video_start'), 'totalVideoCompletions'=>analytics_count('video_complete'),
        'lockerImpressions'=>$locker, 'ctaClicks'=>$cta, 'conversionRate'=>$locker > 0 ? round(($cta/$locker)*100, 1) : 0,
        'topSource'=>$rows[0]['source'] ?? null,
        'sourceBreakdown'=>array_map(fn($r)=>['source'=>(string)$r['source'], 'count'=>(int)$r['count']], $rows),
    ];
}
function check_table(string $table): array {
    try { db()->query("SELECT 1 FROM `$table` LIMIT 1"); return ['status'=>'ok','label'=>"جدول $table", 'details'=>'available']; }
    catch (Throwable $e) { return ['status'=>'error','label'=>"جدول $table", 'details'=>'missing_or_error']; }
}
function count_active_super_admins(?int $excludeId = null): int {
    $sql = "SELECT COUNT(*) AS c FROM admin_users WHERE role='super_admin' AND status='active'"; $params=[];
    if ($excludeId) { $sql .= ' AND id <> ?'; $params[] = $excludeId; }
    $stmt = db()->prepare($sql); $stmt->execute($params); return (int)($stmt->fetch()['c'] ?? 0);
}
function drama_payload(array $body): array {
    $title = trim((string)($body['title'] ?? ''));
    if ($title === '') json_response(['success'=>false,'error'=>'عنوان المسلسل مطلوب'], 400);
    $videoId = trim((string)($body['video_id'] ?? $body['dailymotion_id'] ?? ''));
    if (!validate_dailymotion_id($videoId)) json_response(['success'=>false,'error'=>'معرف Dailymotion غير صالح. أدخلي ID فقط بدون iframe.'], 400);
    $poster = trim((string)($body['thumbnail_url'] ?? ''));
    if (!validate_safe_url($poster)) json_response(['success'=>false,'error'=>'رابط البوستر غير آمن'], 400);
    $status = in_array(($body['status'] ?? 'published'), ['draft','published','archived'], true) ? (string)$body['status'] : 'published';
    return [
        'title'=>$title,
        'slug'=>trim((string)($body['slug'] ?? '')) ?: safe_slug($title),
        'description'=>trim((string)($body['description'] ?? '')),
        'thumbnail_url'=>$poster,
        'video_id'=>$videoId,
        'category_id'=>(int)($body['category_id'] ?? 0),
        'episodes_count'=>max(0, (int)($body['episodes_count'] ?? 1)),
        'year'=>max(1900, min(2100, (int)($body['year'] ?? date('Y')))),
        'rating'=>max(0, min(5, (float)($body['rating'] ?? 4.5))),
        'view_count'=>max(0, (int)($body['view_count'] ?? 0)),
        'status'=>$status,
        'featured'=>!empty($body['featured']) ? 1 : 0,
        'sort_order'=>(int)($body['sort_order'] ?? 0),
    ];
}
function require_action_id(array $body, string $msg): int { $id=(int)($body['id'] ?? 0); if (!$id) json_response(['success'=>false,'error'=>$msg],400); return $id; }

try {
    if ($action === 'dashboardData') {
        $categories = db()->query('SELECT id, name, slug, status, sort_order FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
        $dramas = fetch_dramas('', [], 'd.sort_order ASC, d.view_count DESC');
        $admins = db()->query('SELECT id, username, email, role, status, failed_login_count, locked_until, last_login_at, created_at FROM admin_users ORDER BY id ASC')->fetchAll();
        $auditLogs = db()->query('SELECT l.id, l.action, l.entity_type, l.entity_id, l.created_at, u.username FROM admin_audit_logs l LEFT JOIN admin_users u ON u.id=l.admin_id ORDER BY l.id DESC LIMIT 120')->fetchAll();
        $activeUsernames = db()->query('SELECT username, session_id, visitor_id, last_seen_at, expires_at FROM chat_active_usernames WHERE expires_at>=NOW() ORDER BY last_seen_at DESC LIMIT 120')->fetchAll();
        $recentChatMessages = db()->query("SELECT id, username, message, session_id, visitor_id, status, is_bot, created_at FROM chat_messages ORDER BY id DESC LIMIT 120")->fetchAll();
        $episodes = db()->query('SELECT e.*, d.title AS drama_title FROM episodes e LEFT JOIN dramas d ON d.id=e.drama_id ORDER BY e.drama_id ASC, e.episode_number ASC LIMIT 300')->fetchAll();
        json_response(['success'=>true,'data'=>[
            'categories'=>$categories,
            'dramas'=>$dramas,
            'episodes'=>$episodes,
            'admins'=>$admins,
            'auditLogs'=>$auditLogs,
            'activeUsernames'=>$activeUsernames,
            'recentChatMessages'=>$recentChatMessages,
            'botSettings'=>public_bot_settings(),
            'chatSettings'=>[
                'cooldownSeconds'=>(int)setting_value('chat_cooldown_seconds','30'),
                'rateLimitPerMinute'=>(int)setting_value('chat_rate_limit_per_minute','6'),
                'usernameRequired'=>setting_value('chat_username_required','1')==='1',
                'frontendWarning'=>setting_value('chat_frontend_warning','1')==='1',
                'backendModeration'=>setting_value('chat_backend_moderation','1')==='1',
            ],
            'siteSettings'=>[
                'siteTitle'=>(string)setting_value('site_title','دراما قصيرة بالعربي'),
                'siteSubtitle'=>(string)setting_value('site_subtitle','arabshortdrama.cloud'),
                'maintenanceMode'=>setting_value('site_maintenance_mode','0')==='1',
                'homepageLimit'=>(int)setting_value('site_homepage_limit','24'),
                'analyticsEnabled'=>setting_value('site_analytics_enabled','1')==='1',
            ],
            'analytics'=>build_analytics(),
            'botAudit'=>['storedMessages'=>(int)(db()->query('SELECT COUNT(*) AS c FROM chat_messages WHERE is_bot=1')->fetch()['c'] ?? 0), 'botLogRows'=>(int)(db()->query('SELECT COUNT(*) AS c FROM bot_message_logs')->fetch()['c'] ?? 0), 'note'=>'رسائل البوتات محفوظة الآن في MySQL داخل chat_messages مع is_bot=1، وتظهر ضمن moderation وسجل bot_message_logs.'],
            'botBrain'=>bot_brain_snapshot(),
            'chatBans'=>(function(){ try { return db()->query('SELECT id, visitor_id, reason, banned_until, active, created_at FROM chat_bans ORDER BY id DESC LIMIT 80')->fetchAll(); } catch(Throwable $e){ return []; } })(),
        ]]);
    }

    if ($action === 'health') {
        $checks = ['database'=>['status'=>'ok','label'=>'اتصال MySQL','details'=>'connected']];
        foreach (['categories','dramas','episodes','admin_users','admin_sessions','admin_audit_logs','admin_settings','chat_active_usernames','chat_messages','bot_message_logs','bot_profiles','bot_memory_events','bot_conversation_summaries','bot_context_state','chat_visitor_identities','chat_bans','viewer_series_access','analytics_events'] as $t) $checks[$t] = check_table($t);
        $checks['auth_session'] = current_admin() ? ['status'=>'ok','label'=>'فحص جلسة الأدمن','details'=>'backend MySQL session valid'] : ['status'=>'error','label'=>'فحص جلسة الأدمن','details'=>'unauthorized'];
        $checks['dailymotion_validation'] = validate_dailymotion_id('x7abcde') && !validate_dailymotion_id('<script>') ? ['status'=>'ok','label'=>'فحص Dailymotion ID','details'=>'ID-only validation active'] : ['status'=>'error','label'=>'فحص Dailymotion ID','details'=>'validation failed'];
        $endpointFiles = [
            'auth_login_endpoint'=>'api/admin/login.php',
            'session_validation_endpoint'=>'api/admin/session.php',
            'chat_username_endpoint'=>'api/chat/username.php',
            'chat_message_moderation_endpoint'=>'api/chat/message.php',
            'public_bot_settings_endpoint'=>'api/public/bot-settings.php',
            'public_bot_message_endpoint'=>'api/public/bot-message.php',
            'gate_access_endpoint'=>'api/public/gate-access.php',
        ];
        foreach ($endpointFiles as $key=>$rel) {
            $file = dirname(__DIR__, 2) . '/' . $rel;
            $checks[$key] = is_file($file) ? ['status'=>'ok','label'=>$key,'details'=>'file_exists'] : ['status'=>'error','label'=>$key,'details'=>'missing'];
        }
        $last = setting_value('last_safe_backend_error', '');
        $checks['last_safe_backend_error'] = $last !== '' ? ['status'=>'warning','label'=>'آخر خطأ آمن','details'=>$last] : ['status'=>'ok','label'=>'آخر خطأ آمن','details'=>'لا توجد أخطاء آمنة مسجلة'];
        json_response(['success'=>true,'data'=>['checks'=>$checks]]);
    }

    if ($action === 'createDrama') {
        $p = drama_payload($body);
        if (!$p['category_id']) json_response(['success'=>false,'error'=>'القسم مطلوب'],400);
        $stmt = db()->prepare('INSERT INTO dramas (title, slug, description, thumbnail_url, video_id, category_id, view_count, rating, year, episodes_count, status, featured, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
        $stmt->execute([$p['title'],$p['slug'],$p['description'],$p['thumbnail_url'],$p['video_id'],$p['category_id'],$p['view_count'],$p['rating'],$p['year'],$p['episodes_count'],$p['status'],$p['featured'],$p['sort_order']]);
        $id=(int)db()->lastInsertId(); log_audit((int)$admin['id'],'create_series','dramas',$id,['title'=>$p['title']]); json_response(['success'=>true,'data'=>['id'=>$id]]);
    }
    if ($action === 'updateDrama') {
        $id = require_action_id($body, 'معرف المسلسل مطلوب'); $p = drama_payload($body);
        $stmt = db()->prepare('UPDATE dramas SET title=?, slug=?, description=?, thumbnail_url=?, video_id=?, category_id=?, view_count=?, rating=?, year=?, episodes_count=?, status=?, featured=?, sort_order=?, updated_at=NOW() WHERE id=?');
        $stmt->execute([$p['title'],$p['slug'],$p['description'],$p['thumbnail_url'],$p['video_id'],$p['category_id'],$p['view_count'],$p['rating'],$p['year'],$p['episodes_count'],$p['status'],$p['featured'],$p['sort_order'],$id]);
        log_audit((int)$admin['id'],'update_series','dramas',$id,['title'=>$p['title']]); json_response(['success'=>true]);
    }
    if ($action === 'deleteDrama' || $action === 'archiveDrama') {
        $id = require_action_id($body, 'معرف المسلسل مطلوب');
        if ($action === 'archiveDrama') db()->prepare("UPDATE dramas SET status='archived', updated_at=NOW() WHERE id=?")->execute([$id]);
        else db()->prepare('DELETE FROM dramas WHERE id=?')->execute([$id]);
        log_audit((int)$admin['id'], $action==='archiveDrama'?'archive_series':'delete_series', 'dramas', $id); json_response(['success'=>true]);
    }
    if ($action === 'updateVideoId' || $action === 'updateDailymotionId') {
        $id=require_action_id($body,'معرف المسلسل مطلوب'); $videoId=trim((string)($body['video_id'] ?? $body['dailymotion_id'] ?? ''));
        if (!validate_dailymotion_id($videoId)) json_response(['success'=>false,'error'=>'معرف Dailymotion غير صالح. ID فقط.'],400);
        db()->prepare('UPDATE dramas SET video_id=?, updated_at=NOW() WHERE id=?')->execute([$videoId,$id]);
        log_audit((int)$admin['id'],'update_dailymotion_id','dramas',$id,['video_id'=>$videoId]); json_response(['success'=>true]);
    }
    if ($action === 'updatePoster') {
        $id=require_action_id($body,'معرف المسلسل مطلوب'); $url=trim((string)($body['thumbnail_url'] ?? ''));
        if ($url === '' || !validate_safe_url($url)) json_response(['success'=>false,'error'=>'رابط البوستر غير آمن'],400);
        db()->prepare('UPDATE dramas SET thumbnail_url=?, updated_at=NOW() WHERE id=?')->execute([$url,$id]);
        log_audit((int)$admin['id'],'update_poster','dramas',$id); json_response(['success'=>true]);
    }

    if ($action === 'createEpisode' || $action === 'updateEpisode') {
        $dramaId=(int)($body['drama_id'] ?? 0); $num=max(1,(int)($body['episode_number'] ?? 1)); $videoId=trim((string)($body['video_id'] ?? ''));
        if (!$dramaId || !validate_dailymotion_id($videoId)) json_response(['success'=>false,'error'=>'بيانات الحلقة غير صالحة'],400);
        $title=trim((string)($body['title'] ?? '')); $duration=max(1,(int)($body['duration'] ?? 45)); $status=in_array(($body['status'] ?? 'published'),['draft','published','archived'],true)?(string)$body['status']:'published';
        if ($action==='createEpisode') { $stmt=db()->prepare('INSERT INTO episodes (drama_id, episode_number, title, video_id, duration, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())'); $stmt->execute([$dramaId,$num,$title,$videoId,$duration,$status]); $id=(int)db()->lastInsertId(); log_audit((int)$admin['id'],'create_episode','episodes',$id,['drama_id'=>$dramaId]); json_response(['success'=>true,'data'=>['id'=>$id]]); }
        $id=require_action_id($body,'معرف الحلقة مطلوب'); db()->prepare('UPDATE episodes SET drama_id=?, episode_number=?, title=?, video_id=?, duration=?, status=?, updated_at=NOW() WHERE id=?')->execute([$dramaId,$num,$title,$videoId,$duration,$status,$id]); log_audit((int)$admin['id'],'update_episode','episodes',$id); json_response(['success'=>true]);
    }
    if ($action === 'deleteEpisode') { $id=require_action_id($body,'معرف الحلقة مطلوب'); db()->prepare('DELETE FROM episodes WHERE id=?')->execute([$id]); log_audit((int)$admin['id'],'delete_episode','episodes',$id); json_response(['success'=>true]); }

    if ($action === 'createCategory' || $action === 'updateCategory') {
        $name=trim((string)($body['name'] ?? '')); $slug=trim((string)($body['slug'] ?? '')) ?: safe_slug($name); $sort=(int)($body['sort_order'] ?? 0); $status=((string)($body['status'] ?? 'active'))==='inactive'?'inactive':'active';
        if ($name==='') json_response(['success'=>false,'error'=>'اسم التصنيف مطلوب'],400);
        if ($action==='createCategory') { $stmt=db()->prepare('INSERT INTO categories (name, slug, status, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())'); $stmt->execute([$name,$slug,$status,$sort]); $id=(int)db()->lastInsertId(); log_audit((int)$admin['id'],'create_category','categories',$id,['name'=>$name]); json_response(['success'=>true,'data'=>['id'=>$id]]); }
        $id=require_action_id($body,'معرف التصنيف مطلوب'); db()->prepare('UPDATE categories SET name=?, slug=?, status=?, sort_order=?, updated_at=NOW() WHERE id=?')->execute([$name,$slug,$status,$sort,$id]); log_audit((int)$admin['id'],'update_category','categories',$id,['name'=>$name]); json_response(['success'=>true]);
    }
    if ($action === 'deleteCategory' || $action === 'disableCategory') {
        $id=require_action_id($body,'معرف التصنيف مطلوب');
        if ($action==='disableCategory') { db()->prepare("UPDATE categories SET status='inactive', updated_at=NOW() WHERE id=?")->execute([$id]); log_audit((int)$admin['id'],'disable_category','categories',$id); json_response(['success'=>true]); }
        $stmt=db()->prepare('SELECT COUNT(*) AS c FROM dramas WHERE category_id=?'); $stmt->execute([$id]); if ((int)$stmt->fetch()['c']>0) json_response(['success'=>false,'error'=>'لا يمكن حذف تصنيف يحتوي على مسلسلات. عطّليه بدلاً من الحذف.'],409);
        db()->prepare('DELETE FROM categories WHERE id=?')->execute([$id]); log_audit((int)$admin['id'],'delete_category','categories',$id); json_response(['success'=>true]);
    }

    if ($action === 'saveSiteSettings') { require_super_admin();
        save_setting('site_title', mb_substr(trim((string)($body['siteTitle'] ?? 'دراما قصيرة بالعربي')),0,120,'UTF-8'), (int)$admin['id']);
        save_setting('site_subtitle', mb_substr(trim((string)($body['siteSubtitle'] ?? 'arabshortdrama.cloud')),0,180,'UTF-8'), (int)$admin['id']);
        save_setting('site_maintenance_mode', !empty($body['maintenanceMode'])?'1':'0', (int)$admin['id']);
        save_setting('site_homepage_limit', (string)max(6,min(60,(int)($body['homepageLimit'] ?? 24))), (int)$admin['id']);
        save_setting('site_analytics_enabled', !empty($body['analyticsEnabled'])?'1':'0', (int)$admin['id']);
        log_audit((int)$admin['id'],'update_site_settings','admin_settings'); json_response(['success'=>true]);
    }
    if ($action === 'saveBotSettings') {
        $target=trim((string)($body['targetGame'] ?? '')); if ($target==='') json_response(['success'=>false,'error'=>'اسم الهدف مطلوب'],400);
        save_setting('bot_knowledge_base', (string)($body['knowledgeBase'] ?? ''), (int)$admin['id']);
        save_setting('bot_target_game', $target, (int)$admin['id']);
        save_setting('bot_steering_weight', (string)max(0,min(100,(int)($body['steeringWeight'] ?? 15))), (int)$admin['id']);
        save_setting('bot_feed_enabled', !empty($body['feedEnabled'])?'1':'0', (int)$admin['id']);
        save_setting('bot_polling_interval', (string)max(5,min(60,(int)($body['pollingInterval'] ?? 10))), (int)$admin['id']);
        log_audit((int)$admin['id'],'bot_setting_change','admin_settings',null,['targetGame'=>$target]); json_response(['success'=>true]);
    }

    if ($action === 'saveBotBrain') { require_super_admin();
        $siteMood = mb_substr(trim((string)($body['siteMood'] ?? 'دراما، تشويق، ترشيحات ذكية، شات آمن')),0,240,'UTF-8');
        $seasonOverride = mb_substr(trim((string)($body['seasonOverride'] ?? 'auto')),0,80,'UTF-8') ?: 'auto';
        $occasion = mb_substr(trim((string)($body['occasion'] ?? '')),0,160,'UTF-8');
        $directive = mb_substr(trim((string)($body['directive'] ?? 'اتكلم كزائر طبيعي متابع للمسلسل. لا تكتب روابط أو أرقام أو وعود وهمية. نوّع الكلام ولا تكرر نفسك.')),0,600,'UTF-8');
        $stmt=db()->prepare('INSERT INTO bot_context_state (context_key, context_value, updated_by, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE context_value=VALUES(context_value), updated_by=VALUES(updated_by), updated_at=NOW()');
        foreach (['site_mood'=>$siteMood,'season_override'=>$seasonOverride,'occasion'=>$occasion,'bot_directive'=>$directive] as $k=>$v) $stmt->execute([$k,$v,(int)$admin['id']]);
        log_audit((int)$admin['id'],'bot_brain_context_update','bot_context_state',null,['season'=>$seasonOverride,'occasion'=>$occasion]);
        json_response(['success'=>true,'data'=>bot_brain_snapshot()]);
    }
    if ($action === 'createBotProfile' || $action === 'updateBotProfile') { require_super_admin();
        $name = mb_substr(trim((string)($body['display_name'] ?? $body['displayName'] ?? '')),0,80,'UTF-8');
        if ($name === '') json_response(['success'=>false,'error'=>'اسم البوت مطلوب'],400);
        if (message_violation($name)) json_response(['success'=>false,'error'=>'اسم البوت غير مناسب'],400);
        $persona = mb_substr(trim((string)($body['persona'] ?? 'زائر متابع للدراما')),0,160,'UTF-8');
        $style = mb_substr(trim((string)($body['speech_style'] ?? $body['speechStyle'] ?? 'عامي طبيعي')),0,160,'UTF-8');
        $domains = $body['preferred_domains'] ?? $body['preferredDomains'] ?? ['general_chat','drama_content'];
        if (!is_array($domains)) $domains = ['general_chat','drama_content'];
        $domains = array_values(array_intersect(array_map('strval',$domains), ['general_chat','drama_content','games_apps','trust_security','episode_links']));
        if (!$domains) $domains=['general_chat'];
        $activity=max(1,min(100,(int)($body['activity_level'] ?? $body['activityLevel'] ?? 60)));
        $memory=max(1,min(100,(int)($body['memory_weight'] ?? $body['memoryWeight'] ?? 60)));
        $min=max(3,min(120,(int)($body['response_delay_min'] ?? $body['responseDelayMin'] ?? 6)));
        $max=max($min,min(180,(int)($body['response_delay_max'] ?? $body['responseDelayMax'] ?? 24)));
        $active=!empty($body['active']) ? 1 : 0;
        if ($action === 'createBotProfile') {
            $stmt=db()->prepare('INSERT INTO bot_profiles (display_name, persona, speech_style, preferred_domains, activity_level, memory_weight, response_delay_min, response_delay_max, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
            $stmt->execute([$name,$persona,$style,json_encode($domains,JSON_UNESCAPED_UNICODE),$activity,$memory,$min,$max,$active]);
            $id=(int)db()->lastInsertId();
            log_audit((int)$admin['id'],'create_bot_profile','bot_profiles',$id,['name'=>$name]);
            json_response(['success'=>true,'data'=>['id'=>$id]]);
        }
        $id=require_action_id($body,'معرف البوت مطلوب');
        db()->prepare('UPDATE bot_profiles SET display_name=?, persona=?, speech_style=?, preferred_domains=?, activity_level=?, memory_weight=?, response_delay_min=?, response_delay_max=?, active=?, updated_at=NOW() WHERE id=?')->execute([$name,$persona,$style,json_encode($domains,JSON_UNESCAPED_UNICODE),$activity,$memory,$min,$max,$active,$id]);
        log_audit((int)$admin['id'],'update_bot_profile','bot_profiles',$id,['name'=>$name]);
        json_response(['success'=>true]);
    }
    if ($action === 'banChatVisitor') { require_admin();
        $visitorId=trim((string)($body['visitor_id'] ?? $body['visitorId'] ?? ''));
        $reason=mb_substr(trim((string)($body['reason'] ?? 'مخالفة قواعد الشات')),0,160,'UTF-8');
        $minutes=max(5,min(43200,(int)($body['minutes'] ?? 1440)));
        if (!preg_match('/^[a-f0-9]{32}$/',$visitorId)) json_response(['success'=>false,'error'=>'معرف الزائر غير صالح'],400);
        $stmt=db()->prepare('SELECT ip_hash FROM chat_visitor_identities WHERE visitor_id=? LIMIT 1'); $stmt->execute([$visitorId]); $row=$stmt->fetch();
        db()->prepare('INSERT INTO chat_bans (visitor_id, ip_hash, reason, banned_until, active, created_by, created_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 1, ?, NOW())')->execute([$visitorId,$row['ip_hash'] ?? null,$reason,$minutes,(int)$admin['id']]);
        db()->prepare('UPDATE chat_visitor_identities SET status="banned", last_seen_at=NOW() WHERE visitor_id=?')->execute([$visitorId]);
        log_audit((int)$admin['id'],'ban_chat_visitor','chat_bans',null,['visitor_id'=>$visitorId,'minutes'=>$minutes,'reason'=>$reason]);
        json_response(['success'=>true]);
    }
    if ($action === 'unbanChatVisitor') { require_admin();
        $visitorId=trim((string)($body['visitor_id'] ?? $body['visitorId'] ?? ''));
        if (!preg_match('/^[a-f0-9]{32}$/',$visitorId)) json_response(['success'=>false,'error'=>'معرف الزائر غير صالح'],400);
        db()->prepare('UPDATE chat_bans SET active=0 WHERE visitor_id=?')->execute([$visitorId]);
        db()->prepare('UPDATE chat_visitor_identities SET status="active", last_seen_at=NOW() WHERE visitor_id=?')->execute([$visitorId]);
        log_audit((int)$admin['id'],'unban_chat_visitor','chat_bans',null,['visitor_id'=>$visitorId]);
        json_response(['success'=>true]);
    }

    if ($action === 'saveChatSettings') {
        save_setting('chat_cooldown_seconds', (string)max(0,min(3600,(int)($body['cooldownSeconds'] ?? 30))), (int)$admin['id']);
        save_setting('chat_rate_limit_per_minute', (string)max(1,min(60,(int)($body['rateLimitPerMinute'] ?? 6))), (int)$admin['id']);
        save_setting('chat_username_required', !empty($body['usernameRequired'])?'1':'0', (int)$admin['id']);
        save_setting('chat_frontend_warning', !empty($body['frontendWarning'])?'1':'0', (int)$admin['id']);
        // Backend moderation is mandatory to keep visitor link/phone filtering active.
        save_setting('chat_backend_moderation', '1', (int)$admin['id']);
        log_audit((int)$admin['id'],'update_chat_settings','admin_settings'); json_response(['success'=>true]);
    }

    if ($action === 'releaseUsername') { $sessionId=trim((string)($body['session_id'] ?? '')); $username=trim((string)($body['username'] ?? '')); if ($sessionId!=='') db()->prepare('DELETE FROM chat_active_usernames WHERE session_id=?')->execute([$sessionId]); elseif ($username!=='') db()->prepare('DELETE FROM chat_active_usernames WHERE username=?')->execute([$username]); else json_response(['success'=>false,'error'=>'لا يوجد اسم أو جلسة لتحريرها'],400); log_audit((int)$admin['id'],'release_chat_username','chat_active_usernames',null,['username'=>$username]); json_response(['success'=>true]); }
    if (in_array($action, ['hideChatMessage','deleteChatMessage','reviewChatMessage'], true)) { $id=require_action_id($body,'معرف الرسالة مطلوب'); $status=$action==='deleteChatMessage'?'deleted':($action==='hideChatMessage'?'hidden':'reviewed'); db()->prepare('UPDATE chat_messages SET status=?, reviewed_at=NOW(), reviewed_by=? WHERE id=?')->execute([$status,(int)$admin['id'],$id]); log_audit((int)$admin['id'],'chat_moderation_action','chat_messages',$id,['status'=>$status]); json_response(['success'=>true]); }

    if ($action === 'createAdmin') { require_super_admin(); $username=trim((string)($body['username'] ?? '')); $email=trim((string)($body['email'] ?? '')) ?: null; $role=((string)($body['role'] ?? 'admin'))==='super_admin'?'super_admin':'admin'; $password=(string)($body['password'] ?? ''); if (!preg_match('/^[a-zA-Z0-9_]{3,40}$/',$username)) json_response(['success'=>false,'error'=>'اسم المستخدم غير صالح'],400); if (!validate_password_strength($password)) json_response(['success'=>false,'error'=>'كلمة المرور يجب أن تكون قوية: 12 حرف وحرف كبير وصغير ورقم ورمز'],400); $stmt=db()->prepare('INSERT INTO admin_users (username,email,role,password_hash,status,created_at,updated_at) VALUES (?,?,?,?,"active",NOW(),NOW())'); $stmt->execute([$username,$email,$role,password_hash($password,PASSWORD_DEFAULT)]); $id=(int)db()->lastInsertId(); log_audit((int)$admin['id'],'create_admin','admin_users',$id,['username'=>$username,'role'=>$role]); json_response(['success'=>true,'data'=>['id'=>$id]]); }
    if ($action === 'updateAdminStatus') { require_super_admin(); $id=require_action_id($body,'معرف المدير مطلوب'); $status=((string)($body['status'] ?? 'active'))==='disabled'?'disabled':'active'; if ($id===(int)$admin['id'] && $status==='disabled') json_response(['success'=>false,'error'=>'لا يمكن للمدير تعطيل نفسه'],400); $stmt=db()->prepare('SELECT role FROM admin_users WHERE id=?'); $stmt->execute([$id]); $target=$stmt->fetch(); if (!$target) json_response(['success'=>false,'error'=>'المدير غير موجود'],404); if ($status==='disabled' && $target['role']==='super_admin' && count_active_super_admins($id)<1) json_response(['success'=>false,'error'=>'لا يمكن تعطيل آخر مدير رئيسي'],400); db()->prepare('UPDATE admin_users SET status=?, updated_at=NOW() WHERE id=?')->execute([$status,$id]); log_audit((int)$admin['id'],$status==='disabled'?'deactivate_admin':'activate_admin','admin_users',$id,['status'=>$status]); json_response(['success'=>true]); }
    if ($action === 'updateAdminRole') { require_super_admin(); $id=require_action_id($body,'معرف المدير مطلوب'); $role=((string)($body['role'] ?? 'admin'))==='super_admin'?'super_admin':'admin'; $stmt=db()->prepare('SELECT role FROM admin_users WHERE id=?'); $stmt->execute([$id]); $target=$stmt->fetch(); if (!$target) json_response(['success'=>false,'error'=>'المدير غير موجود'],404); if ($target['role']==='super_admin' && $role==='admin' && count_active_super_admins($id)<1) json_response(['success'=>false,'error'=>'لا يمكن إزالة صلاحية آخر مدير رئيسي'],400); db()->prepare('UPDATE admin_users SET role=?, updated_at=NOW() WHERE id=?')->execute([$role,$id]); log_audit((int)$admin['id'],'update_admin_role','admin_users',$id,['role'=>$role]); json_response(['success'=>true]); }
    if ($action === 'resetAdminPassword') { require_super_admin(); $id=require_action_id($body,'معرف المدير مطلوب'); $password=(string)($body['password'] ?? ''); if (!validate_password_strength($password)) json_response(['success'=>false,'error'=>'كلمة المرور الجديدة ضعيفة'],400); db()->prepare('UPDATE admin_users SET password_hash=?, failed_login_count=0, locked_until=NULL, updated_at=NOW() WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$id]); db()->prepare('UPDATE admin_sessions SET revoked_at=NOW(), expires_at=NOW() WHERE admin_id=?')->execute([$id]); log_audit((int)$admin['id'],'reset_admin_password','admin_users',$id); json_response(['success'=>true]); }
    if ($action === 'unlockAdmin') { require_super_admin(); $id=require_action_id($body,'معرف المدير مطلوب'); db()->prepare('UPDATE admin_users SET failed_login_count=0, locked_until=NULL, updated_at=NOW() WHERE id=?')->execute([$id]); log_audit((int)$admin['id'],'unlock_admin','admin_users',$id); json_response(['success'=>true]); }
    if ($action === 'revokeAdminSessions') { require_super_admin(); $id=require_action_id($body,'معرف المدير مطلوب'); db()->prepare('UPDATE admin_sessions SET revoked_at=NOW(), expires_at=NOW() WHERE admin_id=?')->execute([$id]); log_audit((int)$admin['id'],'session_revoke','admin_sessions',null,['admin_id'=>$id]); json_response(['success'=>true]); }

        // Slang Dictionary
    if ($action === 'getSlangDictionary') {
        $rows = db()->query('SELECT id, term, meaning, sentiment, dialect, added_by, created_at FROM slang_dictionary ORDER BY term ASC')->fetchAll();
        json_response(['success'=>true,'data'=>$rows]);
    }
    if ($action === 'addSlangTerm') {
        $term = trim((string)($body['term'] ?? ''));
        $meaning = trim((string)($body['meaning'] ?? ''));
        $sentiment = in_array(($body['sentiment'] ?? 'neutral'), ['positive','negative','neutral','question'], true) ? (string)$body['sentiment'] : 'neutral';
        $dialect = in_array(($body['dialect'] ?? 'general'), ['egyptian','gulf','sham','maghreb','general'], true) ? (string)$body['dialect'] : 'general';
        if ($term === '' || $meaning === '') json_response(['success'=>false,'error'=>'الكلمة والمعنى مطلوبان'], 400);
        db()->prepare('INSERT INTO slang_dictionary (term, meaning, sentiment, dialect, added_by, created_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE meaning=VALUES(meaning), sentiment=VALUES(sentiment), dialect=VALUES(dialect)')->execute([$term, $meaning, $sentiment, $dialect, $admin['username']]);
        log_audit((int)$admin['id'], 'add_slang_term', 'slang_dictionary', null, ['term'=>$term]); json_response(['success'=>true]);
    }
    if ($action === 'deleteSlangTerm') {
        $id = require_action_id($body, 'معرف الكلمة مطلوب');
        db()->prepare('DELETE FROM slang_dictionary WHERE id=?')->execute([$id]);
        log_audit((int)$admin['id'], 'delete_slang_term', 'slang_dictionary', $id); json_response(['success'=>true]);
    }
    // Unknown Terms
    if ($action === 'getUnknownTerms') {
        $status = in_array(($body['status'] ?? 'pending'), ['pending','approved','rejected'], true) ? (string)$body['status'] : 'pending';
        $stmt = db()->prepare('SELECT id, term, context, visitor_id, message_id, status, created_at FROM unknown_chat_terms WHERE status=? ORDER BY created_at DESC LIMIT 200');
        $stmt->execute([$status]);
        json_response(['success'=>true,'data'=>$stmt->fetchAll()]);
    }
    if ($action === 'approveUnknownTerm') {
        $id = require_action_id($body, 'معرف الكلمة مطلوب');
        $meaning = trim((string)($body['meaning'] ?? ''));
        $sentiment = in_array(($body['sentiment'] ?? 'neutral'), ['positive','negative','neutral','question'], true) ? (string)$body['sentiment'] : 'neutral';
        $dialect = in_array(($body['dialect'] ?? 'general'), ['egyptian','gulf','sham','maghreb','general'], true) ? (string)$body['dialect'] : 'general';
        $stmt = db()->prepare('SELECT term FROM unknown_chat_terms WHERE id=? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) json_response(['success'=>false,'error'=>'الكلمة غير موجودة'], 404);
        $term = $row['term'];
        if ($meaning !== '') {
            db()->prepare('INSERT INTO slang_dictionary (term, meaning, sentiment, dialect, added_by, created_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE meaning=VALUES(meaning), sentiment=VALUES(sentiment), dialect=VALUES(dialect)')->execute([$term, $meaning, $sentiment, $dialect, $admin['username']]);
        }
        db()->prepare('UPDATE unknown_chat_terms SET status="approved", reviewed_by=?, reviewed_at=NOW() WHERE id=?')->execute([(int)$admin['id'], $id]);
        log_audit((int)$admin['id'], 'approve_unknown_term', 'unknown_chat_terms', $id, ['term'=>$term]); json_response(['success'=>true]);
    }
    if ($action === 'rejectUnknownTerm') {
        $id = require_action_id($body, 'معرف الكلمة مطلوب');
        db()->prepare('UPDATE unknown_chat_terms SET status="rejected", reviewed_by=?, reviewed_at=NOW() WHERE id=?')->execute([(int)$admin['id'], $id]);
        log_audit((int)$admin['id'], 'reject_unknown_term', 'unknown_chat_terms', $id); json_response(['success'=>true]);
    }
    // Bot Threads
    if ($action === 'getBotThreads') {
        $rows = db()->query('SELECT id, title, category_id, is_active, current_index, last_used_at, created_at FROM bot_threads ORDER BY is_active DESC, id ASC')->fetchAll();
        json_response(['success'=>true,'data'=>$rows]);
    }
    if ($action === 'createBotThread') {
        $title = trim((string)($body['title'] ?? ''));
        $messagesJson = trim((string)($body['messages_json'] ?? ''));
        $categoryId = !empty($body['category_id']) ? (int)$body['category_id'] : null;
        if ($title === '' || $messagesJson === '') json_response(['success'=>false,'error'=>'العنوان والرسائل مطلوبان'], 400);
        json_decode($messagesJson);
        if (json_last_error() !== JSON_ERROR_NONE) json_response(['success'=>false,'error'=>'JSON غير صالح للرسائل'], 400);
        db()->prepare('INSERT INTO bot_threads (title, category_id, messages_json, is_active, created_at) VALUES (?, ?, ?, 1, NOW())')->execute([$title, $categoryId, $messagesJson]);
        $id = (int)db()->lastInsertId();
        log_audit((int)$admin['id'], 'create_bot_thread', 'bot_threads', $id); json_response(['success'=>true,'data'=>['id'=>$id]]);
    }
    if ($action === 'updateBotThread') {
        $id = require_action_id($body, 'معرف الخيط مطلوب');
        $title = trim((string)($body['title'] ?? ''));
        $messagesJson = trim((string)($body['messages_json'] ?? ''));
        $isActive = !empty($body['is_active']) ? 1 : 0;
        if ($title !== '' && $messagesJson !== '') {
            json_decode($messagesJson);
            if (json_last_error() !== JSON_ERROR_NONE) json_response(['success'=>false,'error'=>'JSON غير صالح'], 400);
            db()->prepare('UPDATE bot_threads SET title=?, messages_json=?, is_active=? WHERE id=?')->execute([$title, $messagesJson, $isActive, $id]);
        } else {
            db()->prepare('UPDATE bot_threads SET is_active=? WHERE id=?')->execute([$isActive, $id]);
        }
        log_audit((int)$admin['id'], 'update_bot_thread', 'bot_threads', $id); json_response(['success'=>true]);
    }
    if ($action === 'deleteBotThread') {
        $id = require_action_id($body, 'معرف الخيط مطلوب');
        db()->prepare('DELETE FROM bot_threads WHERE id=?')->execute([$id]);
        log_audit((int)$admin['id'], 'delete_bot_thread', 'bot_threads', $id); json_response(['success'=>true]);
    }
    // Chat Moderation
    if ($action === 'hideChatMessage') {
        $id = require_action_id($body, 'معرف الرسالة مطلوب');
        db()->prepare('UPDATE chat_messages SET status="hidden" WHERE id=?')->execute([$id]);
        log_audit((int)$admin['id'], 'hide_chat_message', 'chat_messages', $id); json_response(['success'=>true]);
    }
    if ($action === 'reviewChatMessage') {
        $id = require_action_id($body, 'معرف الرسالة مطلوب');
        db()->prepare('UPDATE chat_messages SET status="reviewed" WHERE id=?')->execute([$id]);
        log_audit((int)$admin['id'], 'review_chat_message', 'chat_messages', $id); json_response(['success'=>true]);
    }
    if ($action === 'deleteChatMessage') {
        $id = require_action_id($body, 'معرف الرسالة مطلوب');
        db()->prepare('DELETE FROM chat_messages WHERE id=?')->execute([$id]);
        log_audit((int)$admin['id'], 'delete_chat_message', 'chat_messages', $id); json_response(['success'=>true]);
    }

    json_response(['success'=>false,'error'=>'عملية غير معروفة'], 400);

if ($action === 'unknownTerms') {
    $terms = db()->query('SELECT id, term, context, visitor_id, message_id, status, created_at FROM unknown_chat_terms WHERE status="pending" ORDER BY created_at DESC LIMIT 200')->fetchAll();
    json_response(['success'=>true,'terms'=>$terms]);
}

if ($action === 'approveUnknownTerm') {
    $id = (int)($body['id'] ?? 0);
    $meaning = trim((string)($body['meaning'] ?? ''));
    $sentiment = in_array($body['sentiment'] ?? '', ['positive','negative','neutral','question']) ? $body['sentiment'] : 'neutral';
    $dialect = trim((string)($body['dialect'] ?? 'general'));
    if ($id <= 0) json_response(['success'=>false,'error'=>'Invalid term id'], 400);

    // Get the term
    $stmt = db()->prepare('SELECT term FROM unknown_chat_terms WHERE id=? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_response(['success'=>false,'error'=>'Term not found'], 404);

    $term = $row['term'];

    // Insert into slang_dictionary
    db()->prepare('INSERT INTO slang_dictionary (term, meaning, sentiment, dialect, added_by) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE meaning=VALUES(meaning), sentiment=VALUES(sentiment), dialect=VALUES(dialect)')
        ->execute([$term, $meaning, $sentiment, $dialect, $admin['username']]);

    // Update unknown term status
    db()->prepare('UPDATE unknown_chat_terms SET status="approved", reviewed_by=?, reviewed_at=NOW() WHERE id=?')
        ->execute([$admin['id'], $id]);

    json_response(['success'=>true,'message'=>'Term approved and added to dictionary']);
}

if ($action === 'rejectUnknownTerm') {
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) json_response(['success'=>false,'error'=>'Invalid term id'], 400);
    db()->prepare('UPDATE unknown_chat_terms SET status="rejected", reviewed_by=?, reviewed_at=NOW() WHERE id=?')
        ->execute([$admin['id'], $id]);
    json_response(['success'=>true,'message'=>'Term rejected']);
}


} catch (Throwable $e) { safe_error('حدث خطأ في MySQL API', 500); }
