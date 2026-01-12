# ConLaw Cases UI Redesign - Design Document

**Date:** 2026-01-11
**Status:** Approved

## Overview

Redesign the ConLaw Cases app UI to improve orientation, provide multiple analytical entry points, and add chat history persistence. Backend remains unchanged.

## Design Decisions Summary

| Decision | Choice |
|----------|--------|
| Explore pages approach | 4 new simple browse pages + existing StructuredSearch |
| Time dimension | Chief Justice eras (primary) with decades within |
| Terminology | "Legal Topic" (not "Doctrine" or "Issue") |
| Chat storage | localStorage only (no server storage, no privacy concerns) |
| Case detail page | No change - inline cards sufficient |
| Featured case on home | Skip for now |
| Example queries | 7 curated examples covering breadth |

---

## Navigation & Page Structure

### Home Page (`/` - new default landing)

- **Header**: Logo, title, "Professor Seth J. Chandler, University of Houston Law Center", AI Connection Settings button
- **Orientation paragraph**: 2-3 sentences explaining what the database contains
- **Five navigation cards** in a grid:
  - Explore by Legal Topic → `/explore/topics`
  - Explore by Constitutional Provision → `/explore/provisions`
  - Explore by Historical Trigger → `/explore/triggers`
  - Explore by Time Period → `/explore/time`
  - Explore Cases → `/search` (existing StructuredSearch)
- **Metrics bar**: "177 cases · 84 legal topics · 221 provisions · 175 triggers"
- **Secondary navigation**: Links to AI Query and Chat modes

### New Routes

| Route | Purpose |
|-------|---------|
| `/` | Home page (new landing) |
| `/explore/topics` | Legal Topic browser |
| `/explore/provisions` | Provision browser |
| `/explore/triggers` | Trigger browser |
| `/explore/time` | Time period browser |
| `/search` | Existing StructuredSearch ("Explore Cases") |
| `/query` | AI Query mode (improved layout) |
| `/chat` | Chat mode (with localStorage persistence) |

---

## Explore Pages Layout

All four explore pages share a two-panel layout:

### Left Panel (Entity List)
- Header with category name
- Scrollable list of entities
- Each entity shows: name + case count badge (e.g., "Commerce Clause (23)")
- Click to select; selected item highlighted
- Search/filter box at top for long lists

### Right Panel (Case Results)
- Cases matching selected entity
- Same case card format: name, year, chief justice, description, badges, external link icon
- Default state: first entity pre-selected (never empty)

### Time Period Page (differs slightly)
- Left panel shows Chief Justice eras as collapsible sections
- Each era expands to show decades within
- Example: "Warren Court (1953-1969)" expands to "1950s", "1960s"
- Selecting era shows all cases; selecting decade filters further

### Responsive Behavior
- Narrow screens: left panel becomes dropdown or top filter bar
- Case results stack below

### Data Source
- All data from existing `schema-info` API and `cases_view`
- No new backend endpoints needed

---

## AI Query Mode (Improved Layout)

### Top Section: Input Area
- Label: "Ask a question about the cases"
- Text input (full width)
- "Generate Query" button

### Example Queries (clickable chips)
1. "Show me Commerce Clause cases after 1990"
2. "Which cases involve the Fourteenth Amendment Equal Protection Clause?"
3. "Find cases triggered by federal legislation from 1932 to 1945"
4. "What cases involving federalism were decided during the Warren Court?"
5. "Cases involving the Tenth Amendment"
6. "Show me the most recent cases in the database"
7. "Show me cases triggered by war"

### Results Section (after generation)
1. **Generated SQL** - Visible by default, code block, "Copy SQL" button
2. **Results** - Case cards, same format as elsewhere
3. **Execution time** - Small text

### Key Changes
- Example queries provide immediate affordance
- SQL stays visible and prominent (transparency preserved)
- Tighter layout reduces empty space
- "Copy SQL" button for learning

---

## Chat Mode (ChatGPT-Style Layout)

### Left Sidebar
- "New Chat" button at top (prominent)
- Scrollable list of past conversations
- Each shows: title + relative timestamp ("2 hours ago", "Yesterday")
- Click to load; selected thread highlighted
- Trash icon on hover to delete
- Collapsible on mobile (hamburger menu)

### Main Area (centered, max-width ~768px)
- Conversation flows vertically
- **User messages**: Right-aligned or subtle background differentiation
- **Assistant messages**: Left-aligned, optional small icon
- Clean typography, generous spacing
- **Grounding footer**: Collapsed by default showing "Based on N cases (1954-2023)" - expandable to show case names with external link icons

### Input Area (pinned to bottom)
- Rounded text input, full-width within content area
- Send button (arrow icon) on right
- Placeholder: "Ask about constitutional law cases..."
- Shift+Enter for newlines, Enter to send

### localStorage Structure
```json
{
  "conlaw-chat-threads": [
    {
      "id": "uuid",
      "title": "First six words of message...",
      "createdAt": "2026-01-11T10:00:00Z",
      "messages": [
        {
          "role": "user",
          "content": "...",
          "timestamp": "2026-01-11T10:00:00Z"
        },
        {
          "role": "assistant",
          "content": "...",
          "timestamp": "2026-01-11T10:00:05Z",
          "casesUsed": [
            { "name": "Case Name", "year": 1954, "url": "..." }
          ]
        }
      ]
    }
  ]
}
```

### Empty State (no threads yet)
- Centered welcome message
- 2-3 suggested starter questions as clickable chips

---

## What Stays the Same

### Backend (no changes)
- Database schema (cases, issues, triggers, provisions, chief_justices, case_urls, junction tables, cases_view)
- API routes (`/api/execute-query`, `/api/schema-info`, `/api/search-cases`)
- AI provider integration
- SQL generation logic

### Existing Components (reused)
- Case card component
- AI Connection Settings dialog
- Connection status indicator
- Badge color scheme (purple=topics, blue=provisions, amber=triggers)

### Reorganized, Not Replaced
- StructuredSearch → accessible via "Explore Cases"
- QueryBuilder → new layout, same logic
- ChatInterface → new layout + localStorage, same RAG pipeline

### No New Database Tables
- Chat persistence is localStorage only
- No user accounts, no server-side chat storage

---

## Acceptance Criteria

1. Home screen exists with orientation text, five navigation cards, and metrics
2. Four Explore pages (Topics, Provisions, Triggers, Time) show entity lists and case results
3. Time page shows Chief Justice eras with decade subdivisions
4. AI Query page shows example queries and displays SQL + results
5. Chat has sidebar with threads, ChatGPT-style layout, localStorage persistence
6. Grounding footer on chat responses shows cases used
7. No regression in backend functionality
8. Existing StructuredSearch accessible via "Explore Cases"

---

## Non-Goals (explicitly out of scope)

- Case detail pages (use external links to Oyez/Cornell/Justia)
- Featured case rotation on home page
- Server-side chat storage
- User accounts or authentication
- Complex visualizations or graph views
- Algorithmic case briefs (future idea, not now)
