-- ============================================================
-- FitApp Faz 3: Bildirim Kuralları & Custom Widget Tabloları
-- Supabase SQL Editor'da çalıştırarak tabloları oluşturabilirsiniz.
-- ============================================================

-- 1. Bildirim Kuralları Tablosu
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'antrenman', 'motivasyon', 'dis_fircalama', 'yuruyus', 'sinav', 'yemek', 'ozel_kayit'
  scheduled_time VARCHAR(10) NOT NULL, -- Örn: '18:00'
  days_of_week VARCHAR(100) NOT NULL DEFAULT '0,1,2,3,4,5,6', -- '0,1,2,3,4,5,6' (0=Pazar, 1=Pazartesi...)
  voice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  voice_script TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Custom Widget Tablosu
CREATE TABLE IF NOT EXISTS public.custom_widgets (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  widget_type VARCHAR(50) NOT NULL, -- 'countdown', 'custom_text', 'weight_goal'
  target_time VARCHAR(100), -- Örn: '18:00:00' veya '2026-11-05T18:00:00'
  custom_content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Başlangıç Varsayılan Bildirim Kuralları
INSERT INTO public.notification_rules (title, subtitle, message, category, scheduled_time, days_of_week, voice_enabled, voice_script, is_active)
VALUES
  ('🏋️‍♂️ Antrenman Zamanı!', 'Günün Hedefi', 'Bugün üst vücut antrenmanın var. Ayakkabılarını bağla ve salona doğru yola çık!', 'antrenman', '18:00', '1,2,3,4,5', TRUE, 'Günün en verimli anı geldi! Bugün antrenmanında sınırlarını zorlama zamanı. Unutma, şampiyonlar pes etmeyenlerdir.', TRUE),
  ('🔥 Sabah Motivasyonu', 'Güne Başlarken', 'Her yeni gün yeni bir şans. Bugün kendin için bir iyilik yap ve hedefine odaklan.', 'motivasyon', '09:00', '0,1,2,3,4,5,6', TRUE, 'Günaydın şampiyon! Bugün yapacağın her tekrar, içeceğin her bardak su seni hedefine bir adım daha yaklaştıracak.', TRUE),
  ('🪥 Diş Fırçalama Hatırlatıcısı', 'Gece Rutini', 'Günü bitirmeden önce dişlerini fırçalamayı unutma! Sağlıklı bir gülüş her şeydir.', 'dis_fircalama', '23:00', '0,1,2,3,4,5,6', FALSE, NULL, TRUE),
  ('🚶‍♂️ Temiz Hava Yürüyüşü', 'Adım Hedefi', 'Akşam yürüyüşü için harika bir hava var. 20 dakikalık bir yürüyüşle zihnini boşalt.', 'yuruyus', '20:00', '1,3,5', TRUE, 'Temiz hava ve hafif bir yürüyüş günün yorgunluğunu silip atacak. Kulaklığını tak ve adımlarını say.', TRUE)
ON CONFLICT DO NOTHING;

-- Başlangıç Varsayılan Custom Widget'ları
INSERT INTO public.custom_widgets (title, widget_type, target_time, custom_content, is_active, display_order)
VALUES
  ('⏱️ Antrenmana Ne Kadar Kaldı?', 'countdown', '18:00:00', 'Günün antrenmanı seni bekliyor!', TRUE, 1),
  ('💬 Günün Motivasyon Sözü', 'custom_text', NULL, '«Disiplin; ne istediğin ile şu an ne istediğin arasındaki bilinçli tercihtir.»', TRUE, 2),
  ('🎯 Kilo Hedefi Takibi', 'weight_goal', NULL, 'Hedefe giden yolda kararlı adımlarla ilerle!', TRUE, 3)
ON CONFLICT DO NOTHING;
