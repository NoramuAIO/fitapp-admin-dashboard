import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Fetch all programs — no userId column assumption
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .order('isPrimary', { ascending: false })
      .order('createdAt', { ascending: false })

    if (programsError) throw programsError

    // Filter on server side if userId provided
    // Programs assigned to this user via user_programs, or unassigned (global) ones
    if (userId) {
      const uId = parseInt(userId)
      const { data: userPrograms } = await supabase
        .from('user_programs')
        .select('programId')
        .eq('userId', uId)

      const assignedIds = new Set((userPrograms || []).map((r: any) => r.programId))

      // Also get programIds assigned to ANY user (to exclude them if not this user's)
      const { data: allAssigned } = await supabase
        .from('user_programs')
        .select('programId')

      const allAssignedIds = new Set((allAssigned || []).map((r: any) => r.programId))

      const filtered = (programs || []).filter(p => {
        if (assignedIds.has(p.id)) return true          // Assigned to this user
        if (!allAssignedIds.has(p.id)) return true       // Not assigned to anyone = global
        return false                                      // Assigned to someone else
      }).map(p => ({
        ...p,
        userId: assignedIds.has(p.id) ? uId : null
      }))

      return NextResponse.json(filtered)
    }

    return NextResponse.json(programs || [])
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json([], { status: 200 }) // Return empty array, never error object
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, isPrimary, userId } = body

    // If this is primary, unset all other primary programs
    if (isPrimary) {
      await supabase.from('programs').update({ isPrimary: false }).neq('id', 0)
    }

    const { data, error } = await supabase
      .from('programs')
      .insert([{ name, isPrimary: isPrimary ?? false }])
      .select()
      .single()

    if (error) throw error

    // Assign to user if user-specific
    if (userId && data) {
      await supabase
        .from('user_programs')
        .insert([{ userId, programId: data.id, isActive: true }])
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating program:', error)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}

