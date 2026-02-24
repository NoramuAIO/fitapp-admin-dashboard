import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { name, isPrimary, orderIndex } = body

    // If this is primary, unset other primary programs
    if (isPrimary) {
      await supabase
        .from('programs')
        .update({ isPrimary: false })
        .neq('id', id)
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
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating program:', error)
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting program:', error)
    return NextResponse.json({ error: 'Failed to delete program' }, { status: 500 })
  }
}
