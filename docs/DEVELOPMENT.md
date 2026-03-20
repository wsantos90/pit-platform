# Development

This guide covers local setup, environment variables, Supabase workflow, and the scripts used in day-to-day development.

## Prerequisites

- Node.js 18 or newer
- npm
- Git
- Supabase CLI
- Docker Desktop or an equivalent Docker runtime for local Supabase

Optional but often required during backend work:

- GitHub CLI (`gh`) for issue, label, and milestone management
- Access to the VPS cookie-service stack for EA API flows

## Quick Start

```bash
git clone https://github.com/wsantos90/pit-platform.git
cd pit-platform
npm install
cp .env.example .env.local
npm run dev
```

The app starts at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values below.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public Supabase project URL used by browser and SSR clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anonymous key for SSR and client auth flows. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key used by admin routes and background jobs. |
| `COOKIE_SERVICE_URL` | Conditional | VPS endpoint that refreshes or serves Akamai cookies for EA API access. |
| `COOKIE_SERVICE_SECRET` | Conditional | Shared secret for the cookie-service API. |
| `EA_API_BASE_URL` | Yes | EA FC Pro Clubs API base URL. The example defaults to the production endpoint. |
| `EA_PLATFORM` | Yes | EA platform slug, for example `common-gen5`. |
| `MP_ACCESS_TOKEN` | Conditional | Mercado Pago token for one-time PIX payments. |
| `MP_PUBLIC_KEY` | Conditional | Mercado Pago public key used by checkout integrations. |
| `MP_WEBHOOK_SECRET` | Conditional | Mercado Pago webhook signature secret for one-time payment callbacks. |
| `MP_ACCESS_TOKEN_RECURRING` | Conditional | Mercado Pago token for recurring subscription flows. |
| `MP_WEBHOOK_SECRET_RECURRING` | Conditional | Mercado Pago signature secret for recurring callbacks. |
| `N8N_WEBHOOK_SECRET` | Yes | Shared secret for internal webhooks and most scheduled background routes. |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical app URL used to build callback and redirect URLs. |
| `TIMEZONE` | Recommended | Default project timezone. The repository example uses `America/Sao_Paulo`. |

## Local Supabase

Start the local stack:

```bash
npx supabase start
```

Apply the migration history to the local database:

```bash
npx supabase db push
```

Useful follow-up commands:

```bash
npx supabase db reset
npx supabase status
```

Use `db reset` when local state drifted too far from the migration history and you need a clean rebuild.

## Type Generation

Generate fresh TypeScript database types after any schema change:

```bash
npm run gen:types
```

This command writes to `src/types/database.ts`.

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run build:extension` | Build the browser extension assets in `scripts/build-extension.js`. |
| `npm run start` | Run the production server after a build. |
| `npm run lint` | Run ESLint across the repository. |
| `npm run typecheck` | Run `tsc --noEmit`. |
| `npm run gen:types` | Generate `src/types/database.ts` from the local Supabase schema. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run test:coverage` | Run Vitest with coverage output. |
| `npm run postinstall` | Apply the Taskmaster compatibility fix used by this repository. |

## Working With External Services

### EA API and Cookie Service

EA API access depends on fresh Akamai cookies. The app can fetch them from the VPS cookie service or from raw payloads captured locally by the browser extension flow.

If EA-backed features fail locally:

1. confirm `COOKIE_SERVICE_URL` and `COOKIE_SERVICE_SECRET`
2. confirm the VPS service is healthy
3. check the internal discovery and collect routes in [docs/API.md](./API.md)

### Mercado Pago

Payment and subscription routes require valid Mercado Pago credentials and webhook secrets. Set both one-time and recurring secrets when testing full payment flows.

### VPS and n8n

Deployment and operational details for the VPS stack live in [`vps/VPS_CONTEXT.md`](../vps/VPS_CONTEXT.md).

## Recommended Daily Flow

1. Pull the latest changes from `main`.
2. Create a task branch.
3. Start local Supabase if the task touches schema or route persistence.
4. Run `npm run dev`.
5. Run `npm run gen:types` after migration changes.
6. Run build, lint, typecheck, and tests before opening a PR.

## Troubleshooting

### Types look stale

Run:

```bash
npm run gen:types
```

### Local schema does not match migrations

Run:

```bash
npx supabase db reset
npm run gen:types
```

### EA fetches fail

Check the cookie service configuration and the discovery health route documented in [docs/API.md](./API.md).

### Build passes locally but routes fail at runtime

Double-check `.env.local`, especially `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_SECRET`, and Mercado Pago credentials.

