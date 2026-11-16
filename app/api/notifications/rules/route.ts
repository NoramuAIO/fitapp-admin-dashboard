import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export interface NotificationRule {
  id: number;
  title: string;
  subtitle?: string | null;
  message: string;
  category: 'antrenman' | 'motivasyon' | 'dis_fircalama' | 'yuruyus' | 'sinav' | 'yemek' | 'ozel_kayit';
  scheduled_time: string;
  days_of_week: string;
  voice_enabled: boolean;
  voice_script?: string | null;
  is_active: boolean;
  createdAt?: string;
}

export async function GET(request: Request) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || [], { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error('Error fetching notification rules:', err);
    return NextResponse.json(
      { error: 'Bildirim kuralları yüklenemedi' },
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
        .from('notification_rules')
        .delete()
        .eq('id', numericId)
        .select();

      if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
      if (!deletedRows || deletedRows.length === 0) {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
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

    const {
      title,
      subtitle,
      message,
      category,
      scheduled_time,
      days_of_week,
      voice_enabled,
      voice_script,
      is_active,
    } = body;

    if (!String(title || '').trim() || !String(message || '').trim() || !String(scheduled_time || '').trim()) {
      return NextResponse.json(
        { error: 'Title, message, and scheduled_time are required' },
        { status: 400 }
      );
    }

    const cleanDays = typeof days_of_week === 'string' ? days_of_week.trim() : '';
    if (!cleanDays) {
      return NextResponse.json(
        { error: 'En az bir gün seçilmelidir' },
        { status: 400 }
      );
    }

    const insertPayload = {
      title: String(title).trim(),
      subtitle: subtitle ? String(subtitle).trim() : null,
      message: String(message).trim(),
      category: category || 'ozel_kayit',
      scheduled_time: String(scheduled_time).trim(),
      days_of_week: cleanDays,
      voice_enabled: Boolean(voice_enabled),
      voice_script: voice_script ? String(voice_script).trim() : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    };

    const { data, error } = await supabase
      .from('notification_rules')
      .insert([insertPayload])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create rule: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PUT(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const numericId = parsePositiveInt(body?.id);
    if (!numericId) {
      return NextResponse.json({ error: 'Valid Rule ID is required' }, { status: 400 });
    }

    // Explicit field whitelist (prevent mass assignment of id/createdAt)
    const updatePayload: Record<string, any> = {};
    if (body.title !== undefined) updatePayload.title = String(body.title).trim();
    if (body.subtitle !== undefined) updatePayload.subtitle = body.subtitle ? String(body.subtitle).trim() : null;
    if (body.message !== undefined) updatePayload.message = String(body.message).trim();
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.scheduled_time !== undefined) updatePayload.scheduled_time = String(body.scheduled_time).trim();
    if (body.days_of_week !== undefined) {
      const cleanDays = String(body.days_of_week || '').trim();
      if (!cleanDays) {
        return NextResponse.json({ error: 'En az bir gün seçilmelidir' }, { status: 400 });
      }
      updatePayload.days_of_week = cleanDays;
    }
    if (body.voice_enabled !== undefined) updatePayload.voice_enabled = Boolean(body.voice_enabled);
    if (body.voice_script !== undefined) updatePayload.voice_script = body.voice_script ? String(body.voice_script).trim() : null;
    if (body.is_active !== undefined) updatePayload.is_active = Boolean(body.is_active);

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan gerekli' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notification_rules')
      .update(updatePayload)
      .eq('id', numericId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    let rawId = searchParams.get('id');

    if (!rawId) {
      try {
        const body = await request.json();
        rawId = body?.id;
      } catch {}
    }

    const numericId = parsePositiveInt(rawId);
    if (!numericId) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const { data: deletedRows, error: dbError } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', numericId)
      .select();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
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
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
