import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
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
      muscleGroup
    } = body

    const updateData: any = {}
    
    // dayId olarak kaydet (Supabase'de workoutId yerine dayId kullanılıyor)
    if (workoutId !== undefined) updateData.dayId = workoutId
    if (programId !== undefined) updateData.programId = programId
    if (name !== undefined) updateData.name = name
    if (sets !== undefined) updateData.sets = sets
    if (reps !== undefined) updateData.reps = reps
    if (duration !== undefined) updateData.duration = duration
    if (description !== undefined) updateData.description = description
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex
    if (muscleGroup !== undefined) updateData.muscleGroup = muscleGroup

    const { data, error } = await supabase
      .from('exercises')
      .update(updateData)
      .eq('id', parseInt(id, 10))
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating exercise:', error)
    return NextResponse.json({ error: 'Failed to update exercise' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    // Preserve historical workout logs and PRs: never delete exercise_completions
    const { count: completionCount } = await supabase
      .from('exercise_completions')
      .select('id', { count: 'exact', head: true })
      .eq('exerciseId', numericId);

    if ((completionCount || 0) > 0) {
      // Detach from workout day and program so historical joins still resolve exercise name/muscleGroup
      const { error: detachError } = await supabase
        .from('exercises')
        .update({ dayId: null, programId: null, orderIndex: -1 })
        .eq('id', numericId);

      if (detachError) throw detachError;

      return NextResponse.json({ success: true, detached: true });
    }

    const { data, error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', numericId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: data?.length || 0 });
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return NextResponse.json({ error: 'Failed to delete exercise: ' + (error as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
