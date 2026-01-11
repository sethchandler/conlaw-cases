/**
 * Seed triggers table from JSON
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-triggers.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

interface TriggerFromJSON {
  trigger_id: number;
  trigger_type?: string;
  trigger_event: string;
}

async function seedTriggers() {
  console.log('🎯 Seeding triggers table...\n');

  try {
    // Clear existing triggers (this will cascade to case_triggers)
    console.log('🗑️  Clearing existing triggers...');
    await sql`DELETE FROM triggers`;
    console.log('   ✓ Triggers table cleared\n');

    // Load JSON
    const jsonPath = path.join(__dirname, '..', 'trigger-table.json');
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Cannot find trigger-table.json at ${jsonPath}`);
      process.exit(1);
    }

    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const rawData = JSON.parse(jsonContent);
    // Transform title-case keys to expected format
    const triggers: TriggerFromJSON[] = rawData.map((item: any) => ({
      trigger_id: parseInt(item["Trigger ID"].replace('T', ''), 10),
      trigger_type: item["Trigger Type"] || null,
      trigger_event: item["Specific Trigger"]
    }));
    console.log(`📖 Loaded ${triggers.length} triggers from JSON\n`);

    // Insert triggers
    let successCount = 0;
    let errorCount = 0;

    for (const trigger of triggers) {
      try {
        // Use the trigger_id from JSON as the id
        await sql`
          INSERT INTO triggers (id, trigger_type, trigger_event)
          VALUES (
            ${trigger.trigger_id},
            ${trigger.trigger_type || null},
            ${trigger.trigger_event}
          )
        `;

        successCount++;
        console.log(`   ✓ [${trigger.trigger_id}] ${trigger.trigger_event}`);
      } catch (error) {
        console.error(`   ❌ Error inserting trigger ${trigger.trigger_id}:`, error);
        errorCount++;
      }
    }

    // Reset the sequence to the max id + 1
    await sql`SELECT setval('triggers_id_seq', (SELECT MAX(id) FROM triggers))`;

    console.log('\n' + '═'.repeat(60));
    console.log(`✅ Triggers seeding complete!`);
    console.log(`   Successfully inserted: ${successCount} triggers`);
    if (errorCount > 0) {
      console.log(`   ⚠️  Errors: ${errorCount} triggers`);
    }
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error seeding triggers:', error);
    throw error;
  }
}

// Run
seedTriggers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
