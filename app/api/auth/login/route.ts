import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    console.log('Login attempt:', { email, password: '***' });

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      );
    }

    // First, let's check if user exists
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    console.log('Sample users from DB:', allUsers);
    console.log('List error:', listError);

    // Find user - try both camelCase and snake_case
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    console.log('User lookup result:', { data, error });

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

    // Check password
    const dbPassword = data.password || data.Password;
    console.log('Password check:', { provided: password, stored: dbPassword, match: password === dbPassword });

    if (password !== dbPassword) {
      return NextResponse.json(
        { error: 'Şifre hatalı' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: data.id,
      name: data.name || data.Name,
      email: data.email || data.Email,
      createdAt: data.createdAt || data.created_at || data.CreatedAt || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { error: 'Giriş başarısız: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
