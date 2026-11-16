import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { parseNonNegativeInt, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { programData } = body;

    if (!programData || !String(programData.name || '').trim()) {
      return NextResponse.json({ error: 'Valid programData is required' }, { status: 400 });
    }

    const { data: newProgram, error: progErr } = await supabase
      .from('programs')
      .insert([{ name: String(programData.name).trim(), isPrimary: false }])
      .select()
      .single();

    if (progErr) throw progErr;

    if (Array.isArray(programData.days)) {
      for (let i = 0; i < programData.days.length; i++) {
        const day = programData.days[i];
        const dayTitle = String(day.dayName || day.name || `Gün ${i + 1}`).trim();
        const { data: newDay, error: dayErr } = await supabase
          .from('program_days')
          .insert([{
            programId: newProgram.id,
            dayNumber: parsePositiveInt(day.dayNumber) ?? (i + 1),
            dayName: dayTitle,
            name: dayTitle,
            orderIndex: parseNonNegativeInt(day.orderIndex) ?? i,
          }])
          .select()
          .single();

        if (dayErr) throw dayErr;

        if (Array.isArray(day.exercises)) {
          const exRows = day.exercises
            .filter((ex: any) => String(ex?.name || '').trim())
            .map((ex: any, j: number) => ({
              dayId: newDay.id,
              programId: newProgram.id,
              name: String(ex.name).trim(),
              sets: parseNonNegativeInt(ex.sets) ?? 3,
              reps: parseNonNegativeInt(ex.reps) ?? 10,
              duration: ex.duration || null,
              description: ex.description || null,
              imageUrl: ex.imageUrl || null,
              muscleGroup: ex.muscleGroup || null,
              orderIndex: parseNonNegativeInt(ex.orderIndex) ?? j,
            }));

          if (exRows.length > 0) {
            const { error: exErr } = await supabase.from('exercises').insert(exRows);
            if (exErr) throw exErr;
          }
        }
      }
    }

    return NextResponse.json(newProgram, { status: 201 });
  } catch (error) {
    console.error('Error importing program:', error);
    return NextResponse.json({ error: 'Failed to import program' }, { status: 500 });
  }
}
