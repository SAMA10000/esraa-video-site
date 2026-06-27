CREATE DATABASE IF NOT EXISTS arabshortdrama CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE arabshortdrama;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dramas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  thumbnail_url TEXT NULL,
  video_id VARCHAR(100) NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  view_count INT UNSIGNED NOT NULL DEFAULT 0,
  rating DECIMAL(3,1) NOT NULL DEFAULT 4.5,
  year SMALLINT UNSIGNED NOT NULL DEFAULT 2026,
  episodes_count INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dramas_category (category_id),
  INDEX idx_dramas_status_views (status, view_count),
  CONSTRAINT fk_dramas_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS episodes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  drama_id INT UNSIGNED NOT NULL,
  episode_number INT UNSIGNED NOT NULL,
  title VARCHAR(255) NULL,
  video_id VARCHAR(100) NOT NULL,
  duration INT UNSIGNED NOT NULL DEFAULT 45,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_episode_drama_number (drama_id, episode_number),
  INDEX idx_episodes_drama (drama_id),
  CONSTRAINT fk_episodes_drama FOREIGN KEY (drama_id) REFERENCES dramas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(190) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin','admin') NOT NULL DEFAULT 'admin',
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NOT NULL,
  session_token VARCHAR(160) NOT NULL UNIQUE,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  last_activity_at DATETIME NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_sessions_token (session_token),
  INDEX idx_admin_sessions_admin_id (admin_id),
  INDEX idx_admin_sessions_expiry (expires_at),
  INDEX idx_admin_sessions_revoked (revoked_at),
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(190) NOT NULL UNIQUE,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
  first_attempt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_until DATETIME NULL,
  INDEX idx_login_attempts_identifier (identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_rate_limits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(80) NOT NULL UNIQUE,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
  first_attempt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME NULL,
  INDEX idx_rate_limits_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id VARCHAR(80) NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(255) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_admin (admin_id),
  INDEX idx_audit_action (action),
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_active_usernames (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  normalized_username VARCHAR(120) NOT NULL,
  session_id VARCHAR(160) NOT NULL UNIQUE,
  last_seen_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_name (normalized_username),
  INDEX idx_chat_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  session_id VARCHAR(160) NOT NULL,
  visitor_id CHAR(32) NULL,
  drama_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  reply_to_message_id BIGINT UNSIGNED NULL,
  bot_profile_id INT UNSIGNED NULL,
  status ENUM('visible','hidden','deleted','reviewed') NOT NULL DEFAULT 'visible',
  is_bot TINYINT(1) NOT NULL DEFAULT 0,
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_created (created_at),
  INDEX idx_chat_status_created (status, created_at),
  INDEX idx_chat_is_bot (is_bot),
  INDEX idx_chat_session (session_id),
  INDEX idx_chat_messages_visitor (visitor_id),
  INDEX idx_chat_messages_drama (drama_id, created_at),
  INDEX idx_chat_messages_reply (reply_to_message_id),
  INDEX idx_chat_messages_bot_profile (bot_profile_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



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

CREATE TABLE IF NOT EXISTS admin_settings (
  setting_key VARCHAR(120) PRIMARY KEY,
  setting_value LONGTEXT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admin_settings_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


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

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id VARCHAR(80) NULL,
  source VARCHAR(120) NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_event_created (created_at)
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





CREATE TABLE IF NOT EXISTS bot_profiles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(80) NOT NULL UNIQUE,
  persona VARCHAR(160) NOT NULL,
  speech_style VARCHAR(160) NOT NULL,
  dialect ENUM('egyptian','gulf','sham','maghreb','general') DEFAULT 'general',
  preferred_domains JSON NULL,
  preferred_category_id INT UNSIGNED NULL,
  activity_level TINYINT UNSIGNED NOT NULL DEFAULT 60,
  memory_weight TINYINT UNSIGNED NOT NULL DEFAULT 50,
  response_delay_min INT UNSIGNED NOT NULL DEFAULT 6,
  response_delay_max INT UNSIGNED NOT NULL DEFAULT 22,
  active TINYINT(1) NOT NULL DEFAULT 1,
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  last_seen_at DATETIME NULL,
  next_entry_time DATETIME NULL,
  session_end_time DATETIME NULL,
  activity_pattern ENUM('night_owl','day_person','evening','all_day','weekend_warrior','random') DEFAULT 'all_day',
  avg_session_minutes INT UNSIGNED DEFAULT 60,
  entries_per_day INT UNSIGNED DEFAULT 3,
  personality_intensity INT UNSIGNED DEFAULT 70,
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


-- Slang dictionary for bot understanding
CREATE TABLE IF NOT EXISTS slang_dictionary (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  term VARCHAR(100) NOT NULL UNIQUE,
  meaning TEXT,
  sentiment ENUM('positive','negative','neutral','question') DEFAULT 'neutral',
  dialect VARCHAR(50) DEFAULT 'general',
  added_by VARCHAR(50) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_term (term),
  INDEX idx_dialect (dialect)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unknown terms collected from chat for admin review
CREATE TABLE IF NOT EXISTS unknown_chat_terms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  term VARCHAR(100) NOT NULL,
  context TEXT,
  visitor_id VARCHAR(64) DEFAULT NULL,
  message_id INT UNSIGNED DEFAULT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT UNSIGNED DEFAULT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_term (term),
  INDEX idx_status (status),
  INDEX idx_visitor (visitor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Pre-written conversation threads between bots (side conversations)
CREATE TABLE IF NOT EXISTS bot_threads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  messages_json TEXT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  current_index INT UNSIGNED DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Reply templates for bot responses (editable from admin)
CREATE TABLE IF NOT EXISTS reply_templates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  domain ENUM('episode_links','drama_content','games_apps','trust_security','general_chat') DEFAULT 'general_chat',
  template TEXT NOT NULL,
  sentiment ENUM('positive','negative','neutral','question') DEFAULT 'neutral',
  dialect VARCHAR(50) DEFAULT 'general',
  is_active TINYINT(1) DEFAULT 1,
  use_count INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_domain (domain),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Fake active users for crowd simulation (FOMO)
CREATE TABLE IF NOT EXISTS fake_active_users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(120) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  country VARCHAR(50) DEFAULT 'مصر',
  is_online TINYINT(1) DEFAULT 1,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  join_message TEXT,
  leave_message TEXT,
  activity_pattern ENUM('high','medium','low') DEFAULT 'medium',
  session_end_time DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Real visitor analytics
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  user_agent TEXT,
  device_type ENUM('mobile','desktop','tablet') DEFAULT 'desktop',
  browser VARCHAR(100),
  os VARCHAR(100),
  referrer VARCHAR(500),
  landing_page VARCHAR(500),
  session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_end TIMESTAMP NULL,
  total_duration INT UNSIGNED DEFAULT 0,
  page_views INT UNSIGNED DEFAULT 0,
  messages_sent INT UNSIGNED DEFAULT 0,
  dramas_watched INT UNSIGNED DEFAULT 0,
  cta_clicks INT UNSIGNED DEFAULT 0,
  INDEX idx_visitor (visitor_id),
  INDEX idx_country (country),
  INDEX idx_session_start (session_start),
  INDEX idx_device (device_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_page_views (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  session_id INT UNSIGNED,
  page_url VARCHAR(500),
  page_type ENUM('home','watch','browse','search','admin','other') DEFAULT 'other',
  drama_id INT UNSIGNED,
  duration_seconds INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor (visitor_id),
  INDEX idx_drama (drama_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  session_id INT UNSIGNED,
  event_type ENUM('page_view','video_start','video_complete','chat_message','cta_click','search','share','download','login','register','other') DEFAULT 'other',
  event_data JSON,
  drama_id INT UNSIGNED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor (visitor_id),
  INDEX idx_event_type (event_type),
  INDEX idx_drama (drama_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_analytics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64),
  username VARCHAR(100),
  message_text TEXT,
  message_length INT UNSIGNED,
  has_emoji TINYINT(1) DEFAULT 0,
  sentiment ENUM('positive','negative','neutral','question') DEFAULT 'neutral',
  drama_id INT UNSIGNED,
  bot_replied TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor (visitor_id),
  INDEX idx_sentiment (sentiment),
  INDEX idx_drama (drama_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- CPA Network tracking
CREATE TABLE IF NOT EXISTS cpa_networks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  network_type ENUM('propellerads','adsterra','pushhouse','other') DEFAULT 'other',
  postback_url VARCHAR(500),
  api_key VARCHAR(255),
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CPA Campaigns
CREATE TABLE IF NOT EXISTS cpa_campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  network_id INT UNSIGNED,
  campaign_name VARCHAR(200),
  target_url VARCHAR(500),
  click_id_param VARCHAR(50) DEFAULT 'subid',
  payout DECIMAL(10,2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  clicks INT UNSIGNED DEFAULT 0,
  conversions INT UNSIGNED DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_network (network_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CPA Clicks tracking
CREATE TABLE IF NOT EXISTS cpa_clicks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id INT UNSIGNED,
  visitor_id VARCHAR(64),
  click_id VARCHAR(255),
  ip_address VARCHAR(45),
  country VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  referrer VARCHAR(500),
  landing_page VARCHAR(500),
  converted TINYINT(1) DEFAULT 0,
  conversion_value DECIMAL(10,2) DEFAULT 0.00,
  converted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_campaign (campaign_id),
  INDEX idx_visitor (visitor_id),
  INDEX idx_click_id (click_id),
  INDEX idx_converted (converted),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CTA Button tracking
CREATE TABLE IF NOT EXISTS cta_tracking (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64),
  cta_type ENUM('gate_unlock','video_play','share','download','subscribe','other') DEFAULT 'other',
  cta_location VARCHAR(100),
  drama_id INT UNSIGNED,
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  converted TINYINT(1) DEFAULT 0,
  conversion_source VARCHAR(100),
  INDEX idx_visitor (visitor_id),
  INDEX idx_cta_type (cta_type),
  INDEX idx_drama (drama_id),
  INDEX idx_created (clicked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- A/B Testing for CTA buttons
CREATE TABLE IF NOT EXISTS ab_tests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  test_name VARCHAR(100) NOT NULL,
  element_type ENUM('button_text','button_color','button_position','gate_message','other') DEFAULT 'button_text',
  is_active TINYINT(1) DEFAULT 1,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  test_id INT UNSIGNED,
  variant_name VARCHAR(50) NOT NULL,
  variant_value TEXT NOT NULL,
  weight INT UNSIGNED DEFAULT 1,
  impressions INT UNSIGNED DEFAULT 0,
  clicks INT UNSIGNED DEFAULT 0,
  conversions INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_test (test_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visitor (visitor_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

