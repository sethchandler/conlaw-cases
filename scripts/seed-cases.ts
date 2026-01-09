/**
 * Seed script for Constitutional Law Cases
 * Reads from conlaw-cases.json and populates the cases table
 * Automatically looks up chief_justice_id based on case year
 *
 * Usage: npx tsx scripts/seed-cases.ts
 */

import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

interface CaseFromJSON {
  name: string;
  year: number;
  description: string;
  chief_justice: string; // This will be replaced with chief_justice_id
  issues: string[];
}

interface ChiefJusticeDB {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
}

/**
 * Find the appropriate chief justice for a given year
 */
function findChiefJusticeForYear(
  year: number,
  chiefJustices: ChiefJusticeDB[]
): number | null {
  for (const cj of chiefJustices) {
    if (year >= cj.start_year && (cj.end_year === null || year <= cj.end_year)) {
      return cj.id;
    }
  }
  return null;
}

async function seedCases() {
  console.log('🌱 Seeding cases table...');

  try {
    // Check if cases table has data
    const { rows: caseRows } = await sql`SELECT COUNT(*) as count FROM cases`;
    const count = parseInt(caseRows[0].count);

    if (count > 0) {
      console.log(`⚠️  Cases table already contains ${count} records.`);
      console.log('   Clear the table first if you want to re-seed.');
      console.log('   Run: DELETE FROM cases;');
      return;
    }

    // Load chief justices from database
    console.log('📚 Loading chief justices from database...');
    const { rows: chiefJustices } = await sql<ChiefJusticeDB>`
      SELECT id, name, start_year, end_year
      FROM chief_justices
      ORDER BY start_year
    `;

    if (chiefJustices.length === 0) {
      console.error('❌ No chief justices found in database!');
      console.error('   Please run seed-chief-justices.ts first.');
      process.exit(1);
    }

    console.log(`   ✓ Loaded ${chiefJustices.length} chief justices`);

    // Read cases from JSON file
    const jsonPath = path.join(__dirname, '..', 'conlaw-cases.json');
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Cannot find conlaw-cases.json at ${jsonPath}`);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const cases: CaseFromJSON[] = JSON.parse(jsonContent);

    console.log(`📖 Loaded ${cases.length} cases from JSON`);
    console.log('');

    // Insert each case
    let successCount = 0;
    let errorCount = 0;

    for (const caseData of cases) {
      try {
        // Find the appropriate chief justice
        const chiefJusticeId = findChiefJusticeForYear(caseData.year, chiefJustices);

        if (!chiefJusticeId) {
          console.warn(
            `⚠️  No chief justice found for ${caseData.name} (${caseData.year})`
          );
          console.warn(`   Expected: ${caseData.chief_justice}`);
          console.warn('   Skipping this case...');
          errorCount++;
          continue;
        }

        // Insert the case
        await sql`
          INSERT INTO cases (name, year, description, chief_justice_id, issues)
          VALUES (
            ${caseData.name},
            ${caseData.year},
            ${caseData.description},
            ${chiefJusticeId},
            ${caseData.issues}
          )
        `;

        successCount++;
        console.log(`   ✓ ${caseData.name} (${caseData.year})`);
      } catch (error) {
        console.error(`   ❌ Error inserting ${caseData.name}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log(`✅ Seeding complete!`);
    console.log(`   Successfully inserted: ${successCount} cases`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount} cases`);
    }
    console.log('═'.repeat(60));
  } catch (error) {
    console.error('❌ Error seeding cases:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedCases()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedCases };
