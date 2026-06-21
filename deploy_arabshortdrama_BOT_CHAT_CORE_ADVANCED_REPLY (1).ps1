$ErrorActionPreference = 'Stop'

$Vps = 'root@187.124.175.137'
$ZipName = 'arabshortdrama_BOT_CHAT_CORE_ADVANCED_REPLY_MYSQL.zip'
$LocalZip = Join-Path (Get-Location) $ZipName

if (!(Test-Path $LocalZip)) {
  Write-Host "ERROR: ضع الملف $ZipName في نفس فولدر السكربت أو شغلي السكربت من فولدر الملف." -ForegroundColor Red
  exit 1
}

Write-Host "Uploading Bot Chat Core Advanced Reply MySQL package..." -ForegroundColor Cyan
scp $LocalZip "$Vps:/root/$ZipName"

$sh = @'
set -Eeuo pipefail
WEBROOT="/var/www/arabshortdrama.cloud"
ZIP="/root/arabshortdrama_BOT_CHAT_CORE_ADVANCED_REPLY_MYSQL.zip"
TMP="/tmp/arabshortdrama_bot_chat_core_advanced_reply_mysql"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/root/backups/arabshortdrama_before_bot_chat_core_advanced_reply_$STAMP"

if [ ! -d "$WEBROOT" ]; then echo "ERROR_WEBROOT_NOT_FOUND=$WEBROOT"; exit 1; fi
if [ ! -f "$ZIP" ]; then echo "ERROR_ZIP_NOT_FOUND=$ZIP"; exit 1; fi

mkdir -p "$BACKUP"
echo "BACKUP=$BACKUP"
tar -czf "$BACKUP/site_files.tar.gz" -C "$WEBROOT" .
if [ -f "$WEBROOT/api/config/database.php" ]; then cp "$WEBROOT/api/config/database.php" "$BACKUP/database.php"; fi

rm -rf "$TMP"
mkdir -p "$TMP"
unzip -q "$ZIP" -d "$TMP"

# Remove old physical admin route folders so React/Nginx route fallback is not bypassed.
rm -rf "$WEBROOT/esraa" "$WEBROOT/admin-login" "$WEBROOT/admin-setup" "$WEBROOT/admin-dashboard" "$WEBROOT/admin" 2>/dev/null || true

cd "$TMP/project"
tar --exclude='./api/config/database.php' -cf - . | tar -xf - -C "$WEBROOT"
if [ -f "$BACKUP/database.php" ]; then cp "$BACKUP/database.php" "$WEBROOT/api/config/database.php"; fi

php <<'PHP'
<?php
$cfg = require '/var/www/arabshortdrama.cloud/api/config/database.php';
$pdo = new PDO("mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['database']};charset={$cfg['charset']}", $cfg['username'], $cfg['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
function has_col(PDO $pdo,string $table,string $col): bool { $s=$pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?"); $s->execute([$table,$col]); return (int)$s->fetchColumn()>0; }
function has_index(PDO $pdo,string $table,string $idx): bool { $s=$pdo->prepare("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?"); $s->execute([$table,$idx]); return (int)$s->fetchColumn()>0; }
function exec_safe(PDO $pdo,string $sql){ try{$pdo->exec($sql); echo "OK: $sql\n";} catch(Throwable $e){ echo "SKIP/ERR: ".$e->getMessage()."\n"; } }

$base = [
"CREATE TABLE IF NOT EXISTS chat_visitor_identities (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, visitor_id CHAR(32) NOT NULL UNIQUE, current_username VARCHAR(80) NULL, normalized_username VARCHAR(120) NULL, ip_hash CHAR(64) NULL, user_agent_hash CHAR(64) NULL, reputation_score INT NOT NULL DEFAULT 0, status ENUM('active','restricted','banned') NOT NULL DEFAULT 'active', first_seen_at DATETIME NOT NULL, last_seen_at DATETIME NOT NULL, INDEX idx_visitor_username (normalized_username), INDEX idx_visitor_ip_hash (ip_hash), INDEX idx_visitor_status (status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS chat_bans (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, visitor_id CHAR(32) NULL, ip_hash CHAR(64) NULL, reason VARCHAR(160) NOT NULL, banned_until DATETIME NULL, active TINYINT(1) NOT NULL DEFAULT 1, created_by INT UNSIGNED NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_chat_bans_visitor (visitor_id), INDEX idx_chat_bans_ip (ip_hash), INDEX idx_chat_bans_active (active, banned_until)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS bot_profiles (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, display_name VARCHAR(80) NOT NULL UNIQUE, persona VARCHAR(160) NOT NULL, speech_style VARCHAR(160) NOT NULL, preferred_domains JSON NULL, preferred_category_id INT UNSIGNED NULL, activity_level TINYINT UNSIGNED NOT NULL DEFAULT 60, memory_weight TINYINT UNSIGNED NOT NULL DEFAULT 50, response_delay_min INT UNSIGNED NOT NULL DEFAULT 6, response_delay_max INT UNSIGNED NOT NULL DEFAULT 22, active TINYINT(1) NOT NULL DEFAULT 1, last_spoke_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_bot_profiles_active (active)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS bot_memory_events (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, bot_profile_id INT UNSIGNED NULL, visitor_id CHAR(32) NULL, drama_id INT UNSIGNED NULL, category_id INT UNSIGNED NULL, event_type VARCHAR(80) NOT NULL, event_text TEXT NOT NULL, importance TINYINT UNSIGNED NOT NULL DEFAULT 50, metadata_json JSON NULL, expires_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_bot_memory_bot (bot_profile_id, created_at), INDEX idx_bot_memory_visitor (visitor_id, created_at), INDEX idx_bot_memory_drama (drama_id, created_at), INDEX idx_bot_memory_type (event_type, created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS bot_conversation_summaries (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, conversation_key VARCHAR(180) NOT NULL UNIQUE, drama_id INT UNSIGNED NULL, category_id INT UNSIGNED NULL, summary_text TEXT NOT NULL, dominant_mood VARCHAR(80) NOT NULL DEFAULT 'neutral', message_count INT UNSIGNED NOT NULL DEFAULT 0, last_message_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_bot_summary_drama (drama_id), INDEX idx_bot_summary_category (category_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
"CREATE TABLE IF NOT EXISTS bot_context_state (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, context_key VARCHAR(120) NOT NULL UNIQUE, context_value TEXT NOT NULL, updated_by INT UNSIGNED NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
];
foreach($base as $sql) exec_safe($pdo,$sql);

if (!has_col($pdo,'chat_active_usernames','visitor_id')) exec_safe($pdo,"ALTER TABLE chat_active_usernames ADD COLUMN visitor_id CHAR(32) NULL AFTER session_id");
if (!has_index($pdo,'chat_active_usernames','idx_chat_active_visitor')) exec_safe($pdo,"ALTER TABLE chat_active_usernames ADD INDEX idx_chat_active_visitor (visitor_id)");
if (!has_col($pdo,'chat_messages','visitor_id')) exec_safe($pdo,"ALTER TABLE chat_messages ADD COLUMN visitor_id CHAR(32) NULL AFTER session_id");
if (!has_index($pdo,'chat_messages','idx_chat_messages_visitor')) exec_safe($pdo,"ALTER TABLE chat_messages ADD INDEX idx_chat_messages_visitor (visitor_id)");
if (!has_col($pdo,'chat_messages','drama_id')) exec_safe($pdo,"ALTER TABLE chat_messages ADD COLUMN drama_id INT UNSIGNED NULL AFTER visitor_id");
if (!has_col($pdo,'chat_messages','category_id')) exec_safe($pdo,"ALTER TABLE chat_messages ADD COLUMN category_id INT UNSIGNED NULL AFTER drama_id");
if (!has_col($pdo,'chat_messages','reply_to_message_id')) exec_safe($pdo,"ALTER TABLE chat_messages ADD COLUMN reply_to_message_id BIGINT UNSIGNED NULL AFTER category_id");
if (!has_col($pdo,'chat_messages','bot_profile_id')) exec_safe($pdo,"ALTER TABLE chat_messages ADD COLUMN bot_profile_id INT UNSIGNED NULL AFTER reply_to_message_id");
if (!has_index($pdo,'chat_messages','idx_chat_messages_drama')) exec_safe($pdo,"ALTER TABLE chat_messages ADD INDEX idx_chat_messages_drama (drama_id, created_at)");
if (!has_index($pdo,'chat_messages','idx_chat_messages_reply')) exec_safe($pdo,"ALTER TABLE chat_messages ADD INDEX idx_chat_messages_reply (reply_to_message_id)");
if (!has_index($pdo,'chat_messages','idx_chat_messages_bot_profile')) exec_safe($pdo,"ALTER TABLE chat_messages ADD INDEX idx_chat_messages_bot_profile (bot_profile_id, created_at)");
if (!has_col($pdo,'bot_message_logs','bot_profile_id')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD COLUMN bot_profile_id INT UNSIGNED NULL AFTER id");
if (!has_col($pdo,'bot_message_logs','visitor_id')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD COLUMN visitor_id CHAR(32) NULL AFTER bot_profile_id");
if (!has_col($pdo,'bot_message_logs','drama_id')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD COLUMN drama_id INT UNSIGNED NULL AFTER visitor_id");
if (!has_col($pdo,'bot_message_logs','category_id')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD COLUMN category_id INT UNSIGNED NULL AFTER drama_id");
if (!has_col($pdo,'bot_message_logs','mood')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD COLUMN mood VARCHAR(80) NULL AFTER source");
if (!has_col($pdo,'bot_message_logs','time_context')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD COLUMN time_context VARCHAR(120) NULL AFTER mood");
if (!has_index($pdo,'bot_message_logs','idx_bot_logs_profile')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD INDEX idx_bot_logs_profile (bot_profile_id, created_at)");
if (!has_index($pdo,'bot_message_logs','idx_bot_logs_drama')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD INDEX idx_bot_logs_drama (drama_id, created_at)");
if (!has_index($pdo,'bot_message_logs','idx_bot_logs_visitor')) exec_safe($pdo,"ALTER TABLE bot_message_logs ADD INDEX idx_bot_logs_visitor (visitor_id, created_at)");

$ctx=$pdo->prepare("INSERT INTO bot_context_state (context_key, context_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE context_key=context_key");
foreach(['site_mood'=>'دراما، تشويق، ترشيحات ذكية، شات آمن','season_override'=>'auto','occasion'=>'','bot_directive'=>'اتكلم كزائر طبيعي متابع للمسلسل. لا تكتب روابط أو أرقام أو وعود وهمية. نوّع الكلام ولا تكرر نفسك.'] as $k=>$v){$ctx->execute([$k,$v]);}
$prof=$pdo->prepare("INSERT INTO bot_profiles (display_name, persona, speech_style, preferred_domains, activity_level, memory_weight, response_delay_min, response_delay_max, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW()) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name)");
foreach([
['يوسف_99','شاب متحمس للدراما والأكشن، يلاحظ التحولات المفاجئة ويحب يفتح نقاش','عامي مصري قصير، حماسي، بدون مبالغة','["drama_content","general_chat"]',70,70,7,19],
['ملكة_الشات','متابعة عاطفية بتحب الرومانسية والخيانة وتعلق على الشخصيات','ناعم وفضولي ويسأل الناس رأيهم','["drama_content","general_chat"]',58,65,9,24],
['كينج_الدراما','خبير ترشيحات يربط المسلسل بتصنيفه ومسلسلات مشابهة','واثق وهادئ وبيتكلم كأنه فاهم الخريطة كلها','["drama_content","episode_links"]',62,80,8,22],
['دكتورة_نور','شخصية منظمة تهتم بأمان الشات وتمنع الأرقام والروابط بأسلوب لطيف','هادئ، مطمئن، يحافظ على القواعد','["trust_security","general_chat"]',45,55,12,28],
['برنس_المصري','زائر اجتماعي يحب السهرة والكلام الخفيف بين الحلقات','عامي، مرح، يعلق على الوقت والمزاج','["general_chat","games_apps"]',64,58,6,20],
['بنوتة_كول','متابعة خفيفة الدم بتحب المفاجآت وتسأل عن رأي الناس','خفيف، قصير، إنساني، فيه دهشة','["general_chat","drama_content"]',55,60,10,25]
] as $r){$prof->execute($r);} 
echo "DONE_ADVANCED_BOT_BRAIN_DB_MIGRATION\n";
PHP

chown -R www:www "$WEBROOT" 2>/dev/null || true
find "$WEBROOT" -type d -exec chmod 755 {} \; 2>/dev/null || true
find "$WEBROOT" -type f -exec chmod 644 {} \; 2>/dev/null || true

for f in api/config/bootstrap.php api/admin/data.php api/public/bot-settings.php api/public/bot-message.php api/chat/username.php api/chat/message.php api/chat/stream.php api/chat/bot-reply.php api/config/bot_engine.php; do php -l "$WEBROOT/$f"; done

php -r 'require "/var/www/arabshortdrama.cloud/api/config/bootstrap.php"; $pdo=db(); foreach(["bot_profiles","bot_memory_events","bot_conversation_summaries","bot_context_state","chat_visitor_identities","chat_bans","bot_message_logs","chat_messages"] as $t){ try{ echo $t."=".$pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn().PHP_EOL; }catch(Throwable $e){ echo $t."=ERR".PHP_EOL; }}'

echo "=== ADVANCED BOT API SMOKE ==="
curl -ks https://arabshortdrama.cloud/api/public/bot-settings.php | head -c 500; echo
curl -ks -X POST https://arabshortdrama.cloud/api/public/bot-message.php -H 'Content-Type: application/json' --data '{"drama_id":1}' | head -c 700; echo
curl -ks https://arabshortdrama.cloud/api/chat/stream.php?drama_id=1 | head -c 700; echo

echo "DONE_BOT_CHAT_CORE_ADVANCED_REPLY_MYSQL_DEPLOYED_ARABSHORTDRAMA_ONLY"
'@

Write-Host "Applying Advanced Bot Brain on VPS..." -ForegroundColor Cyan
$sh | ssh $Vps "bash -s"
