export type ExerciseTrackingType = 'weight_reps' | 'sets_duration' | 'duration_only';

export const TRACKING_TYPE_LABELS: Record<ExerciseTrackingType, string> = {
  weight_reps: 'Ağırlık + Set + Tekrar',
  sets_duration: 'Set × Süre',
  duration_only: 'Sadece Süre',
};

const DURATION_TAG_REGEX = /\[Süre:\s*([^\]]+)\]/i;

const CARDIO_DURATION_ONLY_RE =
  /\b(treadmill|elliptical|stairmaster|stair\s*climber|stepper|arc trainer|stationary bike|spin bike|assault bike|air bike|exercise bike|cycling|ergometer|rowing machine|koşu bandı|bisiklet|eliptik|kardiyo|cardio|jump rope|skipping|running|jogging)\b/i;

const EXCLUDE_CARDIO_OR_TIMED_RE =
  /\b(bicycle crunch|barbell row|dumbbell row|cable row|seated row|t-bar row|renegade row|upright row|pendlay|meadows|bent over|yates|inverted row|pulley row|shotgun row|banded row|row in doorway|rope pushdown|rope push-down|rope climb|push-up|pushup|pull-up|pullup|chin-up|chinup)\b/i;

const TIMED_SET_EXERCISE_RE =
  /\b(dead hang|plank|wall sit|hollow hold|static hold|isometric hold|isometric pull-up|bridge hold|stretch|stretching|pose|bhujangasana|cobra abdominal stretch|sphinx|battle rope)\b/i;

const ISOLATED_LSIT_RE = /\bl-sit\b/i;

export function parseDurationToSeconds(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const clockMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (clockMatch) {
    if (clockMatch[3] !== undefined) {
      const h = Number(clockMatch[1]) || 0;
      const m = Number(clockMatch[2]) || 0;
      const s = Number(clockMatch[3]) || 0;
      const total = h * 3600 + m * 60 + s;
      return total > 0 ? total : null;
    }
    const m = Number(clockMatch[1]) || 0;
    const s = Number(clockMatch[2]) || 0;
    const total = m * 60 + s;
    return total > 0 ? total : null;
  }

  const normalized = trimmed.toLowerCase().replace(',', '.');
  let totalSec = 0;
  let matchedUnit = false;

  const hourMatch = /(\d+(?:\.\d+)?)\s*(?:saat|sa|hour|hours|hr|h)\b/i.exec(normalized);
  if (hourMatch) {
    totalSec += parseFloat(hourMatch[1]) * 3600;
    matchedUnit = true;
  }

  const minMatch = /(\d+(?:\.\d+)?)\s*(?:dakika|dk|min|mins|minute|minutes|m)\b/i.exec(normalized);
  if (minMatch) {
    totalSec += parseFloat(minMatch[1]) * 60;
    matchedUnit = true;
  }

  const secMatch = /(\d+(?:\.\d+)?)\s*(?:saniye|sn|sec|secs|second|seconds|s)\b/i.exec(normalized);
  if (secMatch) {
    totalSec += parseFloat(secMatch[1]);
    matchedUnit = true;
  }

  if (matchedUnit) {
    const rounded = Math.round(totalSec);
    return rounded > 0 ? rounded : null;
  }

  const bareNum = Number(normalized);
  if (Number.isFinite(bareNum) && bareNum > 0) {
    return Math.round(bareNum);
  }

  return null;
}

export function formatDurationSeconds(
  seconds: number | null | undefined,
  compact = true
): string {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (safe === 0) return compact ? '0 sn' : '0 saniye';

  const mins = Math.floor(safe / 60);
  const secs = safe % 60;

  if (mins === 0) {
    return compact ? `${secs} sn` : `${secs} saniye`;
  }
  if (secs === 0) {
    return compact ? `${mins} dk` : `${mins} dakika`;
  }
  return compact ? `${mins} dk ${secs} sn` : `${mins} dakika ${secs} saniye`;
}

