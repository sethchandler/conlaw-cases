/**
 * Create Excel spreadsheet from current JSON data
 *
 * Reads existing JSON files and creates conlaw-data.xlsx with:
 * - Cases (with issue_ids and trigger_ids)
 * - Issues (controlled vocabulary extracted from cases)
 * - Triggers (from trigger-table.json)
 * - Provisions (empty template)
 * - Chief Justices (hardcoded historical data)
 *
 * Usage: npx tsx scripts/create-spreadsheet.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface CaseFromJSON {
  name: string;
  year: number;
  description: string;
  issues: string[];
}

interface TriggerFromJSON {
  "Trigger ID": string;
  "Trigger Type": string;
  "Specific Trigger": string;
}

interface JunctionFromJSON {
  "Case Name": string;
  "Trigger ID": string;
}

interface ChiefJustice {
  name: string;
  start_year: number;
  end_year: number | null;
  appointed_by: string;
}

// Chief Justices data (historical, rarely changes)
const CHIEF_JUSTICES: ChiefJustice[] = [
  { name: "John Jay", start_year: 1789, end_year: 1795, appointed_by: "George Washington" },
  { name: "John Rutledge", start_year: 1795, end_year: 1795, appointed_by: "George Washington" },
  { name: "Oliver Ellsworth", start_year: 1796, end_year: 1800, appointed_by: "George Washington" },
  { name: "John Marshall", start_year: 1801, end_year: 1835, appointed_by: "John Adams" },
  { name: "Roger B. Taney", start_year: 1836, end_year: 1864, appointed_by: "Andrew Jackson" },
  { name: "Salmon P. Chase", start_year: 1864, end_year: 1873, appointed_by: "Abraham Lincoln" },
  { name: "Morrison Waite", start_year: 1874, end_year: 1888, appointed_by: "Ulysses S. Grant" },
  { name: "Melville Fuller", start_year: 1888, end_year: 1910, appointed_by: "Grover Cleveland" },
  { name: "Edward Douglass White", start_year: 1910, end_year: 1921, appointed_by: "William Howard Taft" },
  { name: "William Howard Taft", start_year: 1921, end_year: 1930, appointed_by: "Warren G. Harding" },
  { name: "Charles Evans Hughes", start_year: 1930, end_year: 1941, appointed_by: "Herbert Hoover" },
  { name: "Harlan F. Stone", start_year: 1941, end_year: 1946, appointed_by: "Franklin D. Roosevelt" },
  { name: "Fred M. Vinson", start_year: 1946, end_year: 1953, appointed_by: "Harry S. Truman" },
  { name: "Earl Warren", start_year: 1953, end_year: 1969, appointed_by: "Dwight D. Eisenhower" },
  { name: "Warren E. Burger", start_year: 1969, end_year: 1986, appointed_by: "Richard Nixon" },
  { name: "William Rehnquist", start_year: 1986, end_year: 2005, appointed_by: "Ronald Reagan" },
  { name: "John Roberts", start_year: 2005, end_year: null, appointed_by: "George W. Bush" },
];

function main() {
  console.log('📊 Creating ConLaw Data Spreadsheet\n');

  // Read JSON files
  const casesPath = path.join(__dirname, '..', 'con-law-cases.json');
  const triggersPath = path.join(__dirname, '..', 'trigger-table.json');
  const junctionPath = path.join(__dirname, '..', 'case-trigger-junction-table.json');

  console.log('Reading JSON files...');

  const cases: CaseFromJSON[] = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  console.log(`  ✓ Cases: ${cases.length}`);

  const triggers: TriggerFromJSON[] = JSON.parse(fs.readFileSync(triggersPath, 'utf-8'));
  console.log(`  ✓ Triggers: ${triggers.length}`);

  const junctions: JunctionFromJSON[] = JSON.parse(fs.readFileSync(junctionPath, 'utf-8'));
  console.log(`  ✓ Junctions: ${junctions.length}`);

  // Extract unique issues and assign IDs
  console.log('\nExtracting issues...');
  const issueSet = new Set<string>();
  cases.forEach(c => c.issues.forEach(i => issueSet.add(i)));
  const issuesList = Array.from(issueSet).sort();

  const issueIdMap = new Map<string, string>();
  issuesList.forEach((issue, idx) => {
    const id = `I${String(idx + 1).padStart(2, '0')}`;
    issueIdMap.set(issue, id);
  });
  console.log(`  ✓ Found ${issuesList.length} unique issues`);

  // Build case name to trigger ID mapping
  const caseTriggerMap = new Map<string, string[]>();
  junctions.forEach(j => {
    const existing = caseTriggerMap.get(j["Case Name"]) || [];
    existing.push(j["Trigger ID"]);
    caseTriggerMap.set(j["Case Name"], existing);
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // === Sheet 1: Cases ===
  console.log('\nCreating Cases sheet...');
  const casesData = cases.map(c => {
    const issueIds = c.issues.map(i => issueIdMap.get(i)).filter(Boolean).join(', ');
    const triggerIds = (caseTriggerMap.get(c.name) || []).join(', ');

    return {
      name: c.name,
      year: c.year,
      description: c.description,
      issue_ids: issueIds,
      trigger_ids: triggerIds,
      provision_ids: '' // Empty for now - user will fill
    };
  });

  const casesSheet = XLSX.utils.json_to_sheet(casesData);
  // Set column widths
  casesSheet['!cols'] = [
    { wch: 45 },  // name
    { wch: 6 },   // year
    { wch: 80 },  // description
    { wch: 25 },  // issue_ids
    { wch: 15 },  // trigger_ids
    { wch: 25 },  // provision_ids
  ];
  XLSX.utils.book_append_sheet(workbook, casesSheet, 'Cases');
  console.log(`  ✓ ${casesData.length} cases`);

  // === Sheet 2: Issues ===
  console.log('Creating Issues sheet...');
  const issuesData = issuesList.map(issue => ({
    issue_id: issueIdMap.get(issue),
    name: issue,
    description: ''
  }));

  const issuesSheet = XLSX.utils.json_to_sheet(issuesData);
  issuesSheet['!cols'] = [
    { wch: 8 },   // issue_id
    { wch: 35 },  // name
    { wch: 60 },  // description
  ];
  XLSX.utils.book_append_sheet(workbook, issuesSheet, 'Issues');
  console.log(`  ✓ ${issuesData.length} issues`);

  // === Sheet 3: Triggers ===
  console.log('Creating Triggers sheet...');
  const triggersData = triggers.map(t => ({
    trigger_id: t["Trigger ID"],
    trigger_type: t["Trigger Type"],
    trigger_event: t["Specific Trigger"]
  }));

  const triggersSheet = XLSX.utils.json_to_sheet(triggersData);
  triggersSheet['!cols'] = [
    { wch: 10 },  // trigger_id
    { wch: 25 },  // trigger_type
    { wch: 60 },  // trigger_event
  ];
  XLSX.utils.book_append_sheet(workbook, triggersSheet, 'Triggers');
  console.log(`  ✓ ${triggersData.length} triggers`);

  // === Sheet 4: Provisions ===
  console.log('Creating Provisions sheet (template)...');
  // Create with example rows to show structure
  const provisionsData = [
    { provision_id: 'A1', parent_id: '', name: 'Article I', full_text: '' },
    { provision_id: 'A1.S8', parent_id: 'A1', name: 'Article I, Section 8', full_text: '' },
    { provision_id: 'A1.S8.Com', parent_id: 'A1.S8', name: 'Commerce Clause', full_text: 'To regulate Commerce with foreign Nations, and among the several States, and with the Indian Tribes' },
    { provision_id: '14A', parent_id: '', name: '14th Amendment', full_text: '' },
    { provision_id: '14A.S1', parent_id: '14A', name: '14th Amendment, Section 1', full_text: '' },
    { provision_id: '14A.S1.Cit', parent_id: '14A.S1', name: 'Citizenship Clause', full_text: 'All persons born or naturalized in the United States, and subject to the jurisdiction thereof, are citizens of the United States and of the State wherein they reside.' },
    { provision_id: '14A.S1.PP', parent_id: '14A.S1', name: 'Privileges or Immunities Clause', full_text: 'No State shall make or enforce any law which shall abridge the privileges or immunities of citizens of the United States' },
    { provision_id: '14A.S1.DP', parent_id: '14A.S1', name: 'Due Process Clause (14th)', full_text: 'nor shall any State deprive any person of life, liberty, or property, without due process of law' },
    { provision_id: '14A.S1.EP', parent_id: '14A.S1', name: 'Equal Protection Clause', full_text: 'nor deny to any person within its jurisdiction the equal protection of the laws' },
    { provision_id: '1A', parent_id: '', name: '1st Amendment', full_text: '' },
    { provision_id: '1A.Est', parent_id: '1A', name: 'Establishment Clause', full_text: 'Congress shall make no law respecting an establishment of religion' },
    { provision_id: '1A.FE', parent_id: '1A', name: 'Free Exercise Clause', full_text: 'or prohibiting the free exercise thereof' },
    { provision_id: '1A.FS', parent_id: '1A', name: 'Free Speech Clause', full_text: 'or abridging the freedom of speech' },
    { provision_id: '1A.FP', parent_id: '1A', name: 'Free Press Clause', full_text: 'or of the press' },
  ];

  const provisionsSheet = XLSX.utils.json_to_sheet(provisionsData);
  provisionsSheet['!cols'] = [
    { wch: 15 },  // provision_id
    { wch: 12 },  // parent_id
    { wch: 35 },  // name
    { wch: 80 },  // full_text
  ];
  XLSX.utils.book_append_sheet(workbook, provisionsSheet, 'Provisions');
  console.log(`  ✓ ${provisionsData.length} example provisions (expand as needed)`);

  // === Sheet 5: Chief Justices ===
  console.log('Creating Chief Justices sheet...');
  const cjData = CHIEF_JUSTICES.map(cj => ({
    name: cj.name,
    start_year: cj.start_year,
    end_year: cj.end_year ?? '',
    appointed_by: cj.appointed_by
  }));

  const cjSheet = XLSX.utils.json_to_sheet(cjData);
  cjSheet['!cols'] = [
    { wch: 25 },  // name
    { wch: 12 },  // start_year
    { wch: 12 },  // end_year
    { wch: 25 },  // appointed_by
  ];
  XLSX.utils.book_append_sheet(workbook, cjSheet, 'Chief Justices');
  console.log(`  ✓ ${cjData.length} chief justices`);

  // Write file
  const outputPath = path.join(__dirname, '..', 'conlaw-data.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Created: ${outputPath}`);
  console.log('═'.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Open conlaw-data.xlsx in Excel/Google Sheets');
  console.log('2. Review and fix any data issues');
  console.log('3. Expand the Provisions sheet with all constitutional provisions');
  console.log('4. Add provision_ids to each case in the Cases sheet');
  console.log('5. Run the import script when ready');
}

main();
