import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  isValidYmdDate,
  parseLocaleDecimal,
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
      .from('body_fat_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false });

    if (scoped.userId) {
      query = query.eq('userId', scoped.userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || [], { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching body fat logs:', error);
    return NextResponse.json({ error: 'Failed to fetch body fat logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    if (body.action === 'delete') {
      const targetId = parsePositiveInt(body.id);
      if (!targetId) {
        return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
      }
      let query = supabase.from('body_fat_logs').delete().eq('id', targetId);
      if (!guard.auth.isAdmin && guard.auth.userId) {
        query = query.eq('userId', guard.auth.userId);
      }
      const { data, error } = await query.select('id');
      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const scoped = resolveScopedUserId(guard.auth, parsePositiveInt(body.userId));
    if (!scoped.ok) return scoped.response;
    const userId = scoped.userId;

    const cleanDate = typeof body.date === 'string' ? body.date.trim() : '';
    const parsedFat = parseLocaleDecimal(body.fatPercent);
    const parsedWeight =
      body.weight !== undefined && body.weight !== null && body.weight !== ''
        ? parseLocaleDecimal(body.weight)
        : null;

    if (!userId || !isValidYmdDate(cleanDate) || parsedFat === null || parsedFat <= 0 || parsedFat > 100) {
      return NextResponse.json(
        { error: 'Geçerli kullanıcı, YYYY-AA-GG tarih ve yağ oranı (%0-100) gereklidir' },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from('body_fat_logs')
      .select('id')
      .eq('userId', userId)
      .eq('date', cleanDate)
      .maybeSingle();

    const payload = {
      fatPercent: parsedFat,
      weight: parsedWeight !== null && parsedWeight > 0 ? parsedWeight : null,
      notes: body.notes !== undefined && body.notes !== null ? String(body.notes) : null,
    };

    if (existing) {
      const { data, error } = await supabase
        .from('body_fat_logs')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data, { headers: NO_STORE_HEADERS });
    } else {
      const { data, error } = await supabase
        .from('body_fat_logs')
        .insert([{ userId, date: cleanDate, ...payload }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
    }
  } catch (error) {
    console.error('Error saving body fat log:', error);
    return NextResponse.json({ error: 'Failed to save body fat log' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const numericId = parsePositiveInt(searchParams.get('id'));
    if (!numericId) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    let query = supabase.from('body_fat_logs').delete().eq('id', numericId);
    if (!guard.auth.isAdmin && guard.auth.userId) {
      query = query.eq('userId', guard.auth.userId);
    }
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error deleting body fat log:', error);
    return NextResponse.json({ error: 'Failed to delete body fat log' }, { status: 500 });
  }
}
