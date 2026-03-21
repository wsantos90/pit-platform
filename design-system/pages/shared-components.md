# Shared Components Library — Visual Specification
# Task 30 | P.I.T Design System

> **Overrides MASTER.md?** No — extends it. All MASTER.md rules apply.
> **Surface context:** Components render inside `bg-card` (#161f2a) cards or directly on `bg-background` (#101922).
> **Creative direction:** "Clean Data Stadium" — data is the hero, no decoration.

---

## Global Component Rules

### Interaction States (all components)

| State | Visual Treatment |
|-------|-----------------|
| **Default** | Base token colors, no shadow |
| **Hover** | `bg-surface-raised` or token opacity shift. Transition 150ms ease-out |
| **Focus-visible** | `outline: 2px solid hsl(var(--ring)); outline-offset: 2px` (global rule) |
| **Disabled** | `opacity-50 pointer-events-none cursor-not-allowed` |
| **Loading** | Replace content with `LoadingSkeleton`, maintain exact dimensions |

### Accessibility (all components)

- All icons: `aria-hidden="true"` — visible text provides context
- Interactive elements: keyboard reachable via Tab, activatable via Enter/Space
- Focus ring: 2px solid primary blue, 2px offset (global `*:focus-visible`)
- Contrast: minimum 4.5:1 for normal text, 3:1 for large text (18px+) and UI components
- Color not sole indicator: always pair with text or icon

### Typography & Data

- Numeric values: always `font-data` class (tabular-nums, tnum)
- Labels: `text-label` (0.75rem, 500, uppercase, tracking 0.08em), `text-foreground-secondary`
- Values: `text-data-lg` (1.5rem, 700) or `text-data-sm` (1.125rem, 600)
- Body: `text-body-sm` (0.875rem, 400)

### Prohibited

- No glassmorphism / backdrop-filter
- No gradients
- No drop shadows on cards (depth via surface tiers)
- No hardcoded hex colors — only token utilities
- No emoji as icons — only Lucide React
- No pure `#ffffff` — use `text-foreground` (#f4f6fa)

---

## 1. PageHeader

**Purpose:** Consistent page title + subtitle + optional action buttons.
**Surface:** Renders on `bg-background` (page level), not inside cards.
**Directive:** RSC (no `"use client"`)

### Layout

```
Desktop (>=768px):
+------------------------------------------------------------------+
| [title]                                           [actions slot]  |
| [subtitle]                                                        |
+------------------------------------------------------------------+

Mobile (<768px):
+---------------------------+
| [title]                   |
| [subtitle]                |
| [actions slot]            |
+---------------------------+
```

### Tokens

| Element | Token | Tailwind Class |
|---------|-------|----------------|
| Title (h1) | `text-page-title` | `text-page-title text-foreground` |
| Subtitle (p) | `text-body-sm` | `text-body-sm text-foreground-secondary` |
| Container | — | `flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between` |
| Spacing title→subtitle | 4px | `gap-1` (within title group) |
| Spacing header→content | 24px | Consumer applies `mb-6` or page gap |

### Anatomy

```tsx
<header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
  <div className="space-y-1">
    <h1 className="text-page-title text-foreground">{title}</h1>
    {subtitle && <p className="text-body-sm text-foreground-secondary">{subtitle}</p>}
  </div>
  {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
</header>
```

### States

| State | Behavior |
|-------|----------|
| Default | Title + optional subtitle + optional actions |
| Title only | No subtitle, no actions — just `<h1>` |
| With actions | Actions right-aligned on desktop, below on mobile |

### A11y

- `<header>` semantic element
- `<h1>` for page title
- No aria-label needed (semantic HTML sufficient)

---

## 2. StatCard v2

**Purpose:** Metric card with icon, label, value, optional trend indicator, optional sparkline.
**Surface:** Renders as `bg-card` card on `bg-background` page.
**Directive:** `"use client"` (recharts sparkline)

### Layout

```
+-----------------------------------------------+
| [icon 40px]                    [trend ▲ +12%]  |
|                                                 |
| LABEL (uppercase)                               |
| 1,247 (large data value)                        |
|                                                 |
| ~~~~~~~~~~~~ (sparkline 40px height) ~~~~~~~~   |
+-----------------------------------------------+
```

### Tokens

| Element | Token | Tailwind Class |
|---------|-------|----------------|
| Card background | `--card` | `bg-card` |
| Card border | ghost | `border border-border/15` |
| Card radius | 12px | `rounded-lg` |
| Card padding | 16px (24px on md) | `p-4 md:p-6` |
| Icon container | 40px circle | `size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center` |
| Icon size | 20px | `size-5` inside container |
| Label | `text-label` | `text-label text-foreground-secondary` |
| Value | `text-data-lg` + tabular | `text-data-lg font-data text-foreground` |
| Trend up | `--success` | `text-success` + `TrendingUp` icon (size-4) |
| Trend down | `--error` | `text-error` + `TrendingDown` icon (size-4) |
| Trend neutral | `--foreground-secondary` | `text-foreground-secondary` + `Minus` icon (size-4) |
| Trend text | — | `text-caption font-data` |
| Sparkline fill | `--primary` at 10% | `hsl(var(--primary) / 0.1)` |
| Sparkline stroke | `--primary` | `hsl(var(--primary))`, strokeWidth 1.5 |
| Sparkline height | 40px | Fixed height, no axes/grid/tooltip/labels |

### Icon Container Color Variants

The icon container defaults to primary blue. Consumer can override via icon node className:

```tsx
// Default (blue)
<StatCard icon={<Trophy className="size-5" />} ... />
// Icon renders inside bg-primary/10 container

// No icon
<StatCard label="Gols" value={42} />
// No icon container rendered
```

### Spacing

| Gap | Value |
|-----|-------|
| Icon → Label | 12px (`gap-3`) |
| Label → Value | 4px (`gap-1`) |
| Value → Sparkline | 12px (`mt-3`) |
| Trend positioned | Top-right of card, absolute or flex-end |

### States

| State | Behavior |
|-------|----------|
| Default | All elements visible |
| No icon | Icon container hidden, label/value start at top |
| No sparkline | Sparkline area not rendered |
| No trend | Trend indicator hidden |
| Loading | `<LoadingSkeleton variant="statCard" />` replaces content |

### Sparkline Spec (recharts)

```tsx
<ResponsiveContainer width="100%" height={40}>
  <AreaChart data={sparklineData.map((v, i) => ({ i, v }))}>
    <defs>
      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
      </linearGradient>
    </defs>
    <Area dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} fill="url(#sparkFill)" />
  </AreaChart>
</ResponsiveContainer>
```

No axes, no grid, no tooltip, no cartesian grid, no labels. Pure shape.

### A11y

- Icon: `aria-hidden="true"`
- Trend icon: `aria-hidden="true"`, trend text conveys meaning
- Sparkline: `aria-hidden="true"` (decorative, value + trend convey data)
- Card: `role` not needed (not interactive)

---

## 3. EmptyState

**Purpose:** Shown when a data set is empty. Neutral tone, encouraging action.
**Surface:** Renders inside card or table body, inherits parent background.
**Directive:** RSC

### Layout

```
+------------------------------------------+
|                                          |
|              [icon 48px]                 |
|                                          |
|          Nenhum resultado                |
|     Tente ajustar seus filtros.          |
|                                          |
|          [ Adicionar novo ]              |
|                                          |
+------------------------------------------+
```

### Tokens

| Element | Token | Tailwind Class |
|---------|-------|----------------|
| Container | centered flex column | `flex flex-col items-center justify-center py-16 gap-4` |
| Icon container | 48px rounded square | `size-12 rounded-xl bg-muted flex items-center justify-center` |
| Icon | 24px | `size-6 text-foreground-tertiary` |
| Title | `text-body-lg` | `text-body-lg font-medium text-foreground` |
| Description | `text-body-sm` | `text-body-sm text-foreground-secondary text-center max-w-sm` |
| Action button | shadcn Button | `<Button variant="outline" size="sm">` |

### Default Icons

- Generic empty: `Inbox` (lucide)
- Search no results: `SearchX` (lucide)
- Custom: consumer passes `icon` prop

### States

| State | Behavior |
|-------|----------|
| Minimal | Icon + title only |
| With description | Icon + title + description |
| With action | Icon + title + description + CTA button |

### A11y

- `role="status"` on container (neutral feedback)
- Icon: `aria-hidden="true"`
- Button inherits shadcn a11y (focusable, keyboard activatable)

---

## 4. ErrorState

**Purpose:** Shown when a data fetch or operation fails. Urgent, offers recovery.
**Surface:** Inherits parent background.
**Directive:** RSC

### Layout

Same centered layout as EmptyState, but with error semantic colors.

### Tokens

| Element | Token | Tailwind Class |
|---------|-------|----------------|
| Icon container | 48px | `size-12 rounded-xl bg-error-bg flex items-center justify-center` |
| Icon | 24px | `size-6 text-error` |
| Title | `text-body-lg` | `text-body-lg font-medium text-foreground` |
| Description | `text-body-sm` | `text-body-sm text-foreground-secondary text-center max-w-sm` |
| Retry button | shadcn Button | `<Button variant="outline" size="sm">` |

### Defaults

- Title: `"Algo deu errado"`
- Description: `"Nao foi possivel carregar os dados. Tente novamente."`
- Icon: `AlertTriangle` (lucide)
- Retry label: `"Tentar novamente"`

### A11y

- `role="alert"` on container (urgent feedback)
- Icon: `aria-hidden="true"`

---

## 5. NoPermissionState

**Purpose:** Shown when user lacks permission. Informational, not error.
**Surface:** Inherits parent background.
**Directive:** RSC

### Tokens

| Element | Token | Tailwind Class |
|---------|-------|----------------|
| Icon container | 48px | `size-12 rounded-xl bg-muted flex items-center justify-center` |
| Icon | 24px | `size-6 text-foreground-tertiary` |
| Title | `text-body-lg` | `text-body-lg font-medium text-foreground` |
| Description | `text-body-sm` | `text-body-sm text-foreground-secondary text-center max-w-sm` |

### Defaults

- Title: `"Acesso restrito"`
- Description: `"Voce nao tem permissao para acessar este conteudo."`
- Icon: `Lock` (lucide)
- No action button by default

### A11y

- `role="status"` (informational, not urgent)

---

## 6. LoadingSkeleton

**Purpose:** Animated placeholder matching content shape during data loading.
**Surface:** Inherits parent background, skeleton pulses with `bg-muted`.
**Directive:** RSC (CSS-only animation)

### Variants

#### `card`
```
+-----------------------------------+
| [████████ 33%]                    |
|                                    |
| [████████████████████████ 100%]   |
| [████████████████████████ 100%]   |
| [████████████████ 75%]            |
+-----------------------------------+
```
- Container: `rounded-lg p-4 space-y-3`
- Header skeleton: `h-4 w-1/3 rounded-md`
- Body skeletons: `h-4 w-full`, `h-4 w-full`, `h-4 w-3/4`

#### `tableRow`
```
| [████ 60px] | [████████ 120px] | [████ 80px] | [████ 60px] |
```
- Rendered `rows` times (default 3)
- Each row: `flex items-center gap-4 py-3`
- Cells: varying widths `w-[60px]`, `w-[120px]`, `w-[80px]`, `w-[60px]`
- Height: `h-4` each

#### `textBlock`
```
[████████████████████████████████████ 100%]
[████████████████████████████ 85%]
[████████████████████ 65%]
```
- Rendered `rows` times (default 3)
- Lines: `h-4`, widths vary `w-full`, `w-5/6`, `w-2/3`
- Gap: `space-y-2`

#### `avatar`
```
(████)
```
- Circle: `size-10 rounded-full`
- Single element

#### `statCard`
```
+-----------------------------------+
| (████ 40px)                       |
|                                    |
| [████ 80px] h-3                   |
| [████████ 64px] h-6              |
+-----------------------------------+
```
- Icon placeholder: `size-10 rounded-xl`
- Label placeholder: `h-3 w-20`
- Value placeholder: `h-6 w-16`
- Gap: `space-y-3`

### Tokens

| Element | Tailwind Class |
|---------|----------------|
| Skeleton block | `bg-muted animate-pulse rounded-md` |
| Circle skeleton | `bg-muted animate-pulse rounded-full` |
| Container | inherits parent background |

### A11y

- Container: `aria-busy="true"`, `aria-label="Carregando..."`, `role="status"`

---

## 7. StatusBadge

**Purpose:** Semantic status indicator (approved, pending, rejected, custom).
**Surface:** Renders inline within cards or tables.
**Directive:** RSC

### Layout

```
(* Aprovado)     (* Pendente)     (* Rejeitado)
 green dot        amber dot         red dot
```

### Tokens

| Status | Background | Text | Border | Dot Color |
|--------|-----------|------|--------|-----------|
| `approved` | `bg-success-bg` | `text-success` | `border-success/20` | `bg-success` |
| `pending` | `bg-warning-bg` | `text-warning` | `border-warning/20` | `bg-warning` |
| `rejected` | `bg-error-bg` | `text-error` | `border-error/20` | `bg-error` |
| Fallback | `bg-muted` | `text-foreground-secondary` | `border-border` | `bg-foreground-tertiary` |

### Size Variants

| Size | Padding | Font | Dot | Radius |
|------|---------|------|-----|--------|
| `sm` | `px-1.5 py-0.5` | `text-[10px] font-medium` | `size-1` | `rounded-sm` (8px) |
| `md` | `px-2 py-0.5` | `text-xs font-medium` | `size-1.5` | `rounded-sm` (8px) |

### Anatomy

```tsx
<span role="status" className={cn(badgeVariants({ status, size }), className)}>
  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
  {label ?? capitalize(status)}
</span>
```

### Pattern: CVA (following button.tsx)

```tsx
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border font-medium",
  {
    variants: {
      status: {
        approved: "bg-success-bg text-success border-success/20",
        pending: "bg-warning-bg text-warning border-warning/20",
        rejected: "bg-error-bg text-error border-error/20",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px] rounded-sm",
        md: "px-2 py-0.5 text-xs rounded-sm",
      },
    },
    defaultVariants: { status: undefined, size: "md" },
  }
)
```

### A11y

- `role="status"` on container
- Dot: `aria-hidden="true"`
- Text always visible (never icon-only)
- Contrast: success on success-bg = ~6.8:1 (AA pass), error on error-bg = ~4.6:1 (AA pass), warning on warning-bg = ~8.3:1 (AA pass)

---

## 8. ScoreDisplay

**Purpose:** Match score (home x away) with result-based highlighting.
**Surface:** Renders inline within tables or cards.
**Directive:** RSC

### Layout

```
3 x 1       (home win — home bold, away muted)
1 x 1       (draw — both medium)
0 x 2       (home loss — home muted, away bold)
```

### Tokens

| Element | Condition | Tailwind Class |
|---------|-----------|----------------|
| Winner score | result win/loss | `text-foreground font-black font-data` |
| Loser score | result win/loss | `text-foreground-secondary font-normal font-data` |
| Draw scores | result draw | `text-foreground font-semibold font-data` |
| Neutral scores | no result | `text-foreground font-semibold font-data` |
| Separator "x" | always | `text-foreground-tertiary font-normal mx-1.5` |

### Size Variants

| Size | Score font | Separator |
|------|-----------|-----------|
| `sm` | `text-sm` | `text-sm` |
| `md` | `text-data-sm` (1.125rem, 600) | `text-body-sm` |

### Anatomy

```tsx
<span className={cn("inline-flex items-baseline font-data", className)}
      aria-label={`Placar: ${homeScore} a ${awayScore}`}>
  <span className={homeClass}>{homeScore}</span>
  <span className="text-foreground-tertiary font-normal mx-1.5">x</span>
  <span className={awayClass}>{awayScore}</span>
</span>
```

### A11y

- `aria-label="Placar: {home} a {away}"` (Portuguese)
- Tabular nums for alignment in tables
- Color is supplementary — score numbers convey the data

---

## 9. PlayerAvatar

**Purpose:** Player profile image with initials fallback.
**Surface:** Renders inline within tables, cards, headers.
**Directive:** RSC (shadcn Avatar is RSC-compatible)

### Layout

```
Size sm (32px):  (W)     — single initial, text-xs
Size md (40px):  (WD)    — first initial, text-sm
Size lg (64px):  (WD)    — first initial, text-2xl
```

### Tokens

| Element | Tailwind Class |
|---------|----------------|
| Container | `rounded-full overflow-hidden` |
| Fallback bg | `bg-primary/10` |
| Fallback text | `text-primary font-semibold` |
| Fallback border | `border border-primary/20` |
| Image | fills container, `object-cover` |

### Size Variants

| Size | Dimension | Font | Initial(s) |
|------|-----------|------|-------------|
| `sm` | `size-8` (32px) | `text-xs` | First letter |
| `md` | `size-10` (40px) | `text-sm` | First letter |
| `lg` | `size-16` (64px) | `text-2xl` | First letter |

### Anatomy

Wraps shadcn `Avatar` + `AvatarImage` + `AvatarFallback`:

```tsx
<Avatar className={cn(sizeClasses[size], className)}>
  {src && <AvatarImage src={src} alt={name} />}
  <AvatarFallback className="bg-primary/10 text-primary border border-primary/20 font-semibold">
    {name.charAt(0).toUpperCase()}
  </AvatarFallback>
</Avatar>
```

### States

| State | Behavior |
|-------|----------|
| With image | Image fills avatar, rounded |
| Image error/missing | Fallback initial shown |
| No src | Fallback initial immediately |

### A11y

- `alt={name}` on AvatarImage
- Fallback: `aria-label={name}` for screen readers
- Decorative when next to player name text — consumer can add `aria-hidden="true"`

---

## 10. DataTable

**Purpose:** Full-featured table with sorting, filtering, pagination.
**Surface:** Renders as `bg-card` card or directly on page.
**Directive:** `"use client"` (TanStack Table hooks)

### Layout

```
+-------------------------------------------------------+
| [Search input]                           [x results]   |
+-------------------------------------------------------+
| NAME ↕      | POSITION | MATCHES | GOALS ↕ | RATING  |
|-------------|----------|---------|---------|---------|
| Player 1    | MC       | 42      | 12      | 1450    |
| Player 2    | ZAG      | 38      | 3       | 1380    |
| Player 3    | ATA      | 35      | 28      | 1520    |
+-------------------------------------------------------+
| < Anterior    Pagina 1 de 5    Proximo >               |
+-------------------------------------------------------+
```

### Tokens

| Element | Token | Tailwind Class |
|---------|-------|----------------|
| Container | — | `w-full` |
| Search input | shadcn Input | `bg-input border-border/15 text-foreground placeholder:text-foreground-tertiary` |
| Search icon | lucide Search | `size-4 text-foreground-tertiary` |
| Header row | — | `border-b border-border/15` |
| Header text | `text-label` | `text-label text-foreground-secondary` |
| Header sort icon | lucide ArrowUpDown | `size-3.5 text-foreground-tertiary ml-1` |
| Header active sort | lucide ArrowUp/ArrowDown | `size-3.5 text-primary ml-1` |
| Body row | — | `border-b border-border/15 transition-colors duration-100` |
| Body row hover | `--surface-raised` | `hover:bg-surface-raised` |
| Body text | `text-body-sm` | `text-body-sm text-foreground` |
| Numeric cells | — | `font-data text-right` (consumer applies via column def) |
| Pagination container | — | `flex items-center justify-between pt-4` |
| Pagination text | `text-body-sm` | `text-body-sm text-foreground-secondary` |
| Pagination buttons | shadcn Button | `variant="outline" size="sm"` |
| Pagination disabled | — | `disabled:opacity-50` |

### DataTable Design Rules (from MASTER.md 6.3)

- **No horizontal or vertical gridlines** — rows separated by subtle `border-border/15` bottom border
- Header: `text-label` uppercase, foreground-secondary
- Row hover: `bg-surface-raised`, transition 100ms
- Sortable columns: arrow indicator + `aria-sort` attribute
- Numeric columns: `tabular-nums`, right-aligned
- Row height: default 40px (`h-10`), comfortable for touch (>44px accessible)

### Search Bar

- Only rendered when `searchable={true}`
- Position: above table, left-aligned
- Width: `max-w-sm` (384px)
- Icon: `Search` (lucide) inside input left padding
- Placeholder: configurable, default `"Buscar..."` (Portuguese)

### Sort Headers

- Clickable column headers cycle: none -> ascending -> descending -> none
- Sort indicator: `ArrowUpDown` (unsorted), `ArrowUp` (asc), `ArrowDown` (desc)
- Active sort icon: `text-primary` to indicate active sort
- Header button: `inline-flex items-center gap-1` — keyboard accessible

### Pagination

```
[ < ]  Pagina 1 de 5  [ > ]
```

- Prev/Next: `Button variant="outline" size="sm"` with `ChevronLeft`/`ChevronRight` icons
- Page text: `text-body-sm text-foreground-secondary`
- Disabled at boundaries: `disabled` attribute on button
- `aria-label="Pagina anterior"` / `"Proxima pagina"`

### States

| State | Behavior |
|-------|----------|
| Default | Table with data, optional search + pagination |
| Loading | `<LoadingSkeleton variant="tableRow" rows={pageSize} />` inside table body |
| Empty | `<EmptyState>` centered in `<TableRow><TableCell colSpan={columns.length}>` |
| No pagination | When data fits in one page, pagination row hidden |
| No search | When `searchable={false}`, search input hidden |

### A11y

- `<table>` semantic HTML (via shadcn Table)
- `aria-sort="ascending" | "descending" | "none"` on sortable `<th>`
- Sort buttons: `<button>` elements (Tab + Enter/Space)
- Pagination: `aria-label` on prev/next buttons
- Empty/loading: inherits EmptyState/LoadingSkeleton a11y attributes

---

## Component File Map

| # | Component | Path | Directive |
|---|-----------|------|-----------|
| 1 | LoadingSkeleton | `src/components/shared/LoadingSkeleton.tsx` | RSC |
| 2 | PageHeader | `src/components/shared/PageHeader.tsx` | RSC |
| 3 | EmptyState | `src/components/shared/EmptyState.tsx` | RSC |
| 4 | ErrorState | `src/components/shared/ErrorState.tsx` | RSC |
| 5 | NoPermissionState | `src/components/shared/NoPermissionState.tsx` | RSC |
| 6 | StatusBadge | `src/components/shared/StatusBadge.tsx` | RSC |
| 7 | PlayerAvatar | `src/components/shared/PlayerAvatar.tsx` | RSC |
| 8 | ScoreDisplay | `src/components/shared/ScoreDisplay.tsx` | RSC |
| 9 | StatCard | `src/components/shared/StatCard.tsx` | `"use client"` |
| 10 | DataTable | `src/components/shared/DataTable.tsx` | `"use client"` |
| — | Barrel | `src/components/shared/index.ts` | — |

---

## WCAG AA Contrast Verification

All color combinations used in these components, verified against MASTER.md 2.7:

| Foreground | Background | Ratio | Pass? |
|-----------|-----------|-------|-------|
| `--foreground` on `--card` | #f4f6fa on #161f2a | 13.1:1 | AA |
| `--foreground-secondary` on `--card` | #8fa3b8 on #161f2a | 4.7:1 | AA |
| `--foreground-secondary` on `--background` | #8fa3b8 on #101922 | 5.1:1 | AA |
| `--foreground-tertiary` on `--card` | #5c7491 on #161f2a | 2.8:1 | AA large only |
| `--success` on `--success-bg` | #22c55e on #0f2318 | ~6.8:1 | AA |
| `--warning` on `--warning-bg` | #f59e0b on #291f05 | ~8.3:1 | AA |
| `--error` on `--error-bg` | #ef4444 on #2d0f0f | ~4.6:1 | AA |
| `--primary` on `--card` | #0d7ff2 on #161f2a | 5.2:1 | AA |

**Note:** `--foreground-tertiary` only passes AA for large text (18px+). Used exclusively for: disabled states, placeholders, decorative separators (like "x" in ScoreDisplay at `text-body-sm` which is 14px — acceptable because the score numbers carry the data, the separator is decorative).
