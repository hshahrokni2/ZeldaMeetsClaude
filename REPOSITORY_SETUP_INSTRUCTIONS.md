# ZeldaMeetsClaude Repository Setup Instructions

**For**: Claude (via Claude Web) - Autonomous Execution
**Goal**: Complete standalone GitHub repository for ground truth extraction system
**Status**: Partially created - needs completion

## What's Already Done ✅

1. Repository initialized: `/Users/hosseins/Dropbox/Dev/Komilion/ZeldaMeetsClaude`
2. Directory structure created: `pdfs/`, `agents/`, `schemas/`, `orchestrator/`, `docs/`, `scripts/`, `lib/`
3. README.md created (600+ lines comprehensive documentation)
4. All 20 PDFs copied to `pdfs/` (164 MB)
5. PDF metadata copied: `pdfs/selected_20_pdfs.json`

## What Needs to Be Done 📝

### Task 1: Extract and Copy Agent Definitions (30 min)

**Source**: `/Users/hosseins/Dropbox/Dev/Komilion/chameleon_api/nextjs_space/lib/active-learning/agent-prompts.ts`

**Action**: Extract each of the 19 agent definitions and create individual markdown files:

1. Read the source file (1194 lines)
2. Extract each agent's prompt definition (look for constants like `FINANCIAL_AGENT_PROMPT`, `CHAIRMAN_AGENT_PROMPT`, etc.)
3. Create individual files in `agents/` directory:
   - `agents/chairman_agent.md`
   - `agents/board_members_agent.md`
   - `agents/auditor_agent.md`
   - `agents/financial_agent.md`
   - `agents/balance_sheet_agent.md`
   - `agents/property_agent.md`
   - `agents/fees_agent.md`
   - `agents/cashflow_agent.md`
   - `agents/operational_agent.md`
   - `agents/notes_depreciation_agent.md`
   - `agents/notes_maintenance_agent.md`
   - `agents/notes_tax_agent.md`
   - `agents/events_agent.md`
   - `agents/audit_report_agent.md`
   - `agents/loans_agent.md`
   - `agents/reserves_agent.md`
   - `agents/energy_agent.md`
   - `agents/operating_costs_agent.md`
   - `agents/key_metrics_agent.md`
   - `agents/leverantörer_agent.md` (suppliers)

**Format for each agent file**:
```markdown
# [Agent Name] Agent

## Role
[Extract from prompt]

## Target Fields
[List of fields this agent extracts]

## Swedish Keywords
[Keywords to look for]

## WHERE TO LOOK
[Sections to scan]

## Extraction Rules
[Anti-hallucination rules]

## Example Output
```json
{
  "field_name": "value",
  "field_name_original": "original_string",
  "evidence_pages": [3, 5]
}
```
```

### Task 2: Create TypeScript Schema Definitions (30 min)

**Source**: `/Users/hosseins/Dropbox/Dev/Komilion/chameleon_api/nextjs_space/prisma/schema.prisma` and related type definitions

**Action**: Create schema files in `schemas/` directory:

1. `schemas/extraction-field.ts` - Base field with value + confidence + evidence
2. `schemas/financial-data.ts` - 11 _tkr fields (revenue, costs, etc.)
3. `schemas/balance-sheet.ts` - Assets, liabilities, equity
4. `schemas/governance-data.ts` - Board members, chairman, auditor
5. `schemas/property-data.ts` - Building info, energy class, heating
6. `schemas/full-extraction-result.ts` - Complete output schema
7. `schemas/index.ts` - Exports all schemas

**Key features to include**:
- Optional fields (nulls allowed for missing data)
- Confidence tracking (0.0-1.0 scale)
- Evidence pages (1-based page numbers)
- Swedish format validators (org numbers: NNNNNN-NNNN)

**Reference**: The README.md already documents these schemas (lines 86-103)

### Task 3: Copy Core Library Files (45 min)

**Source Directory**: `/Users/hosseins/Dropbox/Dev/Komilion/chameleon_api/nextjs_space/lib/active-learning/`

**Files to copy**:

