import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    // Önce kaç kayıt var kontrol et
    const { count } = await supabase
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true });

    // Tüm workout session'ları sil
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .neq('id', 0); // Tüm kayıtları sil (id != 0 her zaman true)

    if (error) throw error;

    // İlgili exercise_progress kayıtları da silinir (CASCADE)
    
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
