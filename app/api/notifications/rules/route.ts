import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface NotificationRule {
  id: number;
  title: string;
  subtitle?: string | null;
  message: string;
  category: 'antrenman' | 'motivasyon' | 'dis_fircalama' | 'yuruyus' | 'sinav' | 'yemek' | 'ozel_kayit';
  scheduled_time: string; // e.g. "18:00"
  days_of_week: string; // e.g. "1,2,3,4,5" (0=Paz, 1=Pzt...)
  voice_enabled: boolean;
  voice_script?: string | null;
  is_active: boolean;
  createdAt?: string;
}

// Fallback in-memory store (empty by default so deleted rules never resurrect)
let fallbackRules: NotificationRule[] = [];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching notification rules:', error);
      return NextResponse.json(fallbackRules);
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Catch fetching notification rules:', err);
    return NextResponse.json(fallbackRules);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Support delete via POST
    if (body.action === 'delete' && body.id !== undefined) {
      const numericId = Number(body.id);
      if (isNaN(numericId)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }
      const { data: deletedRows, error: dbError } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', numericId)
        .select();

      if (dbError) {
        console.error('Supabase DELETE notification_rule error:', dbError);
        return NextResponse.json({ error: dbError.message }, { status: 500 });
      }
      fallbackRules = fallbackRules.filter((r) => Number(r.id) !== numericId);
      return NextResponse.json({
        success: true,
        deletedId: numericId,
        deletedRows: deletedRows?.length || 0,
      });
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

    if (!title || !message || !scheduled_time) {
      return NextResponse.json({ error: 'Title, message, and scheduled_time are required' }, { status: 400 });
    }

    const newRule: NotificationRule = {
      id: Date.now(),
      title,
      subtitle: subtitle || null,
      message,
      category: category || 'ozel_kayit',
      scheduled_time,
      days_of_week: days_of_week || '0,1,2,3,4,5,6',
      voice_enabled: Boolean(voice_enabled),
      voice_script: voice_script || null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      createdAt: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .insert([newRule])
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data, { status: 201 });
      }
    } catch {}

    // Fallback in-memory
    fallbackRules.push(newRule);
    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create rule: ' + (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        return NextResponse.json(data);
      }
    } catch {}

    // Fallback in-memory
    const idx = fallbackRules.findIndex((r) => r.id === Number(id));
    if (idx !== -1) {
      fallbackRules[idx] = { ...fallbackRules[idx], ...updates };
      return NextResponse.json(fallbackRules[idx]);
    }

    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let rawId = searchParams.get('id');

    if (!rawId) {
      try {
        const body = await request.json();
        rawId = body?.id;
      } catch {}
    }

    if (!rawId) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const numericId = Number(rawId);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { data: deletedRows, error: dbError } = await supabase
      .from('notification_rules')
      .delete()
      .eq('id', numericId)
      .select();

    if (dbError) {
      console.error('Supabase DELETE notification_rule error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    fallbackRules = fallbackRules.filter((r) => Number(r.id) !== numericId);
    return NextResponse.json({
      success: true,
      deletedId: numericId,
      deletedRows: deletedRows?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
