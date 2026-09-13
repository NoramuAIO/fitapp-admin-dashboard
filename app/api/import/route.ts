import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, format, type } = body;

    console.log('Import request:', { format, type, hasData: !!data });

    let imported = { programs: 0, workouts: 0, exercises: 0 };
    const programIdMap = new Map<number, number>();
    const workoutIdMap = new Map<number, number>();

    if (format === 'json') {
      if (data.programs && (type === 'all' || type === 'programs')) {
        for (let i = 0; i < data.programs.length; i++) {
          const program = data.programs[i];
          const { data: newProgram, error } = await supabase
            .from('programs')
            .insert({
              name: program.name,
              isPrimary: program.is_primary ?? program.isPrimary ?? false
            })
            .select()
            .single();

          if (error) throw error;
          const oldId = program.id || (i + 1);
          programIdMap.set(oldId, newProgram.id);
          imported.programs++;
        }
      }

      if (data.workouts && (type === 'all' || type === 'workouts')) {
        for (let i = 0; i < data.workouts.length; i++) {
          const workout = data.workouts[i];
          let origProgramId = workout.program_id ?? workout.programId;
          
          let programId = origProgramId;
          if (programIdMap.has(origProgramId)) {
            programId = programIdMap.get(origProgramId);
          }

          const { data: newWorkout, error } = await supabase
            .from('program_days')
            .insert({
              programId,
              name: workout.name,
              dayNumber: workout.day_number ?? workout.dayNumber ?? null,
              orderIndex: workout.order_index ?? workout.orderIndex ?? i
            })
            .select()
            .single();

          if (error) throw error;
          const oldId = workout.id || (i + 1);
          workoutIdMap.set(oldId, newWorkout.id);
          imported.workouts++;
        }
      }

      if (data.exercises && (type === 'all' || type === 'exercises')) {
        for (let i = 0; i < data.exercises.length; i++) {
          const exercise = data.exercises[i];
          let origProgramId = exercise.program_id ?? exercise.programId;
          let origWorkoutId = exercise.workout_id ?? exercise.workoutId ?? exercise.day_id ?? exercise.dayId;

          let programId = origProgramId;
          let workoutId = origWorkoutId;

          if (origWorkoutId && workoutIdMap.has(origWorkoutId)) {
            workoutId = workoutIdMap.get(origWorkoutId);
          }
          if (origProgramId && programIdMap.has(origProgramId)) {
            programId = programIdMap.get(origProgramId);
          }

          const { error } = await supabase
            .from('exercises')
            .insert({
              dayId: workoutId || null,
              programId: programId || null,
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
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
      const lines = data.split('\n');
      let currentSection = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === 'PROGRAMS') { currentSection = 'programs'; continue; }
        if (line === 'WORKOUTS') { currentSection = 'workouts'; continue; }
        if (line === 'EXERCISES') { currentSection = 'exercises'; continue; }

        if (!line || line.startsWith('id,')) continue;

        // Safely split CSV respecting quotes and keeping empty fields
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());

        if (currentSection === 'programs' && (type === 'all' || type === 'programs')) {
          if (parts.length >= 2) {
            const oldId = parseInt(parts[0]);
            const name = parts[1];
            const isPrimary = parts[2] === 'true';
            
            const { data: newProgram, error } = await supabase
              .from('programs')
              .insert({ name, isPrimary })
              .select()
              .single();

            if (error) throw error;
            if (newProgram && !isNaN(oldId)) programIdMap.set(oldId, newProgram.id);
            imported.programs++;
          }
        } else if (currentSection === 'workouts' && (type === 'all' || type === 'workouts')) {
          if (parts.length >= 3) {
            let programId = parseInt(parts[1]);
            if (programIdMap.has(programId)) programId = programIdMap.get(programId)!;

            const { data: newWorkout, error } = await supabase
              .from('program_days')
              .insert({
                programId,
                name: parts[2],
                dayNumber: parseInt(parts[3]) || null,
                orderIndex: parseInt(parts[4]) || i
              })
              .select()
              .single();

            if (error) throw error;
            if (newWorkout) workoutIdMap.set(parseInt(parts[0]), newWorkout.id);
            imported.workouts++;
          }
        } else if (currentSection === 'exercises' && (type === 'all' || type === 'exercises')) {
          if (parts.length >= 8) {
            let programId = parseInt(parts[1]);
            let workoutId = parseInt(parts[9]) || null;

            if (workoutId && workoutIdMap.has(workoutId)) workoutId = workoutIdMap.get(workoutId)!;
            else if (programId && programIdMap.has(programId)) programId = programIdMap.get(programId)!;

            const { error } = await supabase
              .from('exercises')
              .insert({
                dayId: workoutId || null,
                programId: programId || null,
                name: parts[2],
                sets: parseInt(parts[3]),
                reps: parseInt(parts[4]),
                duration: parts[5] || null,
                description: parts[6] || null,
                orderIndex: parseInt(parts[7]) || i,
                imageUrl: parts[8] || null,
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
    return NextResponse.json({ 
      success: false,
      error: 'Import failed', 
      details: error.message || String(error)
    }, { status: 500 });
  }
}
