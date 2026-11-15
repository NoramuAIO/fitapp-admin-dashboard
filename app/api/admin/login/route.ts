import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminSessionToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası: Admin bilgileri tanımlanmamış' },
        { status: 500 }
      );
    }

    const { email, password } = await request.json();

    if (
      typeof email === 'string' &&
      typeof password === 'string' &&
      email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() &&
      password === ADMIN_PASSWORD
    ) {
      const token = await createAdminSessionToken(ADMIN_EMAIL.trim().toLowerCase());
      const cookieStore = await cookies();
      cookieStore.set('admin-auth', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
        path: '/',
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Giriş yapılırken hata oluştu' },
      { status: 500 }
    );
  }
}
