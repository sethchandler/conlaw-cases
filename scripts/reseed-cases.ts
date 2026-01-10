/**
 * Re-seed cases from JSON
 * Clears existing cases and reloads from conlaw-cases.json
 *
 * Usage: npx tsx --env-file=.env.local scripts/reseed-cases.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

interface CaseFromJSON {
  name: string;
  year: number;
  description: string;
  chief_justice: string;
  issues: string[];
}

interface ChiefJusticeDB {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
}

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

async function reseedCases() {
  console.log('🔄 Re-seeding cases table...\n');

  try {
    // Step 1: Clear existing cases
    console.log('🗑️  Clearing existing cases...');
    await sql`DELETE FROM cases`;
    console.log('   ✓ Cases table cleared\n');

    // Step 2: Load chief justices
    console.log('📚 Loading chief justices from database...');
    const { rows: chiefJustices } = await sql<ChiefJusticeDB>`
      SELECT id, name, start_year, end_year
      FROM chief_justices
      ORDER BY start_year
    `;

    if (chiefJustices.length === 0) {
      console.error('❌ No chief justices found! Run seed-chief-justices.ts first.');
      process.exit(1);
    }
    console.log(`   ✓ Loaded ${chiefJustices.length} chief justices\n`);

    // Step 3: Load JSON
    const jsonPath = path.join(__dirname, '..', 'conlaw-cases.json');
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Cannot find conlaw-cases.json at ${jsonPath}`);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const cases: CaseFromJSON[] = JSON.parse(jsonContent);
    console.log(`📖 Loaded ${cases.length} cases from JSON\n`);

    // Step 4: Insert cases
    let successCount = 0;
    let errorCount = 0;

    for (const caseData of cases) {
      try {
        const chiefJusticeId = findChiefJusticeForYear(caseData.year, chiefJustices);

        if (!chiefJusticeId) {
          console.warn(`⚠️  No chief justice found for ${caseData.name} (${caseData.year})`);
          errorCount++;
          continue;
        }

        const issuesArray = `{${caseData.issues.map(issue => `"${issue.replace(/"/g, '\\"')}"`).join(',')}}`;

        await sql`
          INSERT INTO cases (name, year, description, chief_justice_id, issues)
          VALUES (
            ${caseData.name},
            ${caseData.year},
            ${caseData.description},
            ${chiefJusticeId},
            ${issuesArray}::text[]
          )
        `;

        successCount++;
        console.log(`   ✓ ${caseData.name} (${caseData.year})`);
      } catch (error) {
        console.error(`   ❌ Error inserting ${caseData.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`✅ Re-seeding complete!`);
    console.log(`   Successfully inserted: ${successCount} cases`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount} cases`);
    }
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error re-seeding cases:', error);
    throw error;
  }
}

// Run
reseedCases()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
