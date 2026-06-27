-- Strict repair migration for PHP + MySQL only.
-- Safe to run after schema_mysql.sql. Does not drop real data.
USE arabshortdrama;

ALTER TABLE admin_sessions
  ADD COLUMN IF NOT EXISTS revoked_at DATETIME NULL AFTER last_activity_at,
  ADD INDEX IF NOT EXISTS idx_admin_sessions_expiry (expires_at),
  ADD INDEX IF NOT EXISTS idx_admin_sessions_revoked (revoked_at);

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS status ENUM('visible','hidden','deleted','reviewed') NOT NULL DEFAULT 'visible' AFTER session_id,
  ADD COLUMN IF NOT EXISTS is_bot TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS reviewed_by INT UNSIGNED NULL AFTER is_bot,
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL AFTER reviewed_by,
  ADD INDEX IF NOT EXISTS idx_chat_status_created (status, created_at),
  ADD INDEX IF NOT EXISTS idx_chat_is_bot (is_bot);

CREATE TABLE IF NOT EXISTS bot_message_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  domain VARCHAR(80) NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'bot_engine',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bot_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_restrictions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(160) NULL,
  normalized_username VARCHAR(120) NULL,
  reason VARCHAR(100) NOT NULL,
  restricted_until DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_restrictions_session (session_id),
  INDEX idx_chat_restrictions_until (restricted_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO admin_settings (setting_key, setting_value, updated_at) VALUES
('bot_feed_enabled','1',NOW()),
('bot_polling_interval','10',NOW()),
('bot_knowledge_base','',NOW()),
('bot_target_game','لعبة ببجي الجديدة',NOW()),
('bot_steering_weight','15',NOW()),
('chat_cooldown_seconds','30',NOW()),
('chat_rate_limit_per_minute','6',NOW()),
('chat_username_required','1',NOW()),
('chat_frontend_warning','1',NOW()),
('chat_backend_moderation','1',NOW())
ON DUPLICATE KEY UPDATE setting_key=setting_key;

CREATE TABLE IF NOT EXISTS viewer_series_access (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  viewer_id CHAR(32) NOT NULL,
  drama_id INT UNSIGNED NOT NULL,
  visit_count INT UNSIGNED NOT NULL DEFAULT 0,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  UNIQUE KEY uq_viewer_drama (viewer_id, drama_id),
  INDEX idx_viewer_access_viewer (viewer_id),
  INDEX idx_viewer_access_drama (drama_id),
  CONSTRAINT fk_viewer_access_drama FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Advanced Bot Brain + visitor identity/ban memory layer.
CREATE TABLE IF NOT EXISTS chat_visitor_identities (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id CHAR(32) NOT NULL UNIQUE,
  current_username VARCHAR(80) NULL,
  normalized_username VARCHAR(120) NULL,
  ip_hash CHAR(64) NULL,
  user_agent_hash CHAR(64) NULL,
  reputation_score INT NOT NULL DEFAULT 0,
  status ENUM('active','restricted','banned') NOT NULL DEFAULT 'active',
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  INDEX idx_visitor_username (normalized_username),
  INDEX idx_visitor_ip_hash (ip_hash),
  INDEX idx_visitor_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_bans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id CHAR(32) NULL,
  ip_hash CHAR(64) NULL,
  reason VARCHAR(160) NOT NULL,
  banned_until DATETIME NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_bans_visitor (visitor_id),
  INDEX idx_chat_bans_ip (ip_hash),
  INDEX idx_chat_bans_active (active, banned_until),
  CONSTRAINT fk_chat_bans_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE chat_active_usernames
  ADD COLUMN IF NOT EXISTS visitor_id CHAR(32) NULL AFTER session_id,
  ADD INDEX IF NOT EXISTS idx_chat_active_visitor (visitor_id);

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS visitor_id CHAR(32) NULL AFTER session_id,
  ADD INDEX IF NOT EXISTS idx_chat_messages_visitor (visitor_id);

CREATE TABLE IF NOT EXISTS bot_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL UNIQUE,
  persona VARCHAR(160) NOT NULL,
  speech_style VARCHAR(160) NOT NULL,
  preferred_domains JSON NULL,
  preferred_category_id INT UNSIGNED NULL,
  activity_level TINYINT UNSIGNED NOT NULL DEFAULT 60,
  memory_weight TINYINT UNSIGNED NOT NULL DEFAULT 50,
  response_delay_min INT UNSIGNED NOT NULL DEFAULT 6,
  response_delay_max INT UNSIGNED NOT NULL DEFAULT 22,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_spoke_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bot_profiles_active (active),
  CONSTRAINT fk_bot_profiles_category FOREIGN KEY (preferred_category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_memory_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bot_profile_id INT UNSIGNED NULL,
  visitor_id CHAR(32) NULL,
  drama_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  event_type VARCHAR(80) NOT NULL,
  event_text TEXT NOT NULL,
  importance TINYINT UNSIGNED NOT NULL DEFAULT 50,
  metadata_json JSON NULL,
  expires_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bot_memory_bot (bot_profile_id, created_at),
  INDEX idx_bot_memory_visitor (visitor_id, created_at),
  INDEX idx_bot_memory_drama (drama_id, created_at),
  INDEX idx_bot_memory_type (event_type, created_at),
  CONSTRAINT fk_bot_memory_profile FOREIGN KEY (bot_profile_id) REFERENCES bot_profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_bot_memory_drama FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE SET NULL,
  CONSTRAINT fk_bot_memory_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_conversation_summaries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_key VARCHAR(180) NOT NULL UNIQUE,
  drama_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  summary_text TEXT NOT NULL,
  dominant_mood VARCHAR(80) NOT NULL DEFAULT 'neutral',
  message_count INT UNSIGNED NOT NULL DEFAULT 0,
  last_message_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bot_summary_drama (drama_id),
  INDEX idx_bot_summary_category (category_id),
  CONSTRAINT fk_bot_summary_drama FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE SET NULL,
  CONSTRAINT fk_bot_summary_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bot_context_state (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  context_key VARCHAR(120) NOT NULL UNIQUE,
  context_value TEXT NOT NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bot_context_admin FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE bot_message_logs
  ADD COLUMN IF NOT EXISTS bot_profile_id INT UNSIGNED NULL AFTER id,
  ADD COLUMN IF NOT EXISTS visitor_id CHAR(32) NULL AFTER bot_profile_id,
  ADD COLUMN IF NOT EXISTS drama_id INT UNSIGNED NULL AFTER visitor_id,
  ADD COLUMN IF NOT EXISTS category_id INT UNSIGNED NULL AFTER drama_id,
  ADD COLUMN IF NOT EXISTS mood VARCHAR(80) NULL AFTER source,
  ADD COLUMN IF NOT EXISTS time_context VARCHAR(120) NULL AFTER mood,
  ADD INDEX IF NOT EXISTS idx_bot_logs_profile (bot_profile_id, created_at),
  ADD INDEX IF NOT EXISTS idx_bot_logs_drama (drama_id, created_at),
  ADD INDEX IF NOT EXISTS idx_bot_logs_visitor (visitor_id, created_at);

INSERT INTO bot_context_state (context_key, context_value, updated_at) VALUES
('site_mood','دراما، تشويق، ترشيحات ذكية، شات آمن',NOW()),
('season_override','auto',NOW()),
('occasion','',NOW()),
('bot_directive','اتكلم كزائر طبيعي متابع للمسلسل. لا تكتب روابط أو أرقام أو وعود وهمية. نوّع الكلام ولا تكرر نفسك.',NOW())
ON DUPLICATE KEY UPDATE context_key=context_key;

INSERT INTO bot_profiles (display_name, persona, speech_style, preferred_domains, activity_level, memory_weight, response_delay_min, response_delay_max, active) VALUES
('يوسف_99','شاب متحمس للدراما والأكشن، يلاحظ التحولات المفاجئة ويحب يفتح نقاش','عامي مصري قصير، حماسي، بدون مبالغة',JSON_ARRAY('drama_content','general_chat'),70,70,7,19,1),
('ملكة_الشات','متابعة عاطفية بتحب الرومانسية والخيانة وتعلق على الشخصيات','ناعم وفضولي ويسأل الناس رأيهم',JSON_ARRAY('drama_content','general_chat'),58,65,9,24,1),
('كينج_الدراما','خبير ترشيحات يربط المسلسل بتصنيفه ومسلسلات مشابهة','واثق وهادئ وبيتكلم كأنه فاهم الخريطة كلها',JSON_ARRAY('drama_content','episode_links'),62,80,8,22,1),
('دكتورة_نور','شخصية منظمة تهتم بأمان الشات وتمنع الأرقام والروابط بأسلوب لطيف','هادئ، مطمئن، يحافظ على القواعد',JSON_ARRAY('trust_security','general_chat'),45,55,12,28,1),
('برنس_المصري','زائر اجتماعي يحب السهرة والكلام الخفيف بين الحلقات','عامي، مرح، يعلق على الوقت والمزاج',JSON_ARRAY('general_chat','games_apps'),64,58,6,20,1),
('بنوتة_كول','متابعة خفيفة الدم بتحب المفاجآت وتسأل عن رأي الناس','خفيف، قصير، إنساني، فيه دهشة',JSON_ARRAY('general_chat','drama_content'),55,60,10,25,1)
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);


-- Bot Chat Core Stable: make chat one unified MySQL stream per drama and reply chain.
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS drama_id INT UNSIGNED NULL AFTER visitor_id,
  ADD COLUMN IF NOT EXISTS category_id INT UNSIGNED NULL AFTER drama_id,
  ADD COLUMN IF NOT EXISTS reply_to_message_id BIGINT UNSIGNED NULL AFTER category_id,
  ADD COLUMN IF NOT EXISTS bot_profile_id INT UNSIGNED NULL AFTER reply_to_message_id,
  ADD INDEX IF NOT EXISTS idx_chat_messages_drama (drama_id, created_at),
  ADD INDEX IF NOT EXISTS idx_chat_messages_reply (reply_to_message_id),
  ADD INDEX IF NOT EXISTS idx_chat_messages_bot_profile (bot_profile_id, created_at);
