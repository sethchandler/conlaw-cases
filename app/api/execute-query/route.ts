import { NextRequest, NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';

// Find connection string from various possible env var names
function getConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.STORAGE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

const pool = createPool({
  connectionString: getConnectionString(),
});

/**
 * API Route: Execute SQL Query
 *
 * Accepts a SQL query from the frontend and executes it against the database.
 *
 * Security measures:
 * - Only allows SELECT statements
 * - Blocks dangerous SQL keywords (DROP, DELETE, UPDATE, INSERT, etc.)
 * - Limits result set size to prevent memory issues
 */

const DANGEROUS_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'MERGE', 'REPLACE'
];

const MAX_RESULTS = 1000; // Maximum number of rows to return

/**
 * Validates that SQL is safe to execute (SELECT only, no dangerous operations)
 */
function validateSQL(query: string): { valid: boolean; error?: string } {
  const trimmed = query.trim().toUpperCase();

  // Must start with SELECT
  if (!trimmed.startsWith('SELECT')) {
    return { valid: false, error: 'Only SELECT queries are allowed' };
  }

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(query)) {
      return { valid: false, error: `Dangerous keyword detected: ${keyword}` };
    }
  }

  // Block semicolons (prevents query chaining)
  const semicolonCount = (query.match(/;/g) || []).length;
  if (semicolonCount > 1 || (semicolonCount === 1 && !query.trim().endsWith(';'))) {
    return { valid: false, error: 'Multiple statements or statement chaining not allowed' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate SQL
    const validation = validateSQL(query);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if we have a connection string
    const connString = getConnectionString();
    if (!connString) {
      return NextResponse.json(
        { error: 'Database not configured. Missing connection string environment variable.' },
        { status: 503 }
      );
    }

    // Execute query with timeout
    const startTime = Date.now();
    const result = await pool.query(query);
    const executionTime = Date.now() - startTime;

    // Limit results
    let rows = result.rows;
    let truncated = false;
    if (rows.length > MAX_RESULTS) {
      rows = rows.slice(0, MAX_RESULTS);
      truncated = true;
    }

    return NextResponse.json({
      success: true,
      data: rows,
      rowCount: result.rowCount,
      executionTime,
      truncated,
      message: truncated
        ? `Results limited to ${MAX_RESULTS} rows. Total rows: ${result.rowCount}`
        : undefined
    });

  } catch (error: any) {
    console.error('Query execution error:', error);

    // Handle different types of errors
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 503 }
      );
    }

    if (error.code === '42P01') {
      return NextResponse.json(
        { error: 'Table or view does not exist' },
        { status: 400 }
      );
    }

    if (error.code === '42601') {
      return NextResponse.json(
        { error: 'SQL syntax error: ' + error.message },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: error.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
