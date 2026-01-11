/**
 * Suggest provision_ids for cases based on their issues
 *
 * Creates a mapping from issue names to likely constitutional provisions,
 * then updates the Cases sheet with suggested provision_ids.
 *
 * Usage: npx tsx scripts/suggest-provisions.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

// Mapping from issue names to provision IDs (with ancestors for explicit linking)
// Format: issue name (lowercase) -> array of provision IDs
const ISSUE_TO_PROVISIONS: Record<string, string[]> = {
  // Commerce and Economic
  'commerce clause': ['A1', 'A1.S8', 'A1.S8.Com'],
  'dormant commerce clause': ['A1', 'A1.S8', 'A1.S8.Com'],
  'taxing and spending clause': ['A1', 'A1.S8', 'A1.S8.TS'],
  'spending clause': ['A1', 'A1.S8', 'A1.S8.Spend'],
  'necessary and proper clause': ['A1', 'A1.S8', 'A1.S8.NP'],
  'contract clause': ['A1', 'A1.S10', 'A1.S10.Con'],
  'takings clause': ['5A', '5A.Tak'],
  'freedom of contract': ['14A', '14A.S1', '14A.S1.DP'],  // Lochner-era substantive due process

  // First Amendment
  'first amendment': ['1A'],
  'free speech': ['1A', '1A.FS'],
  'free speech clause': ['1A', '1A.FS'],
  'freedom of speech': ['1A', '1A.FS'],
  'free press clause': ['1A', '1A.FP'],
  'free exercise clause': ['1A', '1A.FE'],
  'free exercise': ['1A', '1A.FE'],
  'establishment clause': ['1A', '1A.Est'],
  'religious freedom': ['1A', '1A.FE', '1A.Est'],
  'freedom of association': ['1A', '1A.Assoc'],
  'expressive conduct': ['1A', '1A.FS'],
  'hate speech': ['1A', '1A.FS'],
  'academic freedom': ['1A', '1A.FS'],
  'student rights': ['1A', '1A.FS'],

  // Second Amendment
  'second amendment': ['2A'],
  'right to bear arms': ['2A', '2A.Arms'],

  // Fourth Amendment
  'fourth amendment': ['4A'],
  'search and seizure': ['4A', '4A.SS'],

  // Fifth Amendment
  'due process': ['5A', '5A.DP', '14A', '14A.S1', '14A.S1.DP'],  // Both 5th and 14th
  'procedural due process': ['5A', '5A.DP', '14A', '14A.S1', '14A.S1.DP'],
  'double jeopardy': ['5A', '5A.DJ'],
  'self-incrimination': ['5A', '5A.SI'],
  'grand jury': ['5A', '5A.GJ'],

  // Sixth Amendment
  'sixth amendment': ['6A'],
  'right to counsel': ['6A', '6A.Coun'],
  'confrontation clause': ['6A', '6A.Conf'],
  'speedy trial': ['6A', '6A.Spdy'],

  // Seventh Amendment
  'seventh amendment': ['7A'],
  'civil jury trial': ['7A', '7A.Jury'],

  // Eighth Amendment
  'eighth amendment': ['8A'],
  'cruel and unusual punishment': ['8A', '8A.CU'],
  'cruel and unusual punishments': ['8A', '8A.CU'],
  'excessive fines clause': ['8A', '8A.Fine'],
  'excessive bail': ['8A', '8A.Bail'],
  'punitive damages': ['8A', '8A.Fine'],  // Related to excessive fines

  // Ninth Amendment
  'ninth amendment': ['9A'],
  'unenumerated rights': ['9A', '9A.Unen'],

  // Tenth Amendment
  '10th amendment': ['10A'],
  'tenth amendment': ['10A'],
  'reserved powers': ['10A', '10A.Res'],
  'states rights': ['10A', '10A.Res'],

  // Eleventh Amendment
  '11th amendment': ['11A'],
  'eleventh amendment': ['11A'],
  'sovereign immunity': ['11A', '11A.SAS'],

  // Fourteenth Amendment
  '14th amendment': ['14A'],
  'fourteenth amendment': ['14A'],
  'equal protection': ['14A', '14A.S1', '14A.S1.EP'],
  'equal protection clause': ['14A', '14A.S1', '14A.S1.EP'],
  'substantive due process': ['14A', '14A.S1', '14A.S1.DP'],
  'privileges or immunities clause': ['14A', '14A.S1', '14A.S1.PI'],
  'privileges and immunities clause': ['A4', 'A4.S2', 'A4.S2.PI'],  // Article IV version
  'citizenship': ['14A', '14A.S1', '14A.S1.Cit'],
  'citizenship clause': ['14A', '14A.S1', '14A.S1.Cit'],
  'incorporation': ['14A', '14A.S1', '14A.S1.DP'],  // Via due process
  'fundamental rights': ['14A', '14A.S1', '14A.S1.DP'],  // Substantive due process
  'right to privacy': ['14A', '14A.S1', '14A.S1.DP', '9A'],  // Penumbras
  'abortion': ['14A', '14A.S1', '14A.S1.DP'],
  'parental rights': ['14A', '14A.S1', '14A.S1.DP'],
  'right to travel': ['14A', '14A.S1', '14A.S1.PI'],

  // Discrimination/Equal Protection related
  'racial segregation': ['14A', '14A.S1', '14A.S1.EP'],
  'racial discrimination': ['14A', '14A.S1', '14A.S1.EP'],
  'gender discrimination': ['14A', '14A.S1', '14A.S1.EP'],
  'affirmative action': ['14A', '14A.S1', '14A.S1.EP'],
  'discriminatory intent': ['14A', '14A.S1', '14A.S1.EP'],
  'rational basis review': ['14A', '14A.S1', '14A.S1.EP'],

  // Thirteenth Amendment
  '13th amendment': ['13A'],
  'thirteenth amendment': ['13A'],
  'slavery': ['13A', '13A.S1', '13A.S1.Abol'],

  // Fifteenth Amendment
  '15th amendment': ['15A'],
  'fifteenth amendment': ['15A'],
  'voting rights': ['15A', '15A.S1', '15A.S1.VR', '14A', '14A.S1', '14A.S1.EP'],
  'voting rights act': ['15A', '15A.S1', '15A.S2', '15A.S2.Enf'],

  // Other Amendments
  'poll tax': ['24A', '24A.Poll'],
  'presidential succession': ['25A'],

  // Article II - Executive
  'executive power': ['A2', 'A2.S1', 'A2.S1.EVC'],
  'executive removal power': ['A2', 'A2.S2', 'A2.S2.Appt'],
  'appointments clause': ['A2', 'A2.S2', 'A2.S2.Appt'],
  'recess appointments clause': ['A2', 'A2.S2', 'A2.S2.Rec'],
  'commander in chief': ['A2', 'A2.S2', 'A2.S2.CIC'],
  'take care clause': ['A2', 'A2.S3', 'A2.S3.TC'],
  'executive privilege': ['A2', 'A2.S1', 'A2.S1.EVC'],  // Implied
  'executive immunity': ['A2', 'A2.S1', 'A2.S1.EVC'],  // Implied
  'pardon power': ['A2', 'A2.S2', 'A2.S2.Pard'],
  'treaty clause': ['A2', 'A2.S2', 'A2.S2.Tr'],
  'war powers': ['A1', 'A1.S8', 'A1.S8.War', 'A2', 'A2.S2', 'A2.S2.CIC'],
  'foreign affairs': ['A2', 'A2.S2', 'A2.S2.Tr', 'A2.S3', 'A2.S3.Amb'],
  'immigration': ['A1', 'A1.S8', 'A1.S8.Nat'],

  // Article III - Judicial
  'article iii': ['A3'],
  'judicial review': ['A3', 'A3.S1', 'A3.S1.JVC'],  // Marbury
  'standing': ['A3', 'A3.S2', 'A3.S2.CC'],
  'cases or controversies': ['A3', 'A3.S2', 'A3.S2.CC'],
  'federal jurisdiction': ['A3', 'A3.S2'],
  'appellate jurisdiction': ['A3', 'A3.S2', 'A3.S2.AJ'],
  'access to courts': ['A3', 'A3.S2', 'A3.S2.CC', '14A', '14A.S1', '14A.S1.DP'],

  // Separation of Powers
  'separation of powers': ['A1', 'A2', 'A3'],
  'non-delegation doctrine': ['A1', 'A1.S1', 'A1.S1.LVC'],
  'legislative power': ['A1', 'A1.S1', 'A1.S1.LVC'],

  // Federalism
  'federalism': ['A6', 'A6.Supr', '10A', '10A.Res'],
  'federal supremacy': ['A6', 'A6.Supr'],
  'supremacy clause': ['A6', 'A6.Supr'],
  'preemption': ['A6', 'A6.Supr'],

  // Other Article provisions
  'habeas corpus': ['A1', 'A1.S9', 'A1.S9.Susp'],
  'bill of attainder': ['A1', 'A1.S9', 'A1.S9.BoA'],
  'bill of attainder clause': ['A1', 'A1.S9', 'A1.S9.BoA'],
  'ex post facto clause': ['A1', 'A1.S9', 'A1.S9.EPF'],
  'ex post facto': ['A1', 'A1.S9', 'A1.S9.EPF'],
  'full faith and credit': ['A4', 'A4.S1', 'A4.S1.FFC'],
  'guarantee clause': ['A4', 'A4.S4', 'A4.S4.Guar'],
  'republican form of government': ['A4', 'A4.S4', 'A4.S4.Guar'],
  'political question doctrine': ['A4', 'A4.S4', 'A4.S4.Guar'],  // Often arises here
  'redistricting': ['14A', '14A.S1', '14A.S1.EP', 'A4', 'A4.S4', 'A4.S4.Guar'],
  'fugitive slave clause': ['A4', 'A4.S2', 'A4.S2.FS'],

  // Historical/Economic
  'paper money cases': ['A1', 'A1.S8', 'A1.S8.Coin'],
  'implied powers': ['A1', 'A1.S8', 'A1.S8.NP'],
  'police power': ['10A', '10A.Res'],  // State police power
  'state action doctrine': ['14A', '14A.S1'],
  'civil rights': ['14A', '14A.S1', '14A.S1.EP', '13A'],

  // Bill of Rights (general)
  'bill of rights': ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '9A', '10A'],

  // Miscellaneous
  'bivens action': ['4A'],  // Implied remedy
  'remedies': ['A3'],
  'jury selection': ['6A', '6A.Jury', '14A', '14A.S1', '14A.S1.EP'],
  'military tribunals': ['A1', 'A1.S8', 'A1.S8.MilReg', 'A2', 'A2.S2', 'A2.S2.CIC'],
  'affordable care act': ['A1', 'A1.S8', 'A1.S8.Com', 'A1.S8.TS'],
  'natural law': [],  // Not a specific provision
};

function main() {
  console.log('🔍 Suggesting Provision IDs for Cases\n');

  // Read workbook
  const workbookPath = path.join(__dirname, '..', 'conlaw-data.xlsx');
  const workbook = XLSX.readFile(workbookPath);

  // Read Cases sheet
  const casesSheet = workbook.Sheets['Cases'];
  const cases: any[] = XLSX.utils.sheet_to_json(casesSheet);

  // Read Issues sheet to get id -> name mapping
  const issuesSheet = workbook.Sheets['Issues'];
  const issues: any[] = XLSX.utils.sheet_to_json(issuesSheet);
  const issueIdToName = new Map<string, string>();
  issues.forEach(i => issueIdToName.set(i.issue_id, i.name));

  console.log(`Processing ${cases.length} cases...\n`);

  let suggestedCount = 0;
  let noSuggestionCount = 0;
  const unmappedIssues = new Set<string>();

  // Process each case
  cases.forEach(caseRow => {
    const issueIds = (caseRow.issue_ids || '').split(',').map((s: string) => s.trim()).filter(Boolean);

    const allProvisions = new Set<string>();

    issueIds.forEach((issueId: string) => {
      const issueName = issueIdToName.get(issueId);
      if (issueName) {
        const lowerName = issueName.toLowerCase();
        const provisions = ISSUE_TO_PROVISIONS[lowerName];
        if (provisions && provisions.length > 0) {
          provisions.forEach(p => allProvisions.add(p));
        } else {
          unmappedIssues.add(issueName);
        }
      }
    });

    if (allProvisions.size > 0) {
      // Sort provisions logically: articles first, then amendments, then by depth
      const sortedProvisions = Array.from(allProvisions).sort((a, b) => {
        // Articles before amendments
        const aIsArticle = a.startsWith('A') && !a.match(/^\d/);
        const bIsArticle = b.startsWith('A') && !b.match(/^\d/);
        if (aIsArticle && !bIsArticle) return -1;
        if (!aIsArticle && bIsArticle) return 1;

        // Then by ID
        return a.localeCompare(b);
      });

      caseRow.provision_ids = sortedProvisions.join(', ');
      suggestedCount++;
    } else {
      noSuggestionCount++;
    }
  });

  console.log(`✓ Suggested provisions for ${suggestedCount} cases`);
  console.log(`✗ No suggestions for ${noSuggestionCount} cases`);

  if (unmappedIssues.size > 0) {
    console.log(`\n⚠️  Unmapped issues (${unmappedIssues.size}):`);
    Array.from(unmappedIssues).sort().forEach(i => console.log(`   - ${i}`));
  }

  // Write back
  const newCasesSheet = XLSX.utils.json_to_sheet(cases);
  newCasesSheet['!cols'] = [
    { wch: 45 },  // name
    { wch: 6 },   // year
    { wch: 80 },  // description
    { wch: 25 },  // issue_ids
    { wch: 15 },  // trigger_ids
    { wch: 60 },  // provision_ids (wider now)
  ];

  workbook.Sheets['Cases'] = newCasesSheet;
  XLSX.writeFile(workbook, workbookPath);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Updated Cases sheet with suggested provision_ids');
  console.log('   Please review and correct in the spreadsheet!');
  console.log('═'.repeat(60));
}

main();
