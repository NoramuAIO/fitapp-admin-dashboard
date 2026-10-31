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
          name
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

    // Format the response
    const formattedSessions = (data || []).map(session => {
      const formatted: any = {
        id: session.id,
        userId: session.userId,
        programId: session.programId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        category: session.category,
        createdAt: session.createdAt,
        program_name: session.programs?.name || 'Antreman',
        user_name: session.users?.name || null,
        completed_exercises: 0,
        total_reps: 0,
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
    const { userId, programId, startTime, duration, category } = body;

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
        .select('id')
        .eq('id', programId)
        .maybeSingle();
      if (prog) {
        validProgramId = prog.id;
      }
    }

    const insertPayload: any = {
      userId: userId ? parseInt(userId) : null,
      programId: validProgramId,
      startTime: safeStartTime,
      duration: duration || null,
      category: category || 'workout',
      createdAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('workout_sessions')
      .insert([insertPayload])
      .select(`
        *,
        programs (
          name
        ),
        users (
          name
        )
      `)
      .single();

    if (error) throw error;

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
      program_name: data.programs?.name || 'Antreman',
      user_name: data.users?.name || null,
      completed_exercises: 0,
      total_reps: 0,
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
