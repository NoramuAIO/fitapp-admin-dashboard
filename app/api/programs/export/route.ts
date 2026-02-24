import getDatabase from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    const db = getDatabase();
    
    // Get program
    const programResult = await db.query(
      'SELECT * FROM programs WHERE id = $1',
      [programId]
    );

    if (programResult.rows.length === 0) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const program = programResult.rows[0];

    // Get days
    const daysResult = await db.query(
      'SELECT * FROM program_days WHERE "programId" = $1 ORDER BY "orderIndex" ASC',
      [programId]
    );

    // Get exercises for each day
    const daysWithExercises = await Promise.all(
      daysResult.rows.map(async (day) => {
        const exercisesResult = await db.query(
          'SELECT * FROM exercises WHERE "dayId" = $1 ORDER BY "orderIndex" ASC',
          [day.id]
        );
        return {
          ...day,
          exercises: exercisesResult.rows
        };
      })
    );

    const exportData = {
      ...program,
      days: daysWithExercises
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting program:', error);
    return NextResponse.json({ error: 'Failed to export program' }, { status: 500 });
  }
}
