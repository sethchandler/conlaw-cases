/**
 * Seed script for Chief Justices of the United States Supreme Court
 * Run this script to populate the chief_justices table with historical data
 *
 * Usage: npx tsx scripts/seed-chief-justices.ts
 */

import { sql } from '@vercel/postgres';

interface ChiefJustice {
  name: string;
  start_year: number;
  end_year: number | null;
  appointed_by: string;
  notes?: string;
}

const chiefJustices: ChiefJustice[] = [
  {
    name: 'John Jay',
    start_year: 1789,
    end_year: 1795,
    appointed_by: 'George Washington',
    notes: 'First Chief Justice of the United States'
  },
  {
    name: 'John Rutledge',
    start_year: 1795,
    end_year: 1795,
    appointed_by: 'George Washington',
    notes: 'Recess appointment, rejected by Senate'
  },
  {
    name: 'Oliver Ellsworth',
    start_year: 1796,
    end_year: 1800,
    appointed_by: 'George Washington'
  },
  {
    name: 'John Marshall',
    start_year: 1801,
    end_year: 1835,
    appointed_by: 'John Adams',
    notes: 'Established judicial review in Marbury v. Madison'
  },
  {
    name: 'Roger B. Taney',
    start_year: 1836,
    end_year: 1864,
    appointed_by: 'Andrew Jackson',
    notes: 'Authored Dred Scott decision'
  },
  {
    name: 'Salmon P. Chase',
    start_year: 1864,
    end_year: 1873,
    appointed_by: 'Abraham Lincoln',
    notes: 'Former Treasury Secretary and abolitionist'
  },
  {
    name: 'Morrison Waite',
    start_year: 1874,
    end_year: 1888,
    appointed_by: 'Ulysses S. Grant'
  },
  {
    name: 'Melville Fuller',
    start_year: 1888,
    end_year: 1910,
    appointed_by: 'Grover Cleveland'
  },
  {
    name: 'Edward Douglass White',
    start_year: 1910,
    end_year: 1921,
    appointed_by: 'William Howard Taft',
    notes: 'First Associate Justice promoted to Chief Justice'
  },
  {
    name: 'William Howard Taft',
    start_year: 1921,
    end_year: 1930,
    appointed_by: 'Warren G. Harding',
    notes: 'Only person to serve as both President and Chief Justice'
  },
  {
    name: 'Charles Evans Hughes',
    start_year: 1930,
    end_year: 1941,
    appointed_by: 'Herbert Hoover',
    notes: 'Presided during the New Deal era'
  },
  {
    name: 'Harlan F. Stone',
    start_year: 1941,
    end_year: 1946,
    appointed_by: 'Franklin D. Roosevelt',
    notes: 'Authored famous Footnote Four in Carolene Products'
  },
  {
    name: 'Fred M. Vinson',
    start_year: 1946,
    end_year: 1953,
    appointed_by: 'Harry S. Truman'
  },
  {
    name: 'Earl Warren',
    start_year: 1953,
    end_year: 1969,
    appointed_by: 'Dwight D. Eisenhower',
    notes: 'Led the Warren Court, known for civil rights decisions'
  },
  {
    name: 'Warren E. Burger',
    start_year: 1969,
    end_year: 1986,
    appointed_by: 'Richard Nixon'
  },
  {
    name: 'William Rehnquist',
    start_year: 1986,
    end_year: 2005,
    appointed_by: 'Ronald Reagan',
    notes: 'Promoted from Associate Justice'
  },
  {
    name: 'John Roberts',
    start_year: 2005,
    end_year: null,
    appointed_by: 'George W. Bush',
    notes: 'Current Chief Justice (as of 2025)'
  }
];

async function seedChiefJustices() {
  console.log('🌱 Seeding chief justices table...');

  try {
    // Check if table has data
    const { rows } = await sql`SELECT COUNT(*) as count FROM chief_justices`;
    const count = parseInt(rows[0].count);

    if (count > 0) {
      console.log(`⚠️  Table already contains ${count} records.`);
      console.log('   Clear the table first if you want to re-seed.');
      console.log('   Run: DELETE FROM chief_justices;');
      return;
    }

    // Insert all chief justices
    for (const cj of chiefJustices) {
      await sql`
        INSERT INTO chief_justices (name, start_year, end_year, appointed_by, notes)
        VALUES (${cj.name}, ${cj.start_year}, ${cj.end_year}, ${cj.appointed_by}, ${cj.notes || null})
      `;
      console.log(`   ✓ Added ${cj.name} (${cj.start_year}-${cj.end_year || 'present'})`);
    }

    console.log(`✅ Successfully seeded ${chiefJustices.length} chief justices!`);
  } catch (error) {
    console.error('❌ Error seeding chief justices:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedChiefJustices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedChiefJustices, chiefJustices };
