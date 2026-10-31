import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, targetValue, currentValue, unit, startDate, endDate, status } = body;

    const updatePayload: any = {
      title,
      description,
      unit,
      startDate,
      endDate,
      status
    };
    if (targetValue !== undefined) updatePayload.targetValue = Math.round(Number(targetValue));
    if (currentValue !== undefined) updatePayload.currentValue = Math.round(Number(currentValue));

    const { data, error } = await supabase
      .from('goals')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
