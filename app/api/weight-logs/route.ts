import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    let query = supabase
      .from('weight_logs')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching weight logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, weight, notes } = body;

    // Check if entry exists for this date
    const { data: existing } = await supabase
      .from('weight_logs')
      .select('id')
      .eq('userId', userId)
      .eq('date', date)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('weight_logs')
        .update({ weight, notes })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('weight_logs')
        .insert([{ userId, date, weight, notes }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving weight log:', error);
    return NextResponse.json(
      { error: 'Failed to save weight log' },
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
      .from('weight_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting weight log:', error);
    return NextResponse.json(
      { error: 'Failed to delete weight log' },
      { status: 500 }
    );
  }
}
