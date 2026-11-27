import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { enrichExerciseWithTracking } from '@/lib/exerciseApiHelpers';
import {
  detachOrDeleteExercises,
  parsePositiveInt,
  requireApiAuth,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

async function deleteWorkoutSafely(numericId: number) {
  const { data: exRows } = await supabase
    .from('exercises')
    .select('id')
    .eq('dayId', numericId);
  await detachOrDeleteExercises((exRows || []).map((e: any) => Number(e.id)));

  const { data, error } = await supabase
    .from('program_days')
    .delete()
    .eq('id', numericId)
    .select();

  if (error) throw error;
  return data;
}

// GET: Tüm antremanları getir veya programId ile filtrele
export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawProgramId = searchParams.get('programId');
    const programId = rawProgramId ? parsePositiveInt(rawProgramId) : null;
    if (rawProgramId && !programId) {
      return NextResponse.json({ error: 'Geçersiz programId' }, { status: 400 });
    }
    const lite = searchParams.get('lite') === '1';

    let query = supabase
      .from('program_days')
      .select(lite ? 'id, programId, name, dayName, dayNumber, orderIndex' : '*, exercises(*)')
      .order('orderIndex', { ascending: true })
      .order('dayNumber', { ascending: true })
      .order('id', { ascending: true });

    if (programId) {
      query = query.eq('programId', programId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const workouts = (data || []).map((workout: any) => ({
      ...workout,
      name: workout.name || workout.dayName,
      exercises: lite
        ? []
        : (workout.exercises || [])
            .map((ex: any) => enrichExerciseWithTracking(ex))
            .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    }));

    return NextResponse.json(workouts, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}

// POST: Yeni antreman oluştur veya sil
export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = parsePositiveInt(body.id);
      if (!numericId) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
      const data = await deleteWorkoutSafely(numericId);
      return NextResponse.json(
        { success: true, deleted: data?.length || 0 },
        { headers: NO_STORE_HEADERS }
      );
    }

    const parsedProgramId = parsePositiveInt(body.programId);
    const cleanName = typeof body.name === 'string' ? body.name.trim() : '';
    const parsedDayNumber = body.dayNumber ? parsePositiveInt(body.dayNumber) : null;
    const orderIndex = Number.isFinite(Number(body.orderIndex)) ? Number(body.orderIndex) : 0;

    if (!parsedProgramId || !cleanName) {
      return NextResponse.json({ error: 'programId and name are required' }, { status: 400 });
    }

    let { data, error } = await supabase
      .from('program_days')
      .insert([{
        programId: parsedProgramId,
        name: cleanName,
        dayName: cleanName,
        dayNumber: parsedDayNumber ?? 1,
        orderIndex,
      }])
      .select()
      .single();

    if (error && /name|dayName/i.test(String(error.message || ''))) {
      const retryPayload: any = {
        programId: parsedProgramId,
        dayName: cleanName,
        dayNumber: parsedDayNumber ?? 1,
        orderIndex,
      };
      const retry = await supabase.from('program_days').insert([retryPayload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return NextResponse.json(
      { ...data, name: data?.name || data?.dayName || cleanName },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error in workouts POST:', error);
    return NextResponse.json(
      { error: 'Failed to process workout: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// PUT: Antreman güncelle
export async function PUT(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { id, name, dayNumber, orderIndex } = body;

    const numericWorkoutId = parsePositiveInt(id);
    if (!numericWorkoutId) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    const cleanName = name !== undefined ? String(name).trim() : undefined;
    const updateData: any = {};
    if (cleanName !== undefined) {
      updateData.name = cleanName;
      updateData.dayName = cleanName;
    }
    if (dayNumber !== undefined) {
      updateData.dayNumber = dayNumber ? parsePositiveInt(dayNumber) : null;
    }
    if (orderIndex !== undefined) updateData.orderIndex = Number(orderIndex) || 0;

    const { data, error } = await supabase
      .from('program_days')
      .update(updateData)
      .eq('id', numericWorkoutId)
      .select()
      .single();

    if (error) throw error;

    if (cleanName !== undefined && data) {
      try {
        const [{ data: schedules }, { data: fallbackWidgets }] = await Promise.all([
          supabase.from('workout_schedules').select('*'),
          supabase
            .from('custom_widgets')
            .select('*')
            .eq('widget_type', 'workout_schedule_data'),
        ]);

        const applyRename = (weeklyInput: any[], overridesInput: Record<string, any>) => {
          let changed = false;
          const nextWeekly = (Array.isArray(weeklyInput) ? weeklyInput : []).map((day: any) => ({
            ...day,
            workouts: Array.isArray(day.workouts)
              ? day.workouts.map((w: any) => {
                  if (Number(w.workoutId) === numericWorkoutId && w.workoutName !== cleanName) {
                    changed = true;
                    return { ...w, workoutName: cleanName };
                  }
                  return w;
                })
              : [],
          }));
          const nextOverrides =
            overridesInput && typeof overridesInput === 'object' ? { ...overridesInput } : {};
          for (const [k, ov] of Object.entries<any>(nextOverrides)) {
            if (ov && !ov.isRestDay && Number(ov.workoutId) === numericWorkoutId && ov.workoutName !== cleanName) {
              changed = true;
              nextOverrides[k] = { ...ov, workoutName: cleanName };
            }
          }
          return { changed, nextWeekly, nextOverrides };
        };

        for (const row of schedules || []) {
          const { changed, nextWeekly, nextOverrides } = applyRename(row.weeklySchedule, row.overrides);
          if (changed) {
            await supabase
              .from('workout_schedules')
              .update({
                weeklySchedule: nextWeekly,
                overrides: nextOverrides,
                updatedAt: new Date().toISOString(),
              })
              .eq('id', row.id);
          }
        }

        for (const fw of fallbackWidgets || []) {
          if (!fw.custom_content) continue;
          const parsed = JSON.parse(fw.custom_content);
          const { changed, nextWeekly, nextOverrides } = applyRename(parsed.weeklySchedule, parsed.overrides);
          if (changed) {
            await supabase
              .from('custom_widgets')
              .update({
                custom_content: JSON.stringify({
                  ...parsed,
                  weeklySchedule: nextWeekly,
                  overrides: nextOverrides,
                  updatedAt: new Date().toISOString(),
                }),
              })
              .eq('id', fw.id);
          }
        }
      } catch (syncErr) {
        console.warn('Could not propagate renamed workout to schedules:', syncErr);
      }
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 });
  }
}

// DELETE: Antreman sil
export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const numericId = parsePositiveInt(searchParams.get('id'));
    if (!numericId) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    const data = await deleteWorkoutSafely(numericId);
    return NextResponse.json(
      { success: true, deleted: data?.length || 0 },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
