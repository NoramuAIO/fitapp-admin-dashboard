import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    // Check count first
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true });

    // Also delete any exercise completions referencing these sessions
    await supabase
      .from('exercise_completions')
      .delete()
      .neq('id', 0);

    // Delete all workout sessions
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .neq('id', 0);

    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: count || 0,
      message: `${count || 0} antreman kaydı silindi` 
    });
  } catch (error) {
    console.error('Error deleting workout sessions:', error);
    return NextResponse.json(
      { error: 'Antreman kayıtları silinirken hata oluştu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return DELETE();
}
