import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Admin bilgileri environment variable'dan al
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'soykamermustafa033@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '4#$4&!j7xXU7$#';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Basit doğrulama
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Cookie oluştur
      const cookieStore = await cookies();
      cookieStore.set('admin-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
        path: '/', // Tüm path'lerde geçerli
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
