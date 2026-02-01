import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

function parseCSVData(csvData: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvData.length; i++) {
    const char = csvData[i];
    const nextChar = csvData[i + 1];
    
    // Handle quotes
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote - add one quote and skip next
        currentField += '"';
        i++;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        continue;
      }
    }
    
    // Only process special characters when not in quotes
    if (!inQuotes) {
      if (char === ',') {
        // Field separator
        currentRow.push(currentField);
        currentField = '';
        continue;
      }
      
      if (char === '\n' || char === '\r') {
        // Skip carriage returns
        if (char === '\r') continue;
        
        // End of row
        if (currentField || currentRow.length > 0) {
          currentRow.push(currentField);
          if (currentRow.length >= 10) { // Only add rows with enough fields
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
        }
        continue;
      }
    }
    
    // Add character to current field
    currentField += char;
  }
  
  // Add last field and row if exists
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length >= 10) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csvData, programId } = body;

    if (!csvData) {
      return NextResponse.json({ error: 'CSV data is required' }, { status: 400 });
    }

    const rows = parseCSVData(csvData);
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

        // Check if exercise already exists
        const { data: existing } = await supabase
          .from('exercises')
          .select('id')
          .ilike('name', cleanName)
          .single();

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
            programId: programId || null,
            name: cleanName,
            sets: 3,
            reps: 10,
            description: fullDescription.trim() || null,
            imageUrl: imageUrl,
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
