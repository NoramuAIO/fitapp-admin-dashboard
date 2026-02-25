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
      // Yeni format: workouts (antremanlar) ile
      if (data.programs && (type === 'all' || type === 'programs')) {
        for (let i = 0; i < data.programs.length; i++) {
          const program = data.programs[i];
          const { data: newProgram, error } = await supabase
            .from('programs')
            .insert({
              name: program.name,
              isPrimary: program.is_primary || false
            })
            .select()
            .single();

          if (error) throw error;
          programIdMap.set(i + 1, newProgram.id);
          imported.programs++;
        }
      }

      // Workouts (antremanlar) import et
      if (data.workouts && (type === 'all' || type === 'workouts')) {
        for (let i = 0; i < data.workouts.length; i++) {
          const workout = data.workouts[i];
          
          let programId = workout.program_id;
          if (programIdMap.has(workout.program_id)) {
            programId = programIdMap.get(workout.program_id);
          }

          const { data: newWorkout, error } = await supabase
            .from('program_days')
            .insert({
              programId,
              name: workout.name,
              dayNumber: workout.day_number || null,
              orderIndex: workout.order_index || i
            })
            .select()
            .single();

          if (error) throw error;
          workoutIdMap.set(i + 1, newWorkout.id);
          imported.workouts++;
        }
      }

      // Exercises (hareketler) import et
      if (data.exercises && (type === 'all' || type === 'exercises')) {
        for (const exercise of data.exercises) {
          let programId = exercise.program_id;
          let workoutId = exercise.workout_id;

          // Map workout_id if available
          if (workoutId && workoutIdMap.has(workoutId)) {
            workoutId = workoutIdMap.get(workoutId);
          }

          // Fallback to program_id mapping
          if (programId && programIdMap.has(programId)) {
            programId = programIdMap.get(programId);
          }

          const { error } = await supabase
            .from('exercises')
            .insert({
              dayId: workoutId || null,  // Supabase'de dayId kullanılıyor
              programId: programId || null,
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              duration: exercise.duration || null,
              description: exercise.description || null,
              orderIndex: exercise.order_index || 0,
              imageUrl: exercise.image_url || null,
              muscleGroup: exercise.muscle_group || null,
            });

          if (error) throw error;
          imported.exercises++;
        }
      }
    } else if (format === 'csv') {
      // CSV Import
      const lines = data.split('\n');
      let currentSection = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === 'PROGRAMS') {
          currentSection = 'programs';
          i++;
          continue;
        } else if (line === 'WORKOUTS') {
          currentSection = 'workouts';
          i++;
          continue;
        } else if (line === 'EXERCISES') {
          currentSection = 'exercises';
          i++;
          continue;
        }

        if (!line || line.startsWith('id,')) continue;

        if (currentSection === 'programs' && (type === 'all' || type === 'programs')) {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const oldId = parseInt(parts[0]);
            const name = parts[1].replace(/"/g, '');
            const isPrimary = parts[2] === 'true';
            
            const { data: newProgram, error } = await supabase
              .from('programs')
              .insert({ name, isPrimary })
              .select()
              .single();

            if (error) throw error;
            if (newProgram && !isNaN(oldId)) {
              programIdMap.set(oldId, newProgram.id);
            }
            imported.programs++;
          }
        } else if (currentSection === 'workouts' && (type === 'all' || type === 'workouts')) {
          const parts = line.match(/(?:[^,"]+|"[^"]*")+/g) || [];
          if (parts.length >= 3) {
            let programId = parseInt(parts[1]);
            if (programIdMap.has(programId)) {
              programId = programIdMap.get(programId)!;
            }

            const { data: newWorkout, error } = await supabase
              .from('program_days')
              .insert({
                programId,
                name: parts[2].replace(/"/g, ''),
                dayNumber: parseInt(parts[3]) || null,
                orderIndex: parseInt(parts[4]) || i
              })
              .select()
              .single();

            if (error) throw error;
            if (newWorkout) {
              workoutIdMap.set(parseInt(parts[0]), newWorkout.id);
            }
            imported.workouts++;
          }
        } else if (currentSection === 'exercises' && (type === 'all' || type === 'exercises')) {
          const parts = line.match(/(?:[^,"]+|"[^"]*")+/g) || [];
          if (parts.length >= 8) {
            let programId = parseInt(parts[1]);
            let workoutId = parseInt(parts[9]) || null;

            if (workoutId && workoutIdMap.has(workoutId)) {
              workoutId = workoutIdMap.get(workoutId)!;
            } else if (programId && programIdMap.has(programId)) {
              programId = programIdMap.get(programId)!;
            }

            const { error } = await supabase
              .from('exercises')
              .insert({
                dayId: workoutId,  // Supabase'de dayId kullanılıyor
                programId,
                name: parts[2].replace(/"/g, ''),
                sets: parseInt(parts[3]),
                reps: parseInt(parts[4]),
                duration: parts[5].replace(/"/g, '') || null,
                description: parts[6].replace(/"/g, '') || null,
                orderIndex: parseInt(parts[7]),
                imageUrl: parts[8]?.replace(/"/g, '') || null,
                muscleGroup: parts[10]?.replace(/"/g, '') || null,
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
