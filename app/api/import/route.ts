import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { parseNonNegativeInt, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';
import { parseCsvMatrix } from '@/lib/csv';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { data, format, type = 'all' } = body;

    if (!data) {
      return NextResponse.json({ error: 'İçe aktarılacak veri boş' }, { status: 400 });
    }

    const imported = { programs: 0, workouts: 0, exercises: 0 };
    const programIdMap = new Map<number, number>();
    const workoutIdMap = new Map<number, number>();

    if (format === 'json') {
      if (data.programs && (type === 'all' || type === 'programs')) {
        for (let i = 0; i < data.programs.length; i++) {
          const program = data.programs[i];
          const cleanName = String(program.name || '').trim();
          if (!cleanName) continue;
          const { data: newProgram, error } = await supabase
            .from('programs')
            .insert({
              name: cleanName,
              isPrimary: Boolean(program.is_primary ?? program.isPrimary ?? false),
            })
            .select()
            .single();

          if (error) throw error;
          const oldId = parsePositiveInt(program.id) ?? (i + 1);
          programIdMap.set(oldId, newProgram.id);
          imported.programs++;
        }
      }

      if (data.workouts && (type === 'all' || type === 'workouts')) {
        for (let i = 0; i < data.workouts.length; i++) {
          const workout = data.workouts[i];
          const origProgramId = parsePositiveInt(workout.program_id ?? workout.programId);
          const programId =
            origProgramId && programIdMap.has(origProgramId)
              ? programIdMap.get(origProgramId)
              : origProgramId;

          const cleanWorkoutName = String(workout.name || workout.dayName || '').trim();
          if (!cleanWorkoutName) continue;

          const { data: newWorkout, error } = await supabase
            .from('program_days')
            .insert({
              programId,
              name: cleanWorkoutName,
              dayName: cleanWorkoutName,
              dayNumber: workout.day_number ?? workout.dayNumber ?? null,
              orderIndex: workout.order_index ?? workout.orderIndex ?? i,
            })
            .select()
            .single();

          if (error) throw error;
          const oldId = parsePositiveInt(workout.id) ?? (i + 1);
          workoutIdMap.set(oldId, newWorkout.id);
          imported.workouts++;
        }
      }

      if (data.exercises && (type === 'all' || type === 'exercises')) {
        for (let i = 0; i < data.exercises.length; i++) {
          const exercise = data.exercises[i];
          const origProgramId = parsePositiveInt(exercise.program_id ?? exercise.programId);
          const origWorkoutId = parsePositiveInt(
            exercise.workout_id ?? exercise.workoutId ?? exercise.day_id ?? exercise.dayId
          );

          const workoutId =
            origWorkoutId && workoutIdMap.has(origWorkoutId)
              ? workoutIdMap.get(origWorkoutId)
              : origWorkoutId;
          const programId =
            origProgramId && programIdMap.has(origProgramId)
              ? programIdMap.get(origProgramId)
              : origProgramId;

          const cleanExName = String(exercise.name || '').trim();
          if (!cleanExName) continue;

          const { error } = await supabase.from('exercises').insert({
            dayId: workoutId ?? null,
            programId: programId ?? null,
            name: cleanExName,
            sets: parseNonNegativeInt(exercise.sets) ?? 3,
            reps: parseNonNegativeInt(exercise.reps) ?? 10,
            duration: exercise.duration || null,
            description: exercise.description || null,
            orderIndex: exercise.order_index ?? exercise.orderIndex ?? i,
            imageUrl: exercise.image_url ?? exercise.imageUrl ?? null,
            muscleGroup: exercise.muscle_group ?? exercise.muscleGroup ?? null,
          });

          if (error) throw error;
          imported.exercises++;
        }
      }
    } else if (format === 'csv') {
      const rows = parseCsvMatrix(String(data));
      let currentSection = '';

      for (let i = 0; i < rows.length; i++) {
        const parts = rows[i].map((c) => c.trim());
        const first = parts[0] || '';

        if (first === 'PROGRAMS') {
          currentSection = 'programs';
          continue;
        }
        if (first === 'WORKOUTS') {
          currentSection = 'workouts';
          continue;
        }
        if (first === 'EXERCISES') {
          currentSection = 'exercises';
          continue;
        }
        if (!first && parts.length <= 1) continue;
        if (first === 'id') continue;

        if (currentSection === 'programs' && (type === 'all' || type === 'programs')) {
          if (parts.length >= 2 && parts[1]) {
            const oldId = parsePositiveInt(parts[0]);
            const name = parts[1];
            const isPrimary = parts[2] === 'true';

            const { data: newProgram, error } = await supabase
              .from('programs')
              .insert({ name, isPrimary })
              .select()
              .single();

            if (error) throw error;
            if (newProgram && oldId) programIdMap.set(oldId, newProgram.id);
            imported.programs++;
          }
        } else if (currentSection === 'workouts' && (type === 'all' || type === 'workouts')) {
          if (parts.length >= 3 && parts[2]) {
            const oldProgId = parsePositiveInt(parts[1]);
            const programId =
              oldProgId && programIdMap.has(oldProgId) ? programIdMap.get(oldProgId)! : oldProgId;

            const { data: newWorkout, error } = await supabase
              .from('program_days')
              .insert({
                programId,
                name: parts[2],
                dayName: parts[2],
                dayNumber: parsePositiveInt(parts[3]),
                orderIndex: parseNonNegativeInt(parts[4]) ?? i,
              })
              .select()
              .single();

            if (error) throw error;
            const oldWorkoutId = parsePositiveInt(parts[0]);
            if (newWorkout && oldWorkoutId) workoutIdMap.set(oldWorkoutId, newWorkout.id);
            imported.workouts++;
          }
        } else if (currentSection === 'exercises' && (type === 'all' || type === 'exercises')) {
          if (parts.length >= 6 && parts[3]) {
            const oldProgId = parsePositiveInt(parts[1]);
            const oldWorkId = parsePositiveInt(parts[2]);

            const workoutId =
              oldWorkId && workoutIdMap.has(oldWorkId) ? workoutIdMap.get(oldWorkId)! : oldWorkId;
            const programId =
              oldProgId && programIdMap.has(oldProgId) ? programIdMap.get(oldProgId)! : oldProgId;

            const { error } = await supabase.from('exercises').insert({
              dayId: workoutId ?? null,
              programId: programId ?? null,
              name: parts[3],
              sets: parseNonNegativeInt(parts[4]) ?? 3,
              reps: parseNonNegativeInt(parts[5]) ?? 10,
              duration: parts[6] || null,
              description: parts[7] || null,
              orderIndex: parseNonNegativeInt(parts[8]) ?? i,
              imageUrl: parts[9] || null,
              muscleGroup: parts[10] || null,
            });

            if (error) throw error;
            imported.exercises++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      message: `${imported.programs} program, ${imported.workouts} antreman ve ${imported.exercises} hareket içe aktarıldı`,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Import failed',
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
