-- ConLaw Cases Database Schema
-- PostgreSQL with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Chief Justices lookup table
CREATE TABLE IF NOT EXISTS chief_justices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER, -- NULL for current chief justice
  appointed_by VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Main cases table
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  year INTEGER NOT NULL,
  description TEXT NOT NULL,
  chief_justice_id INTEGER REFERENCES chief_justices(id),
  issues TEXT[] NOT NULL,
  full_text TEXT, -- For future extended content
  metadata JSONB, -- For flexible additional fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS case_embeddings (
  id SERIAL PRIMARY KEY,
  case_id INTEGER REFERENCES cases(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension, adjustable
  embedding_model VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User queries log (optional, for debugging/analytics)
CREATE TABLE IF NOT EXISTS query_logs (
  id SERIAL PRIMARY KEY,
  query_type VARCHAR(50), -- 'structured' or 'semantic'
  user_query TEXT,
  generated_sql TEXT,
  ai_provider VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance

-- Full-text search index on cases
CREATE INDEX IF NOT EXISTS cases_fts_idx ON cases
  USING GIN (to_tsvector('english', name || ' ' || description || ' ' || array_to_string(issues, ' ')));

-- Index on case year for temporal queries
CREATE INDEX IF NOT EXISTS cases_year_idx ON cases(year);

-- Index on chief_justice_id for joins
CREATE INDEX IF NOT EXISTS cases_chief_justice_idx ON cases(chief_justice_id);

-- Vector similarity search index (IVFFlat algorithm)
-- Note: This should be created AFTER embeddings are populated for optimal performance
-- For now, we'll create it with default settings
CREATE INDEX IF NOT EXISTS case_embeddings_idx ON case_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10); -- Adjust lists based on data size (sqrt of row count is a good starting point)

-- Helpful view that joins cases with chief justice names
CREATE OR REPLACE VIEW cases_view AS
SELECT
  c.id,
  c.name,
  c.year,
  c.description,
  c.issues,
  c.full_text,
  c.metadata,
  c.chief_justice_id,
  cj.name as chief_justice_name,
  cj.start_year as chief_justice_start,
  cj.end_year as chief_justice_end,
  cj.appointed_by as chief_justice_appointed_by,
  c.created_at,
  c.updated_at
FROM cases c
LEFT JOIN chief_justices cj ON c.chief_justice_id = cj.id;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on cases table
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
