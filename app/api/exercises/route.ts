import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  enrichExerciseWithTracking,
  isMissingColumnError,
  prepareExerciseWritePayload,
} from '@/lib/exerciseApiHelpers';
import { parseNonNegativeInt, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const { data: exercises, error } = await supabase
      .from('exercises')
      .select(`
        *,
        program_days (
          id,
          name,
          dayName,
          programId
        )
      `)
      .order('id', { ascending: false })

    if (error) throw error

    // Exclude soft-detached archive exercises (dayId=null, programId=null, orderIndex=-1) unless explicitly requested
    const visibleExercises = includeArchived
      ? (exercises || [])
      : (exercises || []).filter(
          (ex: any) => !(ex.dayId === null && ex.programId === null && Number(ex.orderIndex) === -1)
        )

    // Flatten the data
    const formattedExercises = visibleExercises.map((ex: any) =>
      enrichExerciseWithTracking({
        ...ex,
        workoutId: ex.dayId || ex.program_days?.id,
        workout_name: ex.program_days?.name || ex.program_days?.dayName,
        program_id: ex.programId || ex.program_days?.programId,
        program_days: undefined,
      })
    );

    return NextResponse.json(formattedExercises, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const {
      workoutId,
      programId,
      name,
      sets,
      reps,
      duration,
      trackingType,
      tracking_type,
      durationSeconds,
      duration_seconds,
      description,
      imageUrl,
      orderIndex,
      muscleGroup,
    } = body;

    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const parsedWorkoutId = workoutId ? parsePositiveInt(workoutId) : null;
    let finalProgramId = programId ? parsePositiveInt(programId) : null;
    if (parsedWorkoutId && !finalProgramId) {
      const { data: workout } = await supabase
        .from('program_days')
        .select('programId')
        .eq('id', parsedWorkoutId)
        .maybeSingle();

      if (workout?.programId) {
        finalProgramId = Number(workout.programId);
      }
    }

    const explicitOrder = parseNonNegativeInt(orderIndex);
    let finalOrderIndex: number;
    if (explicitOrder !== null) {
      finalOrderIndex = explicitOrder;
    } else if (parsedWorkoutId) {
      const { data: maxOrder } = await supabase
        .from('exercises')
        .select('orderIndex')
        .eq('dayId', parsedWorkoutId)
        .order('orderIndex', { ascending: false })
        .limit(1);
      finalOrderIndex =
        maxOrder && maxOrder.length > 0 && typeof maxOrder[0].orderIndex === 'number'
          ? maxOrder[0].orderIndex + 1
          : 0;
    } else {
      finalOrderIndex = 0;
    }

    const trackingPayload = prepareExerciseWritePayload({
      name: cleanName,
      sets,
      reps,
      duration,
      trackingType,
      tracking_type,
      durationSeconds,
      duration_seconds,
      muscleGroup,
    });

    const insertData: any = {
      name: cleanName,
      sets: trackingPayload.sets,
      reps: trackingPayload.reps,
      duration: trackingPayload.duration,
      tracking_type: trackingPayload.trackingType,
      duration_seconds: trackingPayload.durationSeconds,
      description: description || null,
      imageUrl: imageUrl || null,
      orderIndex: finalOrderIndex,
      muscleGroup: muscleGroup || null,
    };

    if (parsedWorkoutId) {
      insertData.dayId = parsedWorkoutId;
    }
    if (finalProgramId) {
      insertData.programId = finalProgramId;
    }

    let { data, error } = await supabase
      .from('exercises')
      .insert([insertData])
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      const { tracking_type: _tt, duration_seconds: _ds, ...legacyInsert } = insertData;
      const fallbackRes = await supabase
        .from('exercises')
        .insert([legacyInsert])
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (data) {
      data = enrichExerciseWithTracking(data);
    }

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 });
  }
}
