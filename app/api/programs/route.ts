import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  detachOrDeleteExercises,
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
    const requestedUserId = scoped.userId;

    let progQuery = supabase
      .from('programs')
      .select('*')
      .order('isPrimary', { ascending: false })
      .order('orderIndex', { ascending: true })
      .order('createdAt', { ascending: false });

    let [
      { data: programs, error: programsError },
      { data: allUserPrograms },
    ] = await Promise.all([
      progQuery,
      supabase
        .from('user_programs')
        .select('programId, userId, users (id, name, email)'),
    ]);

    if (programsError && /orderIndex/i.test(String(programsError.message || ''))) {
      const fallback = await supabase
        .from('programs')
        .select('*')
        .order('isPrimary', { ascending: false })
        .order('createdAt', { ascending: false });
      programs = fallback.data;
      programsError = fallback.error;
    }

    if (programsError) throw programsError;

    const userProgramsMap = new Map<number, Array<{ userId: number; userName: string }>>();
    (allUserPrograms || []).forEach((up: any) => {
      const pid = Number(up.programId);
      const uid = Number(up.userId);
      if (!Number.isFinite(pid) || !Number.isFinite(uid)) return;
      if (!userProgramsMap.has(pid)) userProgramsMap.set(pid, []);
      userProgramsMap.get(pid)!.push({
        userId: uid,
        userName: up.users?.name || up.users?.email || `Kullanıcı #${uid}`,
      });
    });

    const enriched = (programs || []).map((p: any) => {
      const assignments = userProgramsMap.get(Number(p.id)) || [];
      const matchingAssignment = requestedUserId
        ? assignments.find((a) => a.userId === requestedUserId)
        : assignments[0];
      return {
        ...p,
        userId: matchingAssignment ? matchingAssignment.userId : null,
        userName:
          assignments.length > 1
            ? assignments.map((a) => a.userName).join(', ')
            : matchingAssignment
              ? matchingAssignment.userName
              : null,
        assignedUserIds: assignments.map((a) => a.userId),
      };
    });

    if (requestedUserId) {
      const filtered = enriched.filter(
        (p: any) => p.assignedUserIds.includes(requestedUserId) || p.assignedUserIds.length === 0
      );
      return NextResponse.json(filtered, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(enriched, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error fetching programs:', error);
    return NextResponse.json({ error: 'Failed to fetch programs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();

    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = parsePositiveInt(body.id);
      if (!numericId) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      await supabase.from('user_programs').delete().eq('programId', numericId);

      const { data: days } = await supabase.from('program_days').select('id').eq('programId', numericId);
      const dayIds = (days || []).map((d: any) => Number(d.id));

      let exQuery = supabase.from('exercises').select('id');
      if (dayIds.length > 0) {
        exQuery = exQuery.or(`programId.eq.${numericId},dayId.in.(${dayIds.join(',')})`);
      } else {
        exQuery = exQuery.eq('programId', numericId);
      }
      const { data: exRows } = await exQuery;
      await detachOrDeleteExercises((exRows || []).map((e: any) => Number(e.id)));

      await supabase.from('program_days').delete().eq('programId', numericId);

      const { data: delData, error: delError } = await supabase
        .from('programs')
        .delete()
        .eq('id', numericId)
        .select();

      if (delError) throw delError;

      return NextResponse.json(
        { success: true, deleted: delData?.length || 0 },
        { headers: NO_STORE_HEADERS }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const isPrimary = Boolean(body.isPrimary);
    const parsedUserId = body.userId ? parsePositiveInt(body.userId) : null;
    if (!name) {
      return NextResponse.json({ error: 'Program adı gereklidir' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('programs')
      .insert([{ name, isPrimary }])
      .select()
      .single();

    if (error) throw error;

    if (isPrimary && data?.id) {
      await supabase.from('programs').update({ isPrimary: false }).neq('id', data.id);
    }

    if (parsedUserId && data?.id) {
      await supabase
        .from('user_programs')
        .insert([{ userId: parsedUserId, programId: data.id, isActive: true }]);
    }

    return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error in programs POST:', error);
    return NextResponse.json(
      { error: 'Failed to process program: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
