# Moderation Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/moderation`, `/moderation/claims`, `/moderation/disputes`, `/moderation/tournaments`, `/moderation/users`
> Task: 38 — Moderation Panel
> Access: `moderator` role+

---

## Layout Structure (shared)

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ PageHeader "Moderação" + role badge        │
│          ├──────────┬─────────────────────────────────┤
│          │ Mod Nav  │ Tab Content                     │
│          │ (tabs)   │                                 │
│          └──────────┴─────────────────────────────────┘
```

### Moderation Nav (top horizontal tabs)
- Tabs: Overview | Claims | Disputas | Torneios | Usuários
- Active tab: `--primary` bottom border 2px + `--primary` text
- Pending badge on Claims and Disputas tabs if queue > 0: `--accent-brand` circle badge

---

## /moderation — Overview

### Content
- 4 summary cards in a row:
  - Claims Pendentes (N) — `--accent-brand` accent if > 0
  - Disputas Abertas (N) — `--error` accent if > 0
  - Usuários Ativos (N) — neutral
  - Torneios Ativos (N) — `--primary` accent
- Below: Recent Activity feed (last 10 moderation events)
  - Each row: timestamp + actor + action description + target
  - Actions: Claim Aprovado, Claim Rejeitado, Disputa Resolvida, Usuário Suspenso, Torneio Criado

---

## /moderation/claims — Claims Queue

### Layout
- Full-width queue table + detail panel (slide-in drawer on row click)

### Claims Table
- Columns: # ID, Clube Solicitado, Manager, Plataforma, Data, Status, Ações
- Status: Pendente (amber), Aprovado (green), Rejeitado (red)
- Actions column: "Aprovar" (primary ghost) + "Rejeitar" (destructive ghost) — for pending only
- Filters: Status (All/Pending/Approved/Rejected), Date range
- Default sort: newest first

### Claim Detail Drawer
- Slide-in from right, 480px wide, scrim behind
- Header: Claim #ID + status badge + close button
- Sections:
  - Manager info (gamertag, email, user ID)
  - Club data (EA Club ID, platform, member count from EA API)
  - Verification status (verified/unverified)
  - Action buttons: "Aprovar" (primary) / "Rejeitar" (opens confirm dialog)
- Reject Dialog: `Dialog` component + textarea for rejection reason (required) + "Confirmar rejeição" (destructive)

---

## /moderation/disputes — Disputes

### Layout
- Same pattern as claims: table + detail drawer

### Disputes Table
- Columns: # ID, Partida, Clube Reclamante, Motivo, Status, Data, Ações
- Status: Aberta (amber), Em Análise (blue), Resolvida (green), Rejeitada (red)
- Row click → detail drawer

### Dispute Detail Drawer
- Match reference card (date, clubs, score)
- Dispute reason text (full)
- Evidence section: screenshots (thumbnail grid, click to expand lightbox)
- Resolution section (moderator only): radio options (Confirmar resultado / Anular partida / Atualizar placar) + confirm button

---

## /moderation/tournaments — Tournament Management

### Layout
- List of all tournaments with full CRUD access
- Same card grid as `/tournaments` but with edit/delete actions visible

### Tournament Manager Actions
- Each card: "Editar" (outline) + "Encerrar" / "Deletar" (destructive ghost) kebab
- "Criar torneio" button prominent in PageHeader
- Create/Edit: full-page form or modal (based on complexity)

### Tournament Form (Create/Edit)
- Fields: Nome, Formato (single/double elimination / grupos), Data início, Data fim, Participantes máx, Premio (optional), Status
- Preview of bracket structure based on format + participant count

---

## /moderation/users — User Management

### Layout
- Full-width searchable table

### Users Table
- Columns: Gamertag, Email, Role, Clube, Status, Último acesso, Ações
- Role badge: Player (gray) / Manager (blue) / Moderator (purple) / Admin (red)
- Status: Ativo (green), Suspenso (red)
- Search: text input filters gamertag and email
- Actions (kebab): Ver perfil, Alterar role, Suspender/Reativar, Resetar senha

### Role Change Confirm
- Dialog: "Alterar role de [gamertag] para [novaRole]?" + confirm (primary) + cancel

### Suspend Confirm
- Dialog: "Suspender conta de [gamertag]?" + reason textarea + duration select (1d/7d/30d/Permanente) + confirm (destructive)

---

## Token Usage

| Element | Token |
|---------|-------|
| Pending badge | `--warning` / `--accent-brand` |
| Approved | `--result-win` |
| Rejected | `--result-loss` |
| Open dispute | `--warning` |
| Admin role | `--error` |
| Moderator role | `--primary` |

---

## States

### Loading
- Tables: 10 skeleton rows
- Overview cards: 4 skeleton cards

### Empty
- Claims: "Nenhum claim pendente. Tudo em dia ✓"
- Disputes: "Nenhuma disputa aberta."
- Both use EmptyState component without action button

### Access Denied
- If user role < moderator: redirect to `/dashboard` (handled in layout)

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Mod nav becomes scrollable chips row, detail drawer becomes full-screen modal |
| Tablet | Drawer at 400px |
| Desktop | Full layout as described |
