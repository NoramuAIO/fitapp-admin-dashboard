import getDatabase from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    if (!programId) {
      return NextResponse.json({ error: 'programId is required' }, { status: 400 });
    }

    const db = getDatabase();
    const result = await db.query(
      'SELECT * FROM program_days WHERE "programId" = $1 ORDER BY "orderIndex" ASC',
      [programId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching program days:', error);
    return NextResponse.json({ error: 'Failed to fetch program days' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId, dayNumber, dayName, orderIndex = 0 } = body;

    if (!programId || !dayNumber || !dayName) {
      return NextResponse.json(
        { error: 'programId, dayNumber, and dayName are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const result = await db.query(
      'INSERT INTO program_days ("programId", "dayNumber", "dayName", "orderIndex") VALUES ($1, $2, $3, $4) RETURNING *',
      [programId, dayNumber, dayName, orderIndex]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating program day:', error);
    return NextResponse.json({ error: 'Failed to create program day' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, dayNumber, dayName } = body;

    if (!id || !dayNumber || !dayName) {
      return NextResponse.json(
        { error: 'id, dayNumber, and dayName are required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const result = await db.query(
      'UPDATE program_days SET "dayNumber" = $1, "dayName" = $2 WHERE id = $3 RETURNING *',
      [dayNumber, dayName, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Program day not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating program day:', error);
    return NextResponse.json({ error: 'Failed to update program day' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getDatabase();
    await db.query('DELETE FROM program_days WHERE id = $1', [id]);

    return NextResponse.json({ message: 'Program day deleted successfully' });
  } catch (error) {
    console.error('Error deleting program day:', error);
    return NextResponse.json({ error: 'Failed to delete program day' }, { status: 500 });
  }
}
