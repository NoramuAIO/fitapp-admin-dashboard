import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { parseStartValueTag, stripGoalMetadataTags } from '@/lib/fitnessCalculations';
import {
  isValidYmdDate,
  parseLocaleDecimal,
  parsePositiveInt,
  requireApiAuth,
} from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Geçersiz hedef ID' }, { status: 400 });
    }

    const { data: existingGoal, error: existingErr } = await supabase
      .from('goals')
      .select('id, userId, description, startDate')
      .eq('id', numericId)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    if (!guard.auth.isAdmin && Number(existingGoal.userId) !== guard.auth.userId) {
      return NextResponse.json({ error: 'Bu hedefi düzenleme yetkiniz yok' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, targetValue, currentValue, startValue, unit, startDate, endDate, status, userId } = body;

    let preservedStart: number | null =
      startValue !== undefined && startValue !== null && startValue !== ''
        ? parseLocaleDecimal(startValue)
        : null;
    if (preservedStart === null) {
      preservedStart = parseStartValueTag(existingGoal.description);
    }

    const cleanDesc = description !== undefined ? stripGoalMetadataTags(description) : undefined;
    const updatePayload: any = {};
    if (title !== undefined) updatePayload.title = String(title).trim();
    if (unit !== undefined) updatePayload.unit = String(unit).trim();
    if (startDate !== undefined) {
      if (!isValidYmdDate(String(startDate))) {
        return NextResponse.json({ error: 'Geçersiz başlangıç tarihi' }, { status: 400 });
      }
      updatePayload.startDate = String(startDate).trim();
    }
    if (endDate !== undefined) {
      if (endDate === null || String(endDate).trim() === '') {
        updatePayload.endDate = null;
      } else if (isValidYmdDate(String(endDate))) {
        updatePayload.endDate = String(endDate).trim();
      } else {
        return NextResponse.json({ error: 'Geçersiz bitiş tarihi' }, { status: 400 });
      }
    }
    if (status !== undefined) updatePayload.status = status;
    if (guard.auth.isAdmin && userId !== undefined) {
      const parsedOwner = parsePositiveInt(userId);
      if (parsedOwner) updatePayload.userId = parsedOwner;
    }

    if (cleanDesc !== undefined || preservedStart !== null) {
      const baseText =
        cleanDesc !== undefined ? cleanDesc : stripGoalMetadataTags(existingGoal.description);
      updatePayload.description =
        preservedStart && Number.isFinite(preservedStart) && preservedStart > 0
          ? `${baseText ? `${baseText} ` : ''}[START:${preservedStart}]`
          : (baseText || null);
    }

    const parsedTarget =
      targetValue !== undefined && targetValue !== null && targetValue !== ''
        ? parseLocaleDecimal(targetValue)
        : undefined;
    const parsedCurrent =
      currentValue !== undefined && currentValue !== null && currentValue !== ''
        ? parseLocaleDecimal(currentValue)
        : undefined;

    if (parsedTarget !== undefined) {
      if (parsedTarget === null || parsedTarget <= 0) {
        return NextResponse.json({ error: 'Geçerli hedef değeri gerekli' }, { status: 400 });
      }
      updatePayload.targetValue = parsedTarget;
    }
    if (parsedCurrent !== undefined && parsedCurrent !== null && parsedCurrent >= 0) {
      updatePayload.currentValue = parsedCurrent;
    }

    let { data, error } = await supabase
      .from('goals')
      .update(updatePayload)
      .eq('id', numericId)
      .select()
      .maybeSingle();

    if (error && (error.code === '22P02' || error.code === '23502')) {
      const roundedPayload = { ...updatePayload };
      if (error.code === '22P02') {
        if (roundedPayload.targetValue !== undefined) {
          roundedPayload.targetValue = Math.round(Number(roundedPayload.targetValue));
        }
        if (roundedPayload.currentValue !== undefined) {
          roundedPayload.currentValue = Math.round(Number(roundedPayload.currentValue));
        }
      }
      if (error.code === '23502' && roundedPayload.endDate === null) {
        roundedPayload.endDate = updatePayload.startDate || existingGoal.startDate;
      }
      const retry = await supabase
        .from('goals')
        .update(roundedPayload)
        .eq('id', numericId)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...data,
        description: stripGoalMetadataTags(data.description) || null,
        startValue: parseStartValueTag(data.description),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireApiAuth(request);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const numericId = parsePositiveInt(id);
    if (!numericId) {
      return NextResponse.json({ error: 'Geçersiz hedef ID' }, { status: 400 });
    }

    let query = supabase.from('goals').delete().eq('id', numericId);
    if (!guard.auth.isAdmin && guard.auth.userId) {
      query = query.eq('userId', guard.auth.userId);
    }

    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal: ' + (error as Error).message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
