import getDatabase from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

let isMigrated = false

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!isMigrated) {
      try {
        const pool = getDatabase()
        await pool.query('ALTER TABLE IF EXISTS programs ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER DEFAULT 0;')
        await pool.query('ALTER TABLE IF EXISTS programs ADD COLUMN IF NOT EXISTS "userId" INTEGER;')
        isMigrated = true
      } catch (e) {
        console.error('Failed to migrate table programs:', e)
      }
    }

    let query = supabase
      .from('programs')
      .select('*')
      .order('orderIndex', { ascending: true })
      .order('isPrimary', { ascending: false })
      .order('createdAt', { ascending: false })

    if (userId) {
      // Use or() to get both global programs and user-specific programs
      query = query.or(`userId.is.null,userId.eq.${parseInt(userId)}`)
    } else {
      query = query.is('userId', null)
    }

    const { data: programs, error: programsError } = await query

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
    const { name, isPrimary, userId } = body

    // If this is primary, unset other primary programs
    if (isPrimary) {
      let updateQuery = supabase
        .from('programs')
        .update({ isPrimary: false })
        .neq('id', 0)
        
      if (userId) {
        updateQuery = updateQuery.eq('userId', userId)
      } else {
        updateQuery = updateQuery.is('userId', null)
      }
      
      await updateQuery
    }

    const { data, error } = await supabase
      .from('programs')
      .insert([{ name, isPrimary, userId: userId || null }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating program:', error)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}
