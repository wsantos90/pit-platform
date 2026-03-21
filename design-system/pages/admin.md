# Admin Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/admin`
> Task: 39 — Admin Panel
> Access: `admin` role only

---

## Layout Structure

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ PageHeader "Admin" + role badge (red)      │
│          ├────────────────────────────────────────────┤
│          │ Tab Nav (horizontal, 7 tabs)               │
│          ├────────────────────────────────────────────┤
│          │ Tab Content (full width)                   │
│          └────────────────────────────────────────────┘
```

### Tab Navigation
- 7 tabs: Dashboard | Collect | Discovery | Financial | Manual ID | Subscriptions | Settings
- Style: same as moderation nav — `--primary` bottom border active, no background fill
- Tabs scroll horizontally on mobile

---

## Tab: Dashboard

### Content
- System health overview: 4 metric cards
  - EA API Status (Online/Offline) — green/red badge
  - Cookie Service Status (Online/Offline) — green/red badge
  - Supabase Status — always green (or hidden if healthy)
  - Total Usuários Ativos (N)
- Recent sync log: table — Timestamp, Clube, Partidas sincronizadas, Resultado (ok/erro)
- Error log: collapsible section — last 10 errors with stack trace snippet (monospace, `--surface-raised`)

---

## Tab: Collect (EA Sync)

### Content
- Manual sync trigger per club
- Club select dropdown + "Sincronizar agora" button (primary)
- Sync progress: animated progress bar + status text ("Coletando partidas... 12/45")
- Sync history table: Clube, Timestamp, Partidas coletadas, Duração, Status

### Bulk Sync
- "Sincronizar todos os clubes" button (outline) — triggers all active clubs sequentially
- Confirm dialog before bulk sync: "Isso pode levar alguns minutos."

---

## Tab: Discovery

### Content
- Manage EA API discovery configuration
- Discovery status indicator (last ran, next scheduled)
- Settings: Platform filter (PS5/Xbox/PC), Region, Min member count
- "Rodar discovery agora" button (primary)
- Results table: Clubes encontrados, filtros aplicados, novos vs. já existentes

---

## Tab: Financial

### Content
- Revenue overview: 3 metric cards — MRR, Total arrecadado, Assinaturas ativas
- Payments table: Clube, Plano, Valor, Status (Pago/Pendente/Falhou), Data, Mercado Pago ID
- Filters: Status, Date range
- Status colors: Pago (green), Pendente (amber), Falhou (red)
- Export button (ghost) — future

---

## Tab: Manual ID

### Content
- Form to manually link a club's EA ID
- Fields: Clube select (autocomplete from DB), EA Club ID (number input), Platform select, Reason textarea
- "Vincular" button (primary)
- History table: Who linked, Clube, EA ID, Timestamp, Reason

---

## Tab: Subscriptions

### Content
- Subscription plans overview: Championship vs Free — active count + revenue per plan
- Per-club subscription management table: Clube, Plano atual, Válido até, Status, Ações
- Actions: Mudar plano (dropdown inline), Revogar, Reativar
- Mudar plano: dropdown select + "Salvar" inline — no modal needed

---

## Tab: Settings

### Content
- Platform-wide settings (global config)
- Sections (each in `--card`):
  - **Temporada atual:** Nome da temporada + data início/fim + status (Ativa/Encerrada) + "Criar nova temporada" button
  - **ELO Config:** K-factor, base ELO, min/max — number inputs + "Salvar" button
  - **Notificações:** Toggle para notificações de sistema (email/push) — admin recebe ou não
  - **Modo manutenção:** Toggle + mensagem customizada — impacta toda a plataforma

### Danger Zone
- Card with `--error/10` background, red header "Zona de Perigo"
- Actions: Resetar ELO de todos os jogadores, Limpar dados de teste
- Each action: destructive outline button → double confirm dialog (type "CONFIRMAR" in input)

---

## Token Usage

| Element | Token |
|---------|-------|
| Admin badge | `--error` |
| API online | `--result-win` |
| API offline | `--result-loss` |
| Pago | `--result-win` |
| Pendente | `--warning` |
| Falhou | `--result-loss` |
| Danger zone bg | `--error/10` |

---

## States

### Loading
- Each tab content: skeleton matching the tab layout

### Access Denied
- Redirect to `/dashboard` if role < admin (handled in layout/middleware)

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Tabs scroll horizontally, tables scroll horizontally, financial cards stack |
| Tablet | Full tabs visible, tables scrollable |
| Desktop | Full layout as described |
