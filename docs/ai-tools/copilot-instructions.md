# P.I.T — GitHub Copilot & Codex Instructions
# Performance · Intelligence · Tracking
# Plataforma de Gestão Competitiva para FIFA Pro Clubs 11v11

## Project Context

**P.I.T** (Performance · Intelligence · Tracking) is a competitive management platform for FIFA Pro Clubs 11v11.

- **Stack:** Next.js 14 (App Router, TypeScript) + Supabase (PostgreSQL 15+) + Tailwind CSS
- **Payment:** Mercado Pago (PIX) — Brazilian gateway
- **Deploy:** Vercel (frontend), VPS (n8n + Puppeteer cookie service)
- **UI Language:** Brazilian Portuguese
- **Code Language:** English

## Architecture Principles (MANDATORY)

1. **SRP** — Single Responsibility: each module/function has one reason to change
2. **DRY** — Don't Repeat Yourself: extract helpers/components, zero duplication
3. **SSOT** — Single Source of Truth: data flows DB → API → UI
4. **KISS** — Keep It Simple: simplest solution that meets the requirement
5. **YAGNI** — You Aren't Gonna Need It: implement only what's needed now
6. **SOLID** — Respect OCP/LSP/ISP/DIP when relevant

## Logic Division

| Where | What |
|-------|------|
| **Supabase** | Auth, RLS, Functions, Triggers, Realtime, Storage, Views |
| **Next.js API Routes** | EA API integration, Discovery pipeline, Matchmaking engine, Payment, Match classification, Tournament brackets, Encoding normalization |

**Rule:** Simple CRUD + security → Supabase. Complex logic + external APIs → API Routes.

## Coding Conventions

- **Imports:** Use `@/` alias (e.g., `@/lib/supabase/server`)
- **Supabase Clients:**
  - Browser: `createClient()` from `@/lib/supabase/client`
  - Server: `createClient()` from `@/lib/supabase/server`
  - Admin: `createAdminClient()` from `@/lib/supabase/admin` — NEVER on client
- **Types:** Always import from `@/types` — they mirror the DB schema 1:1
- **Components:** PascalCase, one per file
- **Hooks:** camelCase, `use` prefix
- **API Routes:** Named exports (GET, POST, PUT, DELETE), validate with Zod
- **Errors:** `NextResponse.json({ error: 'message' }, { status: 4xx })`

## Role System (FC11)

Roles are **cumulative**: `['player']`, `['player', 'manager']`, etc.
- Check with `useRole()` hook (client) or `has_role()` (DB)
- UI Contexts: `profile` (all), `team` (manager), `moderation` (mod+admin), `admin` (admin)

## Position System (FC10)

EA API returns 4 categories → PIT resolves to 7 positions:
`GK`, `ZAG`, `VOL`, `MC`, `AE`, `AD`, `ATA`

## Database

- 17 migrations in `supabase/migrations/`
- RLS enabled on ALL tables
- Views: `v_player_stats`, `v_club_stats`, `v_financial_dashboard`, `v_club_rankings`

## Reference Docs

- `Imput Manual/Schema prisma_P.I.T.md` — Full architecture + schema (2136 lines)
- `Imput Manual/FlowCharts_P.I.T.mermaid` — 12 Mermaid flowcharts (FC01–FC12)
