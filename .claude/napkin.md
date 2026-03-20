# Napkin Runbook — P.I.T Platform

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

---

## Project State (atualizar a cada task)
- **Fase:** 2 — Redesign Visual + Refatoração (tasks 26–47)
- **Task atual:** 26 — Codebase Refactoring and Cleanup
- **Tasks pendentes:** 26–47 (22 tasks, 148 subtasks)
- **Tasks concluídas Fase 1:** 1–25 (todas done)
- **Migrations:** 23 arquivos em `supabase/migrations/`
- **Design:** Fase 2 É o redesign — aplicar livremente. Usar skills: `ui-ux-pro-max`, `frontend-design`, `stitch-brief`, `stitch-apply`, `vercel-react-best-practices`
- **TaskMaster:** tasks 26–47 no `master` tag. Modelo: `claude-sonnet-4-6` via Anthropic.
- **Fluxo Fase 2:** `task-master next` → branch nova → implementar com skills → PR → merge
- **Branch atual:** `feature/task-25-manual-club-id` (fase 1) — criar nova branch para task 26

---

## Execution & Validation (Highest Priority)

1. **[2026-03-10] Middleware NÃO protege páginas — só `/api/*`**
   Do instead: proteção de rotas de página vai no `(dashboard)/layout.tsx` (Server Component), não no middleware. Nunca mover lógica de redirect de página para o middleware.

2. **[2026-03-10] TaskMaster JSON tem estrutura aninhada**
   Do instead: ao ler `.taskmaster/tasks/tasks.json`, acessar `master.tasks`, não `tasks` diretamente.

3. **[2026-03-10] Testes usam Vitest (não Jest) com ESM nativo**
   Do instead: rodar `npm test` / `npm run test:coverage`. Mocks do Supabase SSR exigem `vi.hoisted()` para variáveis acessíveis dentro de `vi.mock()`.

4. **[2026-03-10] Cliente admin do Supabase nunca deve ir ao cliente**
   Do instead: `src/lib/supabase/admin.ts` é server-only (bypassa RLS). Nunca importar em componentes client ou rotas públicas.

5. **[2026-03-19] `expand --all` só age em tasks SEM subtasks**
   Do instead: se todas já têm subtasks, `expand --all` retorna "0 tasks eligible". Usar `expand --id=N` para re-gerar individualmente se necessário.

6. **[2026-03-19] TaskMaster `validate-dependencies` rejeita deps intra-subtask**
   Do instead: após `expand --all`, rodar script de limpeza para remover deps com IDs < 26 (refs de irmãs que o validador trata como top-level inexistentes). Isso é bug do TaskMaster, não erro de configuração.

7. **[2026-03-20] Toda task precisa comeÃ§ar em branch nova antes da primeira ediÃ§Ã£o**
   Do instead: antes de qualquer alteraÃ§Ã£o, rodar `git checkout main && git pull` e criar `feat/`, `refactor/`, `fix/`, `docs/` ou `design/` conforme a task. Nunca implementar em branch herdada da task anterior.

8. **[2026-03-20] NÃ£o declarar task pronta sem validaÃ§Ã£o final completa**
   Do instead: antes de reportar conclusÃ£o, rodar `npx tsc --noEmit`, `npm run build`, `npm test`, lint relevante e checks pontuais da task, e citar explicitamente o resultado.

---

## Shell & Command Reliability

1. **[2026-03-10] `source .env.stack` quebra com `&` em valores de variáveis**
   Do instead: usar `deploy-stack.sh` para deploy do cookie-service na VPS — nunca fazer `source .env.stack` diretamente no shell.

2. **[2026-03-10] IP da VPS (datacenter) bloqueado pelo Akamai**
   Do instead: usar extensão Edge (`scripts/create-edge-extension.js`) para sincronizar cookies via browser residencial. Não tentar acessar EA API diretamente da VPS.

---

## Domain Behavior Guardrails

