import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let query = supabase
      .from('user_programs')
      .select(`
        *,
        programs (
          id,
          name,
          isPrimary
        ),
        users (
          id,
          name,
          email
        )
      `)
      .order('assignedAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching user programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user programs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, programId, isActive } = body;

    // Deactivate other programs if this is active
    if (isActive) {
      await supabase
        .from('user_programs')
        .update({ isActive: false })
        .eq('userId', userId);
    }

    const { data, error } = await supabase
      .from('user_programs')
      .insert([{ userId, programId, isActive: isActive ?? true }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error assigning program:', error);
    return NextResponse.json(
      { error: 'Failed to assign program' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing program:', error);
    return NextResponse.json(
      { error: 'Failed to remove program' },
      { status: 500 }
    );
  }
}
