import { Pool } from 'pg';

let pool: Pool | null = null;

export default function getDatabase() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_HOST?.includes('supabase.co') ? {
        rejectUnauthorized: false
      } : undefined
    });
  }
  return pool;
}

export async function initializeDatabase() {
  const db = getDatabase();
  
  try {
    // Create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS programs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "isPrimary" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        "programId" INTEGER REFERENCES programs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        sets INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        duration VARCHAR(50),
        description TEXT,
        "imageUrl" TEXT,
        "orderIndex" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "programId" INTEGER REFERENCES programs(id) ON DELETE SET NULL,
        "startTime" VARCHAR(10),
        duration VARCHAR(50),
        category VARCHAR(50) DEFAULT 'workout',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS exercise_progress (
        id SERIAL PRIMARY KEY,
        "sessionId" INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
        "exerciseId" INTEGER REFERENCES exercises(id) ON DELETE CASCADE,
        "setNumber" INTEGER NOT NULL,
        reps INTEGER,
        weight DECIMAL(10, 2),
        completed BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_stats (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        steps INTEGER DEFAULT 0,
        distance INTEGER DEFAULT 0,
        calories INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        "waterGlasses" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("userId", date)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "targetValue" INTEGER NOT NULL,
        "currentValue" INTEGER DEFAULT 0,
        unit VARCHAR(50) NOT NULL,
        "startDate" DATE NOT NULL,
        "endDate" DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

