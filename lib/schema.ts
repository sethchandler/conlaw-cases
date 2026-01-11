/**
 * Database schema description for AI query generation
 *
 * This describes the new normalized schema with controlled vocabulary tables.
 */
export const DATABASE_SCHEMA = `
Tables:

1. chief_justices
   - id: integer (primary key)
   - name: varchar(200)
   - start_year: integer
   - end_year: integer (nullable, NULL = current)
   - appointed_by: varchar(200)

2. cases
   - id: integer (primary key)
   - name: varchar(500)
   - year: integer
   - description: text
   - chief_justice_id: integer (foreign key -> chief_justices.id)
   - created_at: timestamp
   - updated_at: timestamp

3. issues (controlled vocabulary)
   - id: integer (primary key)
   - issue_id: varchar(20) (unique, e.g., "I01")
   - name: varchar(200) (e.g., "Commerce Clause")
   - description: text

4. triggers (events that caused cases)
   - id: integer (primary key)
   - trigger_id: varchar(20) (unique, e.g., "T001")
   - trigger_type: varchar(100) (e.g., "Federal Legislation")
   - trigger_event: varchar(500) (the specific event)

5. provisions (constitutional provisions, hierarchical)
   - id: integer (primary key)
   - provision_id: varchar(50) (unique, e.g., "14A.S1.EP")
   - parent_id: varchar(50) (references provisions.provision_id)
   - name: varchar(200) (e.g., "Equal Protection Clause")
   - full_text: text

6. case_issues (junction table)
   - case_id: integer (foreign key -> cases.id)
   - issue_id: varchar(20) (foreign key -> issues.issue_id)

7. case_triggers (junction table)
   - case_id: integer (foreign key -> cases.id)
   - trigger_id: varchar(20) (foreign key -> triggers.trigger_id)

8. case_provisions (junction table)
   - case_id: integer (foreign key -> cases.id)
   - provision_id: varchar(50) (foreign key -> provisions.provision_id)

9. case_urls (external links to opinions)
   - id: integer (primary key)
   - case_id: integer (foreign key -> cases.id)
   - source: varchar(50) (e.g., "oyez", "cornell", "justia")
   - url: varchar(500)
   - verified: boolean

10. cases_view (VIEW - use this for most queries)
   - id, name, year, description, chief_justice_id
   - chief_justice_name, chief_justice_start, chief_justice_end
   - issues: text[] (array of issue names)
   - issue_ids: text[] (array of issue IDs)
   - trigger_types: text[] (array of trigger type categories)
   - trigger_events: text[] (array of specific trigger events)
   - trigger_ids: text[] (array of trigger IDs)
   - provisions: text[] (array of provision names)
   - provision_ids: text[] (array of provision IDs)
   - oyez_url: varchar (link to Oyez.org)
   - cornell_url: varchar (link to Cornell LII)
   - justia_url: varchar (link to Justia)

Example Queries:

-- Find all cases (basic)
SELECT name, year, chief_justice_name, issues, provisions
FROM cases_view
ORDER BY year DESC;

-- Search by issue (use exact issue name from the provided list)
SELECT * FROM cases_view
WHERE 'Commerce Clause' = ANY(issues)
ORDER BY year DESC;

-- Search by provision
SELECT * FROM cases_view
WHERE '14A.S1.EP' = ANY(provision_ids)
ORDER BY year DESC;

-- Find all 14th Amendment cases (any provision starting with 14A)
SELECT * FROM cases_view
WHERE EXISTS (
  SELECT 1 FROM unnest(provision_ids) pid
  WHERE pid LIKE '14A%'
)
ORDER BY year;

-- Search in description
SELECT * FROM cases_view
WHERE description ILIKE '%privacy%'
ORDER BY year DESC;

-- Cases under a specific chief justice
SELECT * FROM cases_view
WHERE chief_justice_name ILIKE '%Warren%'
ORDER BY year;

-- Cases in a year range with specific issue
SELECT name, year, chief_justice_name, issues
FROM cases_view
WHERE year BETWEEN 1950 AND 2000
  AND 'Equal Protection' = ANY(issues)
ORDER BY year;

-- Find cases by trigger type
SELECT name, year, trigger_types, trigger_events
FROM cases_view
WHERE 'Federal Legislation' = ANY(trigger_types)
ORDER BY year;

-- Combine multiple filters
SELECT name, year, issues, provisions
FROM cases_view
WHERE 'Free Speech' = ANY(issues)
  AND year > 1960
  AND chief_justice_name IS NOT NULL
ORDER BY year DESC;
`;
