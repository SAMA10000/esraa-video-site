USE arabshortdrama;

-- Seed من نفس بيانات Bolt/Supabase الأصلية الظاهرة في Tables:
-- categories = 9 rows, dramas = 22 rows, episodes = 0 rows.

INSERT INTO categories (name, slug, sort_order, status) VALUES
('الرئيسية', 'home', 1, 'active'),
('الأكثر مشاهدة', 'trending', 2, 'active'),
('دراما آسيوية', 'asian-drama', 3, 'active'),
('أبطال متخفون', 'hidden-heroes', 4, 'active'),
('قوة ونفوذ', 'power-influence', 5, 'active'),
('انتقام وصعود', 'revenge-rise', 6, 'active'),
('حب وخيانة', 'love-betrayal', 7, 'active'),
('أسرار العائلات', 'family-secrets', 8, 'active'),
('مسلسلات قصيرة', 'short-series', 9, 'active')
ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order), status=VALUES(status);

INSERT INTO dramas (title, slug, description, thumbnail_url, video_id, category_id, year, episodes_count, rating, view_count, status) VALUES
('الحب الخفي', 'hidden-love', 'قصة حب سرية بين وريثة ثرية وحارسها الشخصي، حيث تتلاقى القلوب في الظلام', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'x7jhdt', (SELECT id FROM categories WHERE slug = 'asian-drama'), 2024, 24, 4.9, 85000, 'published'),
('قلب المدينة', 'city-heart', 'شاب يبحث عن أصل الحقيقة وسط صخب المدينة', 'https://images.pexels.com/photos/1688815/pexels-photo-1688815.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'k3m9xp', (SELECT id FROM categories WHERE slug = 'asian-drama'), 2024, 20, 4.8, 72000, 'published'),
('نجمة الصباح', 'morning-star', 'فتاة فقيرة تكتشف أنها ابنة رجل أعمال ثري', 'https://images.pexels.com/photos/1118907/pexels-photo-1118907.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'm2k7vq', (SELECT id FROM categories WHERE slug = 'asian-drama'), 2024, 16, 4.7, 65000, 'published'),
('الظل المتخفي', 'hidden-shadow', 'بطل مجهول يحارب الفساد من الظلال، لا أحد يعرف هويته الحقيقية', 'https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'p9x2mn', (SELECT id FROM categories WHERE slug = 'hidden-heroes'), 2024, 30, 4.9, 92000, 'published'),
('القناع الذهبي', 'golden-mask', 'رجل أعمال يخفي هويته ليحمي المدينة من الخطر', 'https://images.pexels.com/photos/1696166/pexels-photo-1696166.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'j8k4mp', (SELECT id FROM categories WHERE slug = 'hidden-heroes'), 2024, 28, 4.8, 78000, 'published'),
('الواصم المنسي', 'forgotten-hero', 'بطل سابق يعود للحياة ليكتشف أن الأعداء استولوا على مملكته', 'https://images.pexels.com/photos/2101866/pexels-photo-2101866.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'n3w7xr', (SELECT id FROM categories WHERE slug = 'hidden-heroes'), 2024, 35, 4.7, 81000, 'published'),
('عرش الذئب', 'wolf-throne', 'صراع على السلطة بين رجال الأعمال الأقوياء في عالم الشركات', 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'q5z9kl', (SELECT id FROM categories WHERE slug = 'power-influence'), 2024, 40, 4.9, 95000, 'published'),
('مملكة الظل', 'shadow-kingdom', 'ملك يواجه تحديات من كل الجهات للحفاظ على عرشه', 'https://images.pexels.com/photos/3581364/pexels-photo-3581364.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 't4r2bp', (SELECT id FROM categories WHERE slug = 'power-influence'), 2024, 32, 4.8, 88000, 'published'),
('الإمبراطور الأخير', 'last-emperor', 'قصة إمبراطورية على وشك السقوط ووريث يقاتل لإنقاذها', 'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'w8k3mx', (SELECT id FROM categories WHERE slug = 'power-influence'), 2023, 45, 4.9, 102000, 'published'),
('النار الباردة', 'cold-fire', 'رجل يتراجع من الظلام للانتقام ممن دمروا حياته', 'https://images.pexels.com/photos/2089658/pexels-photo-2089658.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'b7x4pn', (SELECT id FROM categories WHERE slug = 'revenge-rise'), 2024, 28, 4.8, 79000, 'published'),
('من الرماد', 'from-ashes', 'بطل ينطلق من الصفر ليصبح أقوى شخص في المدينة', 'https://images.pexels.com/photos/2422253/pexels-photo-2422253.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'c9m2vx', (SELECT id FROM categories WHERE slug = 'revenge-rise'), 2024, 36, 4.9, 86000, 'published'),
('الغضب الصامت', 'silent-rage', 'رجل صامت يخطط لسنوات للإطاحة بمن ظلموه', 'https://images.pexels.com/photos/1170986/pexels-photo-1170986.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'd3k8pq', (SELECT id FROM categories WHERE slug = 'revenge-rise'), 2024, 24, 4.7, 71000, 'published'),
('القلب المكسور', 'broken-heart', 'قصة حب تنتهي بخيانة مدمرة تغير كل شيء', 'https://images.pexels.com/photos/1036808/pexels-photo-1036808.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'f7r2mn', (SELECT id FROM categories WHERE slug = 'love-betrayal'), 2024, 20, 4.8, 68000, 'published'),
('غموض الحب', 'love-shadow', 'حب ممنوع بين شخصين من عائلات متعادية', 'https://images.pexels.com/photos/1688440/pexels-photo-1688440.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'h9p4xd', (SELECT id FROM categories WHERE slug = 'love-betrayal'), 2024, 18, 4.7, 62000, 'published'),
('الزهور الحزينة', 'sad-flowers', 'امرأة تخون زوجها لتكتشف أن الحب كان كذبة', 'https://images.pexels.com/photos/1259692/pexels-photo-1259692.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'k2x7vb', (SELECT id FROM categories WHERE slug = 'love-betrayal'), 2024, 22, 4.6, 58000, 'published'),
('بيت الأسرار', 'house-secrets', 'عائلة ثرية تخفي أسراراً مدمرة عن الماضي', 'https://images.pexels.com/photos/2774197/pexels-photo-2774197.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'm5n9cp', (SELECT id FROM categories WHERE slug = 'family-secrets'), 2024, 30, 4.8, 74000, 'published'),
('وريث الظلام', 'dark-heir', 'وريث وحيد يكتشف أن عائلته مبنية على أكاذيب', 'https://images.pexels.com/photos/1450353/pexels-photo-1450353.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'p3k8xb', (SELECT id FROM categories WHERE slug = 'family-secrets'), 2024, 26, 4.9, 82000, 'published'),
('الدم المقدس', 'sacred-blood', 'صراع بين الإخوة على إرث العائلة المقدس', 'https://images.pexels.com/photos/1498931/pexels-photo-1498931.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'q7m4vn', (SELECT id FROM categories WHERE slug = 'family-secrets'), 2024, 32, 4.7, 69000, 'published'),
('لحظة وداع', 'farewell-moment', 'قصة قصيرة عن وداع يغير حياة الجميع', 'https://images.pexels.com/photos/994517/pexels-photo-994517.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'r9x2kp', (SELECT id FROM categories WHERE slug = 'short-series'), 2024, 8, 4.8, 55000, 'published'),
('رسالة أخيرة', 'last-message', 'رسالة غامضة تكشف أسراراً مدفونة', 'https://images.pexels.com/photos/1181679/pexels-photo-1181679.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 's4m7dx', (SELECT id FROM categories WHERE slug = 'short-series'), 2024, 6, 4.7, 48000, 'published'),
('السر المنسي', 'forgotten-secret', 'سر قديم يعود ليطارد من نسيه', 'https://images.pexels.com/photos/1198817/pexels-photo-1198817.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 't2w8mk', (SELECT id FROM categories WHERE slug = 'short-series'), 2024, 10, 4.9, 61000, 'published'),
('صمت الليل', 'night-silence', 'قصة رعب قصيرة عن أسرار الليل', 'https://images.pexels.com/photos/1668022/pexels-photo-1668022.jpeg?auto=compress&cs=tinysrgb&w=400&h=711&fit=crop', 'u5n3pr', (SELECT id FROM categories WHERE slug = 'short-series'), 2024, 5, 4.6, 42000, 'published')
ON DUPLICATE KEY UPDATE
  title=VALUES(title),
  description=VALUES(description),
  thumbnail_url=VALUES(thumbnail_url),
  video_id=VALUES(video_id),
  category_id=VALUES(category_id),
  year=VALUES(year),
  episodes_count=VALUES(episodes_count),
  rating=VALUES(rating),
  view_count=VALUES(view_count),
  status=VALUES(status);

-- جدول episodes مقصود يبقى فاضي الآن، مطابق للصورة: 0 rows.

-- أدمن مؤقت للتجربة الأولى فقط. غيّريه فوراً من لوحة التحكم.
-- username: admin
-- password: esraam1919
INSERT INTO admin_users (username, email, password_hash, role, status)
VALUES ('admin', NULL, '$2y$12$bMCJ6iTuY3Y12YAO0K5r6eC7KisXEtGYbF/xdnHMkHuFI6C90wbyC', 'super_admin', 'active')
ON DUPLICATE KEY UPDATE role='super_admin', status='active';


-- إعدادات بوتات أولية محفوظة في MySQL، وليست واجهة ميتة.
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('bot_knowledge_base', ''),
('bot_target_game', 'لعبة ببجي الجديدة'),
('bot_steering_weight', '15')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW();

-- إعدادات الدردشة والبوتات المطلوبة للوحة أدمن غير ميتة.
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('bot_feed_enabled', '1'),
('bot_polling_interval', '10'),
('chat_cooldown_seconds', '30'),
('chat_rate_limit_per_minute', '6'),
('chat_username_required', '1'),
('chat_frontend_warning', '1'),
('chat_backend_moderation', '1')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW();

-- إعدادات عامة حقيقية محفوظة في MySQL.
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('site_title', 'دراما قصيرة بالعربي'),
('site_subtitle', 'arabshortdrama.cloud'),
('site_maintenance_mode', '0'),
('site_homepage_limit', '24'),
('site_analytics_enabled', '1')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), updated_at=NOW();

-- Pre-written conversation threads (side conversations between bots)
INSERT INTO bot_threads (title, category_id, messages_json, is_active) VALUES
('جدال حول الإمبراطور الأخير', NULL, '[
  {"bot_name":"يوسف_99","text":"والله الحلقة الأخيرة من الإمبراطور الأخير خربت بيتي"},
  {"bot_name":"ملكة_الشات","text":"يا بعد حيي، أنا لسه مش شايفاها 😢"},
  {"bot_name":"كينج_الدراما","text":"لا تتفرجي لوحدك، فيه مشهد صعب"},
  {"bot_name":"يوسف_99","text":"المشهد ده اللي بيخلي المسلسل جامد!"},
  {"bot_name":"ملكة_الشات","text":"يا قاسي، فيه ناس عندها قلوب"}
]', 1),
('ترشيحات الأكشن', NULL, '[
  {"bot_name":"كينج_الدراما","text":"يا شباب، مين شاف عرش الذئب؟"},
  {"bot_name":"يوسف_99","text":"أنا شايفه، جامد جداً بس الإمبراطور أحسن"},
  {"bot_name":"دكتورة_نور","text":"أنا بفضل الحكايات الهادية، بس الأكشن كويس برضه"},
  {"bot_name":"برنس_المصري","text":"الانتقام في عرش الذئب مش طبيعي 🔥"}
]', 1),
('السهرة والدراما', NULL, '[
  {"bot_name":"ملكة_الشات","text":"السهرة دي مناسبة للدراما التقيلة"},
  {"bot_name":"يوسف_99","text":"صح، الليل ده معمول للأكشن والانتقام"},
  {"bot_name":"كينج_الدراما","text":"أنا بقول أي وقت مناسب لو المسلسل كويس"},
  {"bot_name":"دكتورة_نور","text":"المهم الإحساس، مش الوقت"}
]', 1);


-- Real bot personalities with dialects
INSERT INTO bot_profiles (display_name, persona, speech_style, dialect, preferred_domains, preferred_category_id, activity_level, memory_weight, response_delay_min, response_delay_max, active) VALUES
('يوسف_99', 'يحب الأكشن والانتقام والصعود. شخصية عصبية وساخرة. بيحب يجادل. عدوه ملكة_الشات.', 'عصبي، ساخر، مصري', 'egyptian', '["drama_content","general_chat"]', NULL, 85, 60, 3, 8, 1),
('ملكة_الشات', 'رومانسية وناعمة وعاطفية. بتحب الدراما الآسيوية والحب الخفي. بتقول يا بعد حيي كتير. عدوها يوسف_99.', 'رومانسي، ناعم، خليجي', 'gulf', '["drama_content","general_chat"]', NULL, 80, 70, 4, 10, 1),
('كينج_الدراما', 'خبير ترشيحات. هادئ ومتزن. بيفهم في كل التصنيفات. بيحكم بين البوتات المتخاصمة.', 'حكيم، متزن، شامي', 'sham', '["episode_links","drama_content","general_chat"]', NULL, 75, 80, 5, 12, 1),
('دكتورة_نور', 'هادئة ولطيفة. بتحب القصص الإنسانية والأسرار. بتنصح الناس بالهدوء.', 'هادئ، لطيف، مغربي', 'maghreb', '["drama_content","general_chat"]', NULL, 65, 55, 6, 14, 1),
('برنس_المصري', 'فخور ومتعجرف شوية. بيحب الأكشن والقتال. بيتكلم بثقة.', 'متعجرف، واثق، مصري', 'egyptian', '["drama_content","general_chat"]', NULL, 70, 50, 4, 9, 1),
('بنوتة_كول', 'شبابية وعصرية. بتحب الترند والموضة. بتتكلم بسرعة.', 'شبابي، عصري، مصري', 'egyptian', '["general_chat","games_apps"]', NULL, 60, 45, 3, 7, 1),
('سوليفان_الأسطوري', 'غامض وعميق. بيحب الغموض والأسرار. كلامه قليل بس مؤثر.', 'غامض، عميق، شامي', 'sham', '["drama_content","general_chat"]', NULL, 55, 75, 7, 15, 1),
('ست_الكل', 'حكيمة وكبيرة. بتنصح الجميع. بتحب قصص العائلات والأسرار.', 'حكيم، كبير، خليجي', 'gulf', '["drama_content","general_chat"]', NULL, 50, 85, 5, 11, 1),
('فنان_العرب', 'فنان ومتقلب المزاج. بيحب يتكلم عن الممثلين والأداء التمثيلي.', 'فني، متقلب، مغربي', 'maghreb', '["drama_content","general_chat"]', NULL, 60, 60, 4, 10, 1);


-- Slang dictionary seed data
INSERT INTO slang_dictionary (term, meaning, sentiment, dialect) VALUES
('طرش', 'إعجاب قوي جداً', 'positive', 'general'),
('نار', 'ممتاز / قوي جداً', 'positive', 'general'),
('جامد', 'ممتاز / قوي', 'positive', 'egyptian'),
('فشخ', 'ممتاز بشكل مبالغ فيه', 'positive', 'egyptian'),
('تحفة', 'عمل فني رائع', 'positive', 'general'),
('رهيب', 'مخيف بمعنى ممتاز', 'positive', 'general'),
('صدمة', 'مفاجأة غير متوقعة', 'neutral', 'general'),
('خيانة', 'غدر / خداع', 'negative', 'general'),
('انتقام', 'الرد على الظلم', 'neutral', 'general'),
('صعود', 'التقدم والنجاح', 'positive', 'general'),
('غموض', 'شيء غير واضح', 'neutral', 'general'),
('حماس', 'إثارة وقوة', 'positive', 'general'),
('وحش', 'سيء جداً', 'negative', 'general'),
('ممل', 'غير مثير', 'negative', 'general'),
('بايظ', 'سيء / تالف', 'negative', 'egyptian'),
('كده', 'بهذا الشكل', 'neutral', 'egyptian'),
('يعني', 'أي / أي شيء', 'neutral', 'egyptian'),
('صافي', 'حسناً / تمام', 'neutral', 'gulf'),
('هلا', 'مرحباً', 'positive', 'gulf'),
('شو', 'ماذا', 'question', 'sham'),
('كتير', 'كثيراً', 'neutral', 'sham'),
('بزاف', 'كثيراً', 'neutral', 'maghreb'),
('خويا', 'أخي / صديقي', 'positive', 'maghreb'),
('يا عم', 'نداء للصديق', 'neutral', 'egyptian'),
('يا بعد حيي', 'تعابير إعجاب وترحيب', 'positive', 'gulf'),
('يا عمري', 'تعبير حب وإعجاب', 'positive', 'sham');

