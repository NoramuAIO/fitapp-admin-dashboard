import {
  ExerciseTrackingType,
  encodeDurationNoteTag,
  extractDurationSecondsFromNotes,
  formatDurationSeconds,
  isTimedTrackingType,
  normalizeTrackingType,
  parseDurationToSeconds,
  resolveExerciseTargetSeconds,
  stripDurationNoteTag,
} from './exerciseTracking';

/**
 * Checks whether a Supabase/PostgREST error indicates a missing schema column
 * (e.g. before SQL DDL migrations have been executed).
 */
export function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || error.details || error.hint || '');
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    /does not exist/i.test(message) ||
    /could not find.*column/i.test(message)
  );
}

/**
 * Attaches normalized camelCase and snake_case tracking fields to an exercise row.
 */
export function enrichExerciseWithTracking<T extends Record<string, any>>(ex: T): T & {
  trackingType: ExerciseTrackingType;
  tracking_type: ExerciseTrackingType;
  durationSeconds: number | null;
  duration_seconds: number | null;
} {
  const trackingType = normalizeTrackingType(ex?.tracking_type ?? ex?.trackingType, {
    name: ex?.name,
    sets: ex?.sets,
    reps: ex?.reps,
    duration: ex?.duration,
    durationSeconds: ex?.durationSeconds,
    duration_seconds: ex?.duration_seconds,
  });
  const parsedExisting =
    ex?.duration_seconds ?? ex?.durationSeconds ?? parseDurationToSeconds(ex?.duration);
  const durationSeconds = isTimedTrackingType(trackingType)
    ? resolveExerciseTargetSeconds({
        trackingType,
        sets: ex?.sets,
        reps: ex?.reps,
        duration: ex?.duration,
        durationSeconds: ex?.durationSeconds,
        duration_seconds: ex?.duration_seconds,
      })
    : parsedExisting && Number(parsedExisting) > 0
      ? Math.round(Number(parsedExisting))
      : null;

  return {
    ...ex,
    trackingType,
    tracking_type: trackingType,
    durationSeconds,
    duration_seconds: durationSeconds,
  };
}

/**
 * Computes consistent sets, reps, duration, trackingType, and durationSeconds
 * for exercise create/update endpoints.
 */
export function prepareExerciseWritePayload(input: {
  name?: string;
  sets?: any;
  reps?: any;
  duration?: any;
  trackingType?: any;
  tracking_type?: any;
  durationSeconds?: any;
  duration_seconds?: any;
  muscleGroup?: any;
  existing?: Record<string, any>;
}) {
  const name = input.name !== undefined ? input.name : (input.existing?.name ?? '');
  const durationRaw =
    input.duration !== undefined ? input.duration : input.existing?.duration;
  const repsRaw = input.reps !== undefined ? input.reps : input.existing?.reps;
  const setsRaw = input.sets !== undefined ? input.sets : input.existing?.sets;
  const muscleGroup =
    input.muscleGroup !== undefined ? input.muscleGroup : input.existing?.muscleGroup;

  const explicitType =
    input.trackingType ??
    input.tracking_type ??
    input.existing?.tracking_type ??
    input.existing?.trackingType;

  const trackingType = normalizeTrackingType(explicitType, {
    name,
    sets: setsRaw !== undefined ? Number(setsRaw) : null,
    reps: repsRaw !== undefined ? Number(repsRaw) : null,
    duration: durationRaw,
    durationSeconds:
      input.durationSeconds !== undefined ? Number(input.durationSeconds) : null,
    duration_seconds:
      input.duration_seconds !== undefined ? Number(input.duration_seconds) : null,
  });

  const rawExplicitDurationSec =
    input.durationSeconds !== undefined
      ? input.durationSeconds
      : input.duration_seconds !== undefined
        ? input.duration_seconds
        : input.existing?.duration_seconds ?? input.existing?.durationSeconds;

  let parsedSec =
    rawExplicitDurationSec !== undefined &&
    rawExplicitDurationSec !== null &&
    rawExplicitDurationSec !== ''
      ? Math.max(0, Math.round(Number(rawExplicitDurationSec) || 0))
      : parseDurationToSeconds(durationRaw);

  if (isTimedTrackingType(trackingType)) {
    if (!parsedSec || parsedSec <= 0) {
      parsedSec = trackingType === 'duration_only' ? 600 : 45;
    }
  } else {
    parsedSec = parsedSec && parsedSec > 0 ? parsedSec : null;
  }

  const normalizedSets =
    trackingType === 'duration_only'
      ? 1
      : isTimedTrackingType(trackingType)
        ? Math.max(1, Number(setsRaw) || 3)
        : Math.max(0, Number(setsRaw) || 0);

  const normalizedReps = isTimedTrackingType(trackingType)
    ? 0
    : Math.max(0, Number(repsRaw) || 0);

  const durationText =
    durationRaw !== undefined && durationRaw !== null && String(durationRaw).trim() !== ''
      ? String(durationRaw).trim()
      : isTimedTrackingType(trackingType) && parsedSec
        ? formatDurationSeconds(parsedSec)
        : null;

  return {
    trackingType,
    durationSeconds: parsedSec,
    sets: normalizedSets,
    reps: normalizedReps,
    duration: durationText,
  };
}

/**
 * Decodes completion durationSeconds (column first, then [Süre: ...] note tag fallback)
 * and strips the internal tag from human-readable notes.
 */
export function enrichCompletionWithDuration<T extends Record<string, any>>(row: T): T & {
  durationSeconds: number | null;
  duration_seconds: number | null;
  trackingType: ExerciseTrackingType;
  cleanNotes: string | null;
} {
  const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
  const colDuration = row.duration_seconds ?? row.durationSeconds ?? null;
  const parsedCol =
    colDuration !== null && colDuration !== undefined && Number(colDuration) > 0
      ? Math.round(Number(colDuration))
      : null;
  const noteDuration = extractDurationSecondsFromNotes(row.notes);
  const durationSeconds = parsedCol ?? noteDuration;

  const trackingType = normalizeTrackingType(
    ex?.tracking_type ??
      ex?.trackingType ??
      (durationSeconds && Number(row.reps) === 0 ? 'sets_duration' : undefined),
    {
      name: row.exerciseName || ex?.name || '',
      sets: row.sets ?? ex?.sets,
      reps: row.reps ?? ex?.reps,
      duration: ex?.duration,
      durationSeconds,
    }
  );

  const stripped = stripDurationNoteTag(row.notes);
  return {
    ...row,
    durationSeconds,
    duration_seconds: durationSeconds,
    trackingType,
    cleanNotes: stripped || null,
  };
}

export { encodeDurationNoteTag, stripDurationNoteTag };