1. `lib/extraction-workflow.ts` - Main extraction orchestration
2. `lib/field-wrapper.ts` - ExtractionField wrapper logic
3. `lib/schema-validator.ts` - Response validation (LENIENT mode)
4. `lib/vision-sectionizer.ts` - PDF sectionization (Round 1 + Round 2)
5. `lib/openrouter-client.ts` - OpenRouter API client with key rotation
6. `lib/db-health.ts` - Database connection health monitoring

**Action**:
- Copy files directly from source to destination
- Update import paths to remove Next.js-specific references (e.g., `@/` → `./`)
- Add comments explaining each module's purpose

### Task 4: Create Orchestrator Logic (30 min)

**Source**: `/Users/hosseins/Dropbox/Dev/Komilion/chameleon_api/nextjs_space/lib/active-learning/extraction-workflow.ts` (lines 400-600 approx)

**Action**: Create `orchestrator/routing.ts` with section-to-agent mapping logic

**Key functions**:
```typescript
export function routeSubsectionsToAgents(subsections: Subsection[]): Record<string, Subsection[]> {
  // Map subsections to agents based on keywords
  // Returns: { "chairman_agent": [subsection1, subsection2], "financial_agent": [...], ... }
}

export function getRelevantPages(subsections: Subsection[]): number[] {
  // Extract page ranges from subsections
}
```

**Routing rules** (from README lines 122-132):
- "Styrelse", "Förvaltning" → chairman_agent + board_members_agent
- "Resultat", "Intäkter", "Kostnader" → financial_agent
- "Balans", "Tillgångar", "Skulder" → balance_sheet_agent
- [... 16 more agents]

### Task 5: Create Executable Scripts (1 hour)

**Scripts to create**:

1. **`scripts/extract-single-pdf.ts`** (200 lines)
   - Accepts --pdf and --output flags
   - Runs full extraction pipeline (sectionize → orchestrate → execute agents → auditor)
   - Outputs JSON with ground truth data
   - Reference: README lines 155-195

2. **`scripts/extract-batch.ts`** (250 lines)
   - Processes all 20 PDFs in `pdfs/` directory
   - Parallel execution (5 PDFs at a time)
   - Progress bar and cost tracking
   - Reference: README lines 197-210

3. **`scripts/export-to-jsonl.ts`** (150 lines)
   - Converts extraction JSON → JSONL for DSPy training
   - One row per agent per PDF
   - Includes images, ground truth, and metadata
   - Reference: README lines 255-268

**Common utilities to include**:
- PDF-to-images conversion (using pdf-lib or similar)
- Progress bar (using cli-progress)
- Cost aggregation
- Error handling with retry logic

### Task 6: Create package.json and Dependencies (15 min)

**Create**: `package.json`

**Dependencies to include**:
```json
{
  "name": "zelda-meets-claude",
  "version": "1.0.0",
  "description": "Autonomous ground truth generation for Swedish BRF annual reports",
  "main": "scripts/extract-single-pdf.ts",
  "scripts": {
    "extract-single": "tsx scripts/extract-single-pdf.ts",
    "extract-batch": "tsx scripts/extract-batch.ts",
    "export-jsonl": "tsx scripts/export-to-jsonl.ts",
    "test": "tsx scripts/test-extraction.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.20.0",
    "@google/generative-ai": "^0.1.1",
    "pdf-lib": "^1.17.1",
    "pdf-parse": "^1.1.1",
    "cli-progress": "^3.12.0",
    "dotenv": "^16.0.3",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### Task 7: Create .env.example (5 min)

**Create**: `.env.example`

```env
# API Keys (required)
ANTHROPIC_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# OpenRouter (optional - for key rotation)
OPENROUTER_API_KEY=your_openrouter_key_here

# Database (optional - for tracking)
DATABASE_URL=postgresql://user:password@localhost:5432/zelda

