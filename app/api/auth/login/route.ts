import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createUserToken, hashPassword, verifyPassword } from '@/lib/auth';
import { escapeIlikePattern, isValidEmail } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'Geçerli bir email adresi girin' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Exact match with escaped pattern prevents SQL wildcard bypass (%, _)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', escapeIlikePattern(cleanEmail))
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Login Supabase error:', error);
      return NextResponse.json(
        { error: 'Sunucu veritabanı hatası oluştu' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const dbPassword = String(data.password || data.Password || '');
    const { valid, needsRehash } = await verifyPassword(password, dbPassword);

    if (!valid) {
      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    if (needsRehash) {
      const hashedPassword = await hashPassword(password);
      const { error: rehashErr } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', data.id);
      if (rehashErr) {
        console.error('Password rehash update error:', rehashErr);
      }
    }

    const resolvedEmail = data.email || data.Email || cleanEmail;
    const token = await createUserToken(data.id, resolvedEmail);

    return NextResponse.json(
      {
        id: data.id,
        name: data.name || data.Name,
        email: resolvedEmail,
        createdAt: data.createdAt || data.created_at || data.CreatedAt || new Date().toISOString(),
        token,
        accessToken: token,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { error: 'Giriş sırasında beklenmeyen bir hata oluştu' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
