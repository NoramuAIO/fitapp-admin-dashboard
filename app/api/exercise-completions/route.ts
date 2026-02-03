import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    
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
      query = query.eq('userId', userId);
    }

    if (sessionId) {
      query = query.eq('sessionId', sessionId);
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
    const { userId, exerciseId, sessionId, sets, reps, weight, notes } = body;

    const { data, error } = await supabase
      .from('exercise_completions')
      .insert([{
        userId,
        exerciseId,
        sessionId,
        sets,
        reps,
        weight: weight || null,
        notes: notes || null,
        completedAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error saving exercise completion:', error);
    return NextResponse.json(
      { error: 'Failed to save exercise completion' },
      { status: 500 }
    );
  }
}
