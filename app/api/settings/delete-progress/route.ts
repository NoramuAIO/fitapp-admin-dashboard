import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    // Check count first
    const { count } = await supabase
      .from('exercise_progress')
      .select('*', { count: 'exact', head: true });

    // Delete all exercise progress records
    const { error } = await supabase
      .from('exercise_progress')
      .delete()
      .neq('id', 0);

    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: count || 0,
      message: `${count || 0} ilerleme kaydı silindi` 
    });
  } catch (error) {
    console.error('Error deleting exercise progress:', error);
    return NextResponse.json(
      { error: 'İlerleme kayıtları silinirken hata oluştu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return DELETE();
}
