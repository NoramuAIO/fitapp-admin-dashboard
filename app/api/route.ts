import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = supabase
      .from('body_fat_logs')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching body fat logs:', error);
    return NextResponse.json({ error: 'Failed to fetch body fat logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, fatPercent, weight, notes } = body;

    if (!userId || !date || fatPercent === undefined) {
      return NextResponse.json({ error: 'userId, date and fatPercent are required' }, { status: 400 });
    }

    // Check if entry exists for this date
    const { data: existing } = await supabase
      .from('body_fat_logs')
      .select('id')
      .eq('userId', userId)
      .eq('date', date)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('body_fat_logs')
        .update({ fatPercent, weight: weight ?? null, notes: notes ?? null })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabase
        .from('body_fat_logs')
        .insert([{ userId, date, fatPercent, weight: weight ?? null, notes: notes ?? null }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving body fat log:', error);
    return NextResponse.json({ error: 'Failed to save body fat log' }, { status: 500 });
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
      .from('body_fat_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting body fat log:', error);
    return NextResponse.json({ error: 'Failed to delete body fat log' }, { status: 500 });
  }
}
