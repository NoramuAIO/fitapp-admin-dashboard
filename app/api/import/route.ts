import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, format, type } = body;

    console.log('Import request:', { format, type, hasData: !!data });

    let imported = { programs: 0, exercises: 0 };
    const programIdMap = new Map<number, number>(); // old_id -> new_id mapping

    if (format === 'json') {
      // JSON Import
      if (data.programs && (type === 'all' || type === 'programs')) {
        for (const program of data.programs) {
          const { data: newProgram, error } = await supabase
            .from('programs')
            .insert({
              name: program.name,
              isPrimary: program.is_primary || false
            })
            .select()
            .single();

          if (error) throw error;
          
          // Map old ID to new ID if exists
          if (program.id && newProgram) {
            programIdMap.set(program.id, newProgram.id);
          }
          
          imported.programs++;
        }
      }

      if (data.exercises && (type === 'all' || type === 'exercises')) {
        for (const exercise of data.exercises) {
          // Use mapped program ID if available, otherwise use original
          let programId = exercise.program_id;
          if (programIdMap.has(exercise.program_id)) {
            programId = programIdMap.get(exercise.program_id);
          }

          // Check if program exists
          const { data: programExists } = await supabase
            .from('programs')
            .select('id')
            .eq('id', programId)
            .single();

          if (!programExists) {
            console.warn(`Program ID ${programId} not found, skipping exercise: ${exercise.name}`);
            continue;
          }

          const { error } = await supabase
            .from('exercises')
            .insert({
              programId: programId,
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              duration: exercise.duration || null,
              description: exercise.description || null,
              orderIndex: exercise.order_index || 0,
              imageUrl: exercise.image_url || null,
            });

          if (error) {
            console.error(`Error inserting exercise ${exercise.name}:`, error);
            throw error;
          }
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
          i++; // Skip header line
          continue;
        } else if (line === 'EXERCISES') {
          currentSection = 'exercises';
          i++; // Skip header line
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
              .insert({
                name,
                isPrimary
              })
              .select()
              .single();

            if (error) throw error;
            
            // Map old ID to new ID
            if (newProgram && !isNaN(oldId)) {
              programIdMap.set(oldId, newProgram.id);
            }
            
            imported.programs++;
          }
        } else if (currentSection === 'exercises' && (type === 'all' || type === 'exercises')) {
          const parts = line.match(/(?:[^,"]+|"[^"]*")+/g) || [];
          if (parts.length >= 8) {
            let programId = parseInt(parts[1]);
            
            // Use mapped program ID if available
            if (programIdMap.has(programId)) {
              programId = programIdMap.get(programId)!;
            }

            // Check if program exists
            const { data: programExists } = await supabase
              .from('programs')
              .select('id')
              .eq('id', programId)
              .single();

            if (!programExists) {
              console.warn(`Program ID ${programId} not found, skipping exercise at line ${i}`);
              continue;
            }

            const { error } = await supabase
              .from('exercises')
              .insert({
                programId: programId,
                name: parts[2].replace(/"/g, ''),
                sets: parseInt(parts[3]),
                reps: parseInt(parts[4]),
                duration: parts[5].replace(/"/g, '') || null,
                description: parts[6].replace(/"/g, '') || null,
                orderIndex: parseInt(parts[7]),
                imageUrl: parts[8]?.replace(/"/g, '') || null,
              });

            if (error) {
              console.error(`Error inserting exercise at line ${i}:`, error);
              throw error;
            }
            imported.exercises++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      message: `${imported.programs} program ve ${imported.exercises} hareket içe aktarıldı`,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Import failed', 
      details: error.message || String(error),
      hint: error.hint || 'Hareketler için geçerli bir program_id kullandığınızdan emin olun'
    }, { status: 500 });
  }
}
