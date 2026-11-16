import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  parsePositiveInt,
  requireApiAuth,
  resolveScopedUserId,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');
    const parsedUserId = rawUserId ? parsePositiveInt(rawUserId) : null;
    if (rawUserId && !parsedUserId) {
      return NextResponse.json({ error: 'Geçersiz userId' }, { status: 400 });
    }

    const scoped = resolveScopedUserId(guard.auth, parsedUserId);
    if (!scoped.ok) return scoped.response;

    let query = supabase
      .from('user_programs')
      .select(`
        *,
        programs (
          id,
          name,
          isPrimary
        ),
        users (
          id,
          name,
          email
        )
      `)
      .order('assignedAt', { ascending: false });

    if (scoped.userId) {
      query = query.eq('userId', scoped.userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || [], { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching user programs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user programs' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const userId = parsePositiveInt(body.userId);
    const programId = parsePositiveInt(body.programId);
    const isActive = body.isActive ?? true;

    if (!userId || !programId) {
      return NextResponse.json({ error: 'Geçerli userId ve programId gerekli' }, { status: 400 });
    }

    if (isActive) {
      const { error: deactErr } = await supabase
        .from('user_programs')
        .update({ isActive: false })
        .eq('userId', userId);
      if (deactErr) throw deactErr;
    }

    const { data: existing } = await supabase
      .from('user_programs')
      .select('id')
      .eq('userId', userId)
      .eq('programId', programId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('user_programs')
        .update({ isActive: Boolean(isActive) })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data, { status: 200, headers: NO_STORE_HEADERS });
    }

    const { data, error } = await supabase
      .from('user_programs')
      .insert([{ userId, programId, isActive: Boolean(isActive) }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error assigning program:', error);
    return NextResponse.json(
      { error: 'Failed to assign program' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const numericId = parsePositiveInt(searchParams.get('id'));
    if (!numericId) {
      return NextResponse.json({ error: 'Geçerli ID gerekli' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_programs')
      .delete()
      .eq('id', numericId)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error removing program:', error);
    return NextResponse.json(
      { error: 'Failed to remove program' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
