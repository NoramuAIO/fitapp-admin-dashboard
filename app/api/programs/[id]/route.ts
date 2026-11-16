import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  detachOrDeleteExercises,
  parsePositiveInt,
  requireApiAuth,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Geçersiz program ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, isPrimary, orderIndex, userId } = body;

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = String(name).trim();
    if (isPrimary !== undefined) updateData.isPrimary = Boolean(isPrimary);
    if (orderIndex !== undefined) updateData.orderIndex = Number(orderIndex) || 0;

    let { data, error } = await supabase
      .from('programs')
      .update(updateData)
      .eq('id', numericId)
      .select()
      .maybeSingle();

    if (error && orderIndex !== undefined && /orderIndex/i.test(String(error.message || ''))) {
      const { orderIndex: _ignored, ...fallbackUpdate } = updateData;
      const retry = await supabase
        .from('programs')
        .update(fallbackUpdate)
        .eq('id', numericId)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    if (isPrimary) {
      await supabase
        .from('programs')
        .update({ isPrimary: false })
        .neq('id', numericId);
    }

    if (userId !== undefined) {
      await supabase.from('user_programs').delete().eq('programId', numericId);
      const parsedUserId = userId ? parsePositiveInt(userId) : null;
      if (parsedUserId) {
        await supabase.from('user_programs').insert([{
          userId: parsedUserId,
          programId: numericId,
          isActive: true,
        }]);
      }
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating program:', error);
    return NextResponse.json({ error: 'Failed to update program' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Geçersiz program ID' }, { status: 400 });
    }

    await supabase.from('user_programs').delete().eq('programId', numericId);

    const { data: days } = await supabase.from('program_days').select('id').eq('programId', numericId);
    const dayIds = (days || []).map((d: any) => Number(d.id));

    let exQuery = supabase.from('exercises').select('id');
    if (dayIds.length > 0) {
      exQuery = exQuery.or(`programId.eq.${numericId},dayId.in.(${dayIds.join(',')})`);
    } else {
      exQuery = exQuery.eq('programId', numericId);
    }
    const { data: exRows } = await exQuery;
    await detachOrDeleteExercises((exRows || []).map((e: any) => Number(e.id)));

    await supabase.from('program_days').delete().eq('programId', numericId);

    const { data, error } = await supabase
      .from('programs')
      .delete()
      .eq('id', numericId)
      .select();

    if (error) throw error;

    return NextResponse.json(
      { success: true, deleted: data?.length || 0 },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error deleting program:', error);
    return NextResponse.json(
      { error: 'Failed to delete program: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

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
