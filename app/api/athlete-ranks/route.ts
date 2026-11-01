import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface AthleteRank {
  id: number;
  title: string;
  icon: string;
  color: string;
  min_volume_kg: number;
  max_volume_kg: number;
  description: string;
}

export const DEFAULT_RANKS: AthleteRank[] = [
  {
    id: 1,
    title: 'Demir Çırağı',
    icon: '⚡',
    color: '#5DD97C',
    min_volume_kg: 0,
    max_volume_kg: 300,
    description: 'İlk antrenmanlarını yapan hevesli sporcu'
  },
  {
    id: 2,
    title: 'Bronz Kaldırıcı',
    icon: '🥉',
    color: '#FF6B4A',
    min_volume_kg: 300,
    max_volume_kg: 1000,
    description: 'Temel hareketlerde düzenli efor gösteren sporcu'
  },
  {
    id: 3,
    title: 'Gümüş Güç',
    icon: '🥈',
    color: '#9B6FFF',
    min_volume_kg: 1000,
    max_volume_kg: 2500,
    description: 'Disiplinli çalışan ve kuvvetlenen sporcu'
  },
  {
    id: 4,
    title: 'Altın Titan',
    icon: '🥇',
    color: '#F59E0B',
    min_volume_kg: 2500,
    max_volume_kg: 5000,
    description: 'Salonda iz bırakan ağır ve kararlı kaldırıcı'
  },
  {
    id: 5,
    title: 'Platin Gladyatör',
    icon: '💎',
    color: '#4ECDC4',
    min_volume_kg: 5000,
    max_volume_kg: 10000,
    description: 'Gelişmiş kuvvet, kondisyon ve kas hakimiyeti'
  },
  {
    id: 6,
    title: 'Elit Şampiyon',
    icon: '🔥',
    color: '#FF6B9D',
    min_volume_kg: 10000,
    max_volume_kg: 20000,
    description: 'Zirveye oynayan profesyonel sporcu'
  },
  {
    id: 7,
    title: 'Efsanevi Titan',
    icon: '🏆',
    color: '#FFD700',
    min_volume_kg: 20000,
    max_volume_kg: 50000,
    description: 'Efsaneleşmiş demir büken usta'
  }
];

let inMemoryRanks: AthleteRank[] = [...DEFAULT_RANKS];

// GET: Return ordered list of athlete levels
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('custom_widgets')
      .select('*')
      .eq('widget_type', 'athlete_rank')
      .order('display_order', { ascending: true });

    if (!error && data && data.length > 0) {
      const parsedRanks: AthleteRank[] = data.map((item) => {
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
          min_volume_kg: content.min_volume_kg || 0,
          max_volume_kg: content.max_volume_kg || 1000,
          description: content.description || '',
        };
      }).sort((a, b) => a.min_volume_kg - b.min_volume_kg);

      return NextResponse.json(parsedRanks);
    }

    return NextResponse.json(inMemoryRanks);
  } catch (err) {
    console.error('Error fetching athlete ranks:', err);
    return NextResponse.json(inMemoryRanks);
  }
}

// POST: Add new rank or reset defaults
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Reset defaults action
    if (body.action === 'reset_defaults') {
      try {
        await supabase.from('custom_widgets').delete().eq('widget_type', 'athlete_rank');
        for (let i = 0; i < DEFAULT_RANKS.length; i++) {
          const r = DEFAULT_RANKS[i];
          await supabase.from('custom_widgets').insert([{
            title: r.title,
            widget_type: 'athlete_rank',
            target_time: JSON.stringify({ icon: r.icon, color: r.color }),
            custom_content: JSON.stringify({ min_volume_kg: r.min_volume_kg, max_volume_kg: r.max_volume_kg, description: r.description }),
            is_active: true,
            display_order: i + 1,
          }]);
        }
      } catch {}
      inMemoryRanks = [...DEFAULT_RANKS];
      return NextResponse.json(DEFAULT_RANKS);
    }

    const { title, icon, color, min_volume_kg, max_volume_kg, description } = body;

    const payload = {
      title: title || 'Yeni Seviye',
      widget_type: 'athlete_rank',
      target_time: JSON.stringify({ icon: icon || '⚡', color: color || '#5DD97C' }),
      custom_content: JSON.stringify({
        min_volume_kg: Number(min_volume_kg) || 0,
        max_volume_kg: Number(max_volume_kg) || 1000,
        description: description || '',
      }),
      is_active: true,
      display_order: Number(min_volume_kg) || 1,
    };

    const { data, error } = await supabase
      .from('custom_widgets')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({
        id: data.id,
        title: data.title,
        icon: icon || '⚡',
        color: color || '#5DD97C',
        min_volume_kg: Number(min_volume_kg) || 0,
        max_volume_kg: Number(max_volume_kg) || 1000,
        description: description || '',
      }, { status: 201 });
    }

    const newRank: AthleteRank = {
      id: Date.now(),
      title,
      icon: icon || '⚡',
      color: color || '#5DD97C',
      min_volume_kg: Number(min_volume_kg) || 0,
      max_volume_kg: Number(max_volume_kg) || 1000,
      description: description || '',
    };
    inMemoryRanks.push(newRank);
    inMemoryRanks.sort((a, b) => a.min_volume_kg - b.min_volume_kg);
    return NextResponse.json(newRank, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT: Update rank
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, icon, color, min_volume_kg, max_volume_kg, description } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updatePayload = {
      title,
      target_time: JSON.stringify({ icon, color }),
      custom_content: JSON.stringify({
        min_volume_kg: Number(min_volume_kg) || 0,
        max_volume_kg: Number(max_volume_kg) || 1000,
        description: description || '',
      }),
      display_order: Number(min_volume_kg) || 1,
    };

    const { data, error } = await supabase
      .from('custom_widgets')
      .update(updatePayload)
      .eq('id', Number(id))
      .select()
      .maybeSingle();

    if (!error && data) {
      return NextResponse.json({
        id: data.id,
        title: data.title,
        icon,
        color,
        min_volume_kg: Number(min_volume_kg) || 0,
        max_volume_kg: Number(max_volume_kg) || 1000,
        description: description || '',
      });
    }

    const idx = inMemoryRanks.findIndex(r => r.id === Number(id));
    if (idx !== -1) {
      inMemoryRanks[idx] = { id: Number(id), title, icon, color, min_volume_kg: Number(min_volume_kg), max_volume_kg: Number(max_volume_kg), description };
      inMemoryRanks.sort((a, b) => a.min_volume_kg - b.min_volume_kg);
      return NextResponse.json(inMemoryRanks[idx]);
    }

    return NextResponse.json({ error: 'Rank not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE: Delete rank
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await supabase.from('custom_widgets').delete().eq('id', Number(id));
    inMemoryRanks = inMemoryRanks.filter(r => r.id !== Number(id));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
