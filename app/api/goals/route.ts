import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');
    const numericUserId = rawUserId && rawUserId !== 'all' && rawUserId !== 'undefined' && rawUserId !== 'null'
      ? parseInt(rawUserId, 10)
      : null;
    
    let query = supabase
      .from('goals')
      .select(`
        *,
        users (
          name
        )
      `)
      .order('createdAt', { ascending: false });

    if (numericUserId && !isNaN(numericUserId)) {
      query = query.eq('userId', numericUserId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rawGoals = data || [];

    // Auto-sync any kg goals that have 0 or empty currentValue with the user's latest weight log
    const formattedGoals = await Promise.all(rawGoals.map(async goal => {
      let currentVal = goal.currentValue || 0;

      if (goal.unit === 'kg' && currentVal === 0 && goal.userId) {
        try {
          const { data: latestWeight } = await supabase
            .from('weight_logs')
            .select('weight')
            .eq('userId', goal.userId)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestWeight && latestWeight.weight) {
            currentVal = Number(latestWeight.weight);
            // Persist the synced weight to Supabase (safe integer for column type)
            await supabase
              .from('goals')
              .update({ currentValue: Math.round(currentVal) })
              .eq('id', goal.id);
          }
        } catch (wErr) {
          console.error('Error auto-syncing weight for goal:', wErr);
        }
      }

      return {
        ...goal,
        currentValue: currentVal,
        user_name: goal.users?.name || null,
        users: undefined
      };
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
    
    // Support delete via POST
    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = Number(body.id);
      const { data, error } = await supabase
        .from('goals')
        .delete()
        .eq('id', numericId)
        .select();
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        deleted: data?.length || 0,
      });
    }

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

    let initialCurrentValue = currentValue || 0;

    // If unit is kg and no currentValue provided, pull from the user's latest weight log
    if (unit === 'kg' && initialCurrentValue === 0 && userId) {
      try {
        const { data: latestWeight } = await supabase
          .from('weight_logs')
          .select('weight')
          .eq('userId', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestWeight && latestWeight.weight) {
          initialCurrentValue = Number(latestWeight.weight);
        }
      } catch (wErr) {
        console.error('Error fetching latest weight for new goal:', wErr);
      }
    }

    const { data, error } = await supabase
      .from('goals')
      .insert([{
        userId,
        title,
        description: description || null,
        targetValue: Math.round(Number(targetValue)),
        currentValue: Math.round(Number(initialCurrentValue)),
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
