import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subtitle, message, category, voice_enabled, voice_script } = body;

    const testPayload = {
      id: 'test-' + Date.now(),
      title: title || '⚡ Test Bildirimi',
      subtitle: subtitle || 'FitApp Bildirim Sistemi',
      body: message || 'Bu bir test bildirimidir. Sistem sorunsuz çalışıyor!',
      sound: true,
      priority: 'high',
      channelId: 'fitapp-coach-high',
      color: '#14b8a6', // turquoise
      data: {
        category: category || 'ozel_kayit',
        voice_enabled: Boolean(voice_enabled),
        voice_script: voice_script || message || null,
        actions: [
          { id: 'complete', title: '✅ Tamamlandı' },
          { id: 'voice', title: '🔊 Sesli Oku' },
          { id: 'snooze', title: '⏰ 10 Dk Ertele' },
        ],
      },
      sentAt: new Date().toISOString(),
    };

    console.log('[Test Notification Sent]', testPayload);

    return NextResponse.json({
      success: true,
      message: 'Test bildirimi başarıyla oluşturuldu ve hazırlandı.',
      payload: testPayload,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to dispatch test notification' }, { status: 500 });
  }
}
