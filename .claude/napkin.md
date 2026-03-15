# Napkin Runbook — P.I.T Platform

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

---

## Project State (atualizar a cada task)
- **Task atual:** 20 — Escalação visual (grid 3-5-2 com drag & drop)
- **Tasks pendentes:** 20, 21, 22, 23, 24, 25
- **Tasks concluídas:** 1–19
- **Migrations:** 23 arquivos em `supabase/migrations/`
- **Design:** NÃO aplicar redesign visual durante tasks 20–25. Redesign Stitch completo após task 25.
- **Fluxo:** Claude (plano) → Codex (impl) → Claude (revisão) → Codex (fix) → Claude (aprovação)
- **Branch:** criar branch nova por task, merge na main só após aprovação do Claude

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

## User Directives

1. **[2026-03-10] Comunicação em Português**
   Do instead: toda comunicação com o usuário deve ser em português. Código e comentários técnicos podem ser em inglês.

2. **[2026-03-10] Respostas diretas e técnicas**
   Do instead: ir direto ao ponto, sem rodeios ou introduções desnecessárias.

3. **[2026-03-15] Design congelado até task 25**
   Do instead: NÃO alterar visual, layout ou components de UI durante tasks 20–25. Qualquer melhoria visual fica para o redesign Stitch pós-task 25.
