import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export interface CustomWidget {
  id: number;
  title: string;
  widget_type: 'countdown' | 'custom_text' | 'weight_goal';
  target_time?: string | null;
  custom_content?: string | null;
  is_active: boolean;
  display_order: number;
  createdAt?: string;
}

// Fallback in-memory store in case table hasn't been created in Supabase SQL editor yet
let fallbackWidgets: CustomWidget[] = [
  {
    id: 1,
    title: '⏱️ Antrenmana Ne Kadar Kaldı?',
    widget_type: 'countdown',
    target_time: '18:00:00', // Today at 18:00
    custom_content: 'Günün antrenmanı seni bekliyor!',
    is_active: true,
    display_order: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: '💬 Günün Motivasyon Sözü',
    widget_type: 'custom_text',
    target_time: null,
    custom_content: '«Disiplin; ne istediğin ile şu an ne istediğin arasındaki bilinçli tercihtir.»',
    is_active: true,
    display_order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: '🎯 Kilo Hedefi Takibi',
    widget_type: 'weight_goal',
    target_time: null,
    custom_content: 'Hedefe giden yolda kararlı adımlarla ilerle!',
    is_active: true,
    display_order: 3,
    createdAt: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';

    let query = supabase
      .from('custom_widgets')
      .select('*')
      .order('display_order', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error || !data) {
      const filtered = onlyActive ? fallbackWidgets.filter((w) => w.is_active) : fallbackWidgets;
      return NextResponse.json(filtered);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(fallbackWidgets);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, widget_type, target_time, custom_content, is_active, display_order } = body;

    if (!title || !widget_type) {
      return NextResponse.json({ error: 'Title and widget_type are required' }, { status: 400 });
    }

    const newWidget: CustomWidget = {
      id: Date.now(),
      title,
      widget_type,
      target_time: target_time || null,
      custom_content: custom_content || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      display_order: display_order !== undefined ? Number(display_order) : fallbackWidgets.length + 1,
      createdAt: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('custom_widgets')
        .insert([newWidget])
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data, { status: 201 });
      }
    } catch {}

    fallbackWidgets.push(newWidget);
    fallbackWidgets.sort((a, b) => a.display_order - b.display_order);
    return NextResponse.json(newWidget, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create widget: ' + (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
    }

    try {
      const { data, error } = await supabase
        .from('custom_widgets')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json(data);
      }
    } catch {}

    const idx = fallbackWidgets.findIndex((w) => w.id === Number(id));
    if (idx !== -1) {
      fallbackWidgets[idx] = { ...fallbackWidgets[idx], ...updates };
      fallbackWidgets.sort((a, b) => a.display_order - b.display_order);
      return NextResponse.json(fallbackWidgets[idx]);
    }

    return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update widget' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
      await supabase.from('custom_widgets').delete().eq('id', id);
    } catch {}

    fallbackWidgets = fallbackWidgets.filter((w) => w.id !== Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
