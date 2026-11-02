import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, isPrimary, orderIndex } = body;

    // If this is primary, unset other primary programs
    if (isPrimary) {
      await supabase
        .from('programs')
        .update({ isPrimary: false })
        .neq('id', id);
    }

    const updateData: any = {
      name,
      isPrimary,
      updatedAt: new Date().toISOString()
    };

    if (orderIndex !== undefined) {
      updateData.orderIndex = orderIndex;
    }

    const { data, error } = await supabase
      .from('programs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    // 1. Delete user assignments
    await supabase.from('user_programs').delete().eq('programId', numericId);

    // 2. Find program days
    const { data: days } = await supabase.from('program_days').select('id').eq('programId', numericId);
    const dayIds = (days || []).map((d: any) => d.id);

    // 3. Delete exercises under this program
    if (dayIds.length > 0) {
      await supabase.from('exercises').delete().in('dayId', dayIds);
    }
    await supabase.from('exercises').delete().eq('programId', numericId);

    // 4. Delete program days
    await supabase.from('program_days').delete().eq('programId', numericId);

    // 5. Delete program itself
    const { data, error } = await supabase
      .from('programs')
      .delete()
      .eq('id', numericId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, deleted: data?.length || 0 });
  } catch (error) {
    console.error('Error deleting program:', error);
    return NextResponse.json({ error: 'Failed to delete program: ' + (error as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    if (body.action === 'delete') {
      return DELETE(request, { params });
    }
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
