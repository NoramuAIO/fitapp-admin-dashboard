import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Fetch all programs
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('*')
      .order('isPrimary', { ascending: false })
      .order('createdAt', { ascending: false })

    if (programsError) throw programsError

    // Fetch all user assignments with user details
    const { data: allUserPrograms } = await supabase
      .from('user_programs')
      .select('programId, userId, users (id, name, email)')

    const userProgramMap = new Map<number, { userId: number; userName: string }>()
    ;(allUserPrograms || []).forEach((up: any) => {
      userProgramMap.set(up.programId, {
        userId: up.userId,
        userName: up.users?.name || up.users?.email || `Kullanıcı #${up.userId}`,
      })
    })

    const enriched = (programs || []).map((p: any) => {
      const assignment = userProgramMap.get(p.id)
      return {
        ...p,
        userId: assignment ? assignment.userId : null,
        userName: assignment ? assignment.userName : null,
      }
    })

    if (userId) {
      const uId = parseInt(userId, 10)
      // Include programs assigned to this specific user OR unassigned (global) programs
      const filtered = enriched.filter((p: any) => p.userId === uId || p.userId === null)
      return NextResponse.json(filtered)
    }

    return NextResponse.json(enriched)
  } catch (error) {
    console.error('Error fetching programs:', error)
    return NextResponse.json([], { status: 200 }) // Return empty array, never error object
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Support deletion via POST
    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = parseInt(String(body.id), 10);
      if (isNaN(numericId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      await supabase.from('user_programs').delete().eq('programId', numericId);

      const { data: days } = await supabase.from('program_days').select('id').eq('programId', numericId);
      const dayIds = (days || []).map((d: any) => d.id);

      if (dayIds.length > 0) {
        await supabase.from('exercises').delete().in('dayId', dayIds);
      }
      await supabase.from('exercises').delete().eq('programId', numericId);
      await supabase.from('program_days').delete().eq('programId', numericId);

      const { data: delData, error: delError } = await supabase
        .from('programs')
        .delete()
        .eq('id', numericId)
        .select();

      if (delError) throw delError;

      return NextResponse.json({ success: true, deleted: delData?.length || 0 });
    }

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
    console.error('Error in programs POST:', error)
    return NextResponse.json({ error: 'Failed to process program: ' + (error as Error).message }, { status: 500 })
  }
}
