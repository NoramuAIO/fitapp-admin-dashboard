import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getLocalDateString, isRealWorkoutSession } from '@/lib/fitnessCalculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const exerciseId = searchParams.get('exerciseId');
    
    let query = supabase
      .from('exercise_completions')
      .select(`
        *,
        exercises (
          id,
          name,
          sets,
          reps
        ),
        users (
          id,
          name
        )
      `)
      .order('completedAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', parseInt(userId));
    }

    if (sessionId) {
      query = query.eq('sessionId', parseInt(sessionId));
    }

    if (exerciseId) {
      query = query.eq('exerciseId', parseInt(exerciseId));
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching exercise completions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise completions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, exerciseId, sessionId, sets, reps, weight, weight_kg, notes, machine_notes, rir } = body;

    const rawWeight = weight_kg !== undefined && weight_kg !== null ? weight_kg : weight;
    const parsedWeight = (rawWeight !== undefined && rawWeight !== null && rawWeight !== '')
      ? parseFloat(String(rawWeight).replace(',', '.'))
      : null;
    const finalWeight = parsedWeight !== null && !isNaN(parsedWeight) ? parsedWeight : null;

    const finalNotes = machine_notes
      ? (rir ? `[RIR: ${rir}] ${machine_notes}` : machine_notes)
      : (notes || (rir ? `RIR: ${rir}` : null));

    // 1. Validate userId strictly (never silently default to userId=1)
    const parsedUserId = userId ? parseInt(String(userId), 10) : NaN;
    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
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
    const parsedExerciseId = exerciseId ? parseInt(String(exerciseId), 10) : NaN;
    if (Number.isFinite(parsedExerciseId) && parsedExerciseId > 0) {
      const { data: exExists } = await supabase
        .from('exercises')
        .select('id')
        .eq('id', parsedExerciseId)
        .maybeSingle();
      if (exExists) {
        validExerciseId = exExists.id;
      }
    }

    if (!validExerciseId && typeof body.exerciseName === 'string' && body.exerciseName.trim()) {
      const { data: namedEx } = await supabase
        .from('exercises')
        .select('id')
        .ilike('name', body.exerciseName.trim())
        .limit(1)
        .maybeSingle();
      if (namedEx) {
        validExerciseId = namedEx.id;
      }
    }

    if (!validExerciseId) {
      return NextResponse.json(
        { error: 'Egzersiz bulunamadı' },
        { status: 404 }
      );
    }

    // 3. Validate sessionId belonging to validUserId or match/create a session on the exact same local date
    const completedIso =
      body.completedAt && !Number.isNaN(new Date(body.completedAt).getTime())
        ? new Date(body.completedAt).toISOString()
        : new Date().toISOString();
    const targetDate = getLocalDateString(completedIso);

    let validSessionId: number | null = null;
    if (sessionId) {
      const parsedSid = parseInt(String(sessionId), 10);
      if (Number.isFinite(parsedSid) && parsedSid > 0) {
        const { data: sExists } = await supabase
          .from('workout_sessions')
          .select('id, userId')
          .eq('id', parsedSid)
          .eq('userId', validUserId)
          .maybeSingle();
        if (sExists) {
          validSessionId = sExists.id;
        }
      }
    }

    if (!validSessionId) {
      const { data: userSessions } = await supabase
        .from('workout_sessions')
        .select('id, userId, startTime, createdAt, category, programId')
        .eq('userId', validUserId)
        .order('createdAt', { ascending: false })
        .limit(20);

      const sameDaySession = (userSessions || []).find(
        (s: any) =>
          isRealWorkoutSession(s) &&
          getLocalDateString(s.startTime || s.createdAt) === targetDate
      );

      if (sameDaySession) {
        validSessionId = sameDaySession.id;
      } else {
        const newSessionPayload = {
          userId: validUserId,
          programId: body.programId ? parseInt(String(body.programId), 10) || null : null,
          startTime: completedIso,
          category: 'workout',
          createdAt: completedIso,
        };
        let { data: createdSession, error: createSessionErr } = await supabase
          .from('workout_sessions')
          .insert([newSessionPayload])
          .select('id')
          .single();

        if (createSessionErr?.code === '22001') {
          const retry = await supabase
            .from('workout_sessions')
            .insert([{ ...newSessionPayload, startTime: targetDate }])
            .select('id')
            .single();
          createdSession = retry.data;
          createSessionErr = retry.error;
        }

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

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error saving exercise completion:', error);
    return NextResponse.json(
      { error: 'Failed to save exercise completion' },
      { status: 500 }
    );
  }
}
