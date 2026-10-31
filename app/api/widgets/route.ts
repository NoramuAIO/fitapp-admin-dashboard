import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    if (!error && data && data.length > 0) {
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const filtered = onlyActive ? fallbackWidgets.filter((w) => w.is_active) : fallbackWidgets;
    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (e) {
    console.error('GET widgets error:', e);
    return NextResponse.json(fallbackWidgets, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, widget_type, target_time, custom_content, is_active, display_order } = body;

    if (!title || !widget_type) {
      return NextResponse.json({ error: 'Title and widget_type are required' }, { status: 400 });
    }

    const insertPayload = {
      title,
      widget_type,
      target_time: target_time || null,
      custom_content: custom_content || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      display_order: display_order !== undefined ? Number(display_order) : fallbackWidgets.length + 1,
    };

    try {
      const { data, error } = await supabase
        .from('custom_widgets')
        .insert([insertPayload])
        .select()
        .single();

      if (!error && data) {
        fallbackWidgets.push(data);
        return NextResponse.json(data, { status: 201 });
      }
      if (error) {
        console.error('Supabase POST widget error:', error);
      }
    } catch (err) {
      console.error('Supabase POST widget exception:', err);
    }

    const newWidget: CustomWidget = {
      id: Date.now(),
      ...insertPayload,
      createdAt: new Date().toISOString(),
    };
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

    const numericId = Number(id);

    const updateData: Record<string, any> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.widget_type !== undefined) updateData.widget_type = updates.widget_type;
    if (updates.target_time !== undefined) updateData.target_time = updates.target_time;
    if (updates.custom_content !== undefined) updateData.custom_content = updates.custom_content;
    if (updates.is_active !== undefined) updateData.is_active = Boolean(updates.is_active);
    if (updates.display_order !== undefined) updateData.display_order = Number(updates.display_order);

    try {
      const { data, error } = await supabase
        .from('custom_widgets')
        .update(updateData)
        .eq('id', numericId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Supabase PUT widget error:', error);
      } else if (data) {
        const idx = fallbackWidgets.findIndex((w) => w.id === numericId);
        if (idx !== -1) {
          fallbackWidgets[idx] = { ...fallbackWidgets[idx], ...data };
        }
        return NextResponse.json(data);
      }
    } catch (err) {
      console.error('Supabase PUT widget exception:', err);
    }

    const idx = fallbackWidgets.findIndex((w) => w.id === numericId);
    if (idx !== -1) {
      fallbackWidgets[idx] = { ...fallbackWidgets[idx], ...updateData };
      fallbackWidgets.sort((a, b) => a.display_order - b.display_order);
      return NextResponse.json(fallbackWidgets[idx]);
    }

    return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update widget: ' + (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const numericId = Number(id);

    try {
      await supabase.from('custom_widgets').delete().eq('id', numericId);
    } catch (err) {
      console.error('Supabase DELETE widget error:', err);
    }

    fallbackWidgets = fallbackWidgets.filter((w) => w.id !== numericId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
