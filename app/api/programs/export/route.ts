import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function GET(request: NextRequest) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const programId = parsePositiveInt(searchParams.get('programId'));
    if (!programId) {
      return NextResponse.json({ error: 'Valid programId is required' }, { status: 400 });
    }

    const { data: program, error: progErr } = await supabase
      .from('programs')
      .select('*')
      .eq('id', programId)
      .maybeSingle();

    if (progErr) throw progErr;
    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const { data: days, error: daysErr } = await supabase
      .from('program_days')
      .select('*, exercises(*)')
      .eq('programId', programId)
      .order('orderIndex', { ascending: true });

    if (daysErr) throw daysErr;

    const daysWithExercises = (days || []).map((day: any) => ({
      ...day,
      dayName: day.dayName || day.name,
      exercises: (day.exercises || [])
        .filter((e: any) => Number(e.orderIndex) !== -1)
        .sort((a: any, b: any) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
    }));

    return NextResponse.json(
      { ...program, days: daysWithExercises },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error exporting program:', error);
    return NextResponse.json({ error: 'Failed to export program' }, { status: 500 });
  }
}
