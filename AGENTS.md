# P.I.T — Agents Configuration
# Performance · Intelligence · Tracking
# Multi-agent instructions for OpenAI Codex and similar systems

## Project Overview

**P.I.T** (Performance · Intelligence · Tracking) — plataforma de gestão competitiva para FIFA Pro Clubs 11v11.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.1.6 (App Router, TypeScript, Tailwind CSS) |
| Backend | Supabase (PostgreSQL 15+, Auth, RLS, Realtime, Storage) |
| API | Next.js Route Handlers (`/src/app/api/`) |
| Payment | Mercado Pago (PIX — gateway brasileiro) |
| Automation | n8n (self-hosted VPS) |
| Cookie Mgmt | Puppeteer (self-hosted VPS) |
| Deploy | Vercel (frontend), VPS Ubuntu (n8n + Puppeteer) |

## Project State
- **Tasks done:** 1–19
- **Current task:** 20 — Escalação visual (grid 3-5-2 com drag & drop)
- **Pending:** 20, 21, 22, 23, 24, 25
- **Migrations:** 23 arquivos em `supabase/migrations/`
- **Design decision:** NÃO alterar visual durante tasks 20–25. Redesign Stitch completo após task 25.

## Workflow
Claude (plan) → Codex (implement) → Claude (review) → Codex (fix) → Claude (approve)
Each task gets its own git branch. Merge to main only after Claude approval.

## Mandatory Architecture Principles

All agents MUST follow these principles in every change:

1. **SRP** — Single Responsibility: one reason to change per module/function
2. **DRY** — Don't Repeat: extract shared logic into helpers/components
3. **SSOT** — Single Source of Truth: data flows DB → API → UI
4. **KISS** — Keep It Simple: simplest solution that meets the requirement
5. **YAGNI** — No speculative features: implement only what's needed now
6. **SOLID** — Full: SRP + OCP + LSP + ISP + DIP when relevant

## Agent Specializations

### Agent: Frontend
- **Scope:** `src/app/`, `src/components/`, `src/hooks/`
- **Rules:**
  - Use `@/` imports
  - Components: PascalCase, one per file
  - Hooks: camelCase with `use` prefix
  - Use `useRole()` for access control, `useAuth()` for auth state
  - UI text in Portuguese (BR), code in English
  - Dark theme, accent color orange (`#f97316`)
  - **DO NOT apply visual redesign during tasks 20–25**
  - Page protection goes in `(dashboard)/layout.tsx` (Server Component), NOT in middleware

### Agent: API
- **Scope:** `src/app/api/`, `src/lib/`
- **Rules:**
  - Validate ALL inputs with Zod
  - Use `createClient()` from `@/lib/supabase/server` for user context
  - Use `createAdminClient()` from `@/lib/supabase/admin` for system operations (NEVER in client components)
  - Return `NextResponse.json()` with appropriate status codes
  - EA API routes use `x-webhook-secret` header auth, not session

### Agent: Database
- **Scope:** `supabase/migrations/`, `src/types/database.ts`
- **Rules:**
  - RLS is enabled on ALL tables — never disable
  - Use helper functions: `has_role()`, `is_admin()`, `is_moderator_or_admin()`, `is_manager_of()`
  - After schema changes, update `src/types/database.ts` to match
  - Add indexes for frequently queried columns
  - Never modify existing migrations — always create new ones

### Agent: Integration
- **Scope:** `src/lib/ea/`, `src/lib/payment/`, `vps/`
- **Rules:**
  - EA API requires Akamai cookie from cookie service (VPS)
  - VPS datacenter IP is blocked by Akamai — never call EA API directly from VPS
  - Always normalize EA strings via `normalizeEaString()` from `@/lib/ea/normalize`
  - Cookie service deploys via `deploy-stack.sh` — never `source .env.stack` directly
  - Mercado Pago uses PIX — handle webhook signature verification

## Critical Business Logic

### Match Classification (FC05)
EA API always returns `friendlyMatch`. PIT classifies internally:
- `championship` — both teams in active tournament bracket
- `friendly_pit` — both teams in active matchmaking confrontation
- `friendly_external` — everything else

### Position Resolution (FC10)
EA returns 4 generic categories → PIT resolves to 7 positions:
- `goalkeeper` → `GK`
- `defender` → `ZAG`
- `midfielder` → `VOL`, `MC`, `AE`, `AD` (based on player's primary/secondary)
- `forward` → `ATA`

### Role System (FC11)
Cumulative: `['player']` → `['player', 'manager']` → `['player', 'manager', 'admin']`
- Never remove roles, only add
- Manager role added automatically when claim is approved

### EA API Gotchas
- Player keys are numeric platform IDs (e.g. `1009046545537`), not gamertags — use `playername` field
- Positions are descriptive strings: `"midfielder"`, `"defender"` — not numeric codes
- Time played is `secondsPlayed`, not `minutesPlayed` — divide by 60
- Club names may have mojibake encoding — this is an EA bug, do not try to fix in parser

## Reference Documents
- `Imput Manual/Schema prisma_P.I.T.md` — Full architecture + database schema
- `Imput Manual/FlowCharts_P.I.T.mermaid` — 12 flowcharts (FC01–FC12)
- `.claude/napkin.md` — Live runbook of learned patterns and gotchas (READ FIRST every session)
- `vps/VPS_CONTEXT.md` — VPS environment context
