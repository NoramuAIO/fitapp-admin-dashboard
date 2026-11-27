import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  encodeDurationNoteTag,
  enrichCompletionWithDuration,
  isMissingColumnError,
  stripDurationNoteTag,
} from '@/lib/exerciseApiHelpers';
import {
  getLocalDateString,
  isRealWorkoutSession,
  normalizeUtcTimestamp,
} from '@/lib/fitnessCalculations';
import {
  escapeIlikePattern,
  parseLocaleDecimal,
  parsePositiveInt,
  requireApiAuth,
  resolveScopedUserId,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

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

    const rawSessionId = searchParams.get('sessionId');
    const sessionId = rawSessionId ? parsePositiveInt(rawSessionId) : null;
    if (rawSessionId && !sessionId) {
      return NextResponse.json({ error: 'Geçersiz sessionId' }, { status: 400 });
    }

    const rawExerciseId = searchParams.get('exerciseId');
    const exerciseId = rawExerciseId ? parsePositiveInt(rawExerciseId) : null;
    if (rawExerciseId && !exerciseId) {
      return NextResponse.json({ error: 'Geçersiz exerciseId' }, { status: 400 });
    }

    const limitParam = searchParams.get('limit');
    const rawLimit = Number(limitParam);

    let query = supabase
      .from('exercise_completions')
      .select(`
        *,
        exercises (
          id,
          name,
          sets,
          reps,
          duration,
          muscleGroup,
          dayId,
          programId
        ),
        users (
          id,
          name
        )
      `)
      .order('completedAt', { ascending: false });

    if (scoped.userId) {
      query = query.eq('userId', scoped.userId);
    }

    if (sessionId) {
      query = query.eq('sessionId', sessionId);
    }

    if (exerciseId) {
      query = query.eq('exerciseId', exerciseId);
    }

    if (limitParam === 'all') {
      query = query.limit(5000);
    } else if (Number.isFinite(rawLimit) && rawLimit > 0) {
      query = query.limit(Math.min(Math.floor(rawLimit), 5000));
    } else if (!sessionId && !exerciseId) {
      query = query.limit(2000);
    }

    const { data, error } = await query;

    if (error) throw error;

    const formatted = (data || []).map((row: any) => {
      const ex = Array.isArray(row.exercises) ? row.exercises[0] : row.exercises;
      return enrichCompletionWithDuration({
        ...row,
        exerciseName: row.exerciseName || ex?.name || null,
        programId: row.programId ?? ex?.programId ?? null,
        dayId: row.dayId ?? ex?.dayId ?? null,
        completedAt: normalizeUtcTimestamp(row.completedAt) || row.completedAt,
      });
    });

    return NextResponse.json(formatted, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching exercise completions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise completions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { exerciseId, sessionId, sets, reps, weight, weight_kg, notes, machine_notes, rir } = body;

    const rawWeight = weight_kg !== undefined && weight_kg !== null ? weight_kg : weight;
    const parsedWeight =
      rawWeight !== undefined && rawWeight !== null && rawWeight !== ''
        ? parseLocaleDecimal(rawWeight)
        : null;
    if (parsedWeight !== null && parsedWeight < 0) {
      return NextResponse.json({ error: 'Ağırlık negatif olamaz' }, { status: 400 });
    }
    const finalWeight = parsedWeight;

    const finalNotes = machine_notes
      ? (rir ? `[RIR: ${rir}] ${machine_notes}` : machine_notes)
      : (notes || (rir ? `RIR: ${rir}` : null));

    const scoped = resolveScopedUserId(guard.auth, parsePositiveInt(body.userId));
    if (!scoped.ok) return scoped.response;
    const parsedUserId = scoped.userId;
    if (!parsedUserId) {
      return NextResponse.json(
        { error: 'Geçerli bir userId gerekli' },
        { status: 400 }
      );
    }

    const { data: uExists, error: userLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('id', parsedUserId)
      .maybeSingle();

    if (userLookupError) throw userLookupError;
    if (!uExists) {
      return NextResponse.json(
        { error: 'Geçerli bir userId gerekli (kullanıcı bulunamadı)' },
        { status: 400 }
      );
    }
    const validUserId = uExists.id;

    // 2. Validate exerciseId (or resolve by exerciseName), never attach to random exercise #564
    let validExerciseId: number | null = null;
    let resolvedProgramId: number | null = body.programId ? parseInt(String(body.programId), 10) || null : null;
    const parsedExerciseId = exerciseId ? parseInt(String(exerciseId), 10) : NaN;
    if (Number.isFinite(parsedExerciseId) && parsedExerciseId > 0) {
      const { data: exExists } = await supabase
        .from('exercises')
        .select('id, programId')
        .eq('id', parsedExerciseId)
        .maybeSingle();
      if (exExists) {
        validExerciseId = exExists.id;
        if (!resolvedProgramId && exExists.programId) {
          resolvedProgramId = Number(exExists.programId);
        }
      }
    }

    if (!validExerciseId && typeof body.exerciseName === 'string' && body.exerciseName.trim()) {
      const { data: namedEx } = await supabase
        .from('exercises')
        .select('id, programId')
        .ilike('name', escapeIlikePattern(body.exerciseName.trim()))
        .limit(1)
        .maybeSingle();
      if (namedEx) {
        validExerciseId = namedEx.id;
        if (!resolvedProgramId && namedEx.programId) {
          resolvedProgramId = Number(namedEx.programId);
        }
      }
    }

    if (!validExerciseId) {
      return NextResponse.json(
        { error: 'Egzersiz bulunamadı' },
        { status: 404 }
      );
    }

    // 3. Preserve original completion & session timestamps (never silently move yesterday's completions to today)
    const normalizedCompletedInput = normalizeUtcTimestamp(body.completedAt);
    const normalizedSessionStartInput = normalizeUtcTimestamp(body.sessionStartTime);
    const completedIso =
      normalizedCompletedInput && !Number.isNaN(new Date(normalizedCompletedInput).getTime())
        ? new Date(normalizedCompletedInput).toISOString()
        : normalizedSessionStartInput && !Number.isNaN(new Date(normalizedSessionStartInput).getTime())
          ? new Date(normalizedSessionStartInput).toISOString()
          : new Date().toISOString();
    const sessionAnchorIso =
      normalizedSessionStartInput && !Number.isNaN(new Date(normalizedSessionStartInput).getTime())
        ? new Date(normalizedSessionStartInput).toISOString()
        : completedIso;
    const targetDate = getLocalDateString(sessionAnchorIso);

    let validSessionId: number | null = null;
    if (sessionId && !body.localSessionOnly) {
      const parsedSid = parseInt(String(sessionId), 10);
      if (Number.isFinite(parsedSid) && parsedSid > 0) {
        const { data: sExists } = await supabase
          .from('workout_sessions')
          .select('id, userId, startTime, createdAt')
          .eq('id', parsedSid)
          .eq('userId', validUserId)
          .maybeSingle();
        if (sExists) {
          // Guard against offline local SQLite IDs accidentally matching an unrelated remote session on a different day
          const existingDay = getLocalDateString(
            normalizeUtcTimestamp(sExists.startTime || sExists.createdAt) || sExists.startTime || sExists.createdAt
          );
          if (!body.sessionStartTime || existingDay === targetDate) {
            validSessionId = sExists.id;
          }
        }
      }
    }

    if (!validSessionId) {
      const { data: userSessions } = await supabase
        .from('workout_sessions')
        .select('id, userId, startTime, createdAt, category, programId')
        .eq('userId', validUserId)
        .order('createdAt', { ascending: false })
        .limit(40);

      const sameDaySessions = (userSessions || []).filter((s: any) => {
        if (!isRealWorkoutSession(s)) return false;
        const sd = getLocalDateString(
          normalizeUtcTimestamp(s.startTime || s.createdAt) || s.startTime || s.createdAt
        );
        return sd === targetDate;
      });

      const matchedSession =
        (resolvedProgramId
          ? sameDaySessions.find((s: any) => Number(s.programId) === resolvedProgramId)
          : undefined) || sameDaySessions[0];

      if (matchedSession) {
        validSessionId = matchedSession.id;
      } else {
        const newSessionPayload = {
          userId: validUserId,
          programId: resolvedProgramId,
          startTime: targetDate,
          category: 'workout',
          createdAt: sessionAnchorIso,
        };
        const { data: createdSession, error: createSessionErr } = await supabase
          .from('workout_sessions')
          .insert([newSessionPayload])
          .select('id')
          .single();

        if (createSessionErr) throw createSessionErr;
        validSessionId = createdSession?.id ?? null;
      }
    }

    const safeSets =
      sets !== undefined && sets !== null && sets !== ''
        ? Math.max(0, parseInt(String(sets), 10) || 0)
        : 1;
    const safeReps =
      reps !== undefined && reps !== null && reps !== ''
        ? Math.max(0, parseInt(String(reps), 10) || 0)
        : 0;

    const rawPostDuration =
      body.durationSeconds !== undefined
        ? body.durationSeconds
        : body.duration_seconds !== undefined
          ? body.duration_seconds
          : undefined;
    const durationSecondsVal =
      rawPostDuration !== undefined && rawPostDuration !== null && rawPostDuration !== ''
        ? Math.max(0, Math.round(Number(rawPostDuration) || 0))
        : null;
    const safeDurationSec =
      durationSecondsVal && durationSecondsVal > 0 ? durationSecondsVal : null;
    const cleanFinalNotes = stripDurationNoteTag(finalNotes || '') || null;

    // Prevent duplicate completion rows for the same (userId, sessionId, exerciseId) on retries or Undo+re-complete
    if (validSessionId && validExerciseId) {
      const { data: existingRows, error: existingErr } = await supabase
        .from('exercise_completions')
        .select('id')
        .eq('userId', validUserId)
        .eq('sessionId', validSessionId)
        .eq('exerciseId', validExerciseId)
        .order('id', { ascending: true });

      if (existingErr) throw existingErr;

      if (existingRows && existingRows.length > 0) {
        const primaryId = existingRows[0].id;
        const extraIds = existingRows.slice(1).map((r: any) => r.id);

        const updatePayload: Record<string, any> = {
          sets: safeSets,
          reps: safeReps,
          weight: finalWeight,
          duration_seconds: safeDurationSec,
          notes: cleanFinalNotes,
          completedAt: completedIso,
        };
        let { data: updated, error: updateErr } = await supabase
          .from('exercise_completions')
          .update(updatePayload)
          .eq('id', primaryId)
          .eq('userId', validUserId)
          .select()
          .single();

        if (updateErr && isMissingColumnError(updateErr)) {
          const { duration_seconds: _ds, ...legacyUpdatePayload } = updatePayload;
          if (safeDurationSec) {
            legacyUpdatePayload.notes = encodeDurationNoteTag(safeDurationSec, cleanFinalNotes);
          }
          const fallbackUpd = await supabase
            .from('exercise_completions')
            .update(legacyUpdatePayload)
            .eq('id', primaryId)
            .eq('userId', validUserId)
            .select()
            .single();
          updated = fallbackUpd.data;
          updateErr = fallbackUpd.error;
        }

        if (updateErr) throw updateErr;

        if (extraIds.length > 0) {
          await supabase
            .from('exercise_completions')
            .delete()
            .in('id', extraIds)
            .eq('userId', validUserId);
        }

        return NextResponse.json(
          enrichCompletionWithDuration({
            ...updated,
            completedAt: normalizeUtcTimestamp(updated?.completedAt) || updated?.completedAt,
          }),
          { status: 200, headers: NO_STORE_HEADERS }
        );
      }
    }

    const insertPayload: Record<string, any> = {
      userId: validUserId,
      exerciseId: validExerciseId,
      sessionId: validSessionId,
      sets: safeSets,
      reps: safeReps,
      weight: finalWeight,
      duration_seconds: safeDurationSec,
      notes: cleanFinalNotes,
      completedAt: completedIso,
    };

    let { data, error } = await supabase
      .from('exercise_completions')
      .insert([insertPayload])
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      const { duration_seconds: _ds, ...legacyInsertPayload } = insertPayload;
      if (safeDurationSec) {
        legacyInsertPayload.notes = encodeDurationNoteTag(safeDurationSec, cleanFinalNotes);
      }
      const fallbackIns = await supabase
        .from('exercise_completions')
        .insert([legacyInsertPayload])
        .select()
        .single();
      data = fallbackIns.data;
      error = fallbackIns.error;
    }

    if (error) {
      console.error('Supabase error inserting exercise_completions:', error);
      throw error;
    }

    return NextResponse.json(
      enrichCompletionWithDuration({
        ...data,
        completedAt: normalizeUtcTimestamp(data?.completedAt) || data?.completedAt,
      }),
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error saving exercise completion:', error);
    return NextResponse.json(
      { error: 'Failed to save exercise completion' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const completionId = parsePositiveInt(body.id);
    const parsedSessionId = parsePositiveInt(body.sessionId);
    const parsedExerciseId = parsePositiveInt(body.exerciseId);
    const scoped = resolveScopedUserId(guard.auth, parsePositiveInt(body.userId));
    if (!scoped.ok) return scoped.response;

    const parsedSets = body.sets !== undefined ? Math.max(0, Math.round(parseLocaleDecimal(body.sets) ?? 0)) : undefined;
    const parsedReps = body.reps !== undefined ? Math.max(0, Math.round(parseLocaleDecimal(body.reps) ?? 0)) : undefined;
    const rawWeight = body.weight_kg !== undefined ? body.weight_kg : body.weight;
    const parsedWeight =
      rawWeight !== undefined
        ? rawWeight === null || rawWeight === ''
          ? null
          : parseLocaleDecimal(rawWeight)
        : undefined;

    if (parsedWeight !== undefined && parsedWeight !== null && parsedWeight < 0) {
      return NextResponse.json({ error: 'Ağırlık negatif olamaz' }, { status: 400 });
    }

    const updateFields: Record<string, any> = {};
    if (parsedSets !== undefined) updateFields.sets = parsedSets;
    if (parsedReps !== undefined) updateFields.reps = parsedReps;
    if (parsedWeight !== undefined) updateFields.weight = parsedWeight;
    const rawPutDuration =
      body.durationSeconds !== undefined
        ? body.durationSeconds
        : body.duration_seconds !== undefined
          ? body.duration_seconds
          : undefined;
    const parsedPutDuration =
      rawPutDuration !== undefined && rawPutDuration !== null && rawPutDuration !== ''
        ? Math.max(0, Math.round(Number(rawPutDuration) || 0))
        : undefined;
    if (parsedPutDuration !== undefined) {
      updateFields.duration_seconds = parsedPutDuration > 0 ? parsedPutDuration : null;
    }
    if (body.notes !== undefined) {
      const cleaned = stripDurationNoteTag(body.notes ? String(body.notes) : '');
      updateFields.notes = cleaned || null;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan gerekli' }, { status: 400 });
    }

    const runCompletionUpdate = async (fields: Record<string, any>) => {
      let query = supabase.from('exercise_completions').update(fields);
      if (completionId) {
        query = query.eq('id', completionId);
      } else if (parsedSessionId && parsedExerciseId) {
        query = query.eq('sessionId', parsedSessionId).eq('exerciseId', parsedExerciseId);
      } else {
        return { data: null, error: null, invalidKeys: true as const };
      }

      if (!guard.auth.isAdmin && guard.auth.userId) {
        query = query.eq('userId', guard.auth.userId);
      } else if (scoped.userId) {
        query = query.eq('userId', scoped.userId);
      }

      const res = await query.select();
      return { data: res.data, error: res.error, invalidKeys: false as const };
    };

    const initialUpdate = await runCompletionUpdate(updateFields);
    if (initialUpdate.invalidKeys) {
      return NextResponse.json(
        { error: 'id veya sessionId+exerciseId gereklidir' },
        { status: 400 }
      );
    }

    let { data, error } = initialUpdate;
    if (error && isMissingColumnError(error) && 'duration_seconds' in updateFields) {
      const { duration_seconds, ...legacyFields } = updateFields;
      if (duration_seconds) {
        let baseNotes =
          legacyFields.notes !== undefined
            ? String(legacyFields.notes || '')
            : body.notes !== undefined
              ? String(body.notes || '')
              : '';
        if (legacyFields.notes === undefined && body.notes === undefined) {
          let noteQuery = supabase.from('exercise_completions').select('notes');
          if (completionId) {
            noteQuery = noteQuery.eq('id', completionId);
          } else if (parsedSessionId && parsedExerciseId) {
            noteQuery = noteQuery.eq('sessionId', parsedSessionId).eq('exerciseId', parsedExerciseId);
          }
          const { data: existingNoteRows } = await noteQuery.limit(1);
          baseNotes = String(existingNoteRows?.[0]?.notes || '');
        }
        legacyFields.notes = encodeDurationNoteTag(duration_seconds, baseNotes);
      }
      const fallbackUpdate = await runCompletionUpdate(legacyFields);
      data = fallbackUpdate.data;
      error = fallbackUpdate.error;
    }

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(
      data.map((row: any) =>
        enrichCompletionWithDuration({
          ...row,
          completedAt: normalizeUtcTimestamp(row.completedAt) || row.completedAt,
        })
      ),
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error updating exercise completion:', error);
    return NextResponse.json(
      { error: 'Failed to update exercise completion' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');
    const completionId = rawId ? parsePositiveInt(rawId) : null;
    if (rawId && !completionId) {
      return NextResponse.json({ error: 'Geçersiz id' }, { status: 400 });
    }

    const rawSessionId = searchParams.get('sessionId');
    const parsedSessionId = rawSessionId ? parsePositiveInt(rawSessionId) : null;
    if (rawSessionId && !parsedSessionId) {
      return NextResponse.json({ error: 'Geçersiz sessionId' }, { status: 400 });
    }

    const rawExerciseId = searchParams.get('exerciseId');
    let parsedExerciseId = rawExerciseId ? parsePositiveInt(rawExerciseId) : null;
    if (rawExerciseId && !parsedExerciseId) {
      return NextResponse.json({ error: 'Geçersiz exerciseId' }, { status: 400 });
    }

    const rawUserId = searchParams.get('userId');
    const parsedUserId = rawUserId ? parsePositiveInt(rawUserId) : null;
    if (rawUserId && !parsedUserId) {
      return NextResponse.json({ error: 'Geçersiz userId' }, { status: 400 });
    }

    const scoped = resolveScopedUserId(guard.auth, parsedUserId);
    if (!scoped.ok) return scoped.response;

    const exerciseNameParam = searchParams.get('exerciseName')?.trim();
    if (!parsedExerciseId && exerciseNameParam) {
      const { data: namedEx } = await supabase
        .from('exercises')
        .select('id')
        .ilike('name', escapeIlikePattern(exerciseNameParam))
        .limit(1)
        .maybeSingle();
      if (namedEx?.id) {
        parsedExerciseId = Number(namedEx.id);
      }
    }

    if (!completionId && !(parsedSessionId && parsedExerciseId)) {
      if (parsedSessionId && exerciseNameParam && !parsedExerciseId) {
        return NextResponse.json(
          { deleted: true, count: 0 },
          { status: 200, headers: NO_STORE_HEADERS }
        );
      }
      return NextResponse.json(
        { error: 'id veya sessionId+exerciseId gereklidir' },
        { status: 400 }
      );
    }

    let deleteQuery = supabase.from('exercise_completions').delete();
    if (completionId) {
      deleteQuery = deleteQuery.eq('id', completionId);
    } else if (parsedSessionId && parsedExerciseId) {
      deleteQuery = deleteQuery.eq('sessionId', parsedSessionId).eq('exerciseId', parsedExerciseId);
    }

    if (!guard.auth.isAdmin && guard.auth.userId) {
      deleteQuery = deleteQuery.eq('userId', guard.auth.userId);
    } else if (scoped.userId) {
      deleteQuery = deleteQuery.eq('userId', scoped.userId);
    }

    const { data, error } = await deleteQuery.select('id');
    if (error) throw error;

    return NextResponse.json(
      { deleted: true, count: data?.length ?? 0 },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error deleting exercise completion:', error);
    return NextResponse.json(
      { error: 'Failed to delete exercise completion' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
