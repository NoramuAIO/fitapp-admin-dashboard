import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu email zaten kayıtlı' },
        { status: 400 }
      );
    }

    // Create user (in production, hash the password!)
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name,
        email,
        password,
        createdAt: new Date().toISOString()
      }])
      .select('*')
      .single();

    console.log('Register result:', { data, error });

    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      name: data.name,
      email: data.email,
      createdAt: data.createdAt || data.created_at
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Kayıt başarısız: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
