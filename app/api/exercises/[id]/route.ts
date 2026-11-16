import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  detachOrDeleteExercises,
  parsePositiveInt,
  requireApiAuth,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      workoutId,
      programId,
      name,
      sets,
      reps,
      duration,
      description,
      imageUrl,
      orderIndex,
      muscleGroup,
    } = body;

    const updateData: any = {};
    if (workoutId !== undefined) updateData.dayId = workoutId ? parsePositiveInt(workoutId) : null;
    if (programId !== undefined) updateData.programId = programId ? parsePositiveInt(programId) : null;
    if (name !== undefined) updateData.name = String(name).trim();
    if (sets !== undefined) updateData.sets = Math.max(0, Number(sets) || 0);
    if (reps !== undefined) updateData.reps = Math.max(0, Number(reps) || 0);
    if (duration !== undefined) updateData.duration = duration || null;
    if (description !== undefined) updateData.description = description || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (orderIndex !== undefined) updateData.orderIndex = Number(orderIndex) || 0;
    if (muscleGroup !== undefined) updateData.muscleGroup = muscleGroup || null;

    const { data, error } = await supabase
      .from('exercises')
      .update(updateData)
      .eq('id', numericId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await detachOrDeleteExercises([numericId]);
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json(
      { error: 'Failed to delete exercise: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    if (body.action === 'delete') {
      return DELETE(request, { params });
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