# Execution Settings
BATCH_SIZE=18
MAX_RETRIES=3
TIMEOUT_SECONDS=60
```

### Task 8: Create Documentation (30 min)

**Files to create in `docs/`**:

1. **`docs/ARCHITECTURE.md`** (300 lines)
   - System architecture deep dive
   - Data flow diagrams
   - Component interactions
   - Code references with line numbers

2. **`docs/AGENT_REFERENCE.md`** (400 lines)
   - Complete reference for all 19 agents
   - Field coverage matrix (which agent extracts which fields)
   - Routing logic explained
   - Example outputs

3. **`docs/FIXES_SUMMARY.md`** (Copy from source)
   - All 7 fixes documented
   - Before/after metrics
   - Integration points

4. **`docs/TROUBLESHOOTING.md`** (200 lines)
   - Common issues and solutions
   - Rate limit handling
   - API key troubleshooting
   - PDF processing errors

### Task 9: Initialize Git and GitHub (15 min)

**Actions**:
1. Commit all changes: `git add -A && git commit -m "feat: Complete ZeldaMeetsClaude repository"`
2. Create GitHub repository: `gh repo create ZeldaMeetsClaude --public --source=. --remote=origin --push`
3. Push all content: `git push -u origin main`
4. Verify: `gh repo view --web`

### Task 10: Create Test Suite (30 min)

**Create**: `scripts/test-extraction.ts` (300 lines)

**Tests to include**:
1. Test single PDF extraction (use smallest PDF from the 20)
2. Verify all agents execute
3. Validate JSON output structure
4. Check confidence scoring
5. Verify consensus mechanism

**Success criteria**:
- At least 15/19 agents succeed
- Output JSON validates against schema
- Cost within expected range ($0.75-1.00)
- Execution time < 15 minutes

## Verification Checklist

After completing all tasks, verify:

- [ ] All 20 PDFs in `pdfs/` directory
- [ ] 19 agent definition files in `agents/`
- [ ] 7 schema files in `schemas/`
- [ ] 6 core library files in `lib/`
- [ ] 1 orchestrator file in `orchestrator/`
- [ ] 4 executable scripts in `scripts/`
- [ ] package.json with correct dependencies
- [ ] .env.example with all required keys
- [ ] 4 documentation files in `docs/`
- [ ] README.md (already created)
- [ ] Repository pushed to GitHub
- [ ] Test suite passes

## Success Criteria

The repository is complete when:

1. **Autonomous Operation**: Claude Web can clone the repo and run the system WITHOUT asking questions
2. **Complete Documentation**: All components explained with examples
3. **Runnable Scripts**: All scripts execute successfully with correct API keys
4. **Test Coverage**: Test suite validates core functionality
5. **GitHub Ready**: Repository is public and well-organized

## Time Estimate

- Task 1: 30 min
- Task 2: 30 min
- Task 3: 45 min
- Task 4: 30 min
- Task 5: 60 min
- Task 6: 15 min
- Task 7: 5 min
- Task 8: 30 min
- Task 9: 15 min
- Task 10: 30 min

**Total**: ~4.5 hours

## Notes for Claude Web

- **Focus on completeness**: Every file should be production-ready
- **Preserve context**: Include code comments explaining WHY things work this way
- **Test as you go**: Run scripts after creating them to verify they work
- **Reference README**: The README already explains the system - use it as ground truth
- **Copy, don't create**: Most code already exists in the source - copy and adapt rather than writing from scratch

## Source Locations

All source code is in: `/Users/hosseins/Dropbox/Dev/Komilion/chameleon_api/nextjs_space/`

Key directories:
- Agent prompts: `lib/active-learning/agent-prompts.ts`
- Core logic: `lib/active-learning/*.ts`
- API routes: `app/api/ground-truth/generate/route.ts`
- Scripts: `scripts/extract-20-pdfs-batch.ts` (reference implementation)
- Schemas: `prisma/schema.prisma` + type definitions

## Questions?

If you encounter issues:
1. Check the README.md (already created in this repo)
2. Check `docs/CLAUDE.md` in the source repo for implementation context
3. Check commit history in source repo for recent changes

**Last Updated**: 2025-11-13
**Status**: Ready for Claude Web autonomous execution
