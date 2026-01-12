/**
 * Export all database tables to an Excel file with 10 sheets
 */

import { createPool } from '@vercel/postgres';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

function getConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.STORAGE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL
  );
}

async function exportDatabase() {
  const connString = getConnectionString();
  if (!connString) {
    console.error('No database connection string found');
    process.exit(1);
  }

  const pool = createPool({ connectionString: connString });

  console.log('Connecting to database...');

  // Define all tables to export (in order)
  const tables = [
    { name: 'chief_justices', query: 'SELECT * FROM chief_justices ORDER BY start_year' },
    { name: 'cases', query: 'SELECT * FROM cases ORDER BY year, name' },
    { name: 'issues', query: 'SELECT * FROM issues ORDER BY issue_id' },
    { name: 'triggers', query: 'SELECT * FROM triggers ORDER BY trigger_id' },
    { name: 'provisions', query: 'SELECT * FROM provisions ORDER BY provision_id' },
    { name: 'case_issues', query: 'SELECT * FROM case_issues ORDER BY case_id' },
    { name: 'case_triggers', query: 'SELECT * FROM case_triggers ORDER BY case_id' },
    { name: 'case_provisions', query: 'SELECT * FROM case_provisions ORDER BY case_id' },
    { name: 'case_urls', query: 'SELECT * FROM case_urls ORDER BY case_id, source' },
    { name: 'cases_view', query: 'SELECT * FROM cases_view ORDER BY year, name' },
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();

  for (const table of tables) {
    console.log(`Exporting ${table.name}...`);

    try {
      const result = await pool.query(table.query);

      if (result.rows.length === 0) {
        console.log(`  (empty table)`);
        // Create empty sheet with headers if we can infer them
        const emptySheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, table.name);
      } else {
        // For cases_view, convert arrays to strings for readability
        const rows = result.rows.map(row => {
          const newRow: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            if (Array.isArray(value)) {
              newRow[key] = value.join('; ');
            } else if (value instanceof Date) {
              newRow[key] = value.toISOString();
            } else {
              newRow[key] = value;
            }
          }
          return newRow;
        });

        const sheet = XLSX.utils.json_to_sheet(rows);

        // Auto-size columns (approximate)
        const colWidths: { wch: number }[] = [];
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]);
          keys.forEach((key, i) => {
            let maxWidth = key.length;
            rows.forEach(row => {
              const val = row[key];
              if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxWidth) maxWidth = Math.min(len, 50); // Cap at 50
              }
            });
            colWidths[i] = { wch: maxWidth + 2 };
          });
          sheet['!cols'] = colWidths;
        }

        XLSX.utils.book_append_sheet(workbook, sheet, table.name);
        console.log(`  ${result.rows.length} rows`);
      }
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
      // Create empty sheet on error
      const emptySheet = XLSX.utils.json_to_sheet([{ error: error.message }]);
      XLSX.utils.book_append_sheet(workbook, emptySheet, table.name);
    }
  }

  // Write file
  const outputPath = path.join(__dirname, '..', 'conlaw-database-export.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log(`\nExported to: ${outputPath}`);

  await pool.end();
}

exportDatabase().catch(console.error);
