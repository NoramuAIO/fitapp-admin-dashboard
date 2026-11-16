import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { constantTimeStringEqual, createAdminSessionToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;
const failedAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
}

export async function POST(request: Request) {
  try {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası: Admin bilgileri tanımlanmamış' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const clientKey = getClientKey(request);
    const now = Date.now();
    const record = failedAttemptsByIp.get(clientKey);
    if (record && record.resetAt > now && record.count >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Çok fazla başarısız giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: NO_STORE_HEADERS }
      );
    }

    const { email, password } = await request.json();

    const emailMatch =
      typeof email === 'string' &&
      (await constantTimeStringEqual(email.trim().toLowerCase(), ADMIN_EMAIL.trim().toLowerCase()));
    const passwordMatch =
      typeof password === 'string' &&
      (await constantTimeStringEqual(password, ADMIN_PASSWORD));

    if (emailMatch && passwordMatch) {
      failedAttemptsByIp.delete(clientKey);
      const token = await createAdminSessionToken(ADMIN_EMAIL.trim().toLowerCase());
      const cookieStore = await cookies();
      cookieStore.set('admin-auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
        path: '/',
      });

      return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    } else {
      const nextCount = record && record.resetAt > now ? record.count + 1 : 1;
      const nextReset = record && record.resetAt > now ? record.resetAt : now + LOGIN_WINDOW_MS;
      failedAttemptsByIp.set(clientKey, { count: nextCount, resetAt: nextReset });

      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Giriş yapılırken hata oluştu' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
