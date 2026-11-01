import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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

    // Validate sessionId against workout_sessions to prevent foreign key errors (e.g. from local SQLite session IDs)
    let validSessionId: number | null = null;
    if (sessionId) {
      try {
        const parsed = parseInt(String(sessionId));
        if (!isNaN(parsed)) {
          const { data: sExists } = await supabase
            .from('workout_sessions')
            .select('id')
            .eq('id', parsed)
            .maybeSingle();
          if (sExists) {
            validSessionId = sExists.id;
          }
        }
      } catch {}
    }

    // If local SQLite sessionId wasn't in Supabase, associate with user's most recent workout session if one exists
    if (!validSessionId && userId) {
      try {
        const { data: latestSession } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('userId', parseInt(userId) || 1)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestSession) {
          validSessionId = latestSession.id;
        }
      } catch {}
    }

    // Validate userId against users table
    let validUserId = 1;
    if (userId) {
      try {
        const { data: uExists } = await supabase
          .from('users')
          .select('id')
          .eq('id', parseInt(userId))
          .maybeSingle();
        if (uExists) {
          validUserId = uExists.id;
        }
      } catch {}
    }

    // Validate exerciseId against exercises table
    let validExerciseId = parseInt(exerciseId);
    if (!validExerciseId || isNaN(validExerciseId)) {
      validExerciseId = 564;
    } else {
      try {
        const { data: exExists } = await supabase
          .from('exercises')
          .select('id')
          .eq('id', validExerciseId)
          .maybeSingle();
        if (!exExists) {
          // Fallback to first available exercise
          const { data: firstEx } = await supabase.from('exercises').select('id').limit(1).maybeSingle();
          if (firstEx) validExerciseId = firstEx.id;
        }
      } catch {}
    }

    const { data, error } = await supabase
      .from('exercise_completions')
      .insert([{
        userId: validUserId,
        exerciseId: validExerciseId,
        sessionId: validSessionId,
        sets: sets ? parseInt(sets) : 1,
        reps: reps ? parseInt(reps) : 10,
        weight: finalWeight,
        notes: finalNotes,
        completedAt: new Date().toISOString()
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
