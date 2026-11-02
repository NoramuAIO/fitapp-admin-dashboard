import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exercises } = body; // Array of { id: number, orderIndex: number, workoutId?: number }

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: 'Invalid exercises array' }, { status: 400 });
    }

    // Perform updates in parallel
    const updates = exercises.map(async (item: any) => {
      const updateData: any = { orderIndex: item.orderIndex };
      if (item.workoutId !== undefined) {
        updateData.dayId = item.workoutId;
      }
      return supabase
        .from('exercises')
        .update(updateData)
        .eq('id', parseInt(String(item.id), 10));
    });

    const results = await Promise.all(updates);
    const hasError = results.find(r => r.error);
    if (hasError && hasError.error) {
      throw hasError.error;
    }

    return NextResponse.json({ success: true, count: exercises.length });
  } catch (error) {
    console.error('Error reordering exercises:', error);
    return NextResponse.json(
      { error: 'Failed to reorder exercises: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
