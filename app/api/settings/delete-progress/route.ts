import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    // Önce kaç kayıt var kontrol et
    const { count } = await supabase
      .from('exercise_progress')
      .select('*', { count: 'exact', head: true });

    // Tüm exercise progress kayıtlarını sil
    const { error } = await supabase
      .from('exercise_progress')
      .delete()
      .neq('id', 0); // Tüm kayıtları sil (id != 0 her zaman true)

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