export function formatClockMMSS(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function normalizeTrackingType(
  rawType: unknown,
  exercise?: {
    name?: string | null;
    sets?: number | null;
    reps?: number | null;
    duration?: string | null;
    durationSeconds?: number | null;
    duration_seconds?: number | null;
  }
): ExerciseTrackingType {
  if (typeof rawType === 'string') {
    const clean = rawType.trim().toLowerCase();
    if (clean === 'weight_reps' || clean === 'sets_duration' || clean === 'duration_only') {
      return clean;
    }
  }

  if (exercise) {
    const reps = exercise.reps !== null && exercise.reps !== undefined ? Number(exercise.reps) : null;
    const sets = exercise.sets !== null && exercise.sets !== undefined ? Number(exercise.sets) : null;
    const durSec =
      exercise.durationSeconds ??
      exercise.duration_seconds ??
      parseDurationToSeconds(exercise.duration);

    if (reps === 0 && durSec && durSec > 0) {
      return sets !== null && sets > 1 ? 'sets_duration' : 'duration_only';
    }
  }

  return 'weight_reps';
}

export function isTimedTrackingType(type: ExerciseTrackingType | unknown): boolean {
  return type === 'sets_duration' || type === 'duration_only';
}

export function classifyExerciseByName(
  name: string,
  existingDuration?: string | null
): {
  trackingType: ExerciseTrackingType;
  defaultSets?: number;
  defaultDuration?: string;
  defaultDurationSeconds?: number;
} {
  const cleanName = String(name || '').trim();
  const parsedExisting = parseDurationToSeconds(existingDuration);

  if (!cleanName) {
    return { trackingType: 'weight_reps' };
  }

  if (EXCLUDE_CARDIO_OR_TIMED_RE.test(cleanName)) {
    return { trackingType: 'weight_reps' };
  }

  if (CARDIO_DURATION_ONLY_RE.test(cleanName)) {
    const sec = parsedExisting ?? 900;
    return {
      trackingType: 'duration_only',
      defaultSets: 1,
      defaultDurationSeconds: sec,
      defaultDuration: existingDuration?.trim() || formatDurationSeconds(sec, false),
    };
  }

  if (
    TIMED_SET_EXERCISE_RE.test(cleanName) ||
    (ISOLATED_LSIT_RE.test(cleanName) && !/pull-?up/i.test(cleanName))
  ) {
    const isStretchOrPose = /\b(stretch|stretching|pose|bhujangasana|sphinx)\b/i.test(cleanName);
    const sec = parsedExisting ?? (isStretchOrPose ? 30 : 45);
    const sets = isStretchOrPose ? 2 : 3;
    return {
      trackingType: 'sets_duration',
      defaultSets: sets,
      defaultDurationSeconds: sec,
      defaultDuration: existingDuration?.trim() || formatDurationSeconds(sec, false),
    };
  }

  return { trackingType: 'weight_reps' };
}

export function encodeDurationNoteTag(
  seconds: number | null | undefined,
  baseNotes?: string | null
): string | null {
  const stripped = stripDurationNoteTag(baseNotes);
  const safeSec = Math.max(0, Math.round(Number(seconds) || 0));
  if (safeSec <= 0) {
    return stripped;
  }
  const tag = `[Süre: ${safeSec} sn]`;
  return stripped ? `${tag} ${stripped}` : tag;
}

export function extractDurationSecondsFromNotes(notes?: string | null): number | null {
  if (!notes) return null;
  const match = DURATION_TAG_REGEX.exec(String(notes));
  if (!match) return null;
  return parseDurationToSeconds(match[1]);
}

export function stripDurationNoteTag(notes?: string | null): string | null {
  if (!notes) return null;
  const cleaned = String(notes)
    .replace(/\[Süre:\s*[^\]]+\]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return cleaned || null;
}

export function resolveExerciseTargetSeconds(exercise?: {
  trackingType?: ExerciseTrackingType;
  tracking_type?: string | null;
  sets?: number | null;
  reps?: number | null;
  duration?: string | null;
  durationSeconds?: number | null;
  duration_seconds?: number | null;
}): number {
  const explicit = Number(exercise?.durationSeconds ?? exercise?.duration_seconds);
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
  const parsed = parseDurationToSeconds(exercise?.duration);
  if (parsed && parsed > 0) return parsed;
  const mode = normalizeTrackingType(exercise?.trackingType ?? exercise?.tracking_type, exercise);
  return mode === 'duration_only' ? 600 : 45;
}
