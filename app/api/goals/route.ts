import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let query = supabase
      .from('goals')
      .select(`
        *,
        users (
          name
        )
      `)
      .order('createdAt', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Flatten user name
    const formattedGoals = (data || []).map(goal => ({
      ...goal,
      user_name: goal.users?.name || null,
      users: undefined
    }));

    return NextResponse.json(formattedGoals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if this is a bulk delete request
    if (body.action === 'bulkDelete' && body.names) {
      const { data, error } = await supabase
        .from('goals')
        .delete()
        .in('title', body.names)
        .select('title');
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        deleted: data?.length || 0,
        goals: data?.map(r => r.title) || []
      });
    }
    
    const { userId, title, description, targetValue, currentValue, unit, startDate, endDate, status } = body;

    const { data, error } = await supabase
      .from('goals')
      .insert([{
        userId,
        title,
        description: description || null,
        targetValue,
        currentValue: currentValue || 0,
        unit,
        startDate,
        endDate,
        status: status || 'active',
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
