# Problem Summary: Vercel Postgres Connection Error

## What We're Trying To Do

Build a Next.js app on Vercel that queries a Neon PostgreSQL database. The app allows users to:
1. Enter natural language queries (e.g., "Show me Commerce Clause cases after 1990")
2. Generate SQL using AI (client-side with user's API key)
3. Execute that SQL against our database via `/api/execute-query` endpoint
4. Display results

## Current Status

### ✅ What's Working
- **Database**: Neon PostgreSQL created via Vercel Storage marketplace
- **Schema**: All 4 tables created (chief_justices, cases, case_embeddings, query_logs)
- **Data**: Successfully seeded with 17 chief justices and 160 constitutional law cases
- **Local Development**: Works perfectly - we can run seed scripts and connect to database
- **Build**: App builds and deploys to Vercel without errors
- **Frontend**: Query Builder generates SQL successfully

### ❌ What's Broken
- **Production API calls fail** with this error:
  ```
  VercelPostgresError - 'missing_connection_string':
  You did not supply a 'connectionString' and no 'POSTGRES_URL' env var was found.
  ```

## Technical Details

### Code Structure
**File**: `/app/api/execute-query/route.ts`
```typescript
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  // ... validation code ...
  const result = await sql.query(query); // FAILS HERE
  // ...
}
```

**Problem**: The `@vercel/postgres` package looks for environment variables in this order:
1. `POSTGRES_URL`
2. `POSTGRES_PRISMA_URL`
3. `DATABASE_URL`

### Environment Variables Setup

**Local (Working)**:
- File: `.env.local` (gitignored)
- Contains: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL`, etc.
- Source: Manually copied from Neon dashboard
- Result: ✅ Works - seed scripts execute successfully

**Production (NOT Working)**:
- When connecting Neon database to Vercel project via Storage UI:
  - Vercel requires a "Custom Prefix" field
  - Default value: `STORAGE`
  - Cannot be left blank (auto-fills "STORAGE")
  - Cannot be set to `POSTGRES` (Connect button becomes disabled)

- This creates environment variables with WRONG names:
  - `STORAGE_URL` ❌
  - `STORAGE_URL_NON_POOLING` ❌
  - `STORAGE_PRISMA_URL` ❌

- But code expects:
  - `POSTGRES_URL` ✅
  - `POSTGRES_URL_NON_POOLING` ✅
  - `POSTGRES_PRISMA_URL` ✅

### Database Connection Strings (from Neon)
```
POSTGRES_URL=postgresql://neondb_owner:npg_eGv3BDVPnJl6@ep-fancy-shadow-ah5xw3fc-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL_NON_POOLING=postgresql://neondb_owner:npg_eGv3BDVPnJl6@ep-fancy-shadow-ah5xw3fc.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
POSTGRES_PRISMA_URL=postgresql://neondb_owner:npg_eGv3BDVPnJl6@ep-fancy-shadow-ah5xw3fc-pooler.c-3.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require
```

## My Diagnosis

**Root Cause**: Environment variable name mismatch
- Vercel's Neon integration forces `STORAGE_` prefix
- `@vercel/postgres` package requires `POSTGRES_` prefix
- Variables exist but code can't find them

## Attempted Solutions

1. ✅ Connected database to Development environment → Works locally
2. ❌ Tried to connect to Production with "STORAGE" prefix → Variables have wrong names
3. ❌ Tried to change prefix to "POSTGRES" → Vercel UI disables Connect button
4. ❌ Tried to leave prefix blank → Auto-fills back to "STORAGE"

## Proposed Solutions

### Option A: Manually Add Environment Variables (Most Reliable)
**Steps**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Manually add for **Production** environment:
   - Name: `POSTGRES_URL`, Value: `postgresql://neondb_owner:npg_eGv3BDVPnJl6@ep-fancy-shadow-ah5xw3fc-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - Name: `POSTGRES_PRISMA_URL`, Value: `postgresql://neondb_owner:npg_eGv3BDVPnJl6@ep-fancy-shadow-ah5xw3fc-pooler.c-3.us-east-1.aws.neon.tech/neondb?connect_timeout=15&sslmode=require`
3. Redeploy

**Pros**: Guaranteed to work
**Cons**: Manual, not using Vercel's auto-integration

### Option B: Change Code to Use STORAGE_ Prefix
**Change**: `/app/api/execute-query/route.ts`
```typescript
import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.STORAGE_URL
});

export async function POST(request: NextRequest) {
  const result = await pool.query(query);
  // ...
}
```

**Pros**: Uses Vercel's auto-created variables
**Cons**: Non-standard, might break other features

### Option C: Use Different Database Package
Switch from `@vercel/postgres` to `postgres` or `pg` package with explicit connection string.

## Questions for Second Opinion

1. **Is there a way to force Vercel's Neon integration to use `POSTGRES_` prefix instead of `STORAGE_`?**
2. **Should we manually set environment variables (Option A) or change the code (Option B)?**
3. **Is this a known issue with Vercel + Neon integration?**
4. **What's the best practice for connecting Neon to Vercel in production?**

## Repository Info
- **GitHub**: https://github.com/sethchandler/conlaw-cases
- **Vercel Project**: conlaw-cases (under seth-chandlers-projects)
- **Database**: conlaw-cases-db (Neon, free tier)
- **File with error**: `/app/api/execute-query/route.ts` line 73
