import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all programs
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .order('isPrimary', { ascending: false })
      .order('createdAt', { ascending: false })

    if (programsError) throw programsError

    // Get exercises for each program
    const programsWithExercises = await Promise.all(
      (programs || []).map(async (program: any) => {
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercises')
          .select('*')
          .eq('programId', program.id)
          .order('orderIndex', { ascending: true })

        if (exercisesError) throw exercisesError

        return {
          ...program,
          exercises: exercises || [],
        }
      })
    )

    return NextResponse.json(programsWithExercises)
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, isPrimary } = body

    // If this is primary, unset other primary programs
    if (isPrimary) {
      await supabase
        .from('programs')
        .update({ isPrimary: false })
        .neq('id', 0)
    }

    const { data, error } = await supabase
      .from('programs')
      .insert([{ name, isPrimary }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating program:', error)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}
