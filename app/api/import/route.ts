import getDatabase from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const db = getDatabase();

  try {
    const body = await request.json();
    const { data, format, type } = body;

    console.log('Import request:', { format, type, hasData: !!data });

    let imported = { programs: 0, exercises: 0 };

    if (format === 'json') {
      // JSON Import
      if (data.programs && (type === 'all' || type === 'programs')) {
        for (const program of data.programs) {
          await db.query(
            'INSERT INTO programs (name, is_primary) VALUES ($1, $2)',
            [program.name, program.is_primary || false]
          );
          imported.programs++;
        }
      }

      if (data.exercises && (type === 'all' || type === 'exercises')) {
        for (const exercise of data.exercises) {
          await db.query(
            'INSERT INTO exercises (program_id, name, sets, reps, duration, description, order_index, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [
              exercise.program_id,
              exercise.name,
              exercise.sets,
              exercise.reps,
              exercise.duration || null,
              exercise.description || null,
              exercise.order_index || 0,
              exercise.image_url || null,
            ]
          );
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
            const name = parts[1].replace(/"/g, '');
            const isPrimary = parts[2] === 'true';
            await db.query(
              'INSERT INTO programs (name, is_primary) VALUES ($1, $2)',
              [name, isPrimary]
            );
            imported.programs++;
          }
        } else if (currentSection === 'exercises' && (type === 'all' || type === 'exercises')) {
          const parts = line.match(/(?:[^,"]+|"[^"]*")+/g) || [];
          if (parts.length >= 8) {
            await db.query(
              'INSERT INTO exercises (program_id, name, sets, reps, duration, description, order_index, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
              [
                parseInt(parts[1]),
                parts[2].replace(/"/g, ''),
                parseInt(parts[3]),
                parseInt(parts[4]),
                parts[5].replace(/"/g, '') || null,
                parts[6].replace(/"/g, '') || null,
                parseInt(parts[7]),
                parts[8]?.replace(/"/g, '') || null,
              ]
            );
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
      stack: error.stack 
    }, { status: 500 });
  }
}
