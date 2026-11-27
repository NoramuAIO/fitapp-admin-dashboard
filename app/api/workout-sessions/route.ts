import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  encodeDurationNoteTag,
  enrichExerciseWithTracking,
  isMissingColumnError,
} from '@/lib/exerciseApiHelpers';
import { isTimedTrackingType } from '@/lib/exerciseTracking';
import {
  getLocalDateString,
  isManualTimerSession,
  isRealWorkoutSession,
  normalizeUtcTimestamp,
} from '@/lib/fitnessCalculations';
import {
  parsePositiveInt,
  requireApiAuth,
  resolveScopedUserId,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

// Tracks whether workout_sessions.startTime in Postgres is limited to VARCHAR(10) so we avoid generating 22001 Postgres error logs on UPDATE/INSERT
let workoutSessionStartTimeIsVarchar10: boolean | null = null;

function detectStartTimeConstraintFromRows(
  rows: Array<{ startTime?: string | null }> | null | undefined
): boolean | null {
  if (!rows || rows.length === 0) return workoutSessionStartTimeIsVarchar10;
  if (rows.some((r) => typeof r.startTime === 'string' && r.startTime.trim().length > 10)) {
    workoutSessionStartTimeIsVarchar10 = false;
    return false;
  }
  if (workoutSessionStartTimeIsVarchar10 === true) return true;
  if (
    rows.length >= 2 &&
    rows.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(String(r.startTime || '').trim()))
  ) {
    workoutSessionStartTimeIsVarchar10 = true;
    return true;
  }
  return null;
}

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');
    const parsedUserId = rawUserId ? parsePositiveInt(rawUserId) : null;
    if (rawUserId && !parsedUserId) {
      return NextResponse.json({ error: 'Geçersiz userId' }, { status: 400 });
    }
    const scoped = resolveScopedUserId(guard.auth, parsedUserId);
    if (!scoped.ok) return scoped.response;

    const limitParam = searchParams.get('limit');
    const rawLimit = Number(limitParam);
    const limit =
      limitParam === 'all'
        ? 2000
        : Number.isFinite(rawLimit) && rawLimit > 0
          ? Math.min(Math.floor(rawLimit), 2000)
          : 500;

    let query = supabase
      .from('workout_sessions')
      .select(`
        *,
        programs (
          id,
          name
        ),
        users (
          name
        )
      `)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (scoped.userId) {
      query = query.eq('userId', scoped.userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rawSessions = data || [];
    const sessionIds = rawSessions.map(s => s.id);

    // Fetch exercise completions (including exercise dayId/programId) to resolve workoutId & workout_name
    const completionsBySession: Record<number, any[]> = {};
    const dayIds = new Set<number>();
    const compProgramIds = new Set<number>();

    if (sessionIds.length > 0) {
      try {
        const { data: completions } = await supabase
          .from('exercise_completions')
          .select('id, sessionId, exerciseId, sets, reps, exercises(id, name, dayId, programId)')
          .in('sessionId', sessionIds);
        if (completions && completions.length > 0) {
          completions.forEach((c: any) => {
            if (!completionsBySession[c.sessionId]) completionsBySession[c.sessionId] = [];
            completionsBySession[c.sessionId].push(c);
            const ex = Array.isArray(c.exercises) ? c.exercises[0] : c.exercises;
            if (ex?.dayId) dayIds.add(Number(ex.dayId));
            if (ex?.programId) compProgramIds.add(Number(ex.programId));
          });
        }
      } catch (compErr) {
        console.error('Error fetching completions for sessions:', compErr);
      }
    }

    const dayMetaMap = new Map<number, { name: string; programId: number | null }>();
    const progNameMap = new Map<number, string>();
    if (dayIds.size > 0 || compProgramIds.size > 0) {
      try {
        const [{ data: daysData }, { data: progsData }] = await Promise.all([
          dayIds.size > 0
            ? supabase.from('program_days').select('id, name, dayName, programId').in('id', Array.from(dayIds))
            : Promise.resolve({ data: [] as any[] }),
          compProgramIds.size > 0
            ? supabase.from('programs').select('id, name').in('id', Array.from(compProgramIds))
            : Promise.resolve({ data: [] as any[] }),
        ]);
        for (const d of daysData || []) {
          const wName = String(d.name || d.dayName || '').trim();
          if (wName) {
            dayMetaMap.set(Number(d.id), { name: wName, programId: d.programId ? Number(d.programId) : null });
          }
        }
        for (const p of progsData || []) {
          if (p.name) progNameMap.set(Number(p.id), String(p.name).trim());
        }
      } catch (metaErr) {
        console.error('Error resolving workout names for sessions:', metaErr);
      }
    }

    // Format the response
    const formattedSessions = rawSessions.map(session => {
      const isManualTimer = isManualTimerSession({
        ...session,
        program_name: session.programs?.name,
      });

      let completedExercises = Number(session.completed_exercises) || 0;
      let totalReps = Number(session.total_reps) || 0;
      let totalSets = Number(session.total_sets) || 0;
      let resolvedWorkoutId: number | null = null;
      let resolvedWorkoutName: string | null = null;
      let resolvedProgramId: number | null = session.programId ?? null;

      const rawCompletions = completionsBySession[session.id];
      const completions = (() => {
        if (!rawCompletions || rawCompletions.length <= 1) return rawCompletions;
        const deduped = new Map<string, any>();
        for (const c of rawCompletions) {
          const key = c.exerciseId ? `ex:${c.exerciseId}` : `id:${c.id}`;
          const prev = deduped.get(key);
          if (!prev || Number(c.id) > Number(prev.id)) {
            deduped.set(key, c);
          }
        }
        return Array.from(deduped.values());
      })();
      if (completions && completions.length > 0) {
        completedExercises = completions.length;
        totalSets = completions.reduce((sum: number, c: any) => sum + (Number(c.sets) || 0), 0);
        totalReps = completions.reduce((sum: number, c: any) => {
          const cs = Number(c.sets) || 0;
          const cr = Number(c.reps) || 0;
          return sum + (cs > 0 ? cs * cr : cr);
        }, 0);

        const dayCounts = new Map<number, number>();
        for (const c of completions) {
          const ex = Array.isArray(c.exercises) ? c.exercises[0] : c.exercises;
          if (ex?.dayId) {
            const did = Number(ex.dayId);
            dayCounts.set(did, (dayCounts.get(did) || 0) + 1);
          }
          if (!resolvedProgramId && ex?.programId) {
            resolvedProgramId = Number(ex.programId);
          }
        }
        let bestDayId: number | null = null;
        let bestCount = -1;
        for (const [did, cnt] of dayCounts.entries()) {
          if (cnt > bestCount) {
            bestCount = cnt;
            bestDayId = did;
          }
        }
        if (bestDayId !== null) {
          resolvedWorkoutId = bestDayId;
          const dayInfo = dayMetaMap.get(bestDayId);
          if (dayInfo) {
            resolvedWorkoutName = dayInfo.name;
            if (!resolvedProgramId && dayInfo.programId) {
              resolvedProgramId = dayInfo.programId;
            }
          }
        }
      }

      const resolvedProgramName =
        session.programs?.name ||
        (resolvedProgramId ? progNameMap.get(Number(resolvedProgramId)) : null) ||
        'Antrenman';

      const formatted: any = {
        id: session.id,
        userId: session.userId,
        programId: resolvedProgramId,
        workoutId: resolvedWorkoutId,
        workout_name: isManualTimer ? 'Salonda Geçirilen Vakit' : resolvedWorkoutName,
        workoutName: isManualTimer ? 'Salonda Geçirilen Vakit' : resolvedWorkoutName,
        startTime: normalizeUtcTimestamp(session.startTime) || session.startTime,
        endTime: normalizeUtcTimestamp(session.endTime) || session.endTime,
        duration: session.duration,
        category: isManualTimer ? 'duration' : (session.category || 'workout'),
        createdAt: normalizeUtcTimestamp(session.createdAt) || session.createdAt,
        program_name: isManualTimer ? 'Salonda Geçirilen Vakit' : resolvedProgramName,
        user_name: session.users?.name || null,
        completed_exercises: completedExercises,
        total_sets: totalSets,
        total_reps: totalReps,
        is_manual_timer: isManualTimer
      };
      return formatted;
    });

    return NextResponse.json(formattedSessions, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout sessions: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function deleteSessionCascade(targetId: number, authUserId: number | null, isAdmin: boolean) {
  const { data: existing, error: fetchErr } = await supabase
    .from('workout_sessions')
    .select('id, userId')
    .eq('id', targetId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!existing) return { status: 404 as const };
  if (!isAdmin && Number(existing.userId) !== authUserId) {
    return { status: 403 as const };
  }

  const { error: compErr } = await supabase
    .from('exercise_completions')
    .delete()
    .eq('sessionId', targetId);
  if (compErr) throw compErr;

  const { error } = await supabase.from('workout_sessions').delete().eq('id', targetId);
  if (error) throw error;
  return { status: 200 as const };
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    if (body.action === 'delete') {
      const targetId = parsePositiveInt(body.id);
      if (!targetId) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
      const del = await deleteSessionCascade(targetId, guard.auth.userId, guard.auth.isAdmin);
      if (del.status === 404) {
        return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 });
      }
      if (del.status === 403) {
        return NextResponse.json({ error: 'Bu oturumu silme yetkiniz yok' }, { status: 403 });
      }
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const {
      programId,
      workoutId,
      workoutName,
      startTime,
      duration,
      category,
      completed_exercises,
      total_reps,
      total_sets,
      markCompletedFromAdmin,
    } = body;

    const scoped = resolveScopedUserId(guard.auth, parsePositiveInt(body.userId));
    if (!scoped.ok) return scoped.response;
    const parsedUserId = scoped.userId;
    if (!parsedUserId) {
      return NextResponse.json({ error: 'Geçerli bir userId gereklidir' }, { status: 400 });
    }

    const rawStartTime =
      startTime && typeof startTime === 'string' && startTime.trim()
        ? startTime.trim()
        : new Date().toISOString();
    const resolvedStartTime = normalizeUtcTimestamp(rawStartTime) || rawStartTime;
    const localDateStart = getLocalDateString(resolvedStartTime) || getLocalDateString();
    const safeDuration =
      typeof duration === 'string'
        ? duration.trim().slice(0, 50) || null
        : duration !== undefined && duration !== null
          ? String(duration).trim().slice(0, 50) || null
          : null;

    let validProgramId: number | null = null;
    let resolvedWorkoutName: string | null = workoutName ? String(workoutName).trim() : null;
    const numericWorkoutId = parsePositiveInt(workoutId) ?? NaN;

    if (programId) {
      const parsedProgId = parsePositiveInt(programId);
      if (parsedProgId) {
        const { data: prog } = await supabase
          .from('programs')
          .select('id, name')
          .eq('id', parsedProgId)
          .maybeSingle();
        if (prog) {
          validProgramId = prog.id;
        }
      }
    }

    if (Number.isFinite(numericWorkoutId) && numericWorkoutId > 0) {
      const { data: dayRow } = await supabase
        .from('program_days')
        .select('id, programId, name, dayName')
        .eq('id', numericWorkoutId)
        .maybeSingle();
      if (dayRow) {
        if (!validProgramId && dayRow.programId) validProgramId = Number(dayRow.programId);
        if (!resolvedWorkoutName) resolvedWorkoutName = dayRow.name || dayRow.dayName || null;
      }
    }

    const isManual = isManualTimerSession({
      category,
      is_manual_timer: body.is_manual_timer,
      workoutName: resolvedWorkoutName,
      program_name: body.program_name || body.programName,
    });

    const selectQuery = `
      *,
      programs (
        id,
        name
      ),
      users (
        name
      )
    `;

    let data: any = null;

    if (!isManual) {
      const { data: candidateRows } = await supabase
        .from('workout_sessions')
        .select('id, startTime, duration, programId, category, createdAt')
        .eq('userId', parsedUserId)
        .order('createdAt', { ascending: false })
        .limit(40);

      const detectedVarchar10 = detectStartTimeConstraintFromRows(candidateRows);

      const placeholder = (candidateRows || []).find((s: any) => {
        if (!isRealWorkoutSession(s)) return false;
        if (s.duration !== null && s.duration !== undefined && String(s.duration).trim() !== '') return false;
        const sd = getLocalDateString(
          normalizeUtcTimestamp(s.startTime || s.createdAt) || s.startTime || s.createdAt
        );
        if (sd !== localDateStart) return false;
        return validProgramId ? (s.programId === null || Number(s.programId) === validProgramId) : s.programId === null;
      });

      if (placeholder) {
        const placeholderDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(placeholder.startTime || '').trim());
        const useDateOnlyOnUpdate = detectedVarchar10 === true || (detectedVarchar10 !== false && placeholderDateOnly);
        const updatePayload: any = {};
        if (validProgramId) updatePayload.programId = validProgramId;
        if (safeDuration) updatePayload.duration = safeDuration;
        updatePayload.startTime = useDateOnlyOnUpdate ? localDateStart : resolvedStartTime;

        let updateResult = await supabase
          .from('workout_sessions')
          .update(updatePayload)
          .eq('id', placeholder.id)
          .select(selectQuery)
          .single();

        if (updateResult.error?.code === '22001') {
          workoutSessionStartTimeIsVarchar10 = true;
          updateResult = await supabase
            .from('workout_sessions')
            .update({ ...updatePayload, startTime: localDateStart })
            .eq('id', placeholder.id)
            .select(selectQuery)
            .single();
        }

        if (updateResult.error) throw updateResult.error;
        data = updateResult.data;
      }
    }

    if (!data) {
      if (workoutSessionStartTimeIsVarchar10 === null) {
        const { data: probeRows } = await supabase
          .from('workout_sessions')
          .select('startTime')
          .order('id', { ascending: false })
          .limit(3);
        detectStartTimeConstraintFromRows(probeRows);
      }

      const insertPayload: any = {
        userId: parsedUserId,
        programId: validProgramId,
        startTime: workoutSessionStartTimeIsVarchar10 ? localDateStart : resolvedStartTime,
        duration: safeDuration,
        category: isManual ? 'duration' : (category || 'workout'),
        createdAt: new Date().toISOString()
      };

      let insertResult = await supabase
        .from('workout_sessions')
        .insert([insertPayload])
        .select(selectQuery)
        .single();

      // If startTime column is VARCHAR(10), fallback gracefully to local YYYY-MM-DD
      if (insertResult.error?.code === '22001') {
        workoutSessionStartTimeIsVarchar10 = true;
        insertResult = await supabase
          .from('workout_sessions')
          .insert([{ ...insertPayload, startTime: localDateStart }])
          .select(selectQuery)
          .single();
      }

      if (insertResult.error) throw insertResult.error;
      data = insertResult.data;
    }

    let calculatedExercises = Number(completed_exercises) || 0;
    let calculatedSets = Number(total_sets) || 0;
    let calculatedReps = Number(total_reps) || 0;

    // When Admin marks a scheduled workout as completed on a calendar date, attach completion rows (weight=null)
    // so the workout identity (workoutId/workout_name) is persisted without inflating tonnage.
    if (
      markCompletedFromAdmin &&
      !isManual &&
      parsedUserId &&
      data?.id &&
      Number.isFinite(numericWorkoutId) &&
      numericWorkoutId > 0
    ) {
      let { data: dayExercises, error: dayExErr } = await supabase
        .from('exercises')
        .select('id, name, sets, reps, duration, muscleGroup, tracking_type, duration_seconds')
        .eq('dayId', numericWorkoutId)
        .order('orderIndex', { ascending: true });

      if (dayExErr && isMissingColumnError(dayExErr)) {
        const fallbackRes = await supabase
          .from('exercises')
          .select('id, name, sets, reps, duration, muscleGroup')
          .eq('dayId', numericWorkoutId)
          .order('orderIndex', { ascending: true });
        dayExercises = fallbackRes.data as any;
      }

      if (Array.isArray(dayExercises) && dayExercises.length > 0) {
        const completedIso = `${localDateStart}T12:00:00.000Z`;
        const rowsWithCols = dayExercises.map((rawEx: any) => {
          const ex = enrichExerciseWithTracking(rawEx);
          const timed = isTimedTrackingType(ex.trackingType);
          const sets =
            ex.trackingType === 'duration_only'
              ? 1
              : timed
                ? Math.max(1, Number(ex.sets) || 3)
                : Math.max(1, Number(ex.sets) || 3);
          const reps = timed ? 0 : Math.max(1, Number(ex.reps) || 10);
          const perSetDuration = ex.durationSeconds ?? 0;
          const totalDurationSeconds =
            timed && perSetDuration > 0 ? perSetDuration * sets : null;

          return {
            userId: parsedUserId,
            exerciseId: ex.id,
            sessionId: data.id,
            sets,
            reps,
            weight: null,
            duration_seconds: totalDurationSeconds,
            notes: 'Admin panelinden tamamlandı',
            completedAt: completedIso,
          };
        });
        let { error: adminCompErr } = await supabase
          .from('exercise_completions')
          .insert(rowsWithCols);
        if (adminCompErr && isMissingColumnError(adminCompErr)) {
          const legacyRows = rowsWithCols.map(({ duration_seconds, ...rest }) => ({
            ...rest,
            notes: duration_seconds
              ? encodeDurationNoteTag(duration_seconds, rest.notes)
              : rest.notes,
          }));
          const fallbackInsert = await supabase
            .from('exercise_completions')
            .insert(legacyRows);
          adminCompErr = fallbackInsert.error;
        }
        if (adminCompErr) throw adminCompErr;
        calculatedExercises = rowsWithCols.length;
        calculatedSets = rowsWithCols.reduce((s: number, r: any) => s + r.sets, 0);
        calculatedReps = rowsWithCols.reduce((s: number, r: any) => s + r.sets * r.reps, 0);
      }
    }

    // Format the response
    const formattedSession = {
      id: data.id,
      userId: data.userId,
      programId: data.programId,
      workoutId: Number.isFinite(numericWorkoutId) && numericWorkoutId > 0 ? numericWorkoutId : null,
      workout_name: isManual ? 'Salonda Geçirilen Vakit' : resolvedWorkoutName,
      workoutName: isManual ? 'Salonda Geçirilen Vakit' : resolvedWorkoutName,
      startTime: normalizeUtcTimestamp(data.startTime) || data.startTime,
      endTime: normalizeUtcTimestamp(data.endTime) || data.endTime,
      duration: data.duration,
      category: data.category,
      createdAt: normalizeUtcTimestamp(data.createdAt) || data.createdAt,
      program_name: isManual ? 'Salonda Geçirilen Vakit' : (data.programs?.name || 'Antrenman'),
      user_name: data.users?.name || null,
      completed_exercises: calculatedExercises,
      total_sets: calculatedSets,
      total_reps: calculatedReps,
      is_manual_timer: isManual
    };

    return NextResponse.json(formattedSession, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error creating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to create workout session: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const numericId = parsePositiveInt(searchParams.get('id'));
    if (!numericId) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    const del = await deleteSessionCascade(numericId, guard.auth.userId, guard.auth.isAdmin);
    if (del.status === 404) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 });
    }
    if (del.status === 403) {
      return NextResponse.json({ error: 'Bu oturumu silme yetkiniz yok' }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error deleting workout session:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout session: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
