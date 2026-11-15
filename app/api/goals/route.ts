import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminSessionToken } from '@/lib/auth';
import {
  calculateWeightGoalMetrics,
  parseStartValueTag,
  stripGoalMetadataTags,
} from '@/lib/fitnessCalculations';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUserId = searchParams.get('userId');
    const numericUserId =
      rawUserId && rawUserId !== 'all' && rawUserId !== 'undefined' && rawUserId !== 'null'
        ? parseInt(rawUserId, 10)
        : null;

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

    if (numericUserId && !isNaN(numericUserId)) {
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

    return NextResponse.json(formattedGoals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support delete via POST
    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = Number(body.id);
      const { data, error } = await supabase
        .from('goals')
        .delete()
        .eq('id', numericId)
        .select();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        deleted: data?.length || 0,
      });
    }

    // Check if this is a bulk delete request (admin session required)
    if (body.action === 'bulkDelete' && body.names) {
      const cookieStore = await cookies();
      const isAdmin = await verifyAdminSessionToken(cookieStore.get('admin-auth')?.value);
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Yetkisiz erişim (Admin oturumu gerekli)' },
          { status: 401 }
        );
      }

      const { data, error } = await supabase
        .from('goals')
        .delete()
        .in('title', body.names)
        .select('title');

      if (error) throw error;

      return NextResponse.json({
        success: true,
        deleted: data?.length || 0,
        goals: data?.map((r) => r.title) || [],
      });
    }

    const { userId, title, description, targetValue, currentValue, startValue, unit, startDate, endDate, status } = body;

    const targetNum = parseFloat(String(targetValue).replace(',', '.'));
    let initialCurNum =
      currentValue !== undefined && currentValue !== null && currentValue !== ''
        ? parseFloat(String(currentValue).replace(',', '.'))
        : 0;

    if (!Number.isFinite(targetNum)) {
      return NextResponse.json({ error: 'Geçerli hedef değeri gerekli' }, { status: 400 });
    }
    if (!Number.isFinite(initialCurNum)) {
      initialCurNum = 0;
    }

    // If unit is kg and no currentValue provided, pull exact latest weight from weight_logs
    if (String(unit || '').trim().toLowerCase() === 'kg' && initialCurNum === 0 && userId) {
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
        ? parseFloat(String(startValue).replace(',', '.'))
        : NaN;
    const resolvedStart =
      Number.isFinite(explicitStart) && explicitStart > 0
        ? explicitStart
        : String(unit || '').trim().toLowerCase() === 'kg' && initialCurNum > 0
          ? initialCurNum
          : null;

    const cleanDesc = stripGoalMetadataTags(description);
    const descriptionWithMeta = resolvedStart
      ? `${cleanDesc ? `${cleanDesc} ` : ''}[START:${resolvedStart}]`
      : (cleanDesc || null);

    const basePayload = {
      userId,
      title,
      description: descriptionWithMeta,
      targetValue: targetNum,
      currentValue: initialCurNum,
      unit,
      startDate,
      endDate,
      status: status || 'active',
      createdAt: new Date().toISOString(),
    };

    let { data, error } = await supabase
      .from('goals')
      .insert([basePayload])
      .select()
      .single();

    // Fallback to integer rounding only if Postgres column type is INTEGER (error 22P02)
    if (error?.code === '22P02') {
      const retry = await supabase
        .from('goals')
        .insert([
          {
            ...basePayload,
            targetValue: Math.round(targetNum),
            currentValue: Math.round(initialCurNum),
          },
        ])
        .select()
        .single();
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
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
