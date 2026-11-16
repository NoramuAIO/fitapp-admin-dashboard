import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { parseNonNegativeInt, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';
import { DEFAULT_ATHLETE_RANKS } from '@/lib/fitnessCalculations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

interface AthleteRank {
  id: number;
  title: string;
  icon: string;
  color: string;
  min_volume_kg: number;
  max_volume_kg: number;
  description: string;
}

function mapRankRow(item: any): AthleteRank {
  let meta = { icon: '⚡', color: '#5DD97C' };
  let content = { min_volume_kg: 0, max_volume_kg: 1000, description: '' };
  try {
    if (item.target_time) meta = JSON.parse(item.target_time);
  } catch {}
  try {
    if (item.custom_content) content = JSON.parse(item.custom_content);
  } catch {}

  return {
    id: item.id,
    title: item.title,
    icon: meta.icon || '⚡',
    color: meta.color || '#5DD97C',
    min_volume_kg: Number(content.min_volume_kg) || 0,
    max_volume_kg: Number(content.max_volume_kg) || 1000,
    description: content.description || '',
  };
}

let seedInFlight: Promise<AthleteRank[]> | null = null;

async function ensureSeededRanks(): Promise<AthleteRank[]> {
  if (!seedInFlight) {
    seedInFlight = (async () => {
      const { data: recheck } = await supabase
        .from('custom_widgets')
        .select('*')
        .eq('widget_type', 'athlete_rank')
        .order('display_order', { ascending: true });
      if (recheck && recheck.length > 0) {
        return recheck.map(mapRankRow).sort((a, b) => a.min_volume_kg - b.min_volume_kg);
      }
      const seedRows = DEFAULT_ATHLETE_RANKS.map((r, i) => ({
        title: r.title,
        widget_type: 'athlete_rank',
        target_time: JSON.stringify({ icon: r.icon, color: r.color }),
        custom_content: JSON.stringify({
          min_volume_kg: r.min_volume_kg,
          max_volume_kg: r.max_volume_kg,
          description: r.description,
        }),
        is_active: true,
        display_order: i + 1,
      }));
      const { data: seeded, error } = await supabase.from('custom_widgets').insert(seedRows).select();
      if (error) throw error;
      return (seeded || []).map(mapRankRow).sort((a, b) => a.min_volume_kg - b.min_volume_kg);
    })().finally(() => {
      seedInFlight = null;
    });
  }
  return seedInFlight;
}

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { data, error } = await supabase
      .from('custom_widgets')
      .select('*')
      .eq('widget_type', 'athlete_rank')
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      const parsedRanks = data.map(mapRankRow).sort((a, b) => a.min_volume_kg - b.min_volume_kg);
      return NextResponse.json(parsedRanks, { headers: NO_STORE_HEADERS });
    }

    const seeded = await ensureSeededRanks();
    return NextResponse.json(seeded, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('Error fetching athlete ranks:', err);
    return NextResponse.json(
      { error: 'Seviyeler alınamadı' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
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
      const { data: delData, error } = await supabase
        .from('custom_widgets')
        .delete()
        .eq('id', numericId)
        .eq('widget_type', 'athlete_rank')
        .select('id');

      if (error) throw error;
      if (!delData || delData.length === 0) {
        return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deletedId: numericId }, { headers: NO_STORE_HEADERS });
    }

    if (body.action === 'reset_defaults') {
      const { error: clearErr } = await supabase
        .from('custom_widgets')
        .delete()
        .eq('widget_type', 'athlete_rank');
      if (clearErr) throw clearErr;

      const seedRows = DEFAULT_ATHLETE_RANKS.map((r, i) => ({
        title: r.title,
        widget_type: 'athlete_rank',
        target_time: JSON.stringify({ icon: r.icon, color: r.color }),
        custom_content: JSON.stringify({
          min_volume_kg: r.min_volume_kg,
          max_volume_kg: r.max_volume_kg,
          description: r.description,
        }),
        is_active: true,
        display_order: i + 1,
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from('custom_widgets')
        .insert(seedRows)
        .select();
      if (insertErr) throw insertErr;

      return NextResponse.json(
        (inserted || []).map(mapRankRow).sort((a, b) => a.min_volume_kg - b.min_volume_kg),
        { headers: NO_STORE_HEADERS }
      );
    }

    const { title, icon, color, min_volume_kg, max_volume_kg, description } = body;
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const minVol = parseNonNegativeInt(min_volume_kg) ?? 0;
    const maxVol = parsePositiveInt(max_volume_kg);

    if (!cleanTitle || !maxVol || maxVol <= minVol) {
      return NextResponse.json(
        { error: 'Geçerli başlık ve max_volume_kg > min_volume_kg gereklidir' },
        { status: 400 }
      );
    }

    const payload = {
      title: cleanTitle,
      widget_type: 'athlete_rank',
      target_time: JSON.stringify({ icon: icon || '⚡', color: color || '#5DD97C' }),
      custom_content: JSON.stringify({
        min_volume_kg: minVol,
        max_volume_kg: maxVol,
        description: description || '',
      }),
      is_active: true,
      display_order: minVol,
    };

    const { data, error } = await supabase
      .from('custom_widgets')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(mapRankRow(data), { status: 201, headers: NO_STORE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { id, title, icon, color, min_volume_kg, max_volume_kg, description } = body;

    const numericId = parsePositiveInt(id);
    if (!numericId) return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    const minVol = parseNonNegativeInt(min_volume_kg) ?? 0;
    const maxVol = parsePositiveInt(max_volume_kg);
    if (!cleanTitle || !maxVol || maxVol <= minVol) {
      return NextResponse.json(
        { error: 'Geçerli başlık ve max_volume_kg > min_volume_kg gereklidir' },
        { status: 400 }
      );
    }

    const updatePayload = {
      title: cleanTitle,
      target_time: JSON.stringify({ icon: icon || '⚡', color: color || '#5DD97C' }),
      custom_content: JSON.stringify({
        min_volume_kg: minVol,
        max_volume_kg: maxVol,
        description: description || '',
      }),
      display_order: minVol,
    };

    const { data, error } = await supabase
      .from('custom_widgets')
      .update(updatePayload)
      .eq('id', numericId)
      .eq('widget_type', 'athlete_rank')
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
    }

    return NextResponse.json(mapRankRow(data), { headers: NO_STORE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    const numericId = parsePositiveInt(id);
    if (!numericId) return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('custom_widgets')
      .delete()
      .eq('id', numericId)
      .eq('widget_type', 'athlete_rank')
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
