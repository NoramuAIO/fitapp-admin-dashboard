import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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

// Fallback in-memory store in case table hasn't been created in Supabase SQL editor yet
let fallbackRules: NotificationRule[] = [
  {
    id: 1,
    title: '🏋️‍♂️ Antrenman Zamanı!',
    subtitle: 'Günün Hedefi',
    message: 'Bugün üst vücut antrenmanın var. Ayakkabılarını bağla ve salona doğru yola çık!',
    category: 'antrenman',
    scheduled_time: '18:00',
    days_of_week: '1,2,3,4,5',
    voice_enabled: true,
    voice_script: 'Günün en verimli anı geldi! Bugün antrenmanında sınırlarını zorlama zamanı. Unutma, şampiyonlar pes etmeyenlerdir.',
    is_active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: '🔥 Sabah Motivasyonu',
    subtitle: 'Güne Başlarken',
    message: 'Her yeni gün yeni bir şans. Bugün kendin için bir iyilik yap ve hedefine odaklan.',
    category: 'motivasyon',
    scheduled_time: '09:00',
    days_of_week: '0,1,2,3,4,5,6',
    voice_enabled: true,
    voice_script: 'Günaydın şampiyon! Bugün yapacağın her tekrar, içeceğin her bardak su seni hedefine bir adım daha yaklaştıracak.',
    is_active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: '🪥 Diş Fırçalama Hatırlatıcısı',
    subtitle: 'Gece Rutini',
    message: 'Günü bitirmeden önce dişlerini fırçalamayı unutma! Sağlıklı bir gülüş her şeydir.',
    category: 'dis_fircalama',
    scheduled_time: '23:00',
    days_of_week: '0,1,2,3,4,5,6',
    voice_enabled: false,
    voice_script: null,
    is_active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    title: '🚶‍♂️ Temiz Hava Yürüyüşü',
    subtitle: 'Adım Hedefi',
    message: 'Akşam yürüyüşü için harika bir hava var. 20 dakikalık bir yürüyüşle zihnini boşalt.',
    category: 'yuruyus',
    scheduled_time: '20:00',
    days_of_week: '1,3,5',
    voice_enabled: true,
    voice_script: 'Temiz hava ve hafif bir yürüyüş günün yorgunluğunu silip atacak. Kulaklığını tak ve adımlarını say.',
    is_active: true,
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .order('id', { ascending: true });

    if (error || !data) {
      // Fallback
      return NextResponse.json(fallbackRules);
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(fallbackRules);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
      await supabase.from('notification_rules').delete().eq('id', id);
    } catch {}

    fallbackRules = fallbackRules.filter((r) => r.id !== Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
