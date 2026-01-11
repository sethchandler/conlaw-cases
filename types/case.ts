/**
 * Type definitions for Constitutional Law Cases
 */

// Chief Justice from database
export interface ChiefJustice {
  id: number;
  name: string;
  start_year: number;
  end_year: number | null;
  appointed_by: string;
  notes?: string | null;
  created_at: Date;
}

// Case from database (new schema - no issues array)
export interface Case {
  id: number;
  name: string;
  year: number;
  description: string;
  chief_justice_id: number;
  created_at: Date;
  updated_at: Date;
}

// Case with all related data (from cases_view)
export interface CaseWithChiefJustice {
  id: number;
  name: string;
  year: number;
  description: string;
  chief_justice_id: number;
  chief_justice_name: string;
  chief_justice_start: number;
  chief_justice_end: number | null;
  // Issues from junction table
  issues: string[];
  issue_ids: string[];
  // Triggers from junction table
  trigger_types: string[];
  trigger_events: string[];
  trigger_ids: string[];
  // Provisions from junction table
  provisions: string[];
  provision_ids: string[];
  // URLs from case_urls table
  oyez_url: string | null;
  cornell_url: string | null;
  justia_url: string | null;
}

// Issue from controlled vocabulary table
export interface Issue {
  id: number;
  issue_id: string;
  name: string;
  description?: string | null;
}

// Trigger from triggers table
export interface Trigger {
  id: number;
  trigger_id: string;
  trigger_type: string;
  trigger_event: string;
}

// Provision from provisions table
export interface Provision {
  id: number;
  provision_id: string;
  parent_id: string | null;
  name: string;
  full_text?: string | null;
}

// Case embedding for vector search
export interface CaseEmbedding {
  id: number;
  case_id: number;
  embedding: number[];
  embedding_model: string;
  created_at: Date;
}

// Query log entry
export interface QueryLog {
  id: number;
  query_type: 'structured' | 'semantic';
  user_query: string;
  generated_sql?: string | null;
  ai_provider: string;
  timestamp: Date;
}

// API response types
export interface QueryResult {
  cases: CaseWithChiefJustice[];
  total: number;
  query?: string;
}

export interface VectorSearchResult {
  case: CaseWithChiefJustice;
  similarity: number;
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
  total: number;
}
