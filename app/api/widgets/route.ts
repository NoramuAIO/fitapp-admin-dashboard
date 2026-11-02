import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CustomWidget {
  id: number;
  title: string;
  widget_type: 'countdown' | 'custom_text' | 'weight_goal';
  target_time?: string | null;
  custom_content?: string | null;
  userId?: number | null;
  is_active: boolean;
  display_order: number;
  createdAt?: string;
}

// Helper to parse userId and clean content
function parseWidgetUser(item: any): CustomWidget {
  let rawContent = item.custom_content || '';
  let userId: number | null = null;
  if (rawContent.startsWith('[USER:')) {
    const match = rawContent.match(/^\[USER:([0-9]+)\]\s*([\s\S]*)$/);
    if (match) {
      userId = parseInt(match[1], 10);
      rawContent = match[2];
    }
  }
  return {
    ...item,
    userId,
    custom_content: rawContent,
  };
}

// Fallback in-memory store in case table hasn't been created in Supabase SQL editor yet
let fallbackWidgets: CustomWidget[] = [
  {
    id: 1,
    title: '⏱️ Antrenmana Ne Kadar Kaldı?',
    widget_type: 'countdown',
    target_time: '18:00:00', // Today at 18:00
    custom_content: 'Günün antrenmanı seni bekliyor!',
    userId: null,
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
    userId: null,
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
    userId: null,
    is_active: true,
    display_order: 3,
    createdAt: new Date().toISOString(),
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';
    const targetUserId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!, 10) : null;

    let query = supabase
      .from('custom_widgets')
      .select('*')
      .neq('widget_type', 'athlete_rank')
      .order('display_order', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    let rawList: any[] = [];
    if (!error && data) {
      rawList = data;
    } else {
      rawList = fallbackWidgets.filter(w => w.widget_type !== ('athlete_rank' as any));
      if (onlyActive) rawList = rawList.filter(w => w.is_active);
    }

    // Parse userId and clean content
    let parsedList: CustomWidget[] = rawList.map(parseWidgetUser);

    // Filter by user if userId param provided: return widgets meant for this user + global ones (userId == null)
    if (targetUserId !== null && !isNaN(targetUserId)) {
      parsedList = parsedList.filter(w => w.userId === targetUserId || w.userId === null);
    }

    return NextResponse.json(parsedList, {
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
    const { title, widget_type, target_time, custom_content, is_active, display_order, userId } = body;

    if (!title || !widget_type) {
      return NextResponse.json({ error: 'Title and widget_type are required' }, { status: 400 });
    }

    const cleanUserId = userId ? parseInt(String(userId), 10) : null;
    const finalContent = cleanUserId
      ? `[USER:${cleanUserId}] ${custom_content || ''}`
      : (custom_content || null);

    const insertPayload = {
      title,
      widget_type,
      target_time: target_time || null,
      custom_content: finalContent,
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
        const parsed = parseWidgetUser(data);
        fallbackWidgets.push(parsed);
        return NextResponse.json(parsed, { status: 201 });
      }
      if (error) {
        console.error('Supabase POST widget error:', error);
      }
    } catch (err) {
      console.error('Supabase POST widget exception:', err);
    }

    const newWidget: CustomWidget = {
      id: Date.now(),
      title,
      widget_type,
      target_time: target_time || null,
      custom_content: custom_content || null,
      userId: cleanUserId,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      display_order: display_order !== undefined ? Number(display_order) : fallbackWidgets.length + 1,
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
    const { id, userId, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Widget ID is required' }, { status: 400 });
    }

    const numericId = Number(id);
    const cleanUserId = userId !== undefined ? (userId ? parseInt(String(userId), 10) : null) : undefined;

    const updateData: Record<string, any> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.widget_type !== undefined) updateData.widget_type = updates.widget_type;
    if (updates.target_time !== undefined) updateData.target_time = updates.target_time;
    if (updates.is_active !== undefined) updateData.is_active = Boolean(updates.is_active);
    if (updates.display_order !== undefined) updateData.display_order = Number(updates.display_order);

    if (updates.custom_content !== undefined || cleanUserId !== undefined) {
      const baseContent = updates.custom_content !== undefined ? updates.custom_content : '';
      if (cleanUserId) {
        updateData.custom_content = `[USER:${cleanUserId}] ${baseContent}`;
      } else {
        updateData.custom_content = baseContent;
      }
    }

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
        const parsed = parseWidgetUser(data);
        const idx = fallbackWidgets.findIndex((w) => w.id === numericId);
        if (idx !== -1) {
          fallbackWidgets[idx] = { ...fallbackWidgets[idx], ...parsed };
        }
        return NextResponse.json(parsed);
      }
    } catch (err) {
      console.error('Supabase PUT widget exception:', err);
    }

    const idx = fallbackWidgets.findIndex((w) => w.id === numericId);
    if (idx !== -1) {
      fallbackWidgets[idx] = {
        ...fallbackWidgets[idx],
        ...updateData,
        userId: cleanUserId !== undefined ? cleanUserId : fallbackWidgets[idx].userId,
        custom_content: updates.custom_content !== undefined ? updates.custom_content : fallbackWidgets[idx].custom_content,
      };
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
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const numericId = Number(id);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { error: dbError } = await supabase.from('custom_widgets').delete().eq('id', numericId);
    if (dbError) {
      console.error('Supabase DELETE widget error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    fallbackWidgets = fallbackWidgets.filter((w) => w.id !== numericId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
