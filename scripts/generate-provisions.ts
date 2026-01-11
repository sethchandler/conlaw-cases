/**
 * Generate comprehensive Provisions sheet and update spreadsheet
 *
 * Creates hierarchical provision IDs:
 * - Articles: A1, A2, A3, A4, A5, A6, A7
 * - Sections: A1.S1, A1.S8, A2.S1, etc.
 * - Amendments: 1A, 2A, 3A, ... 14A, ... 27A
 * - Amendment Sections: 13A.S1, 14A.S1, etc.
 * - Clauses: Short codes under their parent
 *
 * Usage: npx tsx scripts/generate-provisions.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

interface Provision {
  provision_id: string;
  parent_id: string;
  name: string;
  full_text: string;
}

const provisions: Provision[] = [];

// Helper to add provision
function add(id: string, parent: string, name: string, text: string = '') {
  provisions.push({ provision_id: id, parent_id: parent, name, full_text: text });
}

// === ARTICLE I ===
add('A1', '', 'Article I', '');
add('A1.S1', 'A1', 'Article I, Section 1', '');
add('A1.S1.LVC', 'A1.S1', 'Legislative Vesting Clause', 'All legislative Powers herein granted shall be vested in a Congress of the United States...');

add('A1.S2', 'A1', 'Article I, Section 2', '');
add('A1.S2.Qual', 'A1.S2', 'Qualifications Clause for Representatives', '');
add('A1.S2.Appt', 'A1.S2', 'Apportionment Clause', '');
add('A1.S2.Cens', 'A1.S2', 'Census Clause', '');
add('A1.S2.Imp', 'A1.S2', 'Impeachment Power Clause', '');

add('A1.S6', 'A1', 'Article I, Section 6', '');
add('A1.S6.SD', 'A1.S6', 'Speech or Debate Clause', '');

add('A1.S7', 'A1', 'Article I, Section 7', '');
add('A1.S7.Orig', 'A1.S7', 'Origination Clause', '');
add('A1.S7.Rev', 'A1.S7', 'Revenue Clause', '');
add('A1.S7.Pres', 'A1.S7', 'Presentment Clause', '');
add('A1.S7.ORV', 'A1.S7', 'Orders, Resolutions, and Votes Clause', '');

add('A1.S8', 'A1', 'Article I, Section 8', '');
add('A1.S8.TS', 'A1.S8', 'Taxing and Spending Clause', '');
add('A1.S8.Spend', 'A1.S8', 'Spending Clause', '');
add('A1.S8.GW', 'A1.S8', 'General Welfare Clause', '');
add('A1.S8.CD', 'A1.S8', 'Common Defense Clause', '');
add('A1.S8.Unif', 'A1.S8', 'Uniformity Clause', '');
add('A1.S8.Borr', 'A1.S8', 'Borrowing Clause', '');
add('A1.S8.Com', 'A1.S8', 'Commerce Clause', 'To regulate Commerce with foreign Nations, and among the several States, and with the Indian Tribes');
add('A1.S8.Nat', 'A1.S8', 'Naturalization Clause', '');
add('A1.S8.Bank', 'A1.S8', 'Bankruptcy Clause', '');
add('A1.S8.Coin', 'A1.S8', 'Coinage Clause', '');
add('A1.S8.Ctft', 'A1.S8', 'Counterfeiting Clause', '');
add('A1.S8.WM', 'A1.S8', 'Weights and Measures Clause', '');
add('A1.S8.Post', 'A1.S8', 'Postal Clause', '');
add('A1.S8.Copy', 'A1.S8', 'Copyright Clause', '');
add('A1.S8.Pat', 'A1.S8', 'Patent Clause', '');
add('A1.S8.Trib', 'A1.S8', 'Inferior Tribunals Clause', '');
add('A1.S8.Pir', 'A1.S8', 'Piracies and Felonies Clause', '');
add('A1.S8.War', 'A1.S8', 'War Powers Clause', '');
add('A1.S8.Capt', 'A1.S8', 'Captures Clause', '');
add('A1.S8.Army', 'A1.S8', 'Army Clause', '');
add('A1.S8.Navy', 'A1.S8', 'Navy Clause', '');
add('A1.S8.MilReg', 'A1.S8', 'Military Regulations Clause', '');
add('A1.S8.Mil', 'A1.S8', 'Militias Clause', '');
add('A1.S8.OrgMil', 'A1.S8', 'Organizing Militia Clause', '');
add('A1.S8.Encl', 'A1.S8', 'Enclave Clause', '');
add('A1.S8.NP', 'A1.S8', 'Necessary and Proper Clause', 'To make all Laws which shall be necessary and proper for carrying into Execution the foregoing Powers...');

add('A1.S9', 'A1', 'Article I, Section 9', '');
add('A1.S9.Mig', 'A1.S9', 'Migration or Importation Clause', '');
add('A1.S9.1808', 'A1.S9', '1808 Clause', '');
add('A1.S9.Susp', 'A1.S9', 'Suspension Clause', 'The Privilege of the Writ of Habeas Corpus shall not be suspended, unless when in Cases of Rebellion or Invasion the public Safety may require it.');
add('A1.S9.BoA', 'A1.S9', 'Bill of Attainder Clause', '');
add('A1.S9.EPF', 'A1.S9', 'Ex Post Facto Clause', '');
add('A1.S9.DT', 'A1.S9', 'Direct Tax Clause', '');
add('A1.S9.Exp', 'A1.S9', 'Export Clause', '');
add('A1.S9.Appr', 'A1.S9', 'Appropriations Clause', '');
add('A1.S9.Emol', 'A1.S9', 'Emoluments Clause (Legislative)', '');
add('A1.S9.Nob', 'A1.S9', 'Title of Nobility Clause', '');

add('A1.S10', 'A1', 'Article I, Section 10', '');
add('A1.S10.Con', 'A1.S10', 'Contract Clause', 'No State shall... pass any... Law impairing the Obligation of Contracts');
add('A1.S10.IE', 'A1.S10', 'Import-Export Clause', '');

// === ARTICLE II ===
add('A2', '', 'Article II', '');
add('A2.S1', 'A2', 'Article II, Section 1', '');
add('A2.S1.EVC', 'A2.S1', 'Executive Vesting Clause', 'The executive Power shall be vested in a President of the United States of America.');
add('A2.S1.Elec', 'A2.S1', 'Electors Clause', '');
add('A2.S1.ECC', 'A2.S1', 'Electoral College Count Clause', '');
add('A2.S1.EV', 'A2.S1', 'Electoral Votes Clause', '');
add('A2.S1.NBC', 'A2.S1', 'Natural-Born Citizen Clause', '');
add('A2.S1.Qual', 'A2.S1', 'Presidential Qualifications Clause', '');
add('A2.S1.Succ', 'A2.S1', 'Succession Clause', '');
add('A2.S1.Comp', 'A2.S1', 'Presidential Compensation Clause', '');
add('A2.S1.Emol', 'A2.S1', 'Presidential Emoluments Clause', '');
add('A2.S1.Oath', 'A2.S1', 'Presidential Oath Clause', '');

add('A2.S2', 'A2', 'Article II, Section 2', '');
add('A2.S2.CIC', 'A2.S2', 'Commander in Chief Clause', '');
add('A2.S2.Opin', 'A2.S2', 'Opinion Clause', '');
add('A2.S2.Pard', 'A2.S2', 'Pardon Clause', '');
add('A2.S2.Tr', 'A2.S2', 'Treaty Clause', '');
add('A2.S2.Appt', 'A2.S2', 'Appointments Clause', '');
add('A2.S2.AC', 'A2.S2', 'Advice and Consent Clause', '');
add('A2.S2.Rec', 'A2.S2', 'Recess Appointments Clause', '');

add('A2.S3', 'A2', 'Article II, Section 3', '');
add('A2.S3.SOU', 'A2.S3', 'State of the Union Clause', '');
add('A2.S3.Rec', 'A2.S3', 'Recommendation Clause', '');
add('A2.S3.Conv', 'A2.S3', 'Convene Congress Clause', '');
add('A2.S3.Adj', 'A2.S3', 'Adjournment Clause', '');
add('A2.S3.Amb', 'A2.S3', 'Receive Ambassadors Clause', '');
add('A2.S3.TC', 'A2.S3', 'Take Care Clause', '...he shall take Care that the Laws be faithfully executed...');
add('A2.S3.Comm', 'A2.S3', 'Commission Officers Clause', '');

add('A2.S4', 'A2', 'Article II, Section 4', '');
add('A2.S4.Imp', 'A2.S4', 'Presidential Impeachment Clause', '');

// === ARTICLE III ===
add('A3', '', 'Article III', '');
add('A3.S1', 'A3', 'Article III, Section 1', '');
add('A3.S1.JVC', 'A3.S1', 'Judicial Vesting Clause', 'The judicial Power of the United States, shall be vested in one supreme Court, and in such inferior Courts as the Congress may from time to time ordain and establish.');
add('A3.S1.GB', 'A3.S1', 'Good Behavior Clause', '');
add('A3.S1.Comp', 'A3.S1', 'Judicial Compensation Clause', '');

add('A3.S2', 'A3', 'Article III, Section 2', '');
add('A3.S2.CC', 'A3.S2', 'Cases or Controversies Clause', '');
add('A3.S2.OJ', 'A3.S2', 'Original Jurisdiction Clause', '');
add('A3.S2.AJ', 'A3.S2', 'Appellate Jurisdiction Clause', '');
add('A3.S2.Exc', 'A3.S2', 'Exceptions Clause', '');
add('A3.S2.Jury', 'A3.S2', 'Jury Trial Clause (Criminal)', '');

add('A3.S3', 'A3', 'Article III, Section 3', '');
add('A3.S3.Tr', 'A3.S3', 'Treason Clause', '');
add('A3.S3.TrP', 'A3.S3', 'Treason Punishment Clause', '');

// === ARTICLE IV ===
add('A4', '', 'Article IV', '');
add('A4.S1', 'A4', 'Article IV, Section 1', '');
add('A4.S1.FFC', 'A4.S1', 'Full Faith and Credit Clause', '');

add('A4.S2', 'A4', 'Article IV, Section 2', '');
add('A4.S2.PI', 'A4.S2', 'Privileges and Immunities Clause (Article IV)', '');
add('A4.S2.Ext', 'A4.S2', 'Extradition Clause', '');
add('A4.S2.FS', 'A4.S2', 'Fugitive Slave Clause', '');

add('A4.S3', 'A4', 'Article IV, Section 3', '');
add('A4.S3.Adm', 'A4.S3', 'Admissions Clause', '');
add('A4.S3.Prop', 'A4.S3', 'Property Clause', '');

add('A4.S4', 'A4', 'Article IV, Section 4', '');
add('A4.S4.Guar', 'A4.S4', 'Guarantee Clause', '');

// === ARTICLE V ===
add('A5', '', 'Article V', '');
add('A5.Amend', 'A5', 'Amendment Clause', '');

// === ARTICLE VI ===
add('A6', '', 'Article VI', '');
add('A6.Debt', 'A6', 'Debts Clause', '');
add('A6.Supr', 'A6', 'Supremacy Clause', 'This Constitution, and the Laws of the United States which shall be made in Pursuance thereof... shall be the supreme Law of the Land');
add('A6.Oath', 'A6', 'Oaths Clause', '');
add('A6.RT', 'A6', 'Religious Test Clause', '');

// === ARTICLE VII ===
add('A7', '', 'Article VII', '');
add('A7.Rat', 'A7', 'Ratification Clause', '');

// === FIRST AMENDMENT ===
add('1A', '', 'First Amendment', 'Congress shall make no law respecting an establishment of religion, or prohibiting the free exercise thereof; or abridging the freedom of speech, or of the press; or the right of the people peaceably to assemble, and to petition the Government for a redress of grievances.');
add('1A.Est', '1A', 'Establishment Clause', 'Congress shall make no law respecting an establishment of religion');
add('1A.FE', '1A', 'Free Exercise Clause', 'or prohibiting the free exercise thereof');
add('1A.FS', '1A', 'Free Speech Clause', 'or abridging the freedom of speech');
add('1A.FP', '1A', 'Free Press Clause', 'or of the press');
add('1A.Asm', '1A', 'Assembly Clause', 'or the right of the people peaceably to assemble');
add('1A.Pet', '1A', 'Petition Clause', 'and to petition the Government for a redress of grievances');
add('1A.Assoc', '1A', 'Freedom of Association (Implied)', '');

// === SECOND AMENDMENT ===
add('2A', '', 'Second Amendment', 'A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed.');
add('2A.Arms', '2A', 'Right to Bear Arms Clause', '');

// === THIRD AMENDMENT ===
add('3A', '', 'Third Amendment', '');
add('3A.Quar', '3A', 'Quartering Clause', '');

// === FOURTH AMENDMENT ===
add('4A', '', 'Fourth Amendment', 'The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated...');
add('4A.SS', '4A', 'Search and Seizure Clause', '');
add('4A.War', '4A', 'Warrants Clause', '');

// === FIFTH AMENDMENT ===
add('5A', '', 'Fifth Amendment', '');
add('5A.GJ', '5A', 'Grand Jury Clause', '');
add('5A.DJ', '5A', 'Double Jeopardy Clause', '');
add('5A.SI', '5A', 'Self-Incrimination Clause', '');
add('5A.DP', '5A', 'Due Process Clause (Fifth Amendment)', 'nor be deprived of life, liberty, or property, without due process of law');
add('5A.Tak', '5A', 'Takings Clause', 'nor shall private property be taken for public use, without just compensation');

// === SIXTH AMENDMENT ===
add('6A', '', 'Sixth Amendment', '');
add('6A.Spdy', '6A', 'Speedy Trial Clause', '');
add('6A.Pub', '6A', 'Public Trial Clause', '');
add('6A.Jury', '6A', 'Impartial Jury Clause', '');
add('6A.Info', '6A', 'Information Clause', '');
add('6A.Conf', '6A', 'Confrontation Clause', '');
add('6A.Comp', '6A', 'Compulsory Process Clause', '');
add('6A.Coun', '6A', 'Assistance of Counsel Clause', '');

// === SEVENTH AMENDMENT ===
add('7A', '', 'Seventh Amendment', '');
add('7A.Jury', '7A', 'Civil Jury Trial Clause', '');

// === EIGHTH AMENDMENT ===
add('8A', '', 'Eighth Amendment', '');
add('8A.Bail', '8A', 'Excessive Bail Clause', '');
add('8A.Fine', '8A', 'Excessive Fines Clause', '');
add('8A.CU', '8A', 'Cruel and Unusual Punishments Clause', '');

// === NINTH AMENDMENT ===
add('9A', '', 'Ninth Amendment', 'The enumeration in the Constitution, of certain rights, shall not be construed to deny or disparage others retained by the people.');
add('9A.Unen', '9A', 'Unenumerated Rights Clause', '');

// === TENTH AMENDMENT ===
add('10A', '', 'Tenth Amendment', 'The powers not delegated to the United States by the Constitution, nor prohibited by it to the States, are reserved to the States respectively, or to the people.');
add('10A.Res', '10A', 'Reserved Powers Clause', '');

// === ELEVENTH AMENDMENT ===
add('11A', '', 'Eleventh Amendment', '');
add('11A.SAS', '11A', 'Suits Against States Clause', '');

// === TWELFTH AMENDMENT ===
add('12A', '', 'Twelfth Amendment', '');
add('12A.Elec', '12A', 'Election of President Clause', '');

// === THIRTEENTH AMENDMENT ===
add('13A', '', 'Thirteenth Amendment', '');
add('13A.S1', '13A', 'Thirteenth Amendment, Section 1', '');
add('13A.S1.Abol', '13A.S1', 'Slavery Abolition Clause', 'Neither slavery nor involuntary servitude, except as a punishment for crime whereof the party shall have been duly convicted, shall exist within the United States...');
add('13A.S2', '13A', 'Thirteenth Amendment, Section 2', '');
add('13A.S2.Enf', '13A.S2', 'Enforcement Clause (13th)', '');

// === FOURTEENTH AMENDMENT ===
add('14A', '', 'Fourteenth Amendment', '');
add('14A.S1', '14A', 'Fourteenth Amendment, Section 1', '');
add('14A.S1.Cit', '14A.S1', 'Citizenship Clause', 'All persons born or naturalized in the United States, and subject to the jurisdiction thereof, are citizens of the United States and of the State wherein they reside.');
add('14A.S1.PI', '14A.S1', 'Privileges or Immunities Clause', 'No State shall make or enforce any law which shall abridge the privileges or immunities of citizens of the United States');
add('14A.S1.DP', '14A.S1', 'Due Process Clause (Fourteenth Amendment)', 'nor shall any State deprive any person of life, liberty, or property, without due process of law');
add('14A.S1.EP', '14A.S1', 'Equal Protection Clause', 'nor deny to any person within its jurisdiction the equal protection of the laws');

add('14A.S2', '14A', 'Fourteenth Amendment, Section 2', '');
add('14A.S2.Appt', '14A.S2', 'Apportionment Clause (14th)', '');

add('14A.S3', '14A', 'Fourteenth Amendment, Section 3', '');
add('14A.S3.Disq', '14A.S3', 'Disqualification Clause', '');

add('14A.S4', '14A', 'Fourteenth Amendment, Section 4', '');
add('14A.S4.Debt', '14A.S4', 'Public Debt Clause', '');

add('14A.S5', '14A', 'Fourteenth Amendment, Section 5', '');
add('14A.S5.Enf', '14A.S5', 'Enforcement Clause (14th)', '');

// === FIFTEENTH AMENDMENT ===
add('15A', '', 'Fifteenth Amendment', '');
add('15A.S1', '15A', 'Fifteenth Amendment, Section 1', '');
add('15A.S1.VR', '15A.S1', 'Voting Rights Clause (15th)', '');
add('15A.S2', '15A', 'Fifteenth Amendment, Section 2', '');
add('15A.S2.Enf', '15A.S2', 'Enforcement Clause (15th)', '');

// === SIXTEENTH AMENDMENT ===
add('16A', '', 'Sixteenth Amendment', '');
add('16A.Tax', '16A', 'Income Tax Clause', '');

// === SEVENTEENTH AMENDMENT ===
add('17A', '', 'Seventeenth Amendment', '');
add('17A.Pop', '17A', 'Popular Election of Senators Clause', '');

// === EIGHTEENTH AMENDMENT ===
add('18A', '', 'Eighteenth Amendment (Repealed)', '');
add('18A.S1', '18A', 'Eighteenth Amendment, Section 1', '');
add('18A.S1.Proh', '18A.S1', 'Prohibition Clause', '');
add('18A.S2', '18A', 'Eighteenth Amendment, Section 2', '');
add('18A.S2.Enf', '18A.S2', 'Enforcement Clause (18th)', '');

// === NINETEENTH AMENDMENT ===
add('19A', '', 'Nineteenth Amendment', '');
add('19A.WS', '19A', 'Women\'s Suffrage Clause', '');

// === TWENTIETH AMENDMENT ===
add('20A', '', 'Twentieth Amendment', '');
add('20A.S1', '20A', 'Twentieth Amendment, Section 1', '');
add('20A.S1.LD', '20A.S1', 'Lame Duck Clause', '');
add('20A.S3', '20A', 'Twentieth Amendment, Section 3', '');
add('20A.S3.Succ', '20A.S3', 'Presidential Succession Clause (20th)', '');

// === TWENTY-FIRST AMENDMENT ===
add('21A', '', 'Twenty-First Amendment', '');
add('21A.Rep', '21A', 'Repeal of Prohibition Clause', '');

// === TWENTY-SECOND AMENDMENT ===
add('22A', '', 'Twenty-Second Amendment', '');
add('22A.Term', '22A', 'Presidential Term Limits Clause', '');

// === TWENTY-THIRD AMENDMENT ===
add('23A', '', 'Twenty-Third Amendment', '');
add('23A.DC', '23A', 'DC Electors Clause', '');

// === TWENTY-FOURTH AMENDMENT ===
add('24A', '', 'Twenty-Fourth Amendment', '');
add('24A.Poll', '24A', 'Poll Tax Abolition Clause', '');

// === TWENTY-FIFTH AMENDMENT ===
add('25A', '', 'Twenty-Fifth Amendment', '');
add('25A.S1', '25A', 'Twenty-Fifth Amendment, Section 1', '');
add('25A.S1.Vac', '25A.S1', 'Presidential Vacancy Clause', '');
add('25A.S4', '25A', 'Twenty-Fifth Amendment, Section 4', '');
add('25A.S4.Dis', '25A.S4', 'Presidential Disability Clause', '');

// === TWENTY-SIXTH AMENDMENT ===
add('26A', '', 'Twenty-Sixth Amendment', '');
add('26A.Vote', '26A', 'Voting Age Clause', '');

// === TWENTY-SEVENTH AMENDMENT ===
add('27A', '', 'Twenty-Seventh Amendment', '');
add('27A.Comp', '27A', 'Congressional Compensation Clause', '');


// Main function
function main() {
  console.log('📜 Generating Provisions Sheet\n');
  console.log(`Total provisions: ${provisions.length}`);

  // Count by category
  const articles = provisions.filter(p => p.provision_id.startsWith('A') && !p.provision_id.includes('.')).length;
  const amendments = provisions.filter(p => p.provision_id.match(/^\d+A$/) || p.provision_id === '1A').length;
  const clauses = provisions.filter(p => p.provision_id.includes('.')).length;

  console.log(`  - Top-level articles: ${articles}`);
  console.log(`  - Top-level amendments: ${amendments}`);
  console.log(`  - Sections and clauses: ${clauses}`);

  // Read existing workbook
  const workbookPath = path.join(__dirname, '..', 'conlaw-data.xlsx');
  const workbook = XLSX.readFile(workbookPath);

  // Create new provisions sheet
  const provisionsSheet = XLSX.utils.json_to_sheet(provisions);
  provisionsSheet['!cols'] = [
    { wch: 15 },  // provision_id
    { wch: 12 },  // parent_id
    { wch: 45 },  // name
    { wch: 100 }, // full_text
  ];

  // Replace the Provisions sheet
  const sheetIndex = workbook.SheetNames.indexOf('Provisions');
  if (sheetIndex > -1) {
    workbook.SheetNames.splice(sheetIndex, 1);
    delete workbook.Sheets['Provisions'];
  }

  // Add at position 3 (after Cases, Issues, Triggers)
  workbook.SheetNames.splice(3, 0, 'Provisions');
  workbook.Sheets['Provisions'] = provisionsSheet;

  // Write back
  XLSX.writeFile(workbook, workbookPath);

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Updated Provisions sheet in conlaw-data.xlsx`);
  console.log(`   ${provisions.length} provisions total`);
  console.log('═'.repeat(60));
}

main();
