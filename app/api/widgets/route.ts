import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import {
  parsePositiveInt,
  requireApiAuth,
  resolveScopedUserId,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const ALLOWED_WIDGET_TYPES = new Set([
  'countdown',
  'custom_text',
  'weight_goal',
  'special_day',
  'workout_schedule',
]);

interface CustomWidget {
  id: number;
  title: string;
  widget_type: 'countdown' | 'custom_text' | 'weight_goal' | 'special_day' | 'workout_schedule';
  target_time?: string | null;
  custom_content?: string | null;
  userId?: number | null;
  is_active: boolean;
  display_order: number;
  createdAt?: string;
}

function parseWidgetUser(item: any): CustomWidget {
  let rawContent = item.custom_content ?? '';
  let userId: number | null = null;
  if (typeof rawContent === 'string' && rawContent.startsWith('[USER:')) {
    const match = rawContent.match(/^\[USER:([0-9]+)\]\s*([\s\S]*)$/);
    if (match) {
      userId = parseInt(match[1], 10);
      rawContent = match[2];
    }
  }
  return {
    ...item,
    userId,
    custom_content: rawContent || null,
  };
}

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';
    const rawUserId = searchParams.get('userId');
    const parsedUserId = rawUserId ? parsePositiveInt(rawUserId) : null;
    if (rawUserId && !parsedUserId) {
      return NextResponse.json({ error: 'Geçersiz userId' }, { status: 400 });
    }
    const scoped = resolveScopedUserId(guard.auth, parsedUserId);
    if (!scoped.ok) return scoped.response;
    const targetUserId = scoped.userId;

    let query = supabase
      .from('custom_widgets')
      .select('*')
      .neq('widget_type', 'athlete_rank')
      .neq('widget_type', 'workout_schedule_data')
      .order('display_order', { ascending: true });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    let parsedList: CustomWidget[] = (data || []).map(parseWidgetUser);

    if (targetUserId !== null) {
      parsedList = parsedList.filter((w) => w.userId === targetUserId || w.userId === null);
    }

    return NextResponse.json(parsedList, { headers: NO_STORE_HEADERS });
  } catch (e) {
    console.error('GET widgets error:', e);
    return NextResponse.json(
      { error: 'Widget verileri yüklenemedi' },
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
      const { data: deletedRows, error: dbError } = await supabase
        .from('custom_widgets')
        .delete()
        .eq('id', numericId)
        .neq('widget_type', 'athlete_rank')
        .neq('widget_type', 'workout_schedule_data')
        .select();

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
      if (!deletedRows || deletedRows.length === 0) {
        return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
      }
      return NextResponse.json(
        {
          success: true,
          deletedId: numericId,
          deletedRows: deletedRows.length,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const { title, widget_type, target_time, custom_content, is_active, display_order, userId } = body;

    if (!title || !widget_type || !ALLOWED_WIDGET_TYPES.has(String(widget_type))) {
      return NextResponse.json({ error: 'Valid title and widget_type are required' }, { status: 400 });
    }

    const cleanUserId = userId ? parsePositiveInt(userId) : null;
    const baseContent = custom_content ?? '';
    const finalContent = cleanUserId
      ? `[USER:${cleanUserId}] ${baseContent}`
      : (custom_content || null);

    const insertPayload = {
      title: String(title).trim(),
      widget_type,
      target_time: target_time || null,
      custom_content: finalContent,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      display_order: display_order !== undefined ? Number(display_order) : 1,
    };

    const { data, error } = await supabase
      .from('custom_widgets')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(parseWidgetUser(data), { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create widget: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { id, userId, ...updates } = body;

    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Valid Widget ID is required' }, { status: 400 });
    }

    if (updates.widget_type !== undefined && !ALLOWED_WIDGET_TYPES.has(String(updates.widget_type))) {
      return NextResponse.json({ error: 'Invalid widget_type' }, { status: 400 });
    }

    const cleanUserId = userId !== undefined ? (userId ? parsePositiveInt(userId) : null) : undefined;

    const updateData: Record<string, any> = {};
    if (updates.title !== undefined) updateData.title = String(updates.title).trim();
    if (updates.widget_type !== undefined) updateData.widget_type = updates.widget_type;
    if (updates.target_time !== undefined) updateData.target_time = updates.target_time;
    if (updates.is_active !== undefined) updateData.is_active = Boolean(updates.is_active);
    if (updates.display_order !== undefined) updateData.display_order = Number(updates.display_order);

    if (updates.custom_content !== undefined || cleanUserId !== undefined) {
      let existingUserId: number | null = null;
      let existingBaseContent = '';
      if (cleanUserId === undefined || updates.custom_content === undefined) {
        const { data: existingRow } = await supabase
          .from('custom_widgets')
          .select('custom_content')
          .eq('id', numericId)
          .neq('widget_type', 'athlete_rank')
          .neq('widget_type', 'workout_schedule_data')
          .maybeSingle();
        if (existingRow) {
          const parsedExisting = parseWidgetUser(existingRow);
          existingUserId = parsedExisting.userId ?? null;
          existingBaseContent = parsedExisting.custom_content ?? '';
        }
      }

      const targetUserId = cleanUserId !== undefined ? cleanUserId : existingUserId;
      const baseContent =
        updates.custom_content !== undefined ? (updates.custom_content ?? '') : existingBaseContent;

      updateData.custom_content = targetUserId
        ? `[USER:${targetUserId}] ${baseContent}`
        : (baseContent || null);
    }

    const { data, error } = await supabase
      .from('custom_widgets')
      .update(updateData)
      .eq('id', numericId)
      .neq('widget_type', 'athlete_rank')
      .neq('widget_type', 'workout_schedule_data')
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json(parseWidgetUser(data), { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update widget: ' + (error as Error).message },
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
    if (!numericId) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const { data: deletedRows, error: dbError } = await supabase
      .from('custom_widgets')
      .delete()
      .eq('id', numericId)
      .neq('widget_type', 'athlete_rank')
      .neq('widget_type', 'workout_schedule_data')
      .select();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        deletedId: numericId,
        deletedRows: deletedRows.length,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete widget' }, { status: 500 });
  }
}
