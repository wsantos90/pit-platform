# Team Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/team`, `/team/roster`, `/team/lineup`, `/team/matches`, `/team/claim`
> Task: 35 — Team Overview, 36 — Team Sub-Pages

---

## /team — Team Overview

### Layout Structure

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ Team Hero (full width)                     │
│          ├──────────┬──────────┬──────────┬───────────┤
│          │ StatCard │ StatCard │ StatCard │ StatCard  │
│          ├──────────┴──────────┴──────────┴───────────┤
│          │ Recent Matches (5 rows, inline)            │
│          ├──────────────────────┬─────────────────────┤
│          │ Roster Snapshot      │ Quick Stats         │
│          └──────────────────────┴─────────────────────┘
```

### Team Hero Component
- Background: `--card`, `rounded-lg`, `p-6`
- Left: Club logo (64px circle, `--surface-raised` fallback) + club `display_name` (`text-page-title`) + EA name (`text-body-sm`, `--foreground-secondary`)
- Center: Win Rate % large (`text-data-lg`, `--primary`) + "Win Rate" label (`text-label`, uppercase)
- Right: inline stats row — Partidas / Vitórias / Empates / Derrotas
- Subscription plan badge (Championship / Free) top-right corner — `PositionBadge` style
- Status: if `status !== 'active'` → amber warning banner below hero

### Stats Grid
- 4 StatCards: Partidas Jogadas, Vitórias, Média de Gols, Jogadores Ativos
- `gap-4`, 2-col mobile, 4-col desktop

### Recent Matches Panel
- 5 most recent matches: Date, Adversário, Competição badge, Resultado badge (W/D/L), Placar
- "Ver todas" link right-aligned → `/team/matches`
- Same table structure as profile overview

### Roster Snapshot
- Compact list of active players (top 6): avatar initial + gamertag + `PositionBadge` + avg rating
- "Ver elenco completo" link → `/team/roster`

### Quick Stats Panel
- Top Scorer (gamertag + goals), Top Assistente (gamertag + assists), Melhor Média (gamertag + rating)
- `--card` panel, `p-4`

---

## /team/roster — Team Roster

### Layout
```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ PageHeader "Elenco" + filter controls      │
│          ├────────────────────────────────────────────┤
│          │ Roster Table (full width)                  │
│          └────────────────────────────────────────────┘
```

### Roster Table
- Columns: # (index), Jogador (avatar + gamertag), Posição, Status, Partidas, Gols, Assistências, Média, Desde
- **Posição:** `PositionBadge` (GK=violet, ZAG=blue, VOL/MC/AE/AD=emerald, ATA=orange)
- **Status:** badge — Ativo (green), Pendente (amber)
- **Média:** tabular number, colored by threshold (≥7.0 green, 5.0–6.9 muted, <5.0 red)
- Sortable columns: Gols, Assistências, Média (chevron icon)
- Row actions (manager only): Kebab menu → Remover do clube, Promover a capitão

### Filter Bar (manager only)
- Position filter: All / GK / ZAG / MID / ATA chips
- Status filter: All / Ativo / Pendente
- Search input (gamertag)

### Pending Players Section
- If `pendingCount > 0`: collapsible section below main table with amber header "Aprovações Pendentes (N)"
- Each row: gamertag + "Aprovar" (primary) / "Rejeitar" (destructive ghost) actions

---

## /team/lineup — Tactical Lineup

### Layout
```
┌──────────┬──────────────────────┬────────────────────┐
│ Sidebar  │ Navbar                                    │
│          ├──────────────────────┬────────────────────┤
│          │ Formation Field      │ Squad Panel        │
│          │ (pitch diagram)      │ (player list)      │
│          └──────────────────────┴────────────────────┘
```

### Formation Field
- Vertical football pitch shape, `--card` background with subtle pitch lines (`--border/10`)
- 11 player tokens positioned by formation (4-4-2, 4-3-3, etc.)
- Player token: avatar initial circle + gamertag below (`text-caption`)
- Token color by position: `--position-gk`, `--position-def`, `--position-mid`, `--position-fwd`
- Formation selector: dropdown top-right of field panel — "4-4-2", "4-3-3", "4-2-3-1", etc.
- Drag-and-drop to reorder positions (manager only)

### Squad Panel
- Right sidebar: scrollable list of all active players
- Each: gamertag + `PositionBadge` + drag handle icon
- Players not placed on field: dimmed (`opacity-50`)
- "Salvar formação" button bottom of panel — `default` variant (manager only)

### View-only (non-manager)
- Formation field read-only, no squad panel
- Formation name displayed below field

---

## /team/matches — Team Match History

### Layout
- Same as `/profile/matches` — full-width table, filters top
- Header filters: Competition type, Date range, Result (W/D/L), Adversário (text search)
- Columns: #, Data, Competição, Adversário, Placar, Resultado, Tipo
- Resultado badge: W (green) / D (amber) / L (red)
- Placar: `font-data`, tabular nums — "3 × 1" format
- Pagination: 10 rows, numbered

---

## /team/claim — Club Claim

### Layout
```
┌─────────────────────────────────────────────────┐
│              --background                        │
│   ┌─────────────────────────────────────────┐   │
│   │  Stepper: 1 → 2 → 3                    │   │
│   │  ─────────────────────────────────────  │   │
│   │  Step content (form or info)            │   │
│   │                                         │   │
│   │  Navigation buttons                     │   │
│   └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Stepper
- 3 steps: "Identificação" → "Verificação" → "Confirmação"
- Active step: `--primary` dot + label; completed: checkmark; pending: `--muted`
- Horizontal line connector between steps

### Step 1 — Identificação
- EA Club ID input + EA Platform select (PS5/Xbox/PC)
- "Buscar clube" button → shows club preview card (name, member count, EA data)
- Club preview card: `--card`, club name + EA ID + platform + member count

### Step 2 — Verificação
- Instructions: "Entre no clube como manager e toque em Verificar"
- Poll status indicator (spinner + "Verificando...")
- Error: "Não foi possível verificar. Tente novamente." + retry button

### Step 3 — Confirmação
- Success: ✅ icon + "Clube reivindicado com sucesso!" + club name
- "Ir para meu clube" button → `/team`
- If already claimed: amber warning "Este clube já tem um manager. Contate a moderação."

---

## Token Usage

| Element | Token |
|---------|-------|
| Club hero background | `--card` |
| Win badge | `--result-win` |
| Position tokens | `--position-gk/def/mid/fwd` |
| Pending badge | `--warning` |
| Pitch lines | `--border/10` |
| Avg rating high | `--result-win` |

---

## States

### Loading
- Hero: skeleton 1 row h-20
- Stats grid: 4 skeleton cards
- Roster table: 10 skeleton rows with shimmer

### Empty (no club)
- Centered EmptyState: shield icon + "Você não tem um clube ativo." + "Reivindicar clube" button → `/team/claim`

### No manager (player view)
- All write actions hidden (no kebab, no drag, no save formation)
- "Somente managers podem editar" tooltip on hover of locked areas

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Hero stacked, 2-col stats, roster table scrollable horizontally, lineup field full-width (squad panel collapses to drawer) |
| Tablet | 2-col stats, roster full, lineup 60/40 split |
| Desktop | Full layout as described |