1. **[2026-03-10] EA API — campos de jogadores usam IDs numéricos como chave, não gamertags**
   Do instead: ler `playername` no objeto do player para obter o gamertag real. A chave `players[clubId]` é ID de plataforma (ex: `1009046545537`).

2. **[2026-03-10] EA API — posições vêm como strings descritivas, não códigos numéricos**
   Do instead: comparar contra `"midfielder"`, `"defender"`, etc. Não usar `"0"`, `"1"`.

3. **[2026-03-10] EA API — tempo jogado está em `secondsPlayed`, não `minutesPlayed`**
   Do instead: dividir `secondsPlayed / 60` para obter minutos.

4. **[2026-03-10] EA API — nomes de clubes podem ter mojibake (encoding quebrado)**
   Do instead: problema da EA API, não do sistema. Não tentar "corrigir" no parser — documentar e seguir em frente.

5. **[2026-03-10] Schema Zod do EA parser — `name`, `clubId`, `teamId` são opcionais**
   Do instead: usar `details.name` para o nome real do clube. Não assumir que os campos de clube no nível raiz estão preenchidos.

6. **[2026-03-10] Webhook routes da EA API bypassam auth via `x-webhook-secret`**
   Do instead: rotas `/api/ea/*` usam `isWebhookRoute()` no middleware — validar o header `x-webhook-secret`, não session de usuário.

---

## Config por Task (Fase 2)

**Fluxo padrão por task:**
1. **Planejar** → Claude Opus + effort high + Plan Mode
2. **Implementar** → Codex (modelo abaixo) + reasoning indicado
3. **Revisar** → Claude Sonnet + effort medium (checar o que foi feito, identificar gaps)
4. **Corrigir** → Codex novamente se necessário

**Codex — modelo padrão: `GPT-5.4` para todas as tasks.**

| Task | Plano (Claude) | Codex Reasoning | Nota |
|---|---|---|---|
| 26 Codebase Refactoring | Opus/high | High | |
| 27 Documentation | Opus/high | Medium | |
| 28 Visual Brainstorm + Design System | Opus/high | — | Só planejamento, sem impl |
| 29 Design Tokens | Opus/high | High | Mudança global |
| 30 Shared Components | Opus/high | High | |
| 31 Layout Shell (Sidebar+Navbar) | Opus/high | High | |
| 32 Auth Pages | Opus/high | Medium | |
| 33 Profile Page | Opus/high | High | |
| 34 Profile Sub-Pages | Opus/high | Medium | |
| 35 Team Page | Opus/high | High | |
| 36 Team Sub-Pages | Opus/high | Medium | |
| 37 Matchmaking Page | Opus/high | Medium | |
| 38 Tournament Pages | Opus/high | High | |
| 39 Detail Pages | Opus/high | Medium | |
| 40 Rankings + Hall of Fame | Opus/high | Medium | |
| 41 Landing Page | Opus/high | Extra High | Página crítica |
| 42 Admin Panel | Opus/high | High | |
| 43 Moderation Panel | Opus/high | Medium | |
| 44 Utility Pages | Opus/medium | Low | 404, loading |
| 45 SEO + OG Images | Opus/high | High | |
| 46 Performance Budget | Opus/high | High | |
| 47 Visual Regression Tests | Opus/high | Medium | |

---

## User Directives

1. **[2026-03-10] Comunicação em Português**
   Do instead: toda comunicação com o usuário deve ser em português. Código e comentários técnicos podem ser em inglês.

2. **[2026-03-10] Respostas diretas e técnicas**
   Do instead: ir direto ao ponto, sem rodeios ou introduções desnecessárias.

3. **[2026-03-19] Novo chat por task — passar contexto mínimo necessário**
   Do instead: ao iniciar nova task, mencionar "Task 2X" e rodar `task-master show <id>` para carregar contexto. Não resumir toda a Fase 2 manualmente.
