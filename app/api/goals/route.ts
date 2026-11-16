import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  isValidYmdDate,
  parseLocaleDecimal,
  parsePositiveInt,
  requireApiAuth,
  resolveScopedUserId,
} from '@/lib/apiAuth';
import {
  calculateWeightGoalMetrics,
  getLocalDateString,
  parseStartValueTag,
  stripGoalMetadataTags,
} from '@/lib/fitnessCalculations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');
    const isUnfiltered = !rawUserId || rawUserId === 'all' || rawUserId === 'undefined' || rawUserId === 'null';
    const parsedUserId = isUnfiltered ? null : parsePositiveInt(rawUserId);
    if (!isUnfiltered && !parsedUserId) {
      return NextResponse.json({ error: 'Geçersiz userId parametresi' }, { status: 400 });
    }

    const scoped = resolveScopedUserId(guard.auth, parsedUserId);
    if (!scoped.ok) return scoped.response;
    const numericUserId = scoped.userId;

    let query = supabase
      .from('goals')
      .select(`
        *,
        users (
          name
        )
      `)
      .order('createdAt', { ascending: false });

    let logsQuery = supabase
      .from('weight_logs')
      .select('id, userId, date, weight')
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (numericUserId) {
      query = query.eq('userId', numericUserId);
      logsQuery = logsQuery.eq('userId', numericUserId);
    }

    const [
      { data, error },
      { data: allWeightLogs },
    ] = await Promise.all([query, logsQuery]);

    if (error) throw error;

    const rawGoals = data || [];
    const logsByUser = new Map<number, Array<{ id: number; date: string; weight: number }>>();
    for (const log of allWeightLogs || []) {
      const uid = Number(log.userId);
      if (!logsByUser.has(uid)) logsByUser.set(uid, []);
      logsByUser.get(uid)!.push({
        id: log.id,
        date: log.date,
        weight: Number(log.weight),
      });
    }

    const formattedGoals = rawGoals.map((goal: any) => {
      const unit = String(goal.unit || '').trim().toLowerCase();
      const userLogs = logsByUser.get(Number(goal.userId)) || [];
      const cleanDescription = stripGoalMetadataTags(goal.description);

      if (unit === 'kg') {
        const metrics = calculateWeightGoalMetrics(goal, userLogs);
        return {
          ...goal,
          description: cleanDescription || null,
          startValue: metrics.startWeight,
          currentValue: metrics.currentWeight,
          targetValue: Number(goal.targetValue) || 0,
          user_name: goal.users?.name || null,
          users: undefined,
        };
      }

      return {
        ...goal,
        description: cleanDescription || null,
        startValue: parseStartValueTag(goal.description),
        currentValue: Number(goal.currentValue) || 0,
        targetValue: Number(goal.targetValue) || 0,
        user_name: goal.users?.name || null,
        users: undefined,
      };
    });

    return NextResponse.json(formattedGoals, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    // Support delete via POST
    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = parsePositiveInt(body.id);
      if (!numericId) {
        return NextResponse.json({ error: 'Geçersiz hedef ID' }, { status: 400 });
      }
      let delQuery = supabase.from('goals').delete().eq('id', numericId);
      if (!guard.auth.isAdmin && guard.auth.userId) {
        delQuery = delQuery.eq('userId', guard.auth.userId);
      }
      const { data, error } = await delQuery.select();
      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
      }

      return NextResponse.json(
        { success: true, deleted: data.length },
        { headers: NO_STORE_HEADERS }
      );
    }

    // Bulk delete requires admin session
    if (body.action === 'bulkDelete' && body.names) {
      if (!guard.auth.isAdmin) {
        return NextResponse.json(
          { error: 'Yetkisiz erişim (Admin oturumu gerekli)' },
          { status: 403 }
        );
      }

      const { data, error } = await supabase
        .from('goals')
        .delete()
        .in('title', body.names)
        .select('title');

      if (error) throw error;

      return NextResponse.json(
        {
          success: true,
          deleted: data?.length || 0,
          goals: data?.map((r) => r.title) || [],
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const { title, description, targetValue, currentValue, startValue, unit, startDate, endDate, status } = body;
    const requestedUserId = parsePositiveInt(body.userId);
    const scoped = resolveScopedUserId(guard.auth, requestedUserId);
    if (!scoped.ok) return scoped.response;
    const userId = scoped.userId;

    if (!userId || !String(title || '').trim() || !String(unit || '').trim()) {
      return NextResponse.json(
        { error: 'Kullanıcı, başlık ve birim alanları zorunludur' },
        { status: 400 }
      );
    }

    const targetNum = parseLocaleDecimal(targetValue);
    let initialCurNum =
      currentValue !== undefined && currentValue !== null && currentValue !== ''
        ? parseLocaleDecimal(currentValue)
        : 0;

    if (targetNum === null || targetNum <= 0) {
      return NextResponse.json({ error: 'Geçerli hedef değeri gerekli' }, { status: 400 });
    }
    if (initialCurNum === null || initialCurNum < 0) {
      initialCurNum = 0;
    }

    const resolvedStartDate =
      startDate && isValidYmdDate(String(startDate)) ? String(startDate).trim() : getLocalDateString();
    const resolvedEndDate =
      endDate && String(endDate).trim()
        ? isValidYmdDate(String(endDate))
          ? String(endDate).trim()
          : null
        : null;
    if (endDate && String(endDate).trim() && !resolvedEndDate) {
      return NextResponse.json({ error: 'Geçersiz bitiş tarihi' }, { status: 400 });
    }

    // If unit is kg and no currentValue provided, pull exact latest weight from weight_logs
    if (String(unit).trim().toLowerCase() === 'kg' && initialCurNum === 0) {
      try {
        const { data: latestWeight } = await supabase
          .from('weight_logs')
          .select('weight')
          .eq('userId', userId)
          .order('date', { ascending: false })
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestWeight && latestWeight.weight) {
          initialCurNum = Number(latestWeight.weight);
        }
      } catch (wErr) {
        console.error('Error fetching latest weight for new goal:', wErr);
      }
    }

    const explicitStart =
      startValue !== undefined && startValue !== null && startValue !== ''
        ? parseLocaleDecimal(startValue)
        : null;
    const resolvedStart =
      explicitStart !== null && explicitStart > 0
        ? explicitStart
        : String(unit).trim().toLowerCase() === 'kg' && initialCurNum > 0
          ? initialCurNum
          : null;

    const cleanDesc = stripGoalMetadataTags(description);
    const descriptionWithMeta = resolvedStart
      ? `${cleanDesc ? `${cleanDesc} ` : ''}[START:${resolvedStart}]`
      : (cleanDesc || null);

    const basePayload = {
      userId,
      title: String(title).trim(),
      description: descriptionWithMeta,
      targetValue: targetNum,
      currentValue: initialCurNum,
      unit: String(unit).trim(),
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      status: status || 'active',
      createdAt: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('goals')
      .insert([basePayload])
      .select()
      .single();

    if (error && (error.code === '22P02' || error.code === '23502')) {
      const retryPayload = {
        ...basePayload,
        targetValue: error.code === '22P02' ? Math.round(targetNum) : basePayload.targetValue,
        currentValue: error.code === '22P02' ? Math.round(initialCurNum) : basePayload.currentValue,
        endDate: basePayload.endDate || resolvedStartDate,
      };
      const retry = await supabase.from('goals').insert([retryPayload]).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    return NextResponse.json(
      {
        ...data,
        description: cleanDesc || null,
        startValue: resolvedStart,
      },
      { status: 201, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
