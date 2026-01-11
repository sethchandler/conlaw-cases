-- Add triggers table and case_triggers junction table
-- Run this in Neon SQL Editor to add the new tables

-- Triggers table: stores the types of events that trigger constitutional cases
CREATE TABLE IF NOT EXISTS triggers (
  id SERIAL PRIMARY KEY,
  trigger_type VARCHAR(100),  -- e.g., "Federal Legislation", "State Legislation", "Domestic Event"
  trigger_event VARCHAR(500) NOT NULL  -- The specific event or legislation
);

-- Junction table: many-to-many relationship between cases and triggers
CREATE TABLE IF NOT EXISTS case_triggers (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  trigger_id INTEGER NOT NULL REFERENCES triggers(id) ON DELETE CASCADE,
  UNIQUE(case_id, trigger_id)  -- Prevent duplicate associations
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_case_triggers_case_id ON case_triggers(case_id);
CREATE INDEX IF NOT EXISTS idx_case_triggers_trigger_id ON case_triggers(trigger_id);
CREATE INDEX IF NOT EXISTS idx_triggers_type ON triggers(trigger_type);

-- Update the view to include trigger information
DROP VIEW IF EXISTS cases_view;

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
  -- Aggregate triggers into arrays
  ARRAY_AGG(DISTINCT t.trigger_type) FILTER (WHERE t.trigger_type IS NOT NULL) as trigger_types,
  ARRAY_AGG(DISTINCT t.trigger_event) FILTER (WHERE t.trigger_event IS NOT NULL) as trigger_events
FROM cases c
LEFT JOIN chief_justices cj ON c.chief_justice_id = cj.id
LEFT JOIN case_triggers ct ON c.id = ct.case_id
LEFT JOIN triggers t ON ct.trigger_id = t.id
GROUP BY c.id, c.name, c.year, c.description, c.chief_justice_id, c.issues,
         cj.name, cj.start_year, cj.end_year;
