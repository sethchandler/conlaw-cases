/**
 * Run SQL schema to add triggers tables
 * Usage: npx tsx --env-file=.env.local scripts/run-schema.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function runSchema() {
  console.log('🚀 Adding triggers tables to database...\n');

  try {
    // Create triggers table
    console.log('📋 Creating triggers table...');
    await sql`
      CREATE TABLE IF NOT EXISTS triggers (
        id SERIAL PRIMARY KEY,
        trigger_type VARCHAR(100),
        trigger_event VARCHAR(500) NOT NULL
      )
    `;
    console.log('   ✓ triggers table created\n');

    // Create junction table
    console.log('🔗 Creating case_triggers junction table...');
    await sql`
      CREATE TABLE IF NOT EXISTS case_triggers (
        id SERIAL PRIMARY KEY,
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        trigger_id INTEGER NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
        UNIQUE(case_id, trigger_id)
      )
    `;
    console.log('   ✓ case_triggers table created\n');

    // Create indexes
    console.log('📇 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_case_triggers_case_id ON case_triggers(case_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_case_triggers_trigger_id ON case_triggers(trigger_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_triggers_type ON triggers(trigger_type)`;
    console.log('   ✓ indexes created\n');

    // Update the view
    console.log('👁️  Updating cases_view view...');
    await sql`DROP VIEW IF EXISTS cases_view`;
    await sql`
      CREATE VIEW cases_view AS
      SELECT
        c.id,
        c.name,
        c.year,
        c.description,
        c.chief_justice_id,
        c.issues,
        cj.name as chief_justice_name,
        cj.start_year as chief_justice_start,
        cj.end_year as chief_justice_end,
        ARRAY_AGG(DISTINCT t.trigger_type) FILTER (WHERE t.trigger_type IS NOT NULL) as trigger_types,
        ARRAY_AGG(DISTINCT t.trigger_event) FILTER (WHERE t.trigger_event IS NOT NULL) as trigger_events
      FROM cases c
      LEFT JOIN chief_justices cj ON c.chief_justice_id = cj.id
      LEFT JOIN case_triggers ct ON c.id = ct.case_id
      LEFT JOIN triggers t ON ct.trigger_id = t.id
      GROUP BY c.id, c.name, c.year, c.description, c.chief_justice_id, c.issues,
               cj.name, cj.start_year, cj.end_year
    `;
    console.log('   ✓ view updated\n');

    console.log('═'.repeat(60));
    console.log('✅ Schema update complete!');
    console.log('   Next steps:');
    console.log('   1. npm run seed:triggers');
    console.log('   2. npm run seed:case-triggers');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error running schema:', error);
    throw error;
  }
}

runSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
