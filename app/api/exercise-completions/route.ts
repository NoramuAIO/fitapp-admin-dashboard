import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
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

    const formatted = (data || []).map((row: any) => ({
      ...row,
      completedAt: normalizeUtcTimestamp(row.completedAt) || row.completedAt,
    }));

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

    const { data, error } = await supabase
      .from('exercise_completions')
      .insert([{
        userId: validUserId,
        exerciseId: validExerciseId,
        sessionId: validSessionId,
        sets: safeSets,
        reps: safeReps,
        weight: finalWeight,
        notes: finalNotes,
        completedAt: completedIso
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting exercise_completions:', error);
      throw error;
    }

    return NextResponse.json(
      {
        ...data,
        completedAt: normalizeUtcTimestamp(data?.completedAt) || data?.completedAt,
      },
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
    if (body.notes !== undefined) updateFields.notes = body.notes ? String(body.notes) : null;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan gerekli' }, { status: 400 });
    }

    let query = supabase.from('exercise_completions').update(updateFields);
    if (completionId) {
      query = query.eq('id', completionId);
    } else if (parsedSessionId && parsedExerciseId) {
      query = query.eq('sessionId', parsedSessionId).eq('exerciseId', parsedExerciseId);
    } else {
      return NextResponse.json(
        { error: 'id veya sessionId+exerciseId gereklidir' },
        { status: 400 }
      );
    }

    if (!guard.auth.isAdmin && guard.auth.userId) {
      query = query.eq('userId', guard.auth.userId);
    } else if (scoped.userId) {
      query = query.eq('userId', scoped.userId);
    }

    const { data, error } = await query.select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(
      data.map((row: any) => ({
        ...row,
        completedAt: normalizeUtcTimestamp(row.completedAt) || row.completedAt,
      })),
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
