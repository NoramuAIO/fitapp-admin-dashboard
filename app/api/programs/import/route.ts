import getDatabase from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programData } = body;

    if (!programData) {
      return NextResponse.json({ error: 'programData is required' }, { status: 400 });
    }

    const db = getDatabase();

    // Create program
    const programResult = await db.query(
      'INSERT INTO programs (name, description, "isPrimary") VALUES ($1, $2, $3) RETURNING *',
      [programData.name, programData.description || null, false]
    );

    const newProgram = programResult.rows[0];

    // Create days and exercises
    if (programData.days && Array.isArray(programData.days)) {
      for (const day of programData.days) {
        const dayResult = await db.query(
          'INSERT INTO program_days ("programId", "dayNumber", "dayName", "orderIndex") VALUES ($1, $2, $3, $4) RETURNING *',
          [newProgram.id, day.dayNumber, day.dayName, day.orderIndex]
        );

        const newDay = dayResult.rows[0];

        if (day.exercises && Array.isArray(day.exercises)) {
          for (const exercise of day.exercises) {
            await db.query(
              'INSERT INTO exercises ("dayId", "programId", name, sets, reps, duration, description, "imageUrl", "muscleGroup", "orderIndex") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
              [
                newDay.id,
                newProgram.id,
                exercise.name,
                exercise.sets,
                exercise.reps,
                exercise.duration || null,
                exercise.description || null,
                exercise.imageUrl || null,
                exercise.muscleGroup || null,
                exercise.orderIndex
              ]
            );
          }
        }
      }
    }

    return NextResponse.json(newProgram, { status: 201 });
  } catch (error) {
    console.error('Error importing program:', error);
    return NextResponse.json({ error: 'Failed to import program' }, { status: 500 });
  }
}
