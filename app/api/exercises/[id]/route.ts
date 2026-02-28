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
      .eq('id', parseInt(id))
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
    const { id } = await params

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', parseInt(id))

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting exercise:', error)
    return NextResponse.json({ error: 'Failed to delete exercise' }, { status: 500 })
  }
}