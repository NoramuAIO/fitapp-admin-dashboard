import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const { data, error } = await supabase
      .from('exercise_completions')
      .delete()
      .neq('id', 0)
      .select('id');

    if (error) throw error;
    const deletedCount = Array.isArray(data) ? data.length : 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} ilerleme kaydı silindi`,
    });
  } catch (error) {
    console.error('Error deleting exercise completions:', error);
    return NextResponse.json(
      { error: 'İlerleme kayıtları silinirken hata oluştu: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return DELETE(request);
}
