import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET: Tüm antremanları getir veya programId ile filtrele
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId')

    let query = supabase
      .from('program_days')
      .select('*, exercises(*)')
      .order('orderIndex', { ascending: true })

    if (programId) {
      query = query.eq('programId', parseInt(programId))
    }

    const { data, error } = await query

    if (error) throw error

    // Her antremanın hareketlerini orderIndex'e göre sırala
    const workouts = (data || []).map(workout => ({
      ...workout,
      exercises: (workout.exercises || []).sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    }))

    return NextResponse.json(workouts)
  } catch (error) {
    console.error('Error fetching workouts:', error)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }
}

// POST: Yeni antreman oluştur
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { programId, name, dayNumber, orderIndex = 0 } = body

    if (!programId || !name) {
      return NextResponse.json({ error: 'programId and name are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('program_days')
      .insert([{
        programId,
        name,
        dayNumber: dayNumber || null,
        orderIndex
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating workout:', error)
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
  }
}

// PUT: Antreman güncelle
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, dayNumber, orderIndex } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (dayNumber !== undefined) updateData.dayNumber = dayNumber
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex

    const { data, error } = await supabase
      .from('program_days')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating workout:', error)
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 })
  }
}

// DELETE: Antreman sil
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('program_days')
      .delete()
      .eq('id', parseInt(id))

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting workout:', error)
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 })
  }
}