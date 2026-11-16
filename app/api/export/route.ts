import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/apiAuth';
import { formatCsvCell } from '@/lib/csv';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const type = searchParams.get('type') || 'all';

  try {
    const data: any = {};

    if (type === 'all' || type === 'programs') {
      const { data: programs, error } = await supabase
        .from('programs')
        .select('*')
        .order('id');

      if (error) throw error;
      data.programs = programs || [];
    }

    if (type === 'all' || type === 'workouts') {
      const { data: workouts, error } = await supabase
        .from('program_days')
        .select('*')
        .order('programId')
        .order('orderIndex');

      if (error) throw error;
      data.workouts = (workouts || []).map((w: any) => ({
        ...w,
        name: w.name || w.dayName || '',
      }));
    }

    if (type === 'all' || type === 'exercises') {
      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .order('programId')
        .order('orderIndex');

      if (error) throw error;
      data.exercises = (exercises || []).filter(
        (e: any) => !(e.dayId === null && e.programId === null && Number(e.orderIndex) === -1)
      );
    }

    if (format === 'csv') {
      let csv = '';

      if (data.programs) {
        csv += 'PROGRAMS\n';
        csv += 'id,name,isPrimary,createdAt\n';
        data.programs.forEach((p: any) => {
          csv += `${p.id},${formatCsvCell(p.name)},${Boolean(p.isPrimary)},${formatCsvCell(p.createdAt)}\n`;
        });
        csv += '\n';
      }

      if (data.workouts) {
        csv += 'WORKOUTS\n';
        csv += 'id,programId,name,dayNumber,orderIndex,createdAt\n';
        data.workouts.forEach((w: any) => {
          csv += `${w.id},${w.programId ?? ''},${formatCsvCell(w.name || w.dayName || '')},${w.dayNumber ?? ''},${w.orderIndex ?? 0},${formatCsvCell(w.createdAt)}\n`;
        });
        csv += '\n';
      }

      if (data.exercises) {
        csv += 'EXERCISES\n';
        csv += 'id,programId,workoutId,name,sets,reps,duration,description,orderIndex,imageUrl,muscleGroup\n';
        data.exercises.forEach((e: any) => {
          const workoutId = e.dayId ?? e.workoutId ?? '';
          csv += `${e.id},${e.programId ?? ''},${workoutId},${formatCsvCell(e.name)},${e.sets ?? 0},${e.reps ?? 0},${formatCsvCell(e.duration || '')},${formatCsvCell(e.description || '')},${e.orderIndex ?? 0},${formatCsvCell(e.imageUrl || '')},${formatCsvCell(e.muscleGroup || '')}\n`;
        });
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="fitness-data-${Date.now()}.csv"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="fitness-data-${Date.now()}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
