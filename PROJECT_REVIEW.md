# ConLaw Cases Project - Review Document for LLM Assistance

## Purpose of This Document

This document is intended for another large language model to review this project. The human user is frustrated with the quality of work done so far and wants a fresh perspective. Please review critically.

## Project Goal

Build a web application that allows users to query a database of U.S. Supreme Court constitutional law cases using natural language. Users should be able to ask questions like "show me all Free Exercise cases" or "what Commerce Clause cases were decided under Chief Justice Warren" and get accurate results.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                               │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │  QueryBuilder   │    │  ChatInterface  │                 │
│  │  (SQL mode)     │    │  (RAG mode)     │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           │                      │                           │
│           ▼                      ▼                           │
│  ┌─────────────────────────────────────────┐                │
│  │  AI Provider (user's API key)           │                │
│  │  - Anthropic / OpenAI / Gemini / OpenRouter              │
│  │  - Runs client-side, no server costs    │                │
│  └────────┬────────────────────────────────┘                │
└───────────┼─────────────────────────────────────────────────┘
            │ Generated SQL
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js)                          │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ /api/execute-query │ /api/schema-info │                  │
│  └────────┬────────┘  └────────┬────────┘                   │
└───────────┼────────────────────┼────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              NEON PostgreSQL (via Vercel Storage)            │
│  Tables: cases, triggers, case_triggers, chief_justices     │
│  View: cases_view                                            │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

- **Frontend/Backend**: Next.js 16 (App Router)
- **Database**: Neon PostgreSQL (serverless, via Vercel Storage marketplace)
- **Hosting**: Vercel (free tier)
- **AI**: Client-side calls to Anthropic/OpenAI/Gemini/OpenRouter (user provides API keys)
- **UI**: shadcn/ui components

## Why These Choices

1. **Vercel + Neon**: Free tier, serverless, no infrastructure management
2. **Client-side AI**: User pays for their own API usage, no server costs for us
3. **PostgreSQL**: Supports arrays (for issues), full-text search, and pgvector for future embeddings

## Database Schema

```sql
-- Chief justices with tenure years (used for year-based lookup)
chief_justices: id, name, start_year, end_year, appointed_by

-- Main cases table
cases: id, name, year, description, chief_justice_id (FK), issues (TEXT[])

-- Triggers (events that caused cases to arise)
triggers: id, trigger_type, trigger_event

-- Junction table (many-to-many: cases <-> triggers)
case_triggers: id, case_id (FK), trigger_id (FK)

-- Convenience view joining everything
cases_view: all case fields + chief_justice_name + trigger arrays
```

## Data Sources

Three JSON files in the project root:

1. **con-law-cases.json** (177 cases)
   - Structure: `{ name, year, description, issues[] }`
   - Issues are legal topics like "Commerce Clause", "Free Exercise Clause", etc.

2. **trigger-table.json** (175 triggers)
   - Structure: `{ "Trigger ID": "T001", "Trigger Type": "...", "Specific Trigger": "..." }`
   - Describes what events triggered each case (legislation, incidents, etc.)

3. **case-trigger-junction-table.json** (177 entries)
   - Structure: `{ "Case Name": "...", "Trigger ID": "T001" }`
   - Links cases to their triggers

## Problems Encountered

### 1. Data Quality Issues (MAJOR)

The case data was initially generated/curated with help from Google Gemini, which hallucinated some cases that don't exist. This caused cascading problems:
- Junction table referenced cases that didn't exist
- Multiple rounds of debugging to reconcile case names
- User had to manually verify which cases were real

### 2. Case Name Mismatches

Case names in the junction table didn't always match the cases file exactly:
- "Bakke (Regents of...)" vs "Regents of the Univ. of Cal. v. Bakke"
- Smart quotes (Unicode) vs straight quotes (ASCII)
- Required extensive manual reconciliation

### 3. Filename Inconsistency

The cases file is named `con-law-cases.json` but seed scripts were looking for `conlaw-cases.json`. This caused silent failures.

### 4. JSON Key Format Mismatch

