# Profile Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/profile`, `/profile/matches`, `/profile/settings`
> Task: 33 — Profile Page, 34 — Profile Sub-Pages
> Reference: Stitch mockup `image.png` (Player Profile — Tactical Analysis)

---

## /profile — Player Overview

### Layout Structure

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ Player Hero (full width)                   │
│          ├──────────────────┬──────────────┬──────────┤
│          │ Stats Overview   │ Radar Chart  │ Gauge    │
│          │ (4 stat cards)   │ (6 attrs)    │ (goals)  │
│          ├──────────────────┴──────────────┴──────────┤
│          │ Match History Table (paginated)            │
│          ├──────────────────┬──────────────────────────┤
│          │ Position Stats   │ Best Scorers sidebar    │
│          └──────────────────┴──────────────────────────┘
```

### Player Hero Component
- **Background:** `--card`, `rounded-lg`
- Left: Avatar circle (80px) + gamertag (`text-page-title`) + positions (`PositionBadge` row)
- Center: ELO rating large (`text-data-lg`, `--primary`) + ELO tier label
- Right: Quick stats inline (Partidas / Gols / Assistências / Média)
- No banners, no background images — clean and flat

### Stats Overview Grid
- 4 StatCards: ELO Rating, Goals, Assists, Avg Rating
- 2-col mobile, 4-col desktop, `gap-4`

### Radar Chart (Tactical Analysis)
- Recharts `<RadarChart>` with 6 axes: Pace, Shooting, Passing, Dribbling, Defense, Physicality
- Primary fill: `--primary / 0.20`, stroke: `--primary` solid 2px
- Comparison player (optional): `--accent-brand / 0.15`, stroke: `--accent-brand`
- Dropdown to select comparison player
- Card with `text-section-title` "Análise Tática"

### Goals Gauge
- Semicircular gauge, value centered large (`text-data-lg`, `font-data`)
- Fill color: `--accent-brand` (orange) for the arc
- Background arc: `--surface-raised`
- Below: breakdown by competition (Championship, Friendly PIT, Friendly External)

### Match History Table
- Columns: #, Competição badge, Adversário, Resultado, Gols, Assistências, Média, Data
- Result: colored badge (W=green, D=amber, L=red)
- Competição: colored pill (Championship=primary, Friendly PIT=emerald, External=gray)
- Pagination: 10 rows per page, "Ver mais" or numbered
- Sortable by date (default desc)

### Best Scorers Sidebar Panel
- Compact list: rank # + gamertag + position badge + goals count
- Current user highlighted with `--primary-subtle` background

---

## /profile/matches — Match History

### Layout
- Full-width table, dense data
- Header filters: Competition type, Date range, Result (W/D/L)
- Same table structure as profile overview but full page + all matches
- Export button (ghost) — future

---

## /profile/settings — Player Settings

### Layout
```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├──────────────────┬──────────────────────────┤
│          │ Settings Nav     │ Settings Content         │
│          │ (left tabs)      │ (form panels)            │
│          └──────────────────┴──────────────────────────┘
```

- Left nav tabs (vertical): Perfil, Plataforma, Notificações, Conta
- Content: form sections with `Card` wrappers
- Save button: `default` variant, bottom of each section

### Settings Sections

**Perfil:** Gamertag (read-only, linked to EA), Avatar upload, Bio

**Plataforma:** EA console platform (PS5/Xbox/PC) — select, Club ID info (read-only)

**Notificações:** Toggle switches for each notification type

**Conta:** Email (read-only, from Supabase Auth), Change password flow, Danger zone (account deletion)

---

## Token Usage

| Element | Token |
|---------|-------|
| Radar primary | `--primary` |
| Gauge fill | `--accent-brand` |
| Win/Draw/Loss | `--result-win/draw/loss` |
| ELO highlight | `--primary` |
| Position badges | `--position-gk/def/mid/fwd` |

---

## States

### Loading
- Hero: skeleton (1 row, h-24)
- Radar: skeleton circle
- Table: 10 skeleton rows

### Empty (new player)
- Match history: EmptyState "Nenhuma partida registrada. Jogue partidas e sincronize para ver seus stats."

### Error
- Toast error if EA sync fails
- Error state in data areas with retry button

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Hero stacked, no radar/gauge (collapsed behind tab), table horizontal scroll |
| Tablet | 2-col stats, radar + gauge side by side |
| Desktop | Full layout as described |
