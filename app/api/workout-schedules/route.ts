import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminSessionToken, verifyUserToken } from '@/lib/auth';
import {
  REST_DAY_LABEL,
  UserWorkoutSchedule,
  normalizeUserSchedule,
} from '@/lib/workoutSchedule';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SCHEDULE_WIDGET_TYPE = 'workout_schedule_data';
const inMemorySchedules = new Map<number, UserWorkoutSchedule>();

function parsePositiveUserId(value: unknown): number | null {
  if (value === undefined || value === null || value === '' || value === 'all' || value === 'null' || value === 'undefined') {
    return null;
  }
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function getScheduleWidgetTitle(userId: number): string {
  return `SCHEDULE_USER_${userId}`;
}

async function authorizeScheduleRequest(
  request: Request,
  requestedUserId: number | null
): Promise<
  | { ok: true; userId: number | null }
  | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin-auth')?.value;
  const isAdmin = await verifyAdminSessionToken(adminCookie);
  if (isAdmin) {
    return { ok: true, userId: requestedUserId };
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    const tokenUser = await verifyUserToken(token);
    if (!tokenUser) {
      return { ok: false, status: 401, error: 'Geçersiz oturum belirteci' };
    }
    if (requestedUserId !== null && requestedUserId !== tokenUser.userId) {
      return { ok: false, status: 403, error: 'Başka bir kullanıcının programına erişilemez' };
    }
    return { ok: true, userId: requestedUserId ?? tokenUser.userId };
  }

  return { ok: true, userId: requestedUserId };
}

