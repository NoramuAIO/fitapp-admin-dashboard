#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function loadEnvLocal() {
  const envPath = path.join(rootDir, '.env.local');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const CARDIO_DURATION_ONLY_RE =
  /\b(treadmill|elliptical|stairmaster|stair\s*climber|stepper|arc trainer|stationary bike|spin bike|assault bike|air bike|exercise bike|cycling|ergometer|rowing machine|koşu bandı|bisiklet|eliptik|kardiyo|cardio|jump rope|skipping|running|jogging)\b/i;

const EXCLUDE_RE =
  /\b(bicycle crunch|barbell row|dumbbell row|cable row|seated row|t-bar row|renegade row|upright row|pendlay|meadows|bent over|yates|inverted row|pulley row|shotgun row|banded row|row in doorway|rope pushdown|rope push-down|rope climb|push-up|pushup|pull-up|pullup|chin-up|chinup)\b/i;

const TIMED_SET_RE =
  /\b(dead hang|plank|wall sit|hollow hold|static hold|isometric hold|isometric pull-up|bridge hold|stretch|stretching|pose|bhujangasana|cobra abdominal stretch|sphinx|battle rope)\b/i;

function classifyRow(row) {
  const name = String(row.name || '').trim();
  if (!name || EXCLUDE_RE.test(name)) return null;

  if (CARDIO_DURATION_ONLY_RE.test(name)) {
    const dur = String(row.duration || '').trim() || '15 dakika';
    return {
      tracking_type: 'duration_only',
      sets: 1,
      reps: 0,
      duration: dur,
      duration_seconds: row.duration_seconds || 900,
    };
  }

  if (TIMED_SET_RE.test(name) || (/\bl-sit\b/i.test(name) && !/pull-?up/i.test(name))) {
    const isStretch = /\b(stretch|stretching|pose|bhujangasana|sphinx)\b/i.test(name);
    const defaultSec = isStretch ? 30 : 45;
    const defaultDur = isStretch ? '30 saniye' : '45 saniye';
    const defaultSets = isStretch ? 2 : 3;
    return {
      tracking_type: 'sets_duration',
      sets: Number(row.sets) > 0 && !isStretch ? Number(row.sets) : defaultSets,
      reps: 0,
      duration: String(row.duration || '').trim() || defaultDur,
      duration_seconds: row.duration_seconds || defaultSec,
    };
  }

  return null;
}

const UPDATED_RANK_TIERS = [
  { title: 'Demir Çırağı', min_volume_kg: 0, max_volume_kg: 15000, min_workouts: 0, description: 'Temel hareketlere başlayan yeni sporcu', legacyMax: 300 },
  { title: 'Bronz Kaldırıcı', min_volume_kg: 15000, max_volume_kg: 50000, min_workouts: 3, description: 'Düzenli antrenmana alışan kararlı sporcu', legacyMax: 1000 },
  { title: 'Gümüş Güç', min_volume_kg: 50000, max_volume_kg: 120000, min_workouts: 8, description: 'Disiplinli çalışan ve güç kazanan sporcu', legacyMax: 2500 },
  { title: 'Altın Titan', min_volume_kg: 120000, max_volume_kg: 250000, min_workouts: 18, description: 'Salonda istikrarıyla fark yaratan ağır kaldırıcı', legacyMax: 5000 },
  { title: 'Platin Gladyatör', min_volume_kg: 250000, max_volume_kg: 500000, min_workouts: 35, description: 'Yüksek hacim ve kondisyonla gelişmiş atlet', legacyMax: 10000 },
  { title: 'Elit Şampiyon', min_volume_kg: 500000, max_volume_kg: 1000000, min_workouts: 60, description: 'Zirveye oynayan deneyimli şampiyon', legacyMax: 20000 },
];

async function main() {
  const apply = process.argv.includes('--apply');
  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: rows, error } = await supabase
    .from('exercises')
    .select('id, name, sets, reps, duration, programId, dayId, orderIndex')
    .order('id', { ascending: true });

  if (error) {
    console.error('Supabase fetch failed:', error.message);
    process.exit(1);
  }

  const updates = [];
  for (const row of rows || []) {
    if (row.dayId === null && row.programId === null && Number(row.orderIndex) === -1) continue;
    const plan = classifyRow(row);
    if (!plan) continue;
    if (
      row.sets !== plan.sets ||
      row.reps !== plan.reps ||
      (row.duration || '') !== plan.duration
    ) {
      updates.push({ id: row.id, name: row.name, programId: row.programId, plan });
    }
  }

  console.log(`Scanned ${rows?.length || 0} exercises. Candidates to update: ${updates.length}`);
  for (const u of updates) {
    console.log(`  #${u.id} [${u.programId ? 'P' + u.programId : 'pool'}] ${u.name} -> ${u.plan.tracking_type} (${u.plan.sets} set, reps=${u.plan.reps}, "${u.plan.duration}")`);
  }

  // Also check legacy tiny athlete_rank thresholds
  const { data: rankRows } = await supabase
    .from('custom_widgets')
    .select('id, title, custom_content')
    .eq('widget_type', 'athlete_rank');
  const rankUpdates = [];
  for (const r of rankRows || []) {
    const targetTier = UPDATED_RANK_TIERS.find((t) => t.title === r.title);
    if (!targetTier) continue;
    try {
      const content = JSON.parse(r.custom_content || '{}');
      if (Number(content.max_volume_kg) <= targetTier.legacyMax) {
        rankUpdates.push({ id: r.id, title: r.title, targetTier });
      }
    } catch {}
  }
  console.log(`Athlete rank rows to rescale: ${rankUpdates.length}`);

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to write changes to Supabase.');
    return;
  }

  let hasTrackingCols = true;
  let updatedCount = 0;
  for (const u of updates) {
    const payload = hasTrackingCols
      ? u.plan
      : { sets: u.plan.sets, reps: u.plan.reps, duration: u.plan.duration };

    let res = await supabase.from('exercises').update(payload).eq('id', u.id);
    if (res.error && /tracking_type|duration_seconds|column/i.test(res.error.message || '')) {
      hasTrackingCols = false;
      res = await supabase
        .from('exercises')
        .update({ sets: u.plan.sets, reps: u.plan.reps, duration: u.plan.duration })
        .eq('id', u.id);
    }
    if (res.error) {
      console.error(`Failed updating exercise #${u.id}:`, res.error.message);
    } else {
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount}/${updates.length} exercises (tracking_type cols present: ${hasTrackingCols}).`);

  let rankUpdatedCount = 0;
  for (const ru of rankUpdates) {
    const { targetTier } = ru;
    const { error: rErr } = await supabase
      .from('custom_widgets')
      .update({
        custom_content: JSON.stringify({
          min_volume_kg: targetTier.min_volume_kg,
          max_volume_kg: targetTier.max_volume_kg,
          min_workouts: targetTier.min_workouts,
          description: targetTier.description,
        }),
        display_order: targetTier.min_volume_kg,
      })
      .eq('id', ru.id);
    if (!rErr) rankUpdatedCount++;
  }
  console.log(`Updated ${rankUpdatedCount}/${rankUpdates.length} athlete_rank rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
