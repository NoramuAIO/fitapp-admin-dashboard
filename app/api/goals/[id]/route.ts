import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { parseStartValueTag, stripGoalMetadataTags } from '@/lib/fitnessCalculations';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, targetValue, currentValue, startValue, unit, startDate, endDate, status } = body;

    // Preserve existing [START:...] metadata if startValue is not explicitly supplied
    let preservedStart: number | null =
      startValue !== undefined && startValue !== null && startValue !== ''
        ? parseFloat(String(startValue).replace(',', '.'))
        : null;

    if (preservedStart === null && description !== undefined) {
      const { data: existingGoal } = await supabase
        .from('goals')
        .select('description')
        .eq('id', id)
        .maybeSingle();
      if (existingGoal) {
        preservedStart = parseStartValueTag(existingGoal.description);
      }
    }

    const cleanDesc = description !== undefined ? stripGoalMetadataTags(description) : undefined;
    const updatePayload: any = {
      title,
      unit,
      startDate,
      endDate,
      status,
    };

    if (cleanDesc !== undefined || preservedStart !== null) {
      const baseText = cleanDesc ?? '';
      updatePayload.description =
        preservedStart && Number.isFinite(preservedStart) && preservedStart > 0
          ? `${baseText ? `${baseText} ` : ''}[START:${preservedStart}]`
          : (baseText || null);
    }

    const parsedTarget =
      targetValue !== undefined && targetValue !== null && targetValue !== ''
        ? parseFloat(String(targetValue).replace(',', '.'))
        : undefined;
    const parsedCurrent =
      currentValue !== undefined && currentValue !== null && currentValue !== ''
        ? parseFloat(String(currentValue).replace(',', '.'))
        : undefined;

    if (parsedTarget !== undefined && Number.isFinite(parsedTarget)) {
      updatePayload.targetValue = parsedTarget;
    }
    if (parsedCurrent !== undefined && Number.isFinite(parsedCurrent)) {
      updatePayload.currentValue = parsedCurrent;
    }

    let { data, error } = await supabase
      .from('goals')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error?.code === '22P02') {
      const roundedPayload = { ...updatePayload };
      if (roundedPayload.targetValue !== undefined) {
        roundedPayload.targetValue = Math.round(Number(roundedPayload.targetValue));
      }
      if (roundedPayload.currentValue !== undefined) {
        roundedPayload.currentValue = Math.round(Number(roundedPayload.currentValue));
      }
      const retry = await supabase
        .from('goals')
        .update(roundedPayload)
        .eq('id', id)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      description: stripGoalMetadataTags(data.description) || null,
      startValue: parseStartValueTag(data.description),
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
