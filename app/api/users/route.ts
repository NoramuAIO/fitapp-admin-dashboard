import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { isValidEmail, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';
import { isRealWorkoutSession } from '@/lib/fitnessCalculations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

async function deleteUserCascade(numericId: number) {
  await Promise.allSettled([
    supabase.from('exercise_completions').delete().eq('userId', numericId),
    supabase.from('workout_sessions').delete().eq('userId', numericId),
    supabase.from('user_programs').delete().eq('userId', numericId),
    supabase.from('goals').delete().eq('userId', numericId),
    supabase.from('weight_logs').delete().eq('userId', numericId),
    supabase.from('body_fat_logs').delete().eq('userId', numericId),
    supabase.from('workout_schedules').delete().eq('userId', numericId),
    supabase.from('activity_stats').delete().eq('userId', numericId),
    supabase.from('custom_widgets').delete().like('custom_content', `[USER:${numericId}]%`),
    supabase
      .from('custom_widgets')
      .delete()
      .eq('widget_type', 'workout_schedule_data')
      .eq('title', `SCHEDULE_USER_${numericId}`),
  ]);

  const { error } = await supabase.from('users').delete().eq('id', numericId);
  if (error) throw error;
}

// Get all users (admin-only; never expose password hashes or plaintext passwords)
export async function GET(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const lite = searchParams.get('lite') === '1';

    if (lite) {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, createdAt')
        .order('id', { ascending: false });

      if (error) throw error;

      const liteUsers = (users || []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        created_at: user.createdAt,
        total_workouts: 0,
        total_programs: 0,
      }));

      return NextResponse.json(liteUsers, { headers: NO_STORE_HEADERS });
    }

    const [
      { data: users, error },
      { data: sessions },
      { data: userPrograms },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, name, email, createdAt')
        .order('id', { ascending: false }),
      supabase
        .from('workout_sessions')
        .select('userId, category, duration, programId')
        .limit(10000),
      supabase
        .from('user_programs')
        .select('userId, programId')
        .limit(10000),
    ]);

    if (error) throw error;

    const workoutCountByUser = new Map<number, number>();
    for (const row of sessions || []) {
      if (!isRealWorkoutSession(row)) continue;
      const uid = Number(row.userId);
      if (Number.isFinite(uid) && uid > 0) {
        workoutCountByUser.set(uid, (workoutCountByUser.get(uid) || 0) + 1);
      }
    }

    const programSetByUser = new Map<number, Set<number>>();
    for (const row of userPrograms || []) {
      const uid = Number(row.userId);
      const pid = Number(row.programId);
      if (Number.isFinite(uid) && uid > 0 && Number.isFinite(pid) && pid > 0) {
        if (!programSetByUser.has(uid)) programSetByUser.set(uid, new Set());
        programSetByUser.get(uid)!.add(pid);
      }
    }

    const usersWithStats = (users || []).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      created_at: user.createdAt,
      total_workouts: workoutCountByUser.get(Number(user.id)) || 0,
      total_programs: programSetByUser.get(Number(user.id))?.size || 0,
    }));

    return NextResponse.json(usersWithStats, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Kullanıcılar alınamadı' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// Delete user with safe cascading cleanup
export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const numericId = parsePositiveInt(searchParams.get('id'));
    if (!numericId) {
      return NextResponse.json({ error: 'Geçerli kullanıcı ID gereklidir' }, { status: 400 });
    }

    await deleteUserCascade(numericId);
    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Kullanıcı silinemedi' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

// POST support for environments where DELETE method is restricted
export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    if (body.action === 'delete') {
      const numericId = parsePositiveInt(body.id);
      if (!numericId) {
        return NextResponse.json({ error: 'Geçerli kullanıcı ID gereklidir' }, { status: 400 });
      }

      await deleteUserCascade(numericId);
      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    }

    if (body.email && body.name) {
      const cleanName = String(body.name).trim();
      const cleanEmail = String(body.email).trim().toLowerCase();
      const rawPassword = typeof body.password === 'string' ? body.password : '';
      if (!cleanName || !isValidEmail(cleanEmail) || rawPassword.length < 8) {
        return NextResponse.json(
          { error: 'Geçerli isim, email ve en az 8 karakterli şifre zorunludur' },
          { status: 400 }
        );
      }

      const hashedPassword = await hashPassword(rawPassword);

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert([{
          name: cleanName,
          email: cleanEmail,
          password: hashedPassword,
          createdAt: new Date().toISOString(),
        }])
        .select('id, name, email, createdAt')
        .single();

      if (createError) {
        if (createError.code === '23505') {
          return NextResponse.json({ error: 'Bu email zaten kayıtlı' }, { status: 409 });
        }
        throw createError;
      }

      return NextResponse.json(
        {
          id: created.id,
          name: created.name,
          email: created.email,
          createdAt: created.createdAt,
        },
        { status: 201, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('Error in user POST:', error);
    return NextResponse.json(
      { error: 'Kullanıcı işlemi başarısız' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
