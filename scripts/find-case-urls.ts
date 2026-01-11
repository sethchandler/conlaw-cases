/**
 * Case URL Finder
 *
 * Searches for Supreme Court cases on Oyez.org and Cornell LII,
 * then updates the spreadsheet with found URLs.
 *
 * Usage: npx tsx scripts/find-case-urls.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const SPREADSHEET_PATH = path.join(__dirname, '..', 'conlaw-data.xlsx');
const CITATIONS_PATH = path.join(__dirname, '..', 'con-law-citations.json');
const PROGRESS_PATH = path.join(__dirname, '..', 'data', 'url-finder-progress.json');
const DELAY_MS = 2000; // 2 seconds between API requests - be kind to Oyez

interface Citation {
  name: string;
  volume: number | string;
  page: number | string;
}

interface CaseRow {
  name: string;
  year: number;
  description: string;
  chief_justice: string;
  issue_ids: string;
  trigger_ids: string;
  provision_ids: string;
}

interface OyezCase {
  ID: number;
  name: string;
  href: string;
  docket_number: string;
  term: string;
  first_party: string;
  second_party: string;
  citation?: {
    volume: string;
    page: string;
    year: string;
  };
}

interface CaseUrl {
  case_name: string;
  oyez_url: string | null;
  cornell_url: string | null;
  justia_url: string | null;
  citation: string | null;
  status: string;
}

// Load citations from JSON file
function loadCitations(): Map<string, Citation> {
  const citationMap = new Map<string, Citation>();
  if (fs.existsSync(CITATIONS_PATH)) {
    try {
      const data: Citation[] = JSON.parse(fs.readFileSync(CITATIONS_PATH, 'utf-8'));
      for (const citation of data) {
        // Store by normalized name for matching
        citationMap.set(normalizeName(citation.name), citation);
      }
      console.log(`Loaded ${data.length} citations from con-law-citations.json`);
    } catch (err) {
      console.warn('Warning: Could not load citations file:', err);
    }
  } else {
    console.log('No citations file found - will search Oyez for all cases');
  }
  return citationMap;
}

// Check if citation has valid volume/page
function hasValidCitation(citation: Citation | undefined): citation is Citation {
  if (!citation) return false;
  return (
    typeof citation.volume === 'number' &&
    typeof citation.page === 'number'
  );
}

// Normalize case name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/v\.\s*/g, 'v. ')
    .replace(/,?\s*et\s*al\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract key parties from case name
function extractParties(name: string): { first: string; second: string } | null {
  const match = name.match(/^(.+?)\s+v\.\s+(.+?)(?:\s*\(|$)/i);
  if (match) {
    return {
      first: match[1].trim(),
      second: match[2].trim()
    };
  }
  return null;
}

// Search Oyez API for a case
async function searchOyez(caseName: string): Promise<OyezCase | null> {
  const parties = extractParties(caseName);
  if (!parties) {
    console.log(`  Could not parse parties from: ${caseName}`);
    return null;
  }

  // Try different search strategies
  const searchTerms = [
    parties.first,
    parties.second,
    `${parties.first} ${parties.second}`,
  ];

  for (const term of searchTerms) {
    try {
      const encodedTerm = encodeURIComponent(term);
      const url = `https://api.oyez.org/cases?filter=name:${encodedTerm}&per_page=20`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ConLaw Cases Research Tool',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        continue;
      }

      const cases: OyezCase[] = await response.json();
      if (!Array.isArray(cases) || cases.length === 0) {
        continue;
      }

      // Find best match
      const normalizedInput = normalizeName(caseName);
      for (const oyezCase of cases) {
        const normalizedOyez = normalizeName(oyezCase.name);

        // Check for match
        if (normalizedOyez === normalizedInput ||
            normalizedOyez.includes(normalizeName(parties.first)) &&
            normalizedOyez.includes(normalizeName(parties.second))) {
          return oyezCase;
        }
      }

      // If no exact match, try partial match on first result
      if (cases.length > 0) {
        const firstCase = cases[0];
        const normalizedFirst = normalizeName(firstCase.name);
        if (normalizedFirst.includes(normalizeName(parties.first)) ||
            normalizedFirst.includes(normalizeName(parties.second))) {
          return firstCase;
        }
      }
    } catch (error) {
      // Continue to next search term
    }
  }

  return null;
}

// Get full case details from Oyez (includes citation)
async function getOyezCaseDetails(href: string): Promise<{ citation?: { volume: string; page: string; year: string } } | null> {
  try {
    const response = await fetch(href, {
      headers: {
        'User-Agent': 'ConLaw Cases Research Tool',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}

// Build URLs from citation info
function buildUrls(citation: { volume: string; page: string }): { cornell: string; justia: string } {
  const { volume, page } = citation;
  return {
    cornell: `https://www.law.cornell.edu/supremecourt/text/${volume}/${page}`,
    justia: `https://supreme.justia.com/cases/federal/us/${volume}/${page}/`
  };
}

// Format citation string
function formatCitation(citation: { volume: string; page: string; year?: string }): string {
  return `${citation.volume} U.S. ${citation.page}${citation.year ? ` (${citation.year})` : ''}`;
}

// Rate limiting helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load previous progress if it exists
function loadProgress(): Map<string, CaseUrl> {
  const progressMap = new Map<string, CaseUrl>();
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8'));
      for (const item of data) {
        progressMap.set(item.case_name, item);
      }
    } catch {
      // Ignore corrupt progress file
    }
  }
  return progressMap;
}

// Save progress incrementally
function saveProgress(results: CaseUrl[]) {
  // Ensure data directory exists
  const dataDir = path.dirname(PROGRESS_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(results, null, 2));
}

async function findCaseUrls() {
  console.log('🔍 Case URL Finder\n');
  console.log('═'.repeat(60));
  console.log(`Rate limit: ${DELAY_MS}ms between requests (be kind to Oyez)`);
  console.log('Progress is saved after each case - safe to interrupt\n');

  // Read the spreadsheet
  if (!fs.existsSync(SPREADSHEET_PATH)) {
    console.error('❌ Spreadsheet not found:', SPREADSHEET_PATH);
    console.log('Run: npm run create-spreadsheet');
    process.exit(1);
  }

  const workbook = XLSX.readFile(SPREADSHEET_PATH);
  const casesSheet = workbook.Sheets['Cases'];

  if (!casesSheet) {
    console.error('❌ Cases sheet not found in spreadsheet');
    process.exit(1);
  }

  const cases: CaseRow[] = XLSX.utils.sheet_to_json(casesSheet);

  // Load previous progress
  const previousProgress = loadProgress();
  const results: CaseUrl[] = [];

  // Copy over any previously found results
  for (const caseData of cases) {
    const prev = previousProgress.get(caseData.name);
    if (prev) {
      results.push(prev);
    }
  }

  const alreadyProcessed = previousProgress.size;
  if (alreadyProcessed > 0) {
    console.log(`Found ${alreadyProcessed} cases from previous run - resuming...\n`);
  }

  // Load citations
  const citations = loadCitations();

  console.log(`\nTotal cases: ${cases.length}`);
  console.log(`Already processed: ${alreadyProcessed}`);
  console.log(`Remaining: ${cases.length - alreadyProcessed}\n`);

  let found = results.filter(r => r.status === 'found').length;
  let partial = results.filter(r => r.status === 'partial').length;
  let notFound = results.filter(r => r.status === 'not_found').length;
  let processed = alreadyProcessed;

  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i];
    const caseName = caseData.name;

    // Skip if already processed
    if (previousProgress.has(caseName)) {
      continue;
    }

    processed++;
    process.stdout.write(`[${processed}/${cases.length}] ${caseName.substring(0, 40).padEnd(40)} `);

    // Check if we have a citation for this case
    const knownCitation = citations.get(normalizeName(caseName));
    const hasCitation = hasValidCitation(knownCitation);

    let result: CaseUrl = {
      case_name: caseName,
      oyez_url: null,
      cornell_url: null,
      justia_url: null,
      citation: null,
      status: 'not_found'
    };

    // If we have a valid citation, we can build Cornell/Justia URLs directly
    if (hasCitation) {
      const urls = buildUrls({ volume: String(knownCitation.volume), page: String(knownCitation.page) });
      result.cornell_url = urls.cornell;
      result.justia_url = urls.justia;
      result.citation = `${knownCitation.volume} U.S. ${knownCitation.page}`;
    }

    // Search Oyez for the Oyez URL (even if we have citation, we want Oyez link)
    const oyezCase = await searchOyez(caseName);

    if (oyezCase) {
      result.oyez_url = oyezCase.href.replace('api.oyez.org', 'www.oyez.org');

      // If we didn't have a citation, try to get it from Oyez
      if (!hasCitation) {
        await delay(DELAY_MS);
        const details = await getOyezCaseDetails(oyezCase.href);
        const oyezCitation = details?.citation || oyezCase.citation;

        if (oyezCitation?.volume && oyezCitation?.page) {
          const urls = buildUrls(oyezCitation);
          result.cornell_url = urls.cornell;
          result.justia_url = urls.justia;
          result.citation = formatCitation(oyezCitation);
        }
      }
    }

    // Determine status
    if (result.oyez_url && result.cornell_url) {
      result.status = 'found';
      console.log(`✓ Found (${result.citation})`);
      found++;
    } else if (result.cornell_url || result.oyez_url) {
      result.status = 'partial';
      const has = result.oyez_url ? 'Oyez only' : 'citation only';
      console.log(`◐ Partial (${has})`);
      partial++;
    } else {
      result.status = 'not_found';
      console.log('✗ Not found');
      notFound++;
    }

    results.push(result);

    // Save progress after each case
    saveProgress(results);

    // Rate limiting - be kind to the API
    await delay(DELAY_MS);
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n📊 Results Summary:`);
  console.log(`  Found (full):  ${found} cases`);
  console.log(`  Partial:       ${partial} cases (Oyez or citation only)`);
  console.log(`  Not found:     ${notFound} cases`);

  // Add Case URLs sheet to spreadsheet
  console.log('\n📝 Updating spreadsheet...');

  // Remove existing Case URLs sheet if it exists
  if (workbook.Sheets['Case URLs']) {
    const sheetIndex = workbook.SheetNames.indexOf('Case URLs');
    if (sheetIndex > -1) {
      workbook.SheetNames.splice(sheetIndex, 1);
      delete workbook.Sheets['Case URLs'];
    }
  }

  // Create new sheet
  const urlsSheet = XLSX.utils.json_to_sheet(results);

  // Set column widths
  urlsSheet['!cols'] = [
    { wch: 50 },  // case_name
    { wch: 60 },  // oyez_url
    { wch: 60 },  // cornell_url
    { wch: 60 },  // justia_url
    { wch: 20 },  // citation
    { wch: 12 },  // status
  ];

  XLSX.utils.book_append_sheet(workbook, urlsSheet, 'Case URLs');

  // Save
  XLSX.writeFile(workbook, SPREADSHEET_PATH);
  console.log('✓ Added "Case URLs" sheet to spreadsheet');

  // Also save a JSON backup
  const jsonPath = path.join(__dirname, '..', 'data', 'case-urls.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✓ Saved backup to ${jsonPath}`);

  // Clean up progress file on successful completion
  if (fs.existsSync(PROGRESS_PATH)) {
    fs.unlinkSync(PROGRESS_PATH);
    console.log('✓ Cleaned up progress file');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ URL finding complete!');
  console.log('\nNext steps:');
  console.log('  1. Review the "Case URLs" sheet in conlaw-data.xlsx');
  console.log('  2. Manually fix any missing URLs');
  console.log('  3. Run npm run migrate (if not done already)');
  console.log('  4. Run npm run import to update the database');
  console.log('═'.repeat(60));
}

findCaseUrls().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
