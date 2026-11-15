import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getLocalDateString, isManualTimerSession } from '@/lib/fitnessCalculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const rawLimit = Number(searchParams.get('limit'));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 500) : 100;
    
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

    if (userId) {
      query = query.eq('userId', parseInt(userId));
    }

    const { data, error } = await query;

    if (error) throw error;

    const rawSessions = data || [];
    const sessionIds = rawSessions.map(s => s.id);

    // Fetch exercise completions if any exist for these sessions
    let completionsBySession: Record<number, any[]> = {};
    if (sessionIds.length > 0) {
      try {
        const { data: completions } = await supabase
          .from('exercise_completions')
          .select('id, sessionId, exerciseId, sets, reps')
          .in('sessionId', sessionIds);
        if (completions && completions.length > 0) {
          completions.forEach((c: any) => {
            if (!completionsBySession[c.sessionId]) completionsBySession[c.sessionId] = [];
            completionsBySession[c.sessionId].push(c);
          });
        }
      } catch (compErr) {
        console.error('Error fetching completions for sessions:', compErr);
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

      const completions = completionsBySession[session.id];
      if (completions && completions.length > 0) {
        completedExercises = completions.length;
        totalSets = completions.reduce((sum: number, c: any) => sum + (Number(c.sets) || 0), 0);
        totalReps = completions.reduce(
          (sum: number, c: any) => sum + (Number(c.sets) || 0) * (Number(c.reps) || 0),
          0
        );
      }

      const formatted: any = {
        id: session.id,
        userId: session.userId,
        programId: session.programId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        category: isManualTimer ? 'duration' : (session.category || 'workout'),
        createdAt: session.createdAt,
        program_name: isManualTimer
          ? 'Salonda Geçirilen Vakit'
          : (session.programs?.name || 'Antrenman'),
        user_name: session.users?.name || null,
        completed_exercises: completedExercises,
        total_sets: totalSets,
        total_reps: totalReps,
        is_manual_timer: isManualTimer
      };
      return formatted;
    });

    return NextResponse.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching workout sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout sessions: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'delete') {
      const targetId = parseInt(String(body.id), 10);
      if (isNaN(targetId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
      await supabase.from('exercise_completions').delete().eq('sessionId', targetId);
      const { error } = await supabase.from('workout_sessions').delete().eq('id', targetId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const { userId, programId, startTime, duration, category, completed_exercises, total_reps, total_sets } = body;

    const resolvedStartTime =
      startTime && typeof startTime === 'string' && startTime.trim()
        ? startTime.trim()
        : new Date().toISOString();
    const localDateStart = getLocalDateString(resolvedStartTime);

    // Verify programId exists to avoid foreign key violation
    let validProgramId: number | null = null;
    if (programId) {
      const { data: prog } = await supabase
        .from('programs')
        .select('id, name')
        .eq('id', programId)
        .maybeSingle();
      if (prog) {
        validProgramId = prog.id;
      }
    }

    const isManual = isManualTimerSession({
      category,
      program_name: body.program_name || body.programName,
    });

    const insertPayload: any = {
      userId: userId ? parseInt(userId) : null,
      programId: validProgramId,
      startTime: resolvedStartTime,
      duration: duration || null,
      category: isManual ? 'duration' : (category || 'workout'),
      createdAt: new Date().toISOString()
    };

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

    let { data, error } = await supabase
      .from('workout_sessions')
      .insert([insertPayload])
      .select(selectQuery)
      .single();

    // If startTime column is VARCHAR(10), fallback gracefully to local YYYY-MM-DD
    if (error?.code === '22001') {
      const retry = await supabase
        .from('workout_sessions')
        .insert([{ ...insertPayload, startTime: localDateStart }])
        .select(selectQuery)
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    const calculatedExercises = Number(completed_exercises) || 0;
    const calculatedSets = Number(total_sets) || 0;
    const calculatedReps = Number(total_reps) || 0;

    // Format the response
    const formattedSession = {
      id: data.id,
      userId: data.userId,
      programId: data.programId,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: data.duration,
      category: data.category,
      createdAt: data.createdAt,
      program_name: isManual ? 'Salonda Geçirilen Vakit' : (data.programs?.name || 'Antrenman'),
      user_name: data.users?.name || null,
      completed_exercises: calculatedExercises,
      total_sets: calculatedSets,
      total_reps: calculatedReps,
      is_manual_timer: isManual
    };

    return NextResponse.json(formattedSession, { status: 201 });
  } catch (error) {
    console.error('Error creating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to create workout session: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await supabase.from('exercise_completions').delete().eq('sessionId', numericId);

    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', numericId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout session:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout session: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
