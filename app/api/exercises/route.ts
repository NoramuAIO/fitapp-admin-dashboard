import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { data: exercises, error } = await supabase
      .from('exercises')
      .select(`
        *,
        programs (
          name
        )
      `)
      .order('id', { ascending: false })

    if (error) throw error

    // Flatten the program name
    const formattedExercises = (exercises || []).map(ex => ({
      ...ex,
      program_name: ex.programs?.name || null,
      programs: undefined
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
    const { programId, name, sets, reps, duration, description, imageUrl, orderIndex } = body

    const { data, error } = await supabase
      .from('exercises')
      .insert([{
        programId,
        name,
        sets,
        reps,
        duration: duration || null,
        description: description || null,
        imageUrl: imageUrl || null,
        orderIndex: orderIndex || 0
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating exercise:', error)
    return NextResponse.json({ error: 'Failed to create exercise' }, { status: 500 })
  }
}
