/**
 * Database schema description for AI query generation
 */
export const DATABASE_SCHEMA = `
Tables:

1. chief_justices
   - id: integer (primary key)
   - name: varchar(200)
   - start_year: integer
   - end_year: integer (nullable, NULL = current)
   - appointed_by: varchar(200)
   - notes: text

2. cases
   - id: integer (primary key)
   - name: varchar(500)
   - year: integer
   - description: text
   - chief_justice_id: integer (foreign key -> chief_justices.id)
   - issues: text[] (array of strings)
   - full_text: text (nullable)
   - metadata: jsonb (nullable)
   - created_at: timestamp
   - updated_at: timestamp

3. cases_with_chief_justice (VIEW)
   - All columns from cases table, plus:
   - chief_justice_name: varchar
   - chief_justice_start: integer
   - chief_justice_end: integer
   - chief_justice_appointed_by: varchar

Example Queries:

-- Find all cases after 1990
SELECT * FROM cases_with_chief_justice WHERE year > 1990 ORDER BY year;

-- Search by issue
SELECT * FROM cases_with_chief_justice
WHERE 'Commerce Clause' = ANY(issues)
ORDER BY year DESC;

-- Search in description
SELECT * FROM cases_with_chief_justice
WHERE description ILIKE '%privacy%'
ORDER BY year DESC;

-- Cases under a specific chief justice
SELECT * FROM cases_with_chief_justice
WHERE chief_justice_name ILIKE '%Warren%'
ORDER BY year;

-- Combine multiple conditions
SELECT name, year, chief_justice_name, issues
FROM cases_with_chief_justice
WHERE year BETWEEN 1950 AND 2000
  AND 'Equal Protection' = ANY(issues)
ORDER BY year;
`;
