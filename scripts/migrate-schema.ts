/**
 * Database Schema Migration
 *
 * Migrates from the old schema (issues as TEXT[] on cases) to the new schema
 * with controlled vocabulary tables and junction tables.
 *
 * This script:
 * 1. Creates new tables: issues, provisions, case_issues, case_provisions
 * 2. Modifies triggers table to use string IDs
 * 3. Recreates case_triggers with string foreign keys
 * 4. Updates the cases_view
 *
 * The old data will be cleared - run the import script after this.
 *
 * Usage: npx tsx --env-file=.env.local scripts/migrate-schema.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function migrate() {
  console.log('🔄 Migrating Database Schema\n');

  try {
    // === Step 1: Drop existing views and junction tables ===
    console.log('Step 1: Cleaning up existing objects...');

    await sql`DROP VIEW IF EXISTS cases_view CASCADE`;
    console.log('  ✓ Dropped cases_view');

    await sql`DROP TABLE IF EXISTS case_triggers CASCADE`;
    console.log('  ✓ Dropped case_triggers');

    await sql`DROP TABLE IF EXISTS case_issues CASCADE`;
    console.log('  ✓ Dropped case_issues');

    await sql`DROP TABLE IF EXISTS case_provisions CASCADE`;
    console.log('  ✓ Dropped case_provisions');

    await sql`DROP TABLE IF EXISTS triggers CASCADE`;
    console.log('  ✓ Dropped triggers');

    await sql`DROP TABLE IF EXISTS issues CASCADE`;
    console.log('  ✓ Dropped issues');

    await sql`DROP TABLE IF EXISTS provisions CASCADE`;
    console.log('  ✓ Dropped provisions');

    // === Step 2: Create new reference tables ===
    console.log('\nStep 2: Creating reference tables...');

    // Issues table
    await sql`
      CREATE TABLE issues (
        id SERIAL PRIMARY KEY,
        issue_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT
      )
    `;
    console.log('  ✓ Created issues table');

    // Provisions table (self-referential for hierarchy)
    await sql`
      CREATE TABLE provisions (
        id SERIAL PRIMARY KEY,
        provision_id VARCHAR(50) UNIQUE NOT NULL,
        parent_id VARCHAR(50),
        name VARCHAR(200) NOT NULL,
        full_text TEXT
      )
    `;
    console.log('  ✓ Created provisions table');

    // Add self-referential foreign key after table exists
    await sql`
      ALTER TABLE provisions
      ADD CONSTRAINT provisions_parent_fk
      FOREIGN KEY (parent_id) REFERENCES provisions(provision_id)
      ON DELETE SET NULL
    `;
    console.log('  ✓ Added provisions parent_id foreign key');

    // Triggers table (with string IDs)
    await sql`
      CREATE TABLE triggers (
        id SERIAL PRIMARY KEY,
        trigger_id VARCHAR(20) UNIQUE NOT NULL,
        trigger_type VARCHAR(100),
        trigger_event VARCHAR(500) NOT NULL
      )
    `;
    console.log('  ✓ Created triggers table');

    // === Step 3: Modify cases table ===
    console.log('\nStep 3: Modifying cases table...');

    // Check if issues column exists and drop it
    const { rows: columns } = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'cases' AND column_name = 'issues'
    `;

    if (columns.length > 0) {
      await sql`ALTER TABLE cases DROP COLUMN IF EXISTS issues`;
      console.log('  ✓ Dropped issues column from cases');
    } else {
      console.log('  ✓ issues column already removed from cases');
    }

    // === Step 4: Create junction tables ===
    console.log('\nStep 4: Creating junction tables...');

    // case_issues
    await sql`
      CREATE TABLE case_issues (
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        issue_id VARCHAR(20) NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
        PRIMARY KEY (case_id, issue_id)
      )
    `;
    console.log('  ✓ Created case_issues table');

    // case_triggers
    await sql`
      CREATE TABLE case_triggers (
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        trigger_id VARCHAR(20) NOT NULL REFERENCES triggers(trigger_id) ON DELETE CASCADE,
        PRIMARY KEY (case_id, trigger_id)
      )
    `;
    console.log('  ✓ Created case_triggers table');

    // case_provisions
    await sql`
      CREATE TABLE case_provisions (
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        provision_id VARCHAR(50) NOT NULL REFERENCES provisions(provision_id) ON DELETE CASCADE,
        PRIMARY KEY (case_id, provision_id)
      )
    `;
    console.log('  ✓ Created case_provisions table');

    // === Step 5: Create indexes ===
    console.log('\nStep 5: Creating indexes...');

    await sql`CREATE INDEX idx_case_issues_case ON case_issues(case_id)`;
    await sql`CREATE INDEX idx_case_issues_issue ON case_issues(issue_id)`;
    await sql`CREATE INDEX idx_case_triggers_case ON case_triggers(case_id)`;
    await sql`CREATE INDEX idx_case_triggers_trigger ON case_triggers(trigger_id)`;
    await sql`CREATE INDEX idx_case_provisions_case ON case_provisions(case_id)`;
    await sql`CREATE INDEX idx_case_provisions_provision ON case_provisions(provision_id)`;
    await sql`CREATE INDEX idx_provisions_parent ON provisions(parent_id)`;
    await sql`CREATE INDEX idx_triggers_type ON triggers(trigger_type)`;
    console.log('  ✓ Created all indexes');

    // === Step 6: Create case_urls table ===
    console.log('\nStep 6: Creating case_urls table...');

    await sql`DROP TABLE IF EXISTS case_urls CASCADE`;

    await sql`
      CREATE TABLE case_urls (
        id SERIAL PRIMARY KEY,
        case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        source VARCHAR(50) NOT NULL,
        url VARCHAR(500) NOT NULL,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(case_id, source)
      )
    `;
    console.log('  ✓ Created case_urls table');

    await sql`CREATE INDEX idx_case_urls_case ON case_urls(case_id)`;
    await sql`CREATE INDEX idx_case_urls_source ON case_urls(source)`;
    console.log('  ✓ Created case_urls indexes');

    // === Step 7: Create updated view ===
    console.log('\nStep 7: Creating cases_view...');

    await sql`
      CREATE VIEW cases_view AS
      SELECT
        c.id,
        c.name,
        c.year,
        c.description,
        c.chief_justice_id,
        cj.name as chief_justice_name,
        cj.start_year as chief_justice_start,
        cj.end_year as chief_justice_end,
        ARRAY_AGG(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) as issues,
        ARRAY_AGG(DISTINCT i.issue_id) FILTER (WHERE i.issue_id IS NOT NULL) as issue_ids,
        ARRAY_AGG(DISTINCT t.trigger_type) FILTER (WHERE t.trigger_type IS NOT NULL) as trigger_types,
        ARRAY_AGG(DISTINCT t.trigger_event) FILTER (WHERE t.trigger_event IS NOT NULL) as trigger_events,
        ARRAY_AGG(DISTINCT t.trigger_id) FILTER (WHERE t.trigger_id IS NOT NULL) as trigger_ids,
        ARRAY_AGG(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL) as provisions,
        ARRAY_AGG(DISTINCT p.provision_id) FILTER (WHERE p.provision_id IS NOT NULL) as provision_ids,
        (SELECT url FROM case_urls WHERE case_id = c.id AND source = 'oyez' LIMIT 1) as oyez_url,
        (SELECT url FROM case_urls WHERE case_id = c.id AND source = 'cornell' LIMIT 1) as cornell_url,
        (SELECT url FROM case_urls WHERE case_id = c.id AND source = 'justia' LIMIT 1) as justia_url
      FROM cases c
      LEFT JOIN chief_justices cj ON c.chief_justice_id = cj.id
      LEFT JOIN case_issues ci ON c.id = ci.case_id
      LEFT JOIN issues i ON ci.issue_id = i.issue_id
      LEFT JOIN case_triggers ct ON c.id = ct.case_id
      LEFT JOIN triggers t ON ct.trigger_id = t.trigger_id
      LEFT JOIN case_provisions cp ON c.id = cp.case_id
      LEFT JOIN provisions p ON cp.provision_id = p.provision_id
      GROUP BY c.id, c.name, c.year, c.description, c.chief_justice_id,
               cj.name, cj.start_year, cj.end_year
    `;
    console.log('  ✓ Created cases_view with URL columns');

    // === Step 8: Clear cases table (will be repopulated by import) ===
    console.log('\nStep 8: Clearing cases table...');
    await sql`DELETE FROM cases`;
    console.log('  ✓ Cleared cases table');

    // === Done ===
    console.log('\n' + '═'.repeat(60));
    console.log('✅ Schema migration complete!');
    console.log('');
    console.log('Next step: Run the import script to populate data');
    console.log('  npx tsx --env-file=.env.local scripts/import-spreadsheet.ts');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
