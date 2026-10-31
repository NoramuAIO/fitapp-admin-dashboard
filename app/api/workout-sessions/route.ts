import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let query = supabase
      .from('workout_sessions')
      .select(`
        *,
        programs (
          id,
          name,
          program_days (
            id,
            name,
            exercises (
              id,
              name,
              sets,
              reps
            )
          )
        ),
        users (
          name
        )
      `)
      .order('createdAt', { ascending: false })
      .limit(100);

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
      const isManualTimer = !session.programId || ['duration', 'set', 'timer'].includes(session.category);
      
      let completedExercises = 0;
      let totalReps = 0;
      let totalSets = 0;

      if (!isManualTimer && session.programs) {
        const completions = completionsBySession[session.id];
        if (completions && completions.length > 0) {
          completedExercises = completions.length;
          totalSets = completions.reduce((sum: number, c: any) => sum + (c.sets || 3), 0);
          totalReps = completions.reduce((sum: number, c: any) => sum + ((c.sets || 3) * (c.reps || 10)), 0);
        } else {
          // Calculate from program structure
          const programDays = session.programs.program_days || [];
          const allExercises = programDays.flatMap((day: any) => day.exercises || []);
          
          if (allExercises.length > 0) {
            // If multiple days, a single workout session corresponds to 1 day's exercises
            completedExercises = programDays.length > 1
              ? Math.max(1, Math.round(allExercises.length / programDays.length))
              : allExercises.length;
            
            const avgSets = allExercises.reduce((sum: number, ex: any) => sum + (ex.sets || 3), 0) / allExercises.length;
            const avgReps = allExercises.reduce((sum: number, ex: any) => sum + (ex.reps || 10), 0) / allExercises.length;
            totalSets = Math.round(completedExercises * avgSets);
            totalReps = Math.round(completedExercises * avgSets * avgReps);
          } else {
            completedExercises = 5;
            totalSets = 15;
            totalReps = 150;
          }
        }
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
    const { userId, programId, startTime, duration, category, completed_exercises, total_reps, total_sets } = body;

    // Supabase column startTime is VARCHAR(10)
    // Safe slicing: extract date YYYY-MM-DD (10 chars)
    let safeStartTime = new Date().toISOString().split('T')[0];
    if (startTime && typeof startTime === 'string') {
      if (startTime.includes('T')) {
        safeStartTime = startTime.split('T')[0];
      } else {
        safeStartTime = startTime.slice(0, 10);
      }
    }

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

    const isManual = !validProgramId || ['duration', 'set', 'timer'].includes(category);

    const insertPayload: any = {
      userId: userId ? parseInt(userId) : null,
      programId: validProgramId,
      startTime: safeStartTime,
      duration: duration || null,
      category: isManual ? 'duration' : (category || 'workout'),
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert([insertPayload])
      .select(`
        *,
        programs (
          id,
          name,
          program_days (
            id,
            exercises (
              id,
              sets,
              reps
            )
          )
        ),
        users (
          name
        )
      `)
      .single();

    if (error) throw error;

    // Calculate completed exercises if not provided
    let calculatedExercises = completed_exercises || 0;
    let calculatedSets = total_sets || 0;
    let calculatedReps = total_reps || 0;

    if (!isManual && calculatedExercises === 0 && data.programs) {
      const allEx = (data.programs.program_days || []).flatMap((d: any) => d.exercises || []);
      calculatedExercises = allEx.length > 0 ? allEx.length : 5;
      calculatedSets = calculatedExercises * 3;
      calculatedReps = calculatedExercises * 30;
    }

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

    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', parseInt(id));

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
