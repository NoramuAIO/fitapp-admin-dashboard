import getDatabase from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

let isMigrated = false

export async function GET() {
  try {
    if (!isMigrated) {
      try {
        const pool = getDatabase()
        await pool.query('ALTER TABLE IF EXISTS programs ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER DEFAULT 0;')
        isMigrated = true
      } catch (e) {
        console.error('Failed to migrate table programs:', e)
      }
    }

    // Get all programs (without exercises, workouts will be fetched separately)
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .order('orderIndex', { ascending: true })
      .order('isPrimary', { ascending: false })
      .order('createdAt', { ascending: false })

    if (programsError) throw programsError

    return NextResponse.json(programs || [])
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
