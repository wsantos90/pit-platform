# API

This document lists the App Router API surface under `src/app/api`.

Base URL examples:

- local: `http://localhost:3000/api`
- production: `https://pit.gg/api`

## Authentication Patterns

| Pattern | How it works | Typical routes |
| --- | --- | --- |
| Session | Supabase session cookie resolved in SSR route handlers | player, clubs, lineups, matchmaking, claim |
| Admin session | Session plus `admin` role check | `admin/*` |
| Moderator session | Session plus `moderator` or `admin` role check | `moderation/*`, tournament control routes |
| Manager session | Session plus managed active club lookup | lineups, matchmaking queue, tournament enroll |
| Webhook secret | `x-webhook-secret` validated against `N8N_WEBHOOK_SECRET` | EA ingest, raw collect, seed flows |
| Cron secret | `x-cron-secret` validated against `CRON_SECRET` or `N8N_WEBHOOK_SECRET` depending on the route | `cron/*`, matchmaking automation |
| Collect token | `x-collect-token` minted by a tournament collect run | `collect/tournament-run/[runId]/ingest` |
| Mercado Pago signature | `x-signature` plus `x-request-id` validated against Mercado Pago secrets | payment and subscription webhooks |

## Response Conventions

Most handlers return JSON with one of these shapes:

```json
{ "success": true, "data": {} }
```

```json
{ "error": "invalid_payload", "details": {} }
```

```json
{ "items": [] }
```

The exact key names vary by route, but the codebase consistently returns JSON and uses HTTP status codes for auth, validation, and conflict handling.

## Route Groups

### Admin

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/admin/discovery-health` | Admin session | Inspect EA fetch transport, cookie-service health, and discovery proxy status. |
| `GET` | `/admin/discovery-runs` | Admin session | List recent discovery runs with counters and error summaries. |
| `GET` | `/admin/financial` | Admin session | Return financial timeline, summary totals, and delinquent clubs for a period window. |
| `POST` | `/admin/ingest-raw` | Webhook secret | Parse raw EA payloads and persist matches without a browser session. |
| `GET` | `/admin/manual-club` | Admin session | Preview a manual discovery candidate by EA club id and show recent matches. |
| `POST` | `/admin/manual-club` | Admin session | Insert or normalize a discovered club manually and notify pending claimants. |
| `GET` | `/admin/metrics` | Admin session | Return headline admin dashboard counts for clubs, players, tournaments, and revenue. |
| `POST` | `/admin/seed-players` | Webhook secret | Create seed players and link them to a club roster from historical match data. |
| `GET` | `/admin/settings` | Admin session | Read key operational settings from `admin_config`. |
| `PATCH` | `/admin/settings` | Admin session | Upsert validated admin settings such as discovery batch sizes and entry fees. |
| `GET` | `/admin/subscriptions` | Admin session | List subscriptions with optional status filtering and joined user or club labels. |

### Claim

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/claim/preview` | Session | Fetch recent EA match previews for a candidate club claim. |
| `POST` | `/claim/submit` | Session (`player`, `manager`, `admin`) | Create a pending claim for a discovered club. |
| `POST` | `/claim/review` | Moderator session | Approve or reject a pending claim through RPC-backed review functions. |

### Clubs

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/clubs/invite` | Session | Send a roster invite from a club manager to a player. |
| `POST` | `/clubs/invite/cancel` | Session | Cancel a still-pending club invite. |
| `POST` | `/clubs/invite/respond` | Session | Accept or reject a pending roster invite as the invited player. |

### Collect

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/collect/run` | Session | Run a manual club collect for the manager's club, optionally using raw extension data. |
| `POST` | `/collect/tournament-run/start` | Admin session | Start a tournament-scoped collect run and mint the temporary ingest token. |
| `POST` | `/collect/tournament-run/[runId]/ingest` | Collect token | Persist one tournament collect payload for a target EA club and update run progress. |

### Cron

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/cron/collect` | Cron secret | Run the batch collect job for active clubs. |
| `POST` | `/cron/matchmaking` | Cron secret | Expire stale matchmaking entries and chats. |
| `GET` | `/cron/payment-strikes` | Cron secret | Cancel overdue trusted entries and increment club strike counters. |
| `POST` | `/cron/tournament` | Cron secret | Advance bracket winners automatically from collected tournament matches. |

### Discovery

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/discovery/scan` | Admin session | Run the club discovery snowball job and persist newly seen clubs and players. |
| `POST` | `/discovery/insert-manual` | Reserved | Placeholder route that currently returns `501 Not implemented`. |

