import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { parseNonNegativeInt, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { exercises } = body;

    if (!Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json({ error: 'Invalid exercises array' }, { status: 400 });
    }

    const targetWorkoutIds = Array.from(
      new Set(
        exercises
          .map((item: any) => parsePositiveInt(item?.workoutId))
          .filter((id): id is number => id !== null)
      )
    );

    const workoutProgramMap = new Map<number, number | null>();
    if (targetWorkoutIds.length > 0) {
      const { data: days } = await supabase
        .from('program_days')
        .select('id, programId')
        .in('id', targetWorkoutIds);
      for (const d of days || []) {
        workoutProgramMap.set(Number(d.id), d.programId ? Number(d.programId) : null);
      }
    }

    const updates = exercises.map(async (item: any) => {
      const exId = parsePositiveInt(item?.id);
      if (!exId) {
        return { error: { message: 'Invalid exercise id' } };
      }
      const orderIdx = parseNonNegativeInt(item?.orderIndex) ?? 0;
      const updateData: any = { orderIndex: orderIdx };
      if (item.workoutId !== undefined) {
        const wId = parsePositiveInt(item.workoutId);
        if (wId) {
          updateData.dayId = wId;
          if (workoutProgramMap.has(wId)) {
            updateData.programId = workoutProgramMap.get(wId);
          }
        }
      }
      return supabase.from('exercises').update(updateData).eq('id', exId);
    });

    const results = await Promise.all(updates);
    const hasError = results.find((r) => r.error);
    if (hasError && hasError.error) {
      throw hasError.error;
    }

    return NextResponse.json({ success: true, count: exercises.length });
  } catch (error) {
    console.error('Error reordering exercises:', error);
    return NextResponse.json(
      { error: 'Failed to reorder exercises: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