async function loadScheduleFromStore(userId: number): Promise<UserWorkoutSchedule> {
  // 1. Primary table: workout_schedules
  try {
    const { data, error } = await supabase
      .from('workout_schedules')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (!error && data) {
      const normalized = normalizeUserSchedule(data, userId);
      inMemorySchedules.set(userId, normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('workout_schedules table read fallback:', err);
  }

  // 2. Fallback table: custom_widgets metadata row
  try {
    const { data: widgetRow, error: widgetErr } = await supabase
      .from('custom_widgets')
      .select('*')
      .eq('widget_type', SCHEDULE_WIDGET_TYPE)
      .eq('title', getScheduleWidgetTitle(userId))
      .maybeSingle();

    if (!widgetErr && widgetRow?.custom_content) {
      const parsed = JSON.parse(widgetRow.custom_content);
      const normalized = normalizeUserSchedule(parsed, userId);
      inMemorySchedules.set(userId, normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('custom_widgets schedule fallback read error:', err);
  }

  // 3. In-memory fallback or clean default
  return inMemorySchedules.get(userId) || normalizeUserSchedule(null, userId);
}

async function persistScheduleToStore(
  userId: number,
  schedule: UserWorkoutSchedule
): Promise<UserWorkoutSchedule> {
  const normalized = normalizeUserSchedule(
    {
      ...schedule,
      userId,
      updatedAt: new Date().toISOString(),
    },
    userId
  );

  inMemorySchedules.set(userId, normalized);

  // 1. Try primary table: workout_schedules
  try {
    const { data: existing, error: findErr } = await supabase
      .from('workout_schedules')
      .select('id')
      .eq('userId', userId)
      .maybeSingle();

    if (!findErr) {
      if (existing?.id) {
        const { data: updated, error: updateErr } = await supabase
          .from('workout_schedules')
          .update({
            weeklySchedule: normalized.weeklySchedule,
            overrides: normalized.overrides,
            updatedAt: normalized.updatedAt,
          })
          .eq('id', existing.id)
          .select()
          .maybeSingle();

        if (!updateErr && updated) {
          const result = normalizeUserSchedule(updated, userId);
          inMemorySchedules.set(userId, result);
          return result;
        }
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('workout_schedules')
          .insert([
            {
              userId,
              weeklySchedule: normalized.weeklySchedule,
              overrides: normalized.overrides,
              updatedAt: normalized.updatedAt,
            },
          ])
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          const result = normalizeUserSchedule(inserted, userId);
          inMemorySchedules.set(userId, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('workout_schedules write fallback:', err);
  }

  // 2. Fallback table: custom_widgets
  try {
    const title = getScheduleWidgetTitle(userId);
    const serialized = JSON.stringify(normalized);
    const { data: existingWidget, error: widgetFindErr } = await supabase
      .from('custom_widgets')
      .select('id')
      .eq('widget_type', SCHEDULE_WIDGET_TYPE)
      .eq('title', title)
      .maybeSingle();

    if (!widgetFindErr) {
      if (existingWidget?.id) {
        await supabase
          .from('custom_widgets')
          .update({
            custom_content: serialized,
            is_active: false,
          })
          .eq('id', existingWidget.id);
      } else {
        await supabase.from('custom_widgets').insert([
          {
            title,
            widget_type: SCHEDULE_WIDGET_TYPE,
            target_time: normalized.updatedAt || null,
            custom_content: serialized,
            is_active: false,
            display_order: 9999,
          },
        ]);
      }
    }
  } catch (err) {
    console.warn('custom_widgets schedule fallback write error:', err);
  }

  return normalized;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = parsePositiveUserId(searchParams.get('userId'));
    const auth = await authorizeScheduleRequest(request, requestedUserId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId;
    if (!userId) {
      return NextResponse.json(normalizeUserSchedule(null, null), {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const schedule = await loadScheduleFromStore(userId);
    return NextResponse.json(schedule, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('GET /api/workout-schedules error:', error);
    return NextResponse.json(
      { error: 'Antrenman takvimi yüklenemedi' },
      { status: 500 }
    );
  }
}

async function handleUpsert(request: Request) {
  try {
    const body = await request.json();
    const requestedUserId = parsePositiveUserId(body?.userId);
    const auth = await authorizeScheduleRequest(request, requestedUserId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId;
    if (!userId) {
      return NextResponse.json(
        { error: 'Geçerli bir kullanıcı ID gereklidir' },
        { status: 400 }
      );
    }

    const action = body?.action ? String(body.action) : 'save_all';
    const current = await loadScheduleFromStore(userId);

    if (action === 'update_day') {
      const dow = Number(body.dayOfWeek);
      if (Number.isNaN(dow) || dow < 0 || dow > 6) {
        return NextResponse.json({ error: 'Geçersiz gün (0-6)' }, { status: 400 });
      }
      const nextWeekly = current.weeklySchedule.map((day) => {
        if (day.dayOfWeek !== dow) return day;
        return {
          dayOfWeek: dow,
          isRestDay: Boolean(body.isRestDay),
          isAlternating: Boolean(body.isAlternating),
          workouts: Array.isArray(body.workouts) ? body.workouts : [],
          note: body.note ?? null,
        };
      });

      const saved = await persistScheduleToStore(userId, {
        ...current,
        weeklySchedule: nextWeekly,
      });
      return NextResponse.json(saved);
    }

    if (action === 'set_override') {
      const dateStr = String(body?.date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: 'Geçerli tarih (YYYY-AA-GG) gereklidir' }, { status: 400 });
      }

      const isRestDay = Boolean(body.isRestDay);
      const nextOverrides = {
        ...current.overrides,
        [dateStr]: {
          date: dateStr,
          isRestDay,
          workoutId: !isRestDay && body.workoutId ? Number(body.workoutId) : null,
          programId: !isRestDay && body.programId ? Number(body.programId) : null,
          workoutName: isRestDay
            ? REST_DAY_LABEL
            : body.workoutName
              ? String(body.workoutName).trim()
              : null,
          programName: !isRestDay && body.programName ? String(body.programName).trim() : null,
          note: body.note !== undefined && body.note !== null && String(body.note).trim()
            ? String(body.note).trim()
            : null,
        },
      };

      const saved = await persistScheduleToStore(userId, {
        ...current,
        overrides: nextOverrides,
      });
      return NextResponse.json(saved);
    }

    if (action === 'clear_override') {
      const dateStr = String(body?.date || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: 'Geçerli tarih (YYYY-AA-GG) gereklidir' }, { status: 400 });
      }

      const nextOverrides = { ...current.overrides };
      delete nextOverrides[dateStr];

      const saved = await persistScheduleToStore(userId, {
        ...current,
        overrides: nextOverrides,
      });
      return NextResponse.json(saved);
    }

    // Default full schedule replacement
    const saved = await persistScheduleToStore(userId, {
      userId,
      weeklySchedule: body.weeklySchedule ?? current.weeklySchedule,
      overrides: body.overrides ?? current.overrides,
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('POST/PUT /api/workout-schedules error:', error);
    return NextResponse.json(
      { error: 'Antrenman takvimi kaydedilemedi' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleUpsert(request);
}

export async function PUT(request: Request) {
  return handleUpsert(request);
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = parsePositiveUserId(searchParams.get('userId'));
    const dateParam = searchParams.get('date');

    const auth = await authorizeScheduleRequest(request, requestedUserId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Geçerli bir kullanıcı ID gereklidir' }, { status: 400 });
    }

    const current = await loadScheduleFromStore(userId);
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const nextOverrides = { ...current.overrides };
      delete nextOverrides[dateParam];
      const saved = await persistScheduleToStore(userId, {
        ...current,
        overrides: nextOverrides,
      });
      return NextResponse.json(saved);
    }

    const reset = await persistScheduleToStore(userId, normalizeUserSchedule(null, userId));
    return NextResponse.json(reset);
  } catch (error) {
    console.error('DELETE /api/workout-schedules error:', error);
    return NextResponse.json(
      { error: 'Antrenman takvimi silinemedi' },
      { status: 500 }
    );
  }
}
