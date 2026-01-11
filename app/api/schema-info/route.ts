import { NextResponse } from 'next/server';
import { createPool } from '@vercel/postgres';

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
 * Fetches dynamic schema metadata from the database
 * Returns valid values for issues, triggers, provisions, chief justices, and year ranges
 */
export async function GET() {
  try {
    const connString = getConnectionString();
    if (!connString) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Run all queries in parallel
    const [
      issuesResult,
      triggerTypesResult,
      provisionsResult,
      chiefJusticesResult,
      yearRangeResult,
      countsResult
    ] = await Promise.all([
      // Get all issues (from controlled vocabulary table)
      pool.query(`
        SELECT issue_id, name, description
        FROM issues
        ORDER BY name
      `),
      // Get all distinct trigger types
      pool.query(`
        SELECT DISTINCT trigger_type
        FROM triggers
        WHERE trigger_type IS NOT NULL
        ORDER BY trigger_type
      `),
      // Get all provisions (hierarchical)
      pool.query(`
        SELECT provision_id, parent_id, name
        FROM provisions
        ORDER BY provision_id
      `),
      // Get all chief justices with their year ranges
      pool.query(`
        SELECT name, start_year, end_year
        FROM chief_justices
        ORDER BY start_year
      `),
      // Get year range of cases
      pool.query(`
        SELECT MIN(year) as min_year, MAX(year) as max_year
        FROM cases
      `),
      // Get counts
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM cases) as case_count,
          (SELECT COUNT(*) FROM issues) as issue_count,
          (SELECT COUNT(*) FROM triggers) as trigger_count,
          (SELECT COUNT(*) FROM provisions) as provision_count
      `)
    ]);

    const schemaInfo = {
      // Issues with IDs for exact matching
      issues: issuesResult.rows.map(r => ({
        id: r.issue_id,
        name: r.name,
        description: r.description
      })),
      // Just the issue names for simple display
      issueNames: issuesResult.rows.map(r => r.name),
      // Trigger types
      triggerTypes: triggerTypesResult.rows.map(r => r.trigger_type),
      // Provisions with hierarchy
      provisions: provisionsResult.rows.map(r => ({
        id: r.provision_id,
        parentId: r.parent_id,
        name: r.name
      })),
      // Chief justices
      chiefJustices: chiefJusticesResult.rows.map(r => ({
        name: r.name,
        startYear: r.start_year,
        endYear: r.end_year
      })),
      // Year range
      yearRange: {
        min: yearRangeResult.rows[0]?.min_year || 1789,
        max: yearRangeResult.rows[0]?.max_year || new Date().getFullYear()
      },
      // Counts
      counts: {
        cases: parseInt(countsResult.rows[0]?.case_count || '0'),
        issues: parseInt(countsResult.rows[0]?.issue_count || '0'),
        triggers: parseInt(countsResult.rows[0]?.trigger_count || '0'),
        provisions: parseInt(countsResult.rows[0]?.provision_count || '0')
      }
    };

    return NextResponse.json(schemaInfo);
  } catch (error: any) {
    console.error('Schema info error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch schema info' },
      { status: 500 }
    );
  }
}