### EA

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/ea/fetch-matches` | Webhook secret | Fetch matches for a club id, optionally using caller-supplied cookies. |

### Lineups

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/lineups` | Manager session | List lineups for the manager's active club, including assigned players. |
| `POST` | `/lineups` | Manager session | Create a lineup for the manager's active club. |
| `PUT` | `/lineups/[id]` | Manager session | Update lineup metadata and player slots. |
| `DELETE` | `/lineups/[id]` | Manager session | Delete a lineup owned by the manager's active club. |
| `POST` | `/lineups/[id]/default` | Manager session | Mark a lineup as the default for the club. |

### Matchmaking

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/matchmaking/queue` | Manager session | Read active queue entries and resolved opponent names for the manager's club. |
| `POST` | `/matchmaking/queue` | Manager session | Add the manager's club to a matchmaking slot and trigger immediate matching. |
| `DELETE` | `/matchmaking/queue` | Manager session | Cancel an open queue entry owned by the manager's club. |
| `POST` | `/matchmaking/confirm` | Manager session | Confirm a confrontation chat from one club side. |
| `POST` | `/matchmaking/expire` | Cron secret | Expire stale queue entries and confrontation chats. |
| `POST` | `/matchmaking/match` | Cron secret | Run the standalone matching job for waiting entries. |

### Moderation

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/moderation/claims` | Moderator session | List claims with claimant, club, and signed proof URLs. |
| `GET` | `/moderation/disputes` | Moderator session | List open or under-review disputes with tournament and club context. |
| `GET` | `/moderation/users` | Moderator session | Search and list users for moderation tooling. |
| `PATCH` | `/moderation/users/[id]` | Moderator session | Update user roles and active status. |
| `GET` | `/moderation/tournaments` | Moderator session | List tournaments with entry counts and enrolled club summaries. |
| `POST` | `/moderation/tournaments` | Moderator session | Create a draft tournament. |
| `PATCH` | `/moderation/tournaments/[id]` | Moderator session | Update a tournament record and status. |
| `GET` | `/moderation/tournaments/[id]/bracket` | Moderator session | Read bracket rows for a moderation view. |
| `POST` | `/moderation/tournaments/[id]/bracket` | Moderator session | Generate or rebuild bracket structure for a tournament. |
| `PATCH` | `/moderation/tournaments/[id]/bracket/[bracketId]` | Moderator session | Update one bracket row, such as pairings or status. |

### Payment

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/payment/create` | Trusted internal caller | Create a Mercado Pago preference or recurring preapproval and write a pending payment row. |
| `POST` | `/payment/refund` | Trusted internal caller | Trigger a Mercado Pago refund and sync the local payment row. |
| `POST` | `/payment/webhook` | Mercado Pago signature | Receive one-time PIX payment callbacks and sync payment plus tournament entry state. |

Implementation note: `payment/create` and `payment/refund` do not currently enforce a session in the route handler, so they should only be called from trusted server-side flows.

### Player

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `PATCH` | `/player/profile` | Session | Create or update the player's EA gamertag profile. |
| `PATCH` | `/player/positions` | Session | Update primary and secondary PIT positions for the current player. |

### Subscription

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/subscription/webhook` | Mercado Pago signature | Receive recurring payment and subscription callbacks and sync payment rows. |

### Tournament

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/tournament` | Session | List recent public tournaments with paid entry counts. |
| `GET` | `/tournament/[id]` | Session | Return one tournament plus its entries and resolved club names. |
| `POST` | `/tournament/create` | Reserved | Placeholder route that currently returns `501 Not implemented`. |
| `POST` | `/tournament/enroll` | Manager session | Enroll the manager's club into an open tournament and create a PIX payment. |
| `GET` | `/tournament/bracket` | Session | Return bracket rows and resolved club labels for a tournament id. |
| `POST` | `/tournament/advance` | Moderator session | Advance a bracket winner manually and attempt round progression. |
| `POST` | `/tournament/finalize` | Moderator session | Finalize a completed tournament, compute awards, and set prize pool totals. |
| `GET` | `/tournament/[id]/hall-of-fame` | Session | Return hall-of-fame awards for a finished tournament. |

## Related References

- [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/DATABASE.md](./DATABASE.md)
- [CLAUDE.md](../CLAUDE.md)

