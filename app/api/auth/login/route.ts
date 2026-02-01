import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve şifre gerekli' },
        { status: 400 }
      );
    }

    // Find user (in production, compare hashed password!)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, createdAt')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Email veya şifre hatalı' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ...data,
      created_at: data.createdAt
    });
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json(
      { error: 'Giriş başarısız: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