The JSON files use title-case keys with spaces (`"Trigger ID"`, `"Case Name"`) but the seed scripts expected snake_case (`trigger_id`, `case_name`). Required adding transformation code.

### 5. Hardcoded Values Problem

Initially, the schema description sent to the AI had hardcoded issue names. When the user asked "show me Free Exercise cases", the AI invented `'Free Exercise of Religion'` instead of using the actual value `'Free Exercise Clause'`.

**Attempted fix**: Created `/api/schema-info` endpoint to dynamically fetch valid values from the database and include them in the AI prompt. This is theoretically correct but may not be working properly yet.

### 6. View Naming Confusion

The database view was named `cases_with_chief_justice` which confused the user since we removed the `chief_justice` field from the JSON. The view still makes sense (it joins cases with the chief_justices table), but the name was misleading. Renamed to `cases_view`.

## Current State

### What Works
- Database is populated: 177 cases, 175 triggers, 177 junction entries, 17 chief justices
- Seed scripts work (after fixes)
- Next.js app builds and deploys
- Query Builder UI generates SQL via AI
- API endpoints execute queries against the database

### What May Not Work
- The dynamic schema injection may not be reaching the AI properly
- Queries for issues return empty results even when data exists
- The user reports that "nothing is returned" when executing valid-looking SQL

## Files Structure

```
/conlaw-app
├── app/
│   ├── page.tsx                 # Main UI with tabs
│   └── api/
│       ├── execute-query/       # Runs SQL against DB
│       ├── schema-info/         # Returns valid field values
│       └── search-cases/        # Text search endpoint
├── components/
│   ├── QueryBuilder.tsx         # Natural language -> SQL
│   ├── ChatInterface.tsx        # RAG-based chat
│   └── SettingsPanel.tsx        # API key management
├── lib/
│   ├── schema.ts                # Static schema description
│   └── ai/providers.ts          # AI provider integrations
├── scripts/
│   ├── seed-cases.ts            # Populates cases table
│   ├── seed-triggers.ts         # Populates triggers table
│   ├── seed-case-triggers.ts    # Populates junction table
│   └── reseed-cases.ts          # Clears and reseeds cases
├── con-law-cases.json           # 177 cases
├── trigger-table.json           # 175 triggers
└── case-trigger-junction-table.json  # 177 relationships
```

## Key Code Locations

1. **AI prompt construction**: `lib/ai/providers.ts` lines 106-119
2. **Dynamic schema fetching**: `components/QueryBuilder.tsx` lines 30-67
3. **Schema info API**: `app/api/schema-info/route.ts`
4. **Static schema**: `lib/schema.ts`

## Questions for Review

1. Is the dynamic schema approach (fetching valid values at runtime) the right solution, or is there a better pattern?

2. Why might the AI still generate wrong issue names even with valid values in the prompt?

3. Is the overall architecture sound, or are there fundamental problems?

4. The seed scripts do key transformation at parse time. Should the JSON files be reformatted instead to match expected structure?

5. What's the best way to handle the mismatch between natural language concepts ("free exercise of religion") and database values ("Free Exercise Clause")?

## Honest Assessment

The implementation has been messy. There have been multiple rounds of:
- Debugging data mismatches
- Fixing filename/key inconsistencies
- Adding transformations to work around format issues
- Changing approaches (hardcoded -> dynamic schema)

The user is rightfully frustrated. The core functionality (query the database with natural language) should be straightforward, but data quality issues and implementation inconsistencies have made it difficult.

The dynamic schema approach is theoretically correct but may have bugs in how the data flows from the API to the AI prompt. This needs verification.

## To Reproduce Issues

1. Run the app locally: `npm run dev`
2. Go to Query Builder
3. Enter: "all free exercise of religion cases"
4. Click "Generate SQL Query"
5. Observe: SQL uses `'Free Exercise of Religion'` instead of `'Free Exercise Clause'`
6. Execute the query
7. Observe: No results returned (because the issue name doesn't match)

The database DOES have cases with `'Free Exercise Clause'` - the problem is the AI generates the wrong string.
