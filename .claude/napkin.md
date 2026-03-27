# Napkin Runbook — P.I.T Platform

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

---

## Project State (atualizar a cada task)
- **Fase:** 3 — Frontend Redesign Completo (tasks 48–90, tag `master`)
- **Task atual:** Nenhuma em progresso — próxima: #48 (CSS Variables)
- **Tasks prontas (sem deps):** 48, 63, 64, 65, 66, 67
- **Total tasks:** 40 (todas pending, todas com subtasks expandidas)
- **Phase 2 backup:** tag `phase2-legacy` (22 tasks, preservadas)
- **Design System:** `design-system/p.i.t/MASTER.md` (OLED dark + amber #F97316)
- **PRD:** `.taskmaster/docs/phase3-redesign-prd.txt` (5 personas, user stories)
- **TaskMaster:** claude-opus-4-5 (main), sonar (research), claude-haiku-4-5 (fallback)
- **Skills obrigatórias:** `frontend-design` + `ui-ux-pro-max` em toda implementação visual; `simplify` para review; `vercel-react-best-practices` para React/Next.js
- **Fluxo por task:** `task-master next` → branch nova → implementar com skills → `tsc --noEmit` + `npm run build` + `npm test` → PR → merge

---

## Execution & Validation (Highest Priority)

1. **[2026-03-26] TaskMaster v0.43.0 NÃO suporta claude-*-4-6**
   Do instead: usar `claude-opus-4-5`, `claude-sonnet-4-5`, ou `claude-haiku-4-5`. IDs `-4-6` causam hang silencioso sem erro.

2. **[2026-03-26] API key Anthropic começa com `sk-ant-`, OpenAI com `sk-proj-`**
   Do instead: verificar prefixo ao configurar `.env`/`.env.local`. Chave errada causa hang silencioso na API.

3. **[2026-03-26] `.env.local` sobrescreve `.env` no Next.js**
   Do instead: se ambos definem a mesma variável, o `.env.local` vence. Sempre checar os dois arquivos ao debugar.

4. **[2026-03-10] Middleware NÃO protege páginas — só `/api/*`**
   Do instead: proteção de rotas de página vai no `(dashboard)/layout.tsx` (Server Component), não no middleware.

5. **[2026-03-10] TaskMaster JSON tem estrutura aninhada**
   Do instead: ao ler `.taskmaster/tasks/tasks.json`, acessar `master.tasks`, não `tasks` diretamente.

6. **[2026-03-10] Testes usam Vitest (não Jest) com ESM nativo**
   Do instead: rodar `npm test` / `npm run test:coverage`. Mocks do Supabase SSR exigem `vi.hoisted()`.

7. **[2026-03-10] Cliente admin do Supabase nunca deve ir ao client**
   Do instead: `src/lib/supabase/admin.ts` é server-only (bypassa RLS). Nunca importar em componentes client.

8. **[2026-03-26] Toda implementação visual DEVE seguir MASTER.md**
   Do instead: ler `design-system/p.i.t/MASTER.md` antes de criar qualquer componente. Zero hardcoded colors, zero light backgrounds, zero emojis como ícones.

9. **[2026-03-26] Toda task precisa começar em branch nova antes da primeira edição**
   Do instead: `git checkout main && git pull` → criar branch `feat/task-XX-description`. Nunca implementar em branch herdada.

10. **[2026-03-26] Não declarar task pronta sem validação final completa**
    Do instead: rodar `npx tsc --noEmit`, `npm run build`, `npm test` e citar resultado antes de reportar conclusão.

---

## Shell & Command Reliability

1. **[2026-03-10] `source .env.stack` quebra com `&` em valores de variáveis**
   Do instead: usar `deploy-stack.sh` para deploy do cookie-service na VPS.

2. **[2026-03-10] IP da VPS (datacenter) bloqueado pelo Akamai**
   Do instead: usar extensão Edge para sincronizar cookies via browser residencial.

3. **[2026-03-26] TaskMaster `parse-prd` com flag `-i=ID` falha silenciosamente**
   Do instead: usar `-i ID` (sem `=`). Ex: `npx task-master research "query" -i 48,49`.

4. **[2026-03-26] `python3` não existe no Windows — usar caminho completo**
   Do instead: `/c/Users/wdsan/AppData/Local/Programs/Python/Python312/python.exe`.

---

## Domain Behavior Guardrails

1. **[2026-03-10] EA API — chaves de jogadores são IDs numéricos, não gamertags**
   Do instead: ler `playername` no objeto do player para o gamertag real.

2. **[2026-03-10] EA API — posições são strings descritivas, não códigos numéricos**
   Do instead: comparar contra `"midfielder"`, `"defender"`, etc.

3. **[2026-03-10] EA API — tempo jogado em `secondsPlayed`, não `minutesPlayed`**
   Do instead: dividir `secondsPlayed / 60`.

4. **[2026-03-10] EA API — encoding de nomes pode ter mojibake**
   Do instead: problema da EA API, não do sistema. Documentar e seguir.

5. **[2026-03-10] Webhook routes da EA API bypassam auth via `x-webhook-secret`**
   Do instead: rotas `/api/ea/*` usam `isWebhookRoute()` no middleware.

---

## User Directives

1. **[2026-03-10] Comunicação em Português**
   Do instead: toda comunicação com o usuário em português. Código e comentários técnicos em inglês.

2. **[2026-03-10] Respostas diretas e técnicas**
   Do instead: ir direto ao ponto, sem rodeios.

3. **[2026-03-26] Skills obrigatórias em toda implementação visual**
   Do instead: invocar `frontend-design` + `ui-ux-pro-max` para cada tela/componente. `simplify` para review de código. `vercel-react-best-practices` para performance React.

4. **[2026-03-26] Cada implementação segue: user story + design system + test strategy**
   Do instead: ler a user story da task no PRD, aplicar tokens do MASTER.md, e seguir a testStrategy definida nos subtasks.
