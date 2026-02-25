import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const type = searchParams.get('type') || 'all'; // all, programs, workouts, exercises

  try {
    let data: any = {};

    if (type === 'all' || type === 'programs') {
      const { data: programs, error } = await supabase
        .from('programs')
        .select('*')
        .order('id');
      
      if (error) throw error;
      data.programs = programs;
    }

    if (type === 'all' || type === 'workouts') {
      const { data: workouts, error } = await supabase
        .from('program_days')
        .select('*')
        .order('programId')
        .order('orderIndex');
      
      if (error) throw error;
      data.workouts = workouts;
    }

    if (type === 'all' || type === 'exercises') {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .order('programId')
        .order('orderIndex');
      
      if (error) throw error;
      data.exercises = exercises;
    }

    if (format === 'csv') {
      let csv = '';
      
      if (data.programs) {
        csv += 'PROGRAMS\n';
        csv += 'id,name,isPrimary,createdAt\n';
        data.programs.forEach((p: any) => {
          csv += `${p.id},"${p.name}",${p.isPrimary},${p.createdAt}\n`;
        });
        csv += '\n';
      }

      if (data.workouts) {
        csv += 'WORKOUTS\n';
        csv += 'id,programId,name,dayNumber,orderIndex,createdAt\n';
        data.workouts.forEach((w: any) => {
          csv += `${w.id},${w.programId},"${w.name}",${w.dayNumber || ''},${w.orderIndex},${w.createdAt}\n`;
        });
        csv += '\n';
      }

      if (data.exercises) {
        csv += 'EXERCISES\n';
        csv += 'id,programId,workoutId,name,sets,reps,duration,description,orderIndex,imageUrl,muscleGroup\n';
        data.exercises.forEach((e: any) => {
          const duration = e.duration || '';
          const description = (e.description || '').replace(/"/g, '""');
          const imageUrl = e.imageUrl || '';
          const muscleGroup = e.muscleGroup || '';
          csv += `${e.id},${e.programId || ''},${e.workoutId || ''},"${e.name}",${e.sets},${e.reps},"${duration}","${description}",${e.orderIndex},"${imageUrl}","${muscleGroup}"\n`;
        });
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="fitness-data-${Date.now()}.csv"`,
        },
      });
    } else {
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