-- ============================================================
-- FitApp Faz 4: Hareket Takip Modları (tracking_type + duration_seconds)
-- Supabase SQL Editor'da tamamını tek seferde veya adım adım çalıştırabilirsiniz.
-- ============================================================

-- 1. Şema eklemeleri (Idempotent)
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(30) DEFAULT 'weight_reps',
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE public.exercise_completions
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- 2. Mevcut egzersiz kataloğu için güvenli toplu sınıflandırma
-- (EXECUTE kullanımı, tek batch'te çalıştırıldığında 42703 parse hatasını önler)
DO $$
BEGIN
  -- 2a. Kardiyo makineleri ve koşu/bisiklet -> duration_only (Sadece Süre)
  EXECUTE $sql$
    UPDATE public.exercises
    SET
      tracking_type = 'duration_only',
      sets = 1,
      reps = 0,
      duration = COALESCE(NULLIF(TRIM(duration), ''), '15 dakika'),
      duration_seconds = COALESCE(duration_seconds, 900)
    WHERE
      name ~* '\m(treadmill|elliptical|stairmaster|stair\s*climber|stepper|arc trainer|stationary bike|spin bike|assault bike|air bike|exercise bike|cycling|ergometer|rowing machine|koşu bandı|bisiklet|eliptik|kardiyo|cardio|jump rope|skipping|running|jogging)\M'
      AND NOT (name ~* '\m(bicycle crunch|barbell row|dumbbell row|cable row|seated row|t-bar row|renegade row|upright row|pendlay|meadows|bent over|yates|inverted row|pulley row|shotgun row|banded row|row in doorway|rope pushdown|rope push-down|rope climb|push-up|pushup|pull-up|pullup|chin-up|chinup)\M');
  $sql$;

  -- 2b. İzometrik tutuşlar (Dead Hang, Plank, Wall Sit, Battle Rope vb.) -> sets_duration (45 sn)
  EXECUTE $sql$
    UPDATE public.exercises
    SET
      tracking_type = 'sets_duration',
      sets = CASE WHEN COALESCE(sets, 0) > 0 THEN sets ELSE 3 END,
      reps = 0,
      duration = COALESCE(NULLIF(TRIM(duration), ''), '45 saniye'),
      duration_seconds = COALESCE(duration_seconds, 45)
    WHERE
      (
        name ~* '\m(dead hang|plank|wall sit|hollow hold|static hold|isometric hold|isometric pull-up|bridge hold|battle rope)\M'
        OR (name ~* '\ml-sit\M' AND NOT (name ~* '\mpull-?up\M'))
      )
      AND NOT (name ~* '\m(push-up|pushup|pull-up|pullup|chin-up|chinup|crunch)\M');
  $sql$;

  -- 2c. Esneme & Yoga pozları (Stretch / Pose) -> sets_duration (2 set x 30 sn)
  EXECUTE $sql$
    UPDATE public.exercises
    SET
      tracking_type = 'sets_duration',
      sets = 2,
      reps = 0,
      duration = COALESCE(NULLIF(TRIM(duration), ''), '30 saniye'),
      duration_seconds = COALESCE(duration_seconds, 30)
    WHERE
      name ~* '\m(stretch|stretching|pose|bhujangasana|cobra abdominal stretch|sphinx)\M'
      AND NOT (name ~* '\m(push-up|pushup|pull-up|pullup|chin-up|chinup|row)\M');
  $sql$;
END $$;

-- 3. Sporcu Seviyesi (athlete_rank) eşiklerini gerçekçi seviyelere çekme
-- (Yalnızca eski düşük varsayılan eşikler hala 20.000 altındaysa günceller)
UPDATE public.custom_widgets
SET custom_content = '{"min_volume_kg":0,"max_volume_kg":15000,"min_workouts":0,"description":"Temel hareketlere başlayan yeni sporcu"}'
WHERE widget_type = 'athlete_rank' AND title = 'Demir Çırağı' AND custom_content LIKE '%"max_volume_kg":300%';

UPDATE public.custom_widgets
SET custom_content = '{"min_volume_kg":15000,"max_volume_kg":50000,"min_workouts":3,"description":"Düzenli antrenmana alışan kararlı sporcu"}'
WHERE widget_type = 'athlete_rank' AND title = 'Bronz Kaldırıcı' AND custom_content LIKE '%"max_volume_kg":1000%';

UPDATE public.custom_widgets
SET custom_content = '{"min_volume_kg":50000,"max_volume_kg":120000,"min_workouts":8,"description":"Disiplinli çalışan ve güç kazanan sporcu"}'
WHERE widget_type = 'athlete_rank' AND title = 'Gümüş Güç' AND custom_content LIKE '%"max_volume_kg":2500%';

UPDATE public.custom_widgets
SET custom_content = '{"min_volume_kg":120000,"max_volume_kg":250000,"min_workouts":18,"description":"Salonda istikrarıyla fark yaratan ağır kaldırıcı"}'
WHERE widget_type = 'athlete_rank' AND title = 'Altın Titan' AND custom_content LIKE '%"max_volume_kg":5000%';

UPDATE public.custom_widgets
SET custom_content = '{"min_volume_kg":250000,"max_volume_kg":500000,"min_workouts":35,"description":"Yüksek hacim ve kondisyonla gelişmiş atlet"}'
WHERE widget_type = 'athlete_rank' AND title = 'Platin Gladyatör' AND custom_content LIKE '%"max_volume_kg":10000%';

UPDATE public.custom_widgets
SET custom_content = '{"min_volume_kg":500000,"max_volume_kg":1000000,"min_workouts":60,"description":"Zirveye oynayan deneyimli şampiyon"}'
WHERE widget_type = 'athlete_rank' AND title = 'Elit Şampiyon' AND custom_content LIKE '%"max_volume_kg":20000%';
