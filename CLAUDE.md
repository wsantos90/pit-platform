# P.I.T — Claude Code Context
# Performance · Intelligence · Tracking
# Plataforma de Gestão Competitiva para FIFA Pro Clubs 11v11

## Projeto
P.I.T (Performance · Intelligence · Tracking) — plataforma de gestão competitiva para FIFA Pro Clubs 11v11.

**Stack:** Next.js 14 (App Router, TypeScript) + Supabase (PostgreSQL 15+) + Tailwind CSS + Mercado Pago (PIX)
**Deploy:** Vercel (frontend) + VPS (n8n + Puppeteer cookie service)
**Idioma:** UI em Português (BR), código em Inglês

## Princípios de Arquitetura (OBRIGATÓRIOS)
1. **SRP** — Cada módulo/função com um único motivo de mudança
2. **DRY** — Zero repetição; extraia helpers/componentes
3. **SSOT** — Dados de uma única fonte oficial (DB → API → UI)
4. **KISS** — Solução mais simples que atende ao requisito
5. **YAGNI** — Implemente só o necessário agora
6. **SOLID** — OCP/LSP/ISP/DIP quando relevante

## Divisão de Lógica
- **Supabase:** Auth, RLS, Database Functions/Triggers, Realtime, Storage, Views
- **Next.js API Routes:** EA API, Discovery, Matchmaking, Pagamento, Match Classification, Brackets, Encoding
- **Regra:** CRUD + segurança → Supabase. Lógica complexa + APIs externas → API Routes.

## Convenções
- Imports: `@/` alias
- Supabase clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service_role — NUNCA no client)
- Tipos: `@/types` — espelham 1:1 o schema do banco
- API Routes: validação com Zod, retorno `NextResponse.json()`
- Components: PascalCase, um por arquivo
- Hooks: camelCase, prefixo `use`

## Roles (FC11)
Acumulativos: `player`, `manager`, `moderator`, `admin`. Verificar via `useRole()` hook.

## 7 Posições PIT (FC10)
GK, ZAG, VOL, MC, AE, AD, ATA — resolvidas a partir de 4 categorias EA.

## Fluxos Críticos
FC01–FC12 documentados em `Imput Manual/FlowCharts_P.I.T.mermaid`

## Schema
17 migrations em `supabase/migrations/`. RLS em todas as tabelas.
Views: `v_player_stats`, `v_club_stats`, `v_financial_dashboard`, `v_club_rankings`

## Referência Completa
- `Imput Manual/Schema prisma_P.I.T.md` — Arquitetura + Schema detalhado (2136 linhas)
- `Imput Manual/FlowCharts_P.I.T.mermaid` — 12 flowcharts Mermaid
