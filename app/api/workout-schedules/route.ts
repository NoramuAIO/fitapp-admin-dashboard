import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  isValidYmdDate,
  parseNonNegativeInt,
  parsePositiveInt,
  requireApiAuth,
  resolveScopedUserId,
} from '@/lib/apiAuth';
import {
  REST_DAY_LABEL,
  UserWorkoutSchedule,
  normalizeUserSchedule,
} from '@/lib/workoutSchedule';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const SCHEDULE_WIDGET_TYPE = 'workout_schedule_data';
const inMemorySchedules = new Map<number, UserWorkoutSchedule>();

function isMissingScheduleTableError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    /could not find the table|relation .* does not exist/i.test(message)
  );
}

async function enrichScheduleNames(schedule: UserWorkoutSchedule): Promise<UserWorkoutSchedule> {
  try {
    const workoutIds = new Set<number>();
    const programIds = new Set<number>();

    for (const day of schedule.weeklySchedule || []) {
      for (const w of day.workouts || []) {
        if (w.workoutId) workoutIds.add(Number(w.workoutId));
        if (w.programId) programIds.add(Number(w.programId));
      }
    }
    for (const ov of Object.values(schedule.overrides || {})) {
      if (!ov.isRestDay) {
        if (ov.workoutId) workoutIds.add(Number(ov.workoutId));
        if (ov.programId) programIds.add(Number(ov.programId));
      }
    }

    if (workoutIds.size === 0 && programIds.size === 0) return schedule;

    const [{ data: daysData }, { data: progsData }] = await Promise.all([
      workoutIds.size > 0
        ? supabase.from('program_days').select('id, name, dayName, programId').in('id', Array.from(workoutIds))
        : Promise.resolve({ data: [] as any[] }),
      programIds.size > 0
        ? supabase.from('programs').select('id, name').in('id', Array.from(programIds))
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const dayMap = new Map<number, { name: string; programId?: number }>();
    for (const d of daysData || []) {
      const resolved = String(d.name || d.dayName || '').trim();
      if (resolved) dayMap.set(Number(d.id), { name: resolved, programId: d.programId });
    }
    const progMap = new Map<number, string>();
    for (const p of progsData || []) {
      const resolved = String(p.name || '').trim();
      if (resolved) progMap.set(Number(p.id), resolved);
    }

    const weeklySchedule = schedule.weeklySchedule.map((day) => ({
      ...day,
      workouts: day.workouts.map((w) => {
        const liveDay = w.workoutId ? dayMap.get(Number(w.workoutId)) : undefined;
        const pid = w.programId ?? liveDay?.programId ?? null;
        const liveProgName = pid ? progMap.get(Number(pid)) : undefined;
        return {
          ...w,
          workoutName: liveDay?.name || w.workoutName,
          programId: pid,
          programName: liveProgName || w.programName || null,
        };
      }),
    }));

    const overrides: Record<string, any> = {};
    for (const [k, ov] of Object.entries(schedule.overrides || {})) {
      if (ov.isRestDay) {
        overrides[k] = ov;
        continue;
      }
      const liveDay = ov.workoutId ? dayMap.get(Number(ov.workoutId)) : undefined;
      const pid = ov.programId ?? liveDay?.programId ?? null;
      const liveProgName = pid ? progMap.get(Number(pid)) : undefined;
      overrides[k] = {
        ...ov,
        workoutName: liveDay?.name || ov.workoutName || null,
        programId: pid,
        programName: liveProgName || ov.programName || null,
      };
    }

    return { ...schedule, weeklySchedule, overrides };
  } catch {
    return schedule;
  }
}

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
  const guard = await requireApiAuth(request);
  if (!guard.ok) {
    const body = await guard.response.clone().json().catch(() => ({}));
    return {
      ok: false,
      status: guard.response.status,
      error: body?.error || 'Yetkisiz erişim',
    };
  }

  const scoped = resolveScopedUserId(guard.auth, requestedUserId);
  if (!scoped.ok) {
    const body = await scoped.response.clone().json().catch(() => ({}));
    return {
      ok: false,
      status: scoped.response.status,
      error: body?.error || 'Erişim reddedildi',
    };
  }

  return { ok: true, userId: scoped.userId };
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
      const normalized = await enrichScheduleNames(normalizeUserSchedule(data, userId));
      inMemorySchedules.set(userId, normalized);
      return normalized;
    }
    if (error && !isMissingScheduleTableError(error)) {
      console.warn('workout_schedules table read warning:', error);
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
      const normalized = await enrichScheduleNames(normalizeUserSchedule(parsed, userId));
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
          const result = await enrichScheduleNames(normalizeUserSchedule(updated, userId));
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
          const result = await enrichScheduleNames(normalizeUserSchedule(inserted, userId));
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
      const dow = parseNonNegativeInt(body.dayOfWeek);
      if (dow === null || dow > 6) {
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
      return NextResponse.json(saved, { headers: NO_STORE_HEADERS });
    }

    if (action === 'set_override') {
      const dateStr = String(body?.date || '').trim();
      if (!isValidYmdDate(dateStr)) {
        return NextResponse.json({ error: 'Geçerli tarih (YYYY-AA-GG) gereklidir' }, { status: 400 });
      }

      const isRestDay = Boolean(body.isRestDay);
      const nextOverrides = {
        ...current.overrides,
        [dateStr]: {
          date: dateStr,
          isRestDay,
          workoutId: !isRestDay ? parsePositiveInt(body.workoutId) : null,
          programId: !isRestDay ? parsePositiveInt(body.programId) : null,
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
      return NextResponse.json(saved, { headers: NO_STORE_HEADERS });
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
      return NextResponse.json(saved, { headers: NO_STORE_HEADERS });
    }

    // Default full schedule replacement
    const saved = await persistScheduleToStore(userId, {
      userId,
      weeklySchedule: body.weeklySchedule ?? current.weeklySchedule,
      overrides: body.overrides ?? current.overrides,
    });
    return NextResponse.json(saved, { headers: NO_STORE_HEADERS });
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
      return NextResponse.json(saved, { headers: NO_STORE_HEADERS });
    }

    const reset = await persistScheduleToStore(userId, normalizeUserSchedule(null, userId));
    return NextResponse.json(reset, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('DELETE /api/workout-schedules error:', error);
    return NextResponse.json(
      { error: 'Antrenman takvimi silinemedi' },
      { status: 500 }
    );
  }
}
