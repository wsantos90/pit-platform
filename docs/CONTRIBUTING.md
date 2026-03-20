# Contributing

This repository follows a task-driven workflow. Keep changes scoped, reproducible, and easy to review.

## Before You Start

- Read [CLAUDE.md](../CLAUDE.md) for the current project rules, architecture guardrails, and coding conventions.
- Read [docs/DEVELOPMENT.md](./DEVELOPMENT.md) for local setup and runtime requirements.
- Read [docs/ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/API.md](./API.md) when changing route behavior or domain flows.

`CLAUDE.md` is the operational SSOT. Do not duplicate its rules in code comments or PR descriptions.

## Workflow

1. Start from `main`.
2. Create one branch per task, bug, or doc update.
3. Keep each branch focused on a single outcome.
4. Open a pull request using the repository template.
5. Merge only after build, lint, typecheck, and tests pass.

## Branch Naming

Use the prefix that matches the change:

| Prefix | Use for |
| --- | --- |
| `feat/` | New product behavior or route capability |
| `fix/` | Bug fixes and regressions |
| `refactor/` | Internal cleanup without behavior change |
| `docs/` | Documentation-only work |
| `design/` | Visual redesign and UX exploration |

Examples:

- `feat/task-35-team-page`
- `fix/payment-webhook-signature`
- `docs/task-27-project-documentation`

## Commit Messages

Use:

```text
type: short description
```

Recommended commit types:

- `feat`
- `fix`
- `refactor`
- `docs`
- `design`
- `test`
- `chore`

Examples:

```text
feat: add admin discovery health endpoint
fix: validate claim review rejection reason
docs: add development and database guides
design: refine phase 2 tournament shell
```

## Pull Requests

Every pull request should:

- explain the user, operator, or developer impact
- link the issue, task, or planning note
- call out migrations, env vars, or API contract changes
- attach screenshots for visible UI changes
- update docs when setup, workflows, or behavior changed

Use the checklist in [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) before requesting review.

## Required Quality Gates

Run these commands before opening or updating a PR:

```bash
npm run build
npm run lint
npm run typecheck
npm test
```

Also run `npm run gen:types` whenever the Supabase schema changes.

## Testing

- Unit and integration tests use Vitest.
- Run the suite with `npm test`.
- Use `npm run test:coverage` when you need coverage details.
- Supabase SSR mocks may require `vi.hoisted()` so mock state is available inside `vi.mock()`.
- Prefer adding or updating tests alongside route, auth, and persistence changes.

## Code Standards

Do not copy rules from `CLAUDE.md` into this file. Reference the source of truth instead.

Important reminders:

- Use `@/` import aliases.
- Keep Supabase admin access server-only.
- Validate route payloads with Zod.
- Treat generated database types as schema mirrors, not hand-written domain models.

## Documentation Rules

- Keep code and technical docs in English.
- Keep the product UI in pt-BR.
- Update the nearest document when behavior changes:
  - setup and scripts -> [docs/DEVELOPMENT.md](./DEVELOPMENT.md)
  - architecture and auth -> [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
  - route contracts -> [docs/API.md](./API.md)
  - schema and views -> [docs/DATABASE.md](./DATABASE.md)

## Communication

- User-facing copy should remain pt-BR.
- Code, docs, and commit messages should stay in English.
- Be explicit in PR notes when a change depends on external systems such as Supabase, Mercado Pago, n8n, or the VPS cookie service.


