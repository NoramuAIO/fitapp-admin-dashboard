import getDatabase from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const type = searchParams.get('type') || 'all'; // all, programs, exercises

  const db = getDatabase();

  try {
    let data: any = {};

    if (type === 'all' || type === 'programs') {
      const programsResult = await db.query('SELECT * FROM programs ORDER BY id');
      data.programs = programsResult.rows;
    }

    if (type === 'all' || type === 'exercises') {
      const exercisesResult = await db.query('SELECT * FROM exercises ORDER BY program_id, order_index');
      data.exercises = exercisesResult.rows;
    }

    if (format === 'csv') {
      // CSV Export
      let csv = '';
      
      if (data.programs) {
        csv += 'PROGRAMS\n';
        csv += 'id,name,is_primary,created_at\n';
        data.programs.forEach((p: any) => {
          csv += `${p.id},"${p.name}",${p.is_primary},${p.created_at}\n`;
        });
        csv += '\n';
      }

      if (data.exercises) {
        csv += 'EXERCISES\n';
        csv += 'id,program_id,name,sets,reps,duration,description,order_index,image_url\n';
        data.exercises.forEach((e: any) => {
          csv += `${e.id},${e.program_id},"${e.name}",${e.sets},${e.reps},"${e.duration || ''}","${e.description || ''}",${e.order_index},"${e.image_url || '"}"\n`;
        });
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="fitness-data-${Date.now()}.csv"`,
        },
      });
    } else {
      // JSON Export
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename="fitness-data-${Date.now()}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
