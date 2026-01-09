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

// Case from database
export interface Case {
  id: number;
  name: string;
  year: number;
  description: string;
  chief_justice_id: number;
  issues: string[];
  full_text?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

// Case with chief justice information (from view)
export interface CaseWithChiefJustice extends Case {
  chief_justice_name: string;
  chief_justice_start: number;
  chief_justice_end: number | null;
  chief_justice_appointed_by: string;
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
