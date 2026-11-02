import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Get all users
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    // Get workout counts for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('userId', user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          createdAt: user.createdAt || user.created_at,
          created_at: user.createdAt || user.created_at,
          total_workouts: count || 0,
          total_programs: 0
        };
      })
    );

    return NextResponse.json(usersWithStats);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// Delete user with safe cascading cleanup
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // 1. Cascading cleanup of all child records belonging to this user
    await Promise.allSettled([
      supabase.from('exercise_completions').delete().eq('userId', numericId),
      supabase.from('workout_sessions').delete().eq('userId', numericId),
      supabase.from('user_programs').delete().eq('userId', numericId),
      supabase.from('goals').delete().eq('userId', numericId),
      supabase.from('weight_logs').delete().eq('userId', numericId),
      supabase.from('body_fat_logs').delete().eq('userId', numericId),
      supabase.from('custom_widgets').delete().eq('userId', numericId),
    ]);

    // 2. Delete user record
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', numericId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// POST support for environments where DELETE method is restricted
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'delete') {
      const numericId = parseInt(String(body.id), 10);
      if (isNaN(numericId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }

      await Promise.allSettled([
        supabase.from('exercise_completions').delete().eq('userId', numericId),
        supabase.from('workout_sessions').delete().eq('userId', numericId),
        supabase.from('user_programs').delete().eq('userId', numericId),
        supabase.from('goals').delete().eq('userId', numericId),
        supabase.from('weight_logs').delete().eq('userId', numericId),
        supabase.from('body_fat_logs').delete().eq('userId', numericId),
        supabase.from('custom_widgets').delete().eq('userId', numericId),
      ]);

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', numericId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error in user POST:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
