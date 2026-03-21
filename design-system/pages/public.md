# Public Pages — Design Spec

> Inherits: [MASTER.md](../MASTER.md)
> Routes: `/` (landing), `/rankings`
> Note: this file intentionally consolidates the landing and rankings specs instead of splitting them into a separate `landing.md`.
> Task: 40 — Landing Page, 41 — Rankings

---

## / — Landing Page

### Layout Structure (no sidebar, no navbar)

```
┌────────────────────────────────────────────────────────┐
│ Top Nav (logo + login/register CTAs)                   │
├────────────────────────────────────────────────────────┤
│ Hero Section                                           │
├──────────────────────┬─────────────────────────────────┤
│ Feature Block 1      │ Feature Block 2                 │
├──────────────────────┴─────────────────────────────────┤
│ Stats Bar (live platform numbers)                      │
├────────────────────────────────────────────────────────┤
│ CTA Section                                            │
├────────────────────────────────────────────────────────┤
│ Footer                                                 │
└────────────────────────────────────────────────────────┘
```

### Top Nav
- `--background` background, `h-14`, `px-6`
- Left: P.I.T wordmark (`text-card-title`, `--primary` dot accent)
- Right: "Entrar" (ghost) + "Criar conta" (default) buttons
- Sticky on scroll — no shadow on landing, keep flat

### Hero Section
- Full-width, `min-h-[80vh]`, `--background`
- Left (60%): headline (`text-page-title`, 2–3 lines, `tracking-tight`) + subheadline (`text-body-lg`, `--foreground-secondary`, 1–2 lines) + "Começar grátis" CTA (`default`, large)
- Right (40%): dashboard preview screenshot or mockup (static image, `rounded-lg`, subtle `--border/15` border)
- **No gradients, no glow, no background shapes** — Piotr Kosmala puro

### Feature Blocks
- 3 features in a 3-col grid (stacks to 1-col mobile):
  - ELO Rating System — `--primary` icon + title + 2-line description
  - Histórico de Partidas — same
  - Torneios Integrados — same
- Each block: no card border — just icon + text, space as structure
- Icon: Lucide, 24px, `--primary`

### Stats Bar
- Full-width `--card` strip, `py-6`
- 3–4 live platform stats: "X Jogadores", "Y Partidas", "Z Torneios", "W Clubes"
- Each: large number (`text-data-lg`, `--primary`) + label below (`text-label`, uppercase, `--foreground-secondary`)
- Numbers animate on scroll-in (simple CSS counter or static if SSR)

### CTA Section
- Centered, `py-16`
- Title: "Pronto para entrar no campo?" (`text-section-title`)
- Subtitle: 1 line (`--foreground-secondary`)
- "Criar conta gratuita" (default, large) + "Ver rankings" (outline)

### Footer
- `--card` background, `py-8`
- Left: P.I.T wordmark + tagline
- Center: links (Rankings, Sobre, Contato) — `text-body-sm`, `--foreground-secondary`
- Right: "© 2026 P.I.T" + social icons (optional)

---

## /rankings — Public Rankings

### Layout Structure

```
┌──────────────────────────────────────────────────────┐
│ Top Nav (same as landing, simplified)                │
├──────────────────────────────────────────────────────┤
│ PageHeader "Rankings"                                │
├──────────────┬───────────────────────────────────────┤
│ Filter Panel │ Rankings Tabs + Table                 │
│ (left)       │                                       │
└──────────────┴───────────────────────────────────────┘
```

### Filter Panel (left sidebar, collapsible)
- Temporada select (current default)
- Competição: Championship / Friendly PIT / All
- Posição: All / GK / ZAG / VOL / MC / AE / AD / ATA

### Rankings Tabs
- 3 tabs: Jogadores | Clubes | Artilheiros
- Active tab: `--primary` bottom border

### Jogadores Table
- Columns: # Rank, Jogador (gamertag), Clube, Posição, ELO Rating, Partidas, Gols, Média
- Rank 1–3: gold/silver/bronze `--accent-brand` colored number
- `PositionBadge` for each player
- ELO: `text-data-value-sm`, `font-data`, `--primary`
- Sortable: ELO (default desc), Gols, Média
- Pagination: 25 rows, numbered

### Clubes Table
- Columns: # Rank, Clube (logo + name), Vitórias, Empates, Derrotas, GF, GS, Pontos, W%
- Same rank accent for top 3
- "Pontos" uses `font-data`

### Artilheiros Table
- Columns: # Rank, Jogador, Clube, Posição, Gols, Assistências, MOM (Man of the Match count)
- Trophy icon for rank 1

---

## Token Usage

| Element | Token |
|---------|-------|
| CTA primary | `--primary` |
| Stats numbers | `--primary` |
| Feature icons | `--primary` |
| Top 3 rank | `--accent-brand` |
| ELO value | `--primary` |
| Footer bg | `--card` |

---

## States

### Landing
- Hero CTA loading: none (static page, SSR)
- Stats bar: static numbers (update on page load via API)

### Rankings Loading
- Table: 25 skeleton rows
- Filter panel: skeleton selects

### Rankings Empty
- EmptyState: "Nenhum ranking disponível para esta temporada."

---

## Responsive

| Breakpoint | Behavior |
|-----------|----------|
| Mobile | Hero stacked (full-width image below text), features 1-col, stats bar 2-col grid, rankings filter collapses to top chip row |
| Tablet | Hero 50/50, features 2-col, filter panel as drawer |
| Desktop | Full layout as described |
