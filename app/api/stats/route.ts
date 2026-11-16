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
      .from('activity_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(7);

    if (scoped.userId) {
      query = query.eq('userId', scoped.userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json((data || []).reverse(), { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const scoped = resolveScopedUserId(guard.auth, parsePositiveInt(body.userId));
    if (!scoped.ok) return scoped.response;
    const userId = scoped.userId;

    const cleanDate = typeof body.date === 'string' ? body.date.trim() : '';
    if (!userId || !isValidYmdDate(cleanDate)) {
      return NextResponse.json({ error: 'Geçerli kullanıcı ve YYYY-AA-GG tarih gereklidir' }, { status: 400 });
    }

    const toNonNegInt = (v: unknown) => Math.max(0, Math.round(parseLocaleDecimal(v) ?? 0));
    const toNonNegFloat = (v: unknown) => Math.max(0, parseLocaleDecimal(v) ?? 0);

    const payload = {
      steps: toNonNegInt(body.steps),
      distance: toNonNegFloat(body.distance),
      calories: toNonNegInt(body.calories),
      points: toNonNegInt(body.points),
      waterGlasses: toNonNegInt(body.waterGlasses),
    };

    const { data: existing } = await supabase
      .from('activity_stats')
      .select('id')
      .eq('userId', userId)
      .eq('date', cleanDate)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('activity_stats')
        .update(payload)
        .eq('id', existing.id);

      if (error) throw error;
      return NextResponse.json({ success: true, updated: true }, { headers: NO_STORE_HEADERS });
    } else {
      const { error } = await supabase
        .from('activity_stats')
        .insert([{ userId, date: cleanDate, ...payload }]);

      if (error) throw error;
      return NextResponse.json({ success: true, created: true }, { status: 201, headers: NO_STORE_HEADERS });
    }
  } catch (error) {
    console.error('Error saving stats:', error);
    return NextResponse.json({ error: 'Failed to save stats' }, { status: 500 });
  }
}

