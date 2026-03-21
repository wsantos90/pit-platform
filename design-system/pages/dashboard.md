# Dashboard — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/dashboard`
> Task: 33 (future — currently redirects to profile or team)

---

## Layout Structure

**Pattern:** Standard dashboard layout — Sidebar + Navbar + content grid.

```
┌──────────┬─────────────────────────────────┐
│ Sidebar  │ Navbar (56px)                   │
│ (288px)  ├─────────────────────────────────┤
│          │ Page Header                     │
│          ├──────────┬──────────┬───────────┤
│          │ StatCard │ StatCard │ StatCard  │
│          ├──────────┴──────────┴───────────┤
│          │ Recent Matches (table, 5 rows)  │
│          ├──────────────────┬──────────────┤
│          │ Results Ticker   │ Quick Stats  │
│          └──────────────────┴──────────────┘
```

---

## Key Components

### PageHeader
- Title: "Dashboard" + subtitle with current date/season
- Right: "Ver histórico" ghost button

### Stats Grid
- 4 StatCards (2-col mobile, 4-col desktop): ELO Rating, Win Rate %, Partidas Jogadas, Gols
- Each: icon + label (uppercase) + value (`text-data-lg`, tabular nums) + trend badge

### Recent Matches
- Table (5 most recent): Date, Opponent, Competition, Score, Result badge (W/D/L)
- "Ver todas" link at bottom right — `text-primary`

### Results Ticker
- Horizontal scrolling bar at top of content area (below navbar)
- Shows all club's recent results: opponent logo + score + result badge
- Auto-scrolls, pausable on hover

### Quick Stats Panel
- Right sidebar mini-panel: Top Scorer, Top Assists, Avg Rating (this week)
- `PositionBadge` + gamertag + stat value

---

## Token Usage

| Element | Token |
|---------|-------|
| Stat values | `text-data-lg`, `font-data` |
| Win badge | `--result-win` |
| Loss badge | `--result-loss` |
| Draw badge | `--result-draw` |
| ELO accent | `--primary` |

---

## States

### Loading
- StatCards: 4 skeleton rectangles (w-full, h-24, `animate-pulse`)
- Table: 5 skeleton rows
- Ticker: shimmer animation

### Empty (no matches yet)
- EmptyState component: soccer ball icon + "Nenhuma partida registrada ainda" + "Sincronizar partidas" button

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Single column, ticker removed, 2-col stat grid |
| Tablet | 2-col stat grid, full table |
| Desktop | 4-col stat grid, full layout |
