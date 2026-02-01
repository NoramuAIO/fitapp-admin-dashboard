import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Get all users
export async function GET() {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    // Get workout counts for each user
    const usersWithStats = await Promise.all(
      (users || []).map(async (user) => {
        const { count } = await supabase
          .from('workout_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('userId', user.id);

        return {
          ...user,
          created_at: user.createdAt,
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

// Delete user
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

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

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
