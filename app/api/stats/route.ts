import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let query = supabase
      .from('activity_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json((data || []).reverse());
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, date, steps, distance, calories, points, waterGlasses } = body

    // Check if stats exist for this date
    const { data: existing } = await supabase
      .from('activity_stats')
      .select('id')
      .eq('userId', userId)
      .eq('date', date)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('activity_stats')
        .update({
          steps,
          distance,
          calories,
          points,
          waterGlasses
        })
        .eq('id', existing.id);

      if (error) throw error;

      return NextResponse.json({ success: true, updated: true })
    } else {
      // Insert new
      const { error } = await supabase
        .from('activity_stats')
        .insert([{
          userId,
          date,
          steps,
          distance,
          calories,
          points,
          waterGlasses
        }]);

      if (error) throw error;

      return NextResponse.json({ success: true, created: true }, { status: 201 })
    }
  } catch (error) {
    console.error('Error saving stats:', error)
    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 })
  }
}
