# P.I.T - Performance Intelligence Tracking

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-000000?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-Private-lightgrey)

Plataforma de gestao competitiva para EA Sports FC Pro Clubs 11v11.

The project uses Next.js App Router on the frontend, Supabase for auth and data, Mercado Pago for PIX payments, and a VPS-hosted cookie service plus n8n for EA API automation.

## Documentation Index

| Document | Purpose |
| --- | --- |
| [README.md](./README.md) | High-level project overview and quick start. |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Branching, commit, PR, and review workflow. |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Local setup, env vars, Supabase workflow, and scripts. |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Runtime architecture, auth patterns, and system flows. |
| [docs/API.md](./docs/API.md) | Route inventory for `src/app/api`. |
| [docs/DATABASE.md](./docs/DATABASE.md) | Schema, enums, ERDs, views, RLS, and trigger summary. |
| [docs/ai-tools/README.md](./docs/ai-tools/README.md) | Secondary AI tooling references and snapshots. |
| [CLAUDE.md](./CLAUDE.md) | Operational SSOT for conventions and guardrails. |
| [vps/VPS_CONTEXT.md](./vps/VPS_CONTEXT.md) | VPS, cookie-service, and n8n deployment context. |

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16.1.6, React 18, TypeScript |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL 15+, Auth, Storage, Realtime) |
| Payments | Mercado Pago |
| Automation | n8n on VPS |
| EA access | VPS cookie service plus browser-assisted fallback |
| Testing | Vitest |

## Quick Start

```bash
git clone https://github.com/wsantos90/pit-platform.git
cd pit-platform
npm install
cp .env.example .env.local
npm run dev
```

For the full local workflow, env var descriptions, Supabase commands, and script reference, see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Project Snapshot

- App router with `(auth)`, `(dashboard)`, `(public)`, and `api` groups
- 37 Supabase migrations in `supabase/migrations/`
- Generated database types in `src/types/database.ts`
- Consolidated AI tool references in `docs/ai-tools/`

## Important Paths

```text
src/app                Next.js pages and API route handlers
src/components         React components
src/hooks              Reusable hooks
src/lib                Domain logic, integrations, auth helpers
src/types              Database and EA API types
supabase/migrations    SQL migration history
docs                   Project documentation
vps                    Cookie service and n8n context
```

## AI Tooling Notes

`CLAUDE.md` is the operational source of truth.

Files in [`docs/ai-tools/`](./docs/ai-tools/) are tool-specific references and should not override the project rules in `CLAUDE.md`.

## Author

Wander - ThePitbullOne
