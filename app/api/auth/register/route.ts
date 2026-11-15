import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { createUserToken, hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    console.log('Register attempt:', { name, email, password: '***' });

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Tüm alanlar gerekli' },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    if (!cleanName || !cleanEmail || cleanPassword.length < 4) {
      return NextResponse.json(
        { error: 'Geçerli isim, email ve en az 4 karakterli şifre gerekli' },
        { status: 400 }
      );
    }

    // Check if user already exists (case-insensitive)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email zaten kayıtlı' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(cleanPassword);

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

    if (error) throw error;

    const token = await createUserToken(data.id, data.email);

    return NextResponse.json({
      id: data.id,
      name: data.name,
      email: data.email,
      createdAt: data.createdAt,
      token,
      accessToken: token,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Kayıt başarısız: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
