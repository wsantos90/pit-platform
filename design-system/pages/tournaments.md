# Tournament Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/tournaments`, `/tournaments/[id]`
> Task: 37 — Tournaments

---

## /tournaments — Tournament List

### Layout Structure

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ PageHeader "Torneios" + "Criar" (mod only) │
│          ├────────────────────┬───────────────────────┤
│          │ Active Tournaments │ Upcoming              │
│          │ (cards grid)       │ (cards grid)          │
│          ├────────────────────┴───────────────────────┤
│          │ Past Tournaments (compact table)           │
│          └────────────────────────────────────────────┘
```

### Tournament Card
- `--card`, `rounded-lg`, `p-4`, `hover:bg-surface-raised` transition
- Top: Tournament name (`text-card-title`) + status badge (Ativo/Em Breve/Encerrado)
- Middle: Format type pill (Championship / Friendly) + date range (`text-caption`)
- Bottom: Participantes N/16 progress bar (`--primary` fill) + prize pool if applicable
- Click → `/tournaments/[id]`

### Status Badges
- **Ativo:** `--result-win` (green) — matches in progress
- **Em Breve:** `--accent-brand` (orange) — registration open
- **Encerrado:** `--muted-foreground` (gray) — completed

### Sections
- **Ativos:** 2-col card grid desktop, 1-col mobile
- **Em Breve:** same grid, dimmer tone
- **Passados:** compact 5-col table — Nome, Formato, Participantes, Campeão, Data — no dividers, header uppercase

### Create Button (moderator+)
- Top-right of PageHeader: `default` variant button "Criar torneio" → opens modal

---

## /tournaments/[id] — Tournament Detail

### Layout Structure

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │ Navbar                                     │
│          ├────────────────────────────────────────────┤
│          │ Tournament Hero                            │
│          ├──────────────────┬─────────────────────────┤
│          │ Bracket View     │ Standings / Info Panel  │
│          ├──────────────────┴─────────────────────────┤
│          │ Match Results Table (recent rounds)        │
│          └────────────────────────────────────────────┘
```

### Tournament Hero
- Background: `--card`, `p-6`
- Left: Tournament name (`text-page-title`) + format badge + status badge
- Center: Phase indicator — "Oitavas", "Quartas", "Semi", "Final"
- Right: Date range + Participantes count + prize pool (if set)
- Action buttons (moderator): "Editar" (outline) + "Encerrar" (destructive outline)

### Bracket View
- Single-elimination bracket rendered with CSS grid (no library dependency)
- Each match node: home team + score + away team, `--card` rounded-sm
- Current round: `--primary` border highlight
- Completed match: winner side has `--result-win` subtle background
- Pending match: `-muted` dashed border
- Bracket scrolls horizontally on smaller screens

### Standings / Info Panel (right sidebar)
- **For group stage tournaments:** mini standings table (rank, clube, P, V, E, D, GP, GC)
- **For info:** Registration deadline, Format (single/double elimination), Participants list (compact)
- "Registrar clube" CTA (if open and user is manager) — `default` variant

### Match Results Table
- Columns: Data, Fase, Home, Placar, Away, Resultado
- Phase label: Oitavas / Quartas / Semi / Final
- Placar: `font-data` tabular "2 × 1"
- Resultado: W/D/L badge per club perspective

---

## Token Usage

| Element | Token |
|---------|-------|
| Active badge | `--result-win` |
| Upcoming badge | `--accent-brand` |
| Bracket highlight | `--primary` |
| Winner row | `--result-win` subtle |
| Progress bar | `--primary` |

---

## States

### Loading
- List: 4 skeleton cards (h-32)
- Bracket: skeleton grid of nodes
- Table: 5 skeleton rows

### Empty (no tournaments)
- EmptyState: trophy icon + "Nenhum torneio encontrado." + (moderator) "Criar primeiro torneio" button

### Error
- Toast if bracket data fails to load + retry button in bracket area

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Single column cards, bracket scrollable horizontally, info panel collapses to accordion below bracket |
| Tablet | 2-col cards, bracket + info side by side (60/40) |
| Desktop | Full layout as described |
