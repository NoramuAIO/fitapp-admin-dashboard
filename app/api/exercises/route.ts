import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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

    // Flatten the data
    const formattedExercises = (exercises || []).map((ex: any) => ({
      ...ex,
      workoutId: ex.dayId || ex.program_days?.id,
      workout_name: ex.program_days?.name || ex.program_days?.dayName,
      program_id: ex.programId || ex.program_days?.programId,
      program_days: undefined
    }))

    return NextResponse.json(formattedExercises)
  } catch (error) {
    console.error('Error fetching exercises:', error)
    return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      workoutId,  // Yeni: antreman ID (opsiyonel)
      programId,  // Artık opsiyonel, workoutId'den alınabilir
      name, 
      sets, 
      reps, 
      duration, 
      description, 
      imageUrl, 
      orderIndex,
      muscleGroup
    } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // workoutId varsa programId'yi otomatik al
    let finalProgramId = programId
    if (workoutId && !finalProgramId) {
      const { data: workout } = await supabase
        .from('program_days')
        .select('programId')
        .eq('id', workoutId)
        .single()
      
      if (workout) {
        finalProgramId = workout.programId
      }
    }

    const insertData: any = {
      name,
      sets,
      reps,
      duration: duration || null,
      description: description || null,
      imageUrl: imageUrl || null,
      orderIndex: orderIndex || 0,
      muscleGroup: muscleGroup || null
    }

    // dayId olarak kaydet (Supabase'de workoutId yerine dayId kullanılıyor)
    if (workoutId) {
      insertData.dayId = workoutId
    }
    if (finalProgramId) {
      insertData.programId = finalProgramId
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert([insertData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating exercise:', error)
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
  }
}