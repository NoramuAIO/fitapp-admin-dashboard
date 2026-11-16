import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { escapeIlikePattern, parsePositiveInt, requireApiAuth } from '@/lib/apiAuth';
import { parseCsvMatrix } from '@/lib/csv';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const guard = await requireApiAuth(request, { requireAdmin: true });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { csvData, programId } = body;

    if (!csvData) {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 });
    }

    const parsedProgramId = programId ? parsePositiveInt(programId) : null;
    const rows = parseCsvMatrix(csvData).filter((r) => r.length >= 10);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];

      try {
        if (fields.length < 10) {
          errors.push(`Row ${i}: Not enough fields (${fields.length})`);
          skipped++;
          continue;
        }

        const [
          exerciseName,
          ,
          exerciseImage,
          exerciseImage1,
          ,
          muscleGp,
          ,
          equipment,
          rating,
          description
        ] = fields;

        const cleanName = exerciseName?.trim().replace(/\s+/g, ' ');
        
        if (!cleanName || cleanName.length < 2) {
          errors.push(`Row ${i}: Invalid exercise name`);
          skipped++;
          continue;
        }

        // Check if exercise already exists safely
        const { data: existing } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', escapeIlikePattern(cleanName))
          .limit(1)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Use first image, fallback to second
        const imageUrl = exerciseImage?.trim() || exerciseImage1?.trim() || null;

        // Create description
        let fullDescription = description?.trim() || '';
        if (muscleGp?.trim()) fullDescription += `\nKas Grubu: ${muscleGp.trim()}`;
        if (equipment?.trim()) fullDescription += `\nEkipman: ${equipment.trim()}`;
        if (rating?.trim()) fullDescription += `\nPuan: ${rating.trim()}`;

        // Insert exercise
        const { error } = await supabase
          .from('exercises')
          .insert([{
            programId: parsedProgramId,
            name: cleanName,
            sets: 3,
            reps: 10,
            description: fullDescription.trim() || null,
            imageUrl: imageUrl,
            muscleGroup: muscleGp?.trim() || null,
            orderIndex: i - 1
          }]);

        if (error) throw error;
        imported++;
      } catch (error) {
        errors.push(`Row ${i}: ${error}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      message: `${imported} hareket içe aktarıldı, ${skipped} atlandı`,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ 
      error: 'Import failed', 
      details: String(error) 
    }, { status: 500 });
  }
}
