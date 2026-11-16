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

async function syncUserKgGoalsFromLatestLog(userId: number) {
  try {
    const { data: latest } = await supabase
      .from('weight_logs')
      .select('weight')
      .eq('userId', userId)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest || latest.weight === undefined || latest.weight === null) return;
    const latestWeight = Number(latest.weight);
    if (!Number.isFinite(latestWeight) || latestWeight <= 0) return;

    const { error: goalErr } = await supabase
      .from('goals')
      .update({ currentValue: latestWeight })
      .eq('userId', userId)
      .ilike('unit', 'kg')
      .eq('status', 'active');

    if (goalErr?.code === '22P02') {
      await supabase
        .from('goals')
        .update({ currentValue: Math.round(latestWeight) })
        .eq('userId', userId)
        .ilike('unit', 'kg')
        .eq('status', 'active');
    }
  } catch (err) {
    console.error('Error syncing active kg goals from weight logs:', err);
  }
}

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
      .from('weight_logs')
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
    console.error('Error fetching weight logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight logs' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

async function deleteWeightLogById(targetId: number, authUserId: number | null, isAdmin: boolean) {
  let query = supabase.from('weight_logs').delete().eq('id', targetId);
  if (!isAdmin && authUserId) {
    query = query.eq('userId', authUserId);
  }
  const { data, error } = await query.select('id, userId');
  if (error) throw error;
  if (!data || data.length === 0) {
    return null;
  }
  const deletedUserId = Number(data[0].userId);
  if (Number.isFinite(deletedUserId) && deletedUserId > 0) {
    await syncUserKgGoalsFromLatestLog(deletedUserId);
  }
  return data[0];
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
      const deleted = await deleteWeightLogById(targetId, guard.auth.userId, guard.auth.isAdmin);
      if (!deleted) {
        return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
      }
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    const scoped = resolveScopedUserId(guard.auth, parsePositiveInt(body.userId));
    if (!scoped.ok) return scoped.response;
    const userId = scoped.userId;

    const cleanDate = typeof body.date === 'string' ? body.date.trim() : '';
    const parsedWeight = parseLocaleDecimal(body.weight);

    if (!userId || !isValidYmdDate(cleanDate) || parsedWeight === null || parsedWeight <= 0 || parsedWeight >= 500) {
      return NextResponse.json(
        { error: 'Geçerli kullanıcı, YYYY-AA-GG tarih ve kilo (>0) gereklidir' },
        { status: 400 }
      );
    }

    const cleanNotes = body.notes !== undefined && body.notes !== null ? String(body.notes) : null;

    const { data: existing } = await supabase
      .from('weight_logs')
      .select('id')
      .eq('userId', userId)
      .eq('date', cleanDate)
      .maybeSingle();

    let resultData;
    if (existing) {
      const { data, error } = await supabase
        .from('weight_logs')
        .update({ weight: parsedWeight, notes: cleanNotes })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from('weight_logs')
        .insert([{ userId, date: cleanDate, weight: parsedWeight, notes: cleanNotes }])
        .select()
        .single();

      if (error) throw error;
      resultData = data;
    }

    await syncUserKgGoalsFromLatestLog(userId);
    return NextResponse.json(resultData, { status: existing ? 200 : 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error saving weight log:', error);
    return NextResponse.json(
      { error: 'Failed to save weight log' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
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

    const deleted = await deleteWeightLogById(numericId, guard.auth.userId, guard.auth.isAdmin);
    if (!deleted) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error deleting weight log:', error);
    return NextResponse.json(
      { error: 'Failed to delete weight log' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
