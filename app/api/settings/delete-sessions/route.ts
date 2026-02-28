import getDatabase from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    const db = getDatabase();

    // Önce kaç kayıt var kontrol et
    const countResult = await db.query('SELECT COUNT(*) as count FROM workout_sessions');
    const count = countResult.rows[0]?.count || 0;

    // Tüm workout session'ları sil
    await db.query('DELETE FROM workout_sessions');

    // İlgili exercise_progress kayıtları da silinir (CASCADE)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: count,
      message: `${count} antreman kaydı silindi` 
    });
  } catch (error) {
    console.error('Error deleting workout sessions:', error);
    return NextResponse.json(
      { error: 'Antreman kayıtları silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
