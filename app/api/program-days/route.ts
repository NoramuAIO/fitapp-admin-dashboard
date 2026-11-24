import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import {
  detachOrDeleteExercises,
  parsePositiveInt,
  requireApiAuth,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(request: NextRequest) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const programId = parsePositiveInt(searchParams.get('programId'));
    if (!programId) {
      return NextResponse.json({ error: 'Valid programId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('program_days')
      .select('*')
      .eq('programId', programId)
      .order('orderIndex', { ascending: true })
      .order('dayNumber', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || [], { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching program days:', error);
    return NextResponse.json({ error: 'Failed to fetch program days' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const programId = parsePositiveInt(body.programId);
    const dayNumber = parsePositiveInt(body.dayNumber);
    const dayName = typeof body.dayName === 'string' ? body.dayName.trim() : '';
    const orderIndex = Number.isFinite(Number(body.orderIndex)) ? Number(body.orderIndex) : 0;

    if (!programId || !dayNumber || !dayName) {
      return NextResponse.json(
        { error: 'programId, dayNumber, and dayName are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('program_days')
      .insert([{ programId, dayNumber, dayName, name: dayName, orderIndex }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error creating program day:', error);
    return NextResponse.json({ error: 'Failed to create program day' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const id = parsePositiveInt(body.id);
    const dayNumber = parsePositiveInt(body.dayNumber);
    const dayName = typeof body.dayName === 'string' ? body.dayName.trim() : '';

    if (!id || !dayNumber || !dayName) {
      return NextResponse.json(
        { error: 'id, dayNumber, and dayName are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('program_days')
      .update({ dayNumber, dayName, name: dayName })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Program day not found' }, { status: 404 });
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error updating program day:', error);
    return NextResponse.json({ error: 'Failed to update program day' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = parsePositiveInt(searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }

    const { data: exRows } = await supabase.from('exercises').select('id').eq('dayId', id);
    await detachOrDeleteExercises((exRows || []).map((e: any) => Number(e.id)));

    const { data, error } = await supabase
      .from('program_days')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Program day not found' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Program day deleted successfully' },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error deleting program day:', error);
    return NextResponse.json({ error: 'Failed to delete program day' }, { status: 500 });
  }
}
