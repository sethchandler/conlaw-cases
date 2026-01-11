/**
 * Import Spreadsheet to Database
 *
 * Reads conlaw-data.xlsx and populates all database tables.
 *
 * Workflow:
 * 1. Read and validate all sheets
 * 2. Clear existing data (in correct order for foreign keys)
 * 3. Insert reference tables: issues, triggers, provisions
 * 4. Insert cases (with chief_justice_id lookup)
 * 5. Insert junction tables: case_issues, case_triggers, case_provisions
 *
 * Usage: npx tsx --env-file=.env.local scripts/import-spreadsheet.ts [path-to-xlsx]
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';
import * as XLSX from 'xlsx';
import * as path from 'path';

// Types
interface IssueRow {
  issue_id: string;
  name: string;
  description?: string;
}

interface TriggerRow {
  trigger_id: string;
  trigger_type: string;
  trigger_event: string;
}

interface ProvisionRow {
  provision_id: string;
  parent_id?: string;
  name: string;
  full_text?: string;
}

interface ChiefJusticeRow {
  name: string;
  start_year: number;
  end_year?: number | string;
  appointed_by: string;
}

interface CaseRow {
  name: string;
  year: number;
  description: string;
  issue_ids?: string;
  trigger_ids?: string;
  provision_ids?: string;
}

interface ChiefJusticeDB {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
}

// Validation errors
const errors: string[] = [];
const warnings: string[] = [];

function addError(msg: string) {
  errors.push(msg);
}

function addWarning(msg: string) {
  warnings.push(msg);
}

// Parse comma-separated IDs
function parseIds(str: string | undefined): string[] {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

// Find chief justice for a given year
function findChiefJusticeForYear(year: number, cjs: ChiefJusticeDB[]): number | null {
  for (const cj of cjs) {
    if (year >= cj.start_year && (cj.end_year === null || year <= cj.end_year)) {
      return cj.id;
    }
  }
  return null;
}

async function importSpreadsheet(xlsxPath: string) {
  console.log('📥 Importing Spreadsheet to Database\n');
  console.log(`File: ${xlsxPath}\n`);

  // === Step 1: Read spreadsheet ===
  console.log('Step 1: Reading spreadsheet...');

  const workbook = XLSX.readFile(xlsxPath);

  const casesSheet = workbook.Sheets['Cases'];
  const issuesSheet = workbook.Sheets['Issues'];
  const triggersSheet = workbook.Sheets['Triggers'];
  const provisionsSheet = workbook.Sheets['Provisions'];
  const cjSheet = workbook.Sheets['Chief Justices'];

  if (!casesSheet) throw new Error('Cases sheet not found');
  if (!issuesSheet) throw new Error('Issues sheet not found');
  if (!triggersSheet) throw new Error('Triggers sheet not found');
  if (!provisionsSheet) throw new Error('Provisions sheet not found');
  if (!cjSheet) throw new Error('Chief Justices sheet not found');

  const cases: CaseRow[] = XLSX.utils.sheet_to_json(casesSheet);
  const issues: IssueRow[] = XLSX.utils.sheet_to_json(issuesSheet);
  const triggers: TriggerRow[] = XLSX.utils.sheet_to_json(triggersSheet);
  const provisions: ProvisionRow[] = XLSX.utils.sheet_to_json(provisionsSheet);
  const chiefJustices: ChiefJusticeRow[] = XLSX.utils.sheet_to_json(cjSheet);

  console.log(`  ✓ Cases: ${cases.length}`);
  console.log(`  ✓ Issues: ${issues.length}`);
  console.log(`  ✓ Triggers: ${triggers.length}`);
  console.log(`  ✓ Provisions: ${provisions.length}`);
  console.log(`  ✓ Chief Justices: ${chiefJustices.length}`);

  // === Step 2: Validate data ===
  console.log('\nStep 2: Validating data...');

  // Build lookup sets
  const issueIds = new Set(issues.map(i => i.issue_id));
  const triggerIds = new Set(triggers.map(t => t.trigger_id));
  const provisionIds = new Set(provisions.map(p => p.provision_id));
  const caseNames = new Set<string>();

  // Check for duplicate case names
  cases.forEach(c => {
    if (caseNames.has(c.name)) {
      addError(`Duplicate case name: ${c.name}`);
    }
    caseNames.add(c.name);
  });

  // Check issue references
  cases.forEach(c => {
    const ids = parseIds(c.issue_ids);
    ids.forEach(id => {
      if (!issueIds.has(id)) {
        addError(`Case "${c.name}" references unknown issue: ${id}`);
      }
    });
  });

  // Check trigger references
  cases.forEach(c => {
    const ids = parseIds(c.trigger_ids);
    ids.forEach(id => {
      if (!triggerIds.has(id)) {
        addError(`Case "${c.name}" references unknown trigger: ${id}`);
      }
    });
  });

  // Check provision references
  cases.forEach(c => {
    const ids = parseIds(c.provision_ids);
    ids.forEach(id => {
      if (!provisionIds.has(id)) {
        addWarning(`Case "${c.name}" references unknown provision: ${id}`);
      }
    });
  });

  // Check provision parent references
  provisions.forEach(p => {
    if (p.parent_id && !provisionIds.has(p.parent_id)) {
      addError(`Provision "${p.provision_id}" references unknown parent: ${p.parent_id}`);
    }
  });

  // Check for cases without any issues
  cases.forEach(c => {
    if (!c.issue_ids || parseIds(c.issue_ids).length === 0) {
      addWarning(`Case "${c.name}" has no issues`);
    }
  });

  if (errors.length > 0) {
    console.log('\n❌ Validation failed:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log('\nPlease fix these errors in the spreadsheet and try again.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(`  ⚠️  ${warnings.length} warnings (non-fatal):`);
    warnings.slice(0, 5).forEach(w => console.log(`    - ${w}`));
    if (warnings.length > 5) {
      console.log(`    ... and ${warnings.length - 5} more`);
    }
  } else {
    console.log('  ✓ All validations passed');
  }

  // === Step 3: Clear existing data ===
  console.log('\nStep 3: Clearing existing data...');

  await sql`DELETE FROM case_provisions`;
  await sql`DELETE FROM case_triggers`;
  await sql`DELETE FROM case_issues`;
  await sql`DELETE FROM cases`;
  await sql`DELETE FROM provisions`;
  await sql`DELETE FROM triggers`;
  await sql`DELETE FROM issues`;
  // Keep chief_justices - they rarely change
  console.log('  ✓ Cleared junction and reference tables');

  // === Step 4: Insert reference tables ===
  console.log('\nStep 4: Inserting reference tables...');

  // Insert issues
  for (const issue of issues) {
    await sql`
      INSERT INTO issues (issue_id, name, description)
      VALUES (${issue.issue_id}, ${issue.name}, ${issue.description || null})
    `;
  }
  console.log(`  ✓ Inserted ${issues.length} issues`);

  // Insert triggers
  for (const trigger of triggers) {
    await sql`
      INSERT INTO triggers (trigger_id, trigger_type, trigger_event)
      VALUES (${trigger.trigger_id}, ${trigger.trigger_type || null}, ${trigger.trigger_event})
    `;
  }
  console.log(`  ✓ Inserted ${triggers.length} triggers`);

  // Insert provisions (sorted to ensure parents exist before children)
  // First pass: provisions without parents
  for (const prov of provisions.filter(p => !p.parent_id)) {
    await sql`
      INSERT INTO provisions (provision_id, parent_id, name, full_text)
      VALUES (${prov.provision_id}, ${null}, ${prov.name}, ${prov.full_text || null})
    `;
  }

  // Subsequent passes: provisions with parents (may need multiple passes for deep hierarchy)
  const insertedProvisions = new Set(provisions.filter(p => !p.parent_id).map(p => p.provision_id));
  let remaining = provisions.filter(p => p.parent_id);
  let maxPasses = 10;

  while (remaining.length > 0 && maxPasses > 0) {
    const toInsert = remaining.filter(p => insertedProvisions.has(p.parent_id!));
    for (const prov of toInsert) {
      await sql`
        INSERT INTO provisions (provision_id, parent_id, name, full_text)
        VALUES (${prov.provision_id}, ${prov.parent_id || null}, ${prov.name}, ${prov.full_text || null})
      `;
      insertedProvisions.add(prov.provision_id);
    }
    remaining = remaining.filter(p => !insertedProvisions.has(p.provision_id));
    maxPasses--;
  }

  if (remaining.length > 0) {
    console.log(`  ⚠️  Could not insert ${remaining.length} provisions (circular or missing parent)`);
  }
  console.log(`  ✓ Inserted ${insertedProvisions.size} provisions`);

  // === Step 5: Insert cases ===
  console.log('\nStep 5: Inserting cases...');

  // Get chief justices from database
  const { rows: cjRows } = await sql<ChiefJusticeDB>`
    SELECT id, name, start_year, end_year FROM chief_justices ORDER BY start_year
  `;

  // Build case name to ID mapping
  const caseNameToId = new Map<string, number>();

  for (const caseRow of cases) {
    const chiefJusticeId = findChiefJusticeForYear(caseRow.year, cjRows);

    const result = await sql`
      INSERT INTO cases (name, year, description, chief_justice_id)
      VALUES (${caseRow.name}, ${caseRow.year}, ${caseRow.description}, ${chiefJusticeId})
      RETURNING id
    `;

    caseNameToId.set(caseRow.name, result.rows[0].id);
  }
  console.log(`  ✓ Inserted ${cases.length} cases`);

  // === Step 6: Insert junction tables ===
  console.log('\nStep 6: Inserting junction tables...');

  let issueLinks = 0;
  let triggerLinks = 0;
  let provisionLinks = 0;

  for (const caseRow of cases) {
    const caseId = caseNameToId.get(caseRow.name)!;

    // Insert case_issues
    const issueIdList = parseIds(caseRow.issue_ids);
    for (const issueId of issueIdList) {
      if (issueIds.has(issueId)) {
        await sql`
          INSERT INTO case_issues (case_id, issue_id)
          VALUES (${caseId}, ${issueId})
          ON CONFLICT DO NOTHING
        `;
        issueLinks++;
      }
    }

    // Insert case_triggers
    const triggerIdList = parseIds(caseRow.trigger_ids);
    for (const triggerId of triggerIdList) {
      if (triggerIds.has(triggerId)) {
        await sql`
          INSERT INTO case_triggers (case_id, trigger_id)
          VALUES (${caseId}, ${triggerId})
          ON CONFLICT DO NOTHING
        `;
        triggerLinks++;
      }
    }

    // Insert case_provisions
    const provisionIdList = parseIds(caseRow.provision_ids);
    for (const provisionId of provisionIdList) {
      if (provisionIds.has(provisionId)) {
        await sql`
          INSERT INTO case_provisions (case_id, provision_id)
          VALUES (${caseId}, ${provisionId})
          ON CONFLICT DO NOTHING
        `;
        provisionLinks++;
      }
    }
  }

  console.log(`  ✓ Inserted ${issueLinks} case-issue links`);
  console.log(`  ✓ Inserted ${triggerLinks} case-trigger links`);
  console.log(`  ✓ Inserted ${provisionLinks} case-provision links`);

  // === Done ===
  console.log('\n' + '═'.repeat(60));
  console.log('✅ Import complete!');
  console.log('');
  console.log('Summary:');
  console.log(`  - ${cases.length} cases`);
  console.log(`  - ${issues.length} issues`);
  console.log(`  - ${triggers.length} triggers`);
  console.log(`  - ${insertedProvisions.size} provisions`);
  console.log(`  - ${issueLinks + triggerLinks + provisionLinks} junction links`);
  console.log('═'.repeat(60));
}

// Main
const xlsxPath = process.argv[2] || path.join(__dirname, '..', 'conlaw-data.xlsx');
importSpreadsheet(xlsxPath)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
