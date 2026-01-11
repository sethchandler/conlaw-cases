/**
 * Seed case_triggers junction table from JSON
 * Links cases to their triggers using case name lookup
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-case-triggers.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

interface CaseTriggerFromJSON {
  case_name: string;
  trigger_id: number;
}

interface CaseDB {
  id: number;
  name: string;
}

async function seedCaseTriggers() {
  console.log('🔗 Seeding case_triggers junction table...\n');

  try {
    // Clear existing case_triggers
    console.log('🗑️  Clearing existing case_triggers...');
    await sql`DELETE FROM case_triggers`;
    console.log('   ✓ case_triggers table cleared\n');

    // Load all cases from database for name lookup
    console.log('📚 Loading cases from database...');
    const { rows: cases } = await sql<CaseDB>`
      SELECT id, name FROM cases
    `;

    if (cases.length === 0) {
      console.error('❌ No cases found! Run seed-cases.ts first.');
      process.exit(1);
    }
    console.log(`   ✓ Loaded ${cases.length} cases\n`);

    // Create a map for case name -> id lookup
    // We'll try exact match first, then fuzzy match
    const caseMap = new Map<string, number>();
    for (const c of cases) {
      caseMap.set(c.name.toLowerCase(), c.id);
    }

    // Load JSON
    const jsonPath = path.join(__dirname, '..', 'case-trigger-junction-table.json');
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Cannot find case-trigger-junction-table.json at ${jsonPath}`);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const rawData = JSON.parse(jsonContent);
    // Transform title-case keys to expected format
    const caseTriggers: CaseTriggerFromJSON[] = rawData.map((item: any) => ({
      case_name: item["Case Name"],
      trigger_id: parseInt(item["Trigger ID"].replace('T', ''), 10)
    }));
    console.log(`📖 Loaded ${caseTriggers.length} case-trigger relationships from JSON\n`);

    // Insert case_triggers
    let successCount = 0;
    let errorCount = 0;
    const notFoundCases: string[] = [];

    for (const ct of caseTriggers) {
      try {
        // Look up case_id by name (case-insensitive)
        let caseId = caseMap.get(ct.case_name.toLowerCase());

        // If not found, try partial match
        if (!caseId) {
          for (const [name, id] of caseMap.entries()) {
            if (name.includes(ct.case_name.toLowerCase()) ||
                ct.case_name.toLowerCase().includes(name)) {
              caseId = id;
              break;
            }
          }
        }

        if (!caseId) {
          if (!notFoundCases.includes(ct.case_name)) {
            notFoundCases.push(ct.case_name);
            console.warn(`   ⚠️  Case not found: "${ct.case_name}"`);
          }
          errorCount++;
          continue;
        }

        await sql`
          INSERT INTO case_triggers (case_id, trigger_id)
          VALUES (${caseId}, ${ct.trigger_id})
          ON CONFLICT (case_id, trigger_id) DO NOTHING
        `;

        successCount++;
        console.log(`   ✓ ${ct.case_name} → trigger ${ct.trigger_id}`);
      } catch (error) {
        console.error(`   ❌ Error inserting case_trigger for ${ct.case_name}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`✅ Case-triggers seeding complete!`);
    console.log(`   Successfully inserted: ${successCount} relationships`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Skipped: ${errorCount} (cases not found)`);
    }
    if (notFoundCases.length > 0) {
      console.log(`\n   Cases not found in database:`);
      for (const name of notFoundCases) {
        console.log(`      - ${name}`);
      }
    }
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error seeding case_triggers:', error);
    throw error;
  }
}

// Run
seedCaseTriggers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
