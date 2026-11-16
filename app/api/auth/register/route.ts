import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createUserToken, hashPassword } from '@/lib/auth';
import { escapeIlikePattern, isValidEmail } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Tüm alanlar gerekli' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !isValidEmail(cleanEmail) || password.length < 8) {
      return NextResponse.json(
        { error: 'Geçerli isim, email ve en az 8 karakterli şifre gerekli' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', escapeIlikePattern(cleanEmail))
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email zaten kayıtlı' },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    const hashedPassword = await hashPassword(password);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      }])
      .select('id, name, email, createdAt')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Bu email zaten kayıtlı' },
          { status: 409, headers: NO_STORE_HEADERS }
        );
      }
      throw error;
    }

    const token = await createUserToken(data.id, data.email);

    return NextResponse.json(
      {
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.createdAt,
        token,
        accessToken: token,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Kayıt sırasında sunucu hatası oluştu' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
