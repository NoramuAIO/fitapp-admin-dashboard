import getDatabase from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE() {
  try {
    const db = getDatabase();

    // Önce kaç kayıt var kontrol et
    const countResult = await db.query('SELECT COUNT(*) as count FROM exercise_progress');
    const count = countResult.rows[0]?.count || 0;

    // Tüm exercise progress kayıtlarını sil
    await db.query('DELETE FROM exercise_progress');
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: count,
      message: `${count} ilerleme kaydı silindi` 
    });
  } catch (error) {
    console.error('Error deleting exercise progress:', error);
    return NextResponse.json(
      { error: 'İlerleme kayıtları silinirken hata oluştu' },
      { status: 500 }
    );
  }
}
