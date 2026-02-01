import getDatabase from '@/lib/db';
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
  const db = getDatabase();

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
    const debugInfo: any[] = [];

    console.log('Total rows parsed:', rows.length);
    if (rows.length > 0) {
      console.log('First row (header):', rows[0].slice(0, 3));
      console.log('Second row (first data):', rows[1]?.slice(0, 3));
    }

    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const fields = rows[i];

      try {
        // Debug first few lines
        if (i <= 3) {
          console.log(`Row ${i}:`, {
            fieldCount: fields.length,
            name: fields[0],
            image: fields[2]?.substring(0, 50)
          });
          debugInfo.push({
            row: i,
            fieldCount: fields.length,
            name: fields[0],
            hasImage: !!fields[2]
          });
        }

        if (fields.length < 10) {
          errors.push(`Row ${i}: Not enough fields (${fields.length})`);
          skipped++;
          continue;
        }

        const [
          exerciseName,
          descriptionUrl,
          exerciseImage,
          exerciseImage1,
          muscleGpDetails,
          muscleGp,
          equipmentDetails,
          equipment,
          rating,
          description
        ] = fields;

        const cleanName = exerciseName?.trim();
        
        if (!cleanName || cleanName.length < 2) {
          errors.push(`Row ${i}: Invalid exercise name: "${cleanName}"`);
          skipped++;
          continue;
        }

        // Check if exercise already exists
        const existingCheck = await db.query(
          'SELECT id FROM exercises WHERE LOWER(name) = LOWER($1)',
          [cleanName]
        );

        if (existingCheck.rows.length > 0) {
          if (i <= 5) {
            console.log(`Row ${i}: Exercise "${cleanName}" already exists, skipping`);
          }
          skipped++;
          continue;
        }

        // Use first image, fallback to second if first is empty
        const imageUrl = exerciseImage?.trim() || exerciseImage1?.trim() || null;

        // Create description with muscle group and equipment info
        let fullDescription = description?.trim() || '';
        if (muscleGp?.trim()) {
          fullDescription += `\nKas Grubu: ${muscleGp.trim()}`;
        }
        if (equipment?.trim()) {
          fullDescription += `\nEkipman: ${equipment.trim()}`;
        }
        if (rating?.trim()) {
          fullDescription += `\nPuan: ${rating.trim()}`;
        }

        // Insert exercise
        await db.query(
          `INSERT INTO exercises ("programId", name, sets, reps, description, "imageUrl", "orderIndex")
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            programId || null,
            cleanName,
            3, // Default sets
            10, // Default reps
            fullDescription.trim() || null,
            imageUrl,
            i - 1 // order index
          ]
        );

        if (i <= 5) {
          console.log(`Row ${i}: ✓ Successfully imported "${cleanName}"`);
        }

        imported++;
      } catch (error) {
        const errorMsg = `Row ${i}: ${error}`;
        errors.push(errorMsg);
        if (i <= 10) {
          console.error(errorMsg);
        }
        skipped++;
      }
    }

    console.log('Import complete:', { imported, skipped, totalErrors: errors.length });

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
      debugInfo: debugInfo.length > 0 ? debugInfo : undefined,
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
