# P.I.T — Agents Configuration
# Performance · Intelligence · Tracking
# Multi-agent instructions for OpenAI Codex and similar systems

## Project Overview

**P.I.T** (Performance · Intelligence · Tracking) is a competitive management platform for FIFA Pro Clubs 11v11.

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Backend | Supabase (PostgreSQL 15+, Auth, RLS, Realtime, Storage) |
| API | Next.js Route Handlers (`/src/app/api/`) |
| Payment | Mercado Pago (PIX — Brazilian gateway) |
| Automation | n8n (self-hosted VPS) |
| Cookie Mgmt | Puppeteer (self-hosted VPS) |
| Deploy | Vercel (frontend), VPS Ubuntu (n8n + Puppeteer) |

## Mandatory Architecture Principles

All agents MUST follow these principles in every change:

1. **SRP** — Single Responsibility: one reason to change per module/function
2. **DRY** — Don't Repeat: extract shared logic into helpers/components
3. **SSOT** — Single Source of Truth: data flows DB → API → UI
4. **KISS** — Keep It Simple: simplest solution that meets requirement
5. **YAGNI** — No speculative features: implement only what's needed now
6. **SOLID** — Full: SRP + OCP + LSP + ISP + DIP when relevant

## Agent Specializations

### Agent: Frontend
- **Scope:** `src/app/`, `src/components/`, `src/hooks/`
- **Rules:**
  - Use `@/` imports
  - Components are PascalCase, one per file
  - Hooks are camelCase with `use` prefix
  - Use `useRole()` for access control, `useAuth()` for auth state
  - UI text in Portuguese (BR), code in English
  - Dark theme with orange (#f97316) as accent color

### Agent: API
- **Scope:** `src/app/api/`, `src/lib/`
- **Rules:**
  - Validate ALL inputs with Zod
  - Use `createClient()` from `@/lib/supabase/server` for user context
  - Use `createAdminClient()` from `@/lib/supabase/admin` for system operations
  - Return `NextResponse.json()` with appropriate status codes
  - Never expose service_role key to client

### Agent: Database
- **Scope:** `supabase/migrations/`, `src/types/database.ts`
- **Rules:**
  - RLS is enabled on ALL tables — never disable
  - Use `has_role()`, `is_admin()`, `is_moderator_or_admin()`, `is_manager_of()` helper functions
  - After schema changes, update `src/types/database.ts` to match
  - Add indexes for frequently queried columns

### Agent: Integration
- **Scope:** `src/lib/ea/`, `src/lib/payment/`, `vps/`
- **Rules:**
  - EA API requires Akamai cookie — get from cookie service
  - Mercado Pago uses PIX — handle webhook signature verification
  - Always normalize EA strings via `normalizeEaString()` from `@/lib/ea/normalize`
  - Cookie service runs on VPS, not Vercel

## Critical Business Logic

### Match Classification (FC05)
Matches from EA API are always "friendlyMatch". PIT classifies internally:
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
Cumulative: `['player']`, `['player', 'manager']`, `['player', 'manager', 'admin']`
- Never remove roles, only add
- Manager role added automatically when claim is approved

## Reference Documents
- `Imput Manual/Schema prisma_P.I.T.md` — Full architecture + database schema
- `Imput Manual/FlowCharts_P.I.T.mermaid` — 12 flowcharts (FC01–FC12)
