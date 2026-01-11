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
 * Search for cases relevant to a query
 * Uses full-text search on name, description, and issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const connString = getConnectionString();
    if (!connString) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Extract potential keywords from the query
    // Remove common words and punctuation
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'and', 'but', 'if', 'or', 'because', 'until', 'while', 'about', 'against',
      'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'it',
      'its', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'he', 'him',
      'his', 'she', 'her', 'they', 'them', 'their', 'i', 'cases', 'case', 'court',
      'supreme', 'tell', 'show', 'explain', 'describe', 'list', 'find', 'get'];

    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    if (keywords.length === 0) {
      // If no keywords, return recent landmark cases
      const result = await pool.query(`
        SELECT * FROM cases_view
        ORDER BY year DESC
        LIMIT $1
      `, [limit]);

      return NextResponse.json({
        success: true,
        cases: result.rows,
        searchTerms: [],
      });
    }

    // Build search query using OR for flexibility
    // Search in name, description, and issues array
    const searchPattern = keywords.map(k => `%${k}%`).join('%');
    const tsQuery = keywords.join(' | '); // PostgreSQL text search OR

    const result = await pool.query(`
      SELECT DISTINCT c.*,
        ts_rank(
          to_tsvector('english', c.name || ' ' || c.description || ' ' || array_to_string(c.issues, ' ')),
          to_tsquery('english', $1)
        ) as rank
      FROM cases_view c
      WHERE
        to_tsvector('english', c.name || ' ' || c.description || ' ' || array_to_string(c.issues, ' '))
        @@ to_tsquery('english', $1)
        OR c.name ILIKE $2
        OR c.description ILIKE $2
        OR EXISTS (SELECT 1 FROM unnest(c.issues) issue WHERE issue ILIKE $2)
      ORDER BY rank DESC, c.year DESC
      LIMIT $3
    `, [tsQuery, `%${keywords[0]}%`, limit]);

    return NextResponse.json({
      success: true,
      cases: result.rows,
      searchTerms: keywords,
    });

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}
