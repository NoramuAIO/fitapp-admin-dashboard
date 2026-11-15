import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createUserToken, hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    console.log('Login attempt for:', cleanEmail);

    // Case-insensitive user lookup
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Veritabanı hatası: ' + error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 401 }
      );
    }

    // Check password with constant-time verification and legacy migration
    const dbPassword = String(data.password || data.Password || '');
    const { valid, needsRehash } = await verifyPassword(cleanPassword, dbPassword);

    if (!valid) {
      return NextResponse.json(
        { error: 'Hatalı şifre. Lütfen tekrar deneyin.' },
        { status: 401 }
      );
    }

    // Transparently upgrade legacy plaintext password to PBKDF2 hash
    if (needsRehash) {
      const hashedPassword = await hashPassword(cleanPassword);
      await supabase.from('users').update({ password: hashedPassword }).eq('id', data.id);
    }

    const resolvedEmail = data.email || data.Email || cleanEmail;
    const token = await createUserToken(data.id, resolvedEmail);

    return NextResponse.json({
      id: data.id,
      name: data.name || data.Name,
      email: resolvedEmail,
      createdAt: data.createdAt || data.created_at || data.CreatedAt || new Date().toISOString(),
      token,
      accessToken: token,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { error: 'Giriş başarısız: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
