# P.I.T — Claude Code Context
# Performance · Intelligence · Tracking
# Plataforma de Gestão Competitiva para FIFA Pro Clubs 11v11

## Stack
- **Frontend:** Next.js 16.1.6 (App Router, TypeScript) + Tailwind CSS
- **Backend:** Supabase (PostgreSQL 15+, Auth, RLS, Realtime, Storage)
- **Pagamento:** Mercado Pago (PIX)
- **Deploy:** Vercel (frontend) + VPS Ubuntu (n8n + Puppeteer cookie service)
- **Idioma:** UI em Português (BR), código em Inglês

## Estado Atual do Projeto
- **Tasks concluídas:** 1–19 (todas done)
- **Task atual:** 20 — Implementar escalação visual (grid 3-5-2 com drag & drop)
- **Tasks pendentes:** 20, 21, 22, 23, 24, 25
- **Migrations:** 23 arquivos em `supabase/migrations/`
- **Design:** visual funcional sem padrão definido (1-2 telas com Stitch experimental)
- **Decisão de design:** NÃO aplicar redesign durante tasks 20–25. Redesign Stitch completo após task 25.

## Fluxo de Trabalho
Claude (plano + análise) → Codex (implementação) → Claude (revisão) → Codex (correção) → Claude (aprovação)
Cada task: branch nova → teste Vercel → merge na main se aprovado.

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

## Convenções de Código
- Imports: alias `@/`
- Supabase clients: `client.ts` (browser) · `server.ts` (SSR) · `admin.ts` (service_role — NUNCA no client)
- Tipos: `@/types` — espelham 1:1 o schema do banco
- API Routes: validação com Zod, retorno `NextResponse.json()`
- Components: PascalCase, um por arquivo
- Hooks: camelCase, prefixo `use`
- Tema: dark, accent orange (`#f97316`)

## Roles (FC11)
Acumulativos: `player` → `manager` → `moderator` → `admin`
Verificar via `useRole()`. Manager adicionado automaticamente ao aprovar claim.

## 7 Posições PIT (FC10)
GK, ZAG, VOL, MC, AE, AD, ATA — resolvidas a partir de 4 categorias EA:
- `goalkeeper` → GK
- `defender` → ZAG
- `midfielder` → VOL / MC / AE / AD (primary/secondary do jogador)
- `forward` → ATA

## Lógica de Negócio Crítica
- **Match Classification (FC05):** EA retorna sempre `friendlyMatch`. PIT classifica: `championship`, `friendly_pit`, `friendly_external`
- **EA API:** requer cookie Akamai do cookie service (VPS). IP de datacenter bloqueado pelo Akamai.
- **Cookie service:** roda na VPS, não na Vercel. Deploy via `deploy-stack.sh`.

## Estrutura de Pastas Relevante
```
src/
  app/
    (auth)/login/
    (dashboard)/          ← páginas protegidas (proteção no layout.tsx, não no middleware)
    (profile-shell)/
    api/
  components/
  hooks/
  lib/
    ea/                   ← integração EA API
    supabase/             ← clients (client/server/admin)
    rating/               ← ELO
    payment/              ← Mercado Pago
  types/
vps/
  cookie-service/         ← Puppeteer + Docker Swarm (serviço separado)
  n8n/workflows/
supabase/
  migrations/             ← 23 arquivos, tasks 1–17 + patches
```

## Views Disponíveis (Supabase)
`v_player_stats`, `v_club_stats`, `v_financial_dashboard`, `v_club_rankings`

## Guardrails Críticos (não esquecer)

### Execução & Validação
- **Middleware** protege APENAS `/api/*` — proteção de páginas vai no `(dashboard)/layout.tsx` (Server Component). Nunca mover redirect de página para o middleware.
- **`admin.ts` Supabase** é server-only (bypassa RLS). Nunca importar em client components ou rotas públicas.
- **Testes:** Vitest com ESM nativo. Mocks Supabase SSR exigem `vi.hoisted()`. Rodar via `npm test`.
- **TaskMaster JSON:** estrutura aninhada — acessar `master.tasks`, não `tasks` diretamente.

### EA API — Pegadinhas
- Chave de jogador em `players[clubId]` é ID de plataforma numérico; usar `playername` para o gamertag.
- Posições são strings descritivas (`"midfielder"`, `"defender"`), não códigos numéricos.
- Tempo jogado está em `secondsPlayed` — dividir por 60 para minutos.
- Nomes de clube podem ter mojibake (problema da EA, não tratar no parser).
- `details.name` para nome real do clube; campos de clube no nível raiz podem estar vazios.
- Rotas `/api/ea/*` usam `isWebhookRoute()` — validar `x-webhook-secret`, não session.

### Shell & VPS
- `source .env.stack` quebra com `&` em valores — usar `deploy-stack.sh` para deploy do cookie-service.
- IP da VPS (datacenter) bloqueado pelo Akamai — usar Edge Extension para sincronizar cookies.

### Diretivas de Comunicação
- Toda comunicação com o usuário em **Português (BR)**. Código e comentários em inglês.
- Respostas diretas e técnicas — sem rodeios ou introduções desnecessárias.
- **Design congelado até task 25** — NÃO alterar visual, layout ou components de UI. Redesign Stitch pós-task 25.

## Referências
- `Imput Manual/Schema prisma_P.I.T.md` — arquitetura + schema detalhado
- `Imput Manual/FlowCharts_P.I.T.mermaid` — 12 flowcharts (FC01–FC12)
- `.claude/napkin.md` — runbook dinâmico (erros novos, estado atual da task)
- `vps/VPS_CONTEXT.md` — contexto do ambiente VPS
