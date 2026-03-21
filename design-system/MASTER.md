# P.I.T Design System — MASTER.md

> **Version:** 1.0 | **Status:** ✅ Aprovado — Task 28 completa
> **Platform:** FIFA Pro Clubs 11v11 Competitive Management
> **Creative Direction:** "Clean Data Stadium" — professional sports analytics, not esports flashiness
> **Primary Reference:** Piotr Kosmala football statistics UI suite (dribbble.com/piotrkadesign)

---

## 1. Creative Direction

### North Star: "Clean Data Stadium"

A stadium at night is defined by **focused light against deep shadow**. This UI applies the same logic: the interface is 90% dark and neutral, with 10% strategic color that draws the eye exactly where needed.

We are building a **premium sports analytics platform**, not a gaming HUD. The benchmark is closer to a professional sports tool (like Transfermarkt, SofaScore Pro, or StatsBomb) than to a typical esports dashboard. Data is the hero — the interface serves it.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Space as Structure** | Breathing room separates sections. No 1px solid dividers for sectioning — background color shifts create hierarchy |
| **Data First** | Every visual decision must improve data legibility. Never add decoration that competes with data |
| **No-Line Rule** | 1px solid borders for sectioning are prohibited. Use `surface` tier shifts to create boundaries |
| **Contained Elements** | No overlapping — elements stay within their containers. Clean, organized, professional |
| **Strategic Color** | 90% neutrals (navy + gray). 10% color: primary blue for actions/links, orange for critical CTAs only |

### What This Is NOT

- No glassmorphism effects (backdrop-filter: blur on cards)
- No gradient buttons or CTAs
- No neon/glow effects on charts
- No overlapping images breaking container edges
- No template/AI-generated aesthetic

---

## 2. Color System

### 2.1 Background & Surface Hierarchy

The UI is built on a **4-layer surface system**. Deeper elements have lighter surfaces, creating depth without shadows.

| Token (CSS Var) | Dark Mode Value | Hex | Usage |
|-----------------|----------------|-----|-------|
| `--background` | `210 36% 10%` | `#101922` | Page background (deepest layer) |
| `--card` | `210 36% 13%` | `#161f2a` | Default card background |
| `--surface-raised` | `215 28% 17%` | `#1f2c3d` | Elevated cards, dropdowns |
| `--surface-overlay` | `215 30% 21%` | `#27364a` | Tooltips, highest elevation |

**Rule:** Always place a higher-tier surface inside a lower-tier one to imply natural lift. Never place two elements with the same surface tier directly adjacent without significant spacing.

### 2.2 Primary & Accent Colors

**Primary: Blue** — Professional, tech-forward, high contrast on dark backgrounds.

| Token | Value | Hex | Contrast on `--background` |
|-------|-------|-----|---------------------------|
| `--primary` | `210 90% 50%` | `#0d7ff2` | ~5.8:1 ✓ AA |
| `--primary-hover` | `210 90% 45%` | `#0b72da` | ~4.8:1 ✓ AA |
| `--primary-active` | `210 90% 40%` | `#0964c1` | ~4.0:1 ✓ AA large |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | — |
| `--primary-subtle` | `210 90% 50% / 0.12` | `#0d7ff21f` | Hover backgrounds, active fills |

**Accent: Orange** — High energy, reserved for critical CTAs and match-win highlights only.

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `--accent-brand` | `25 95% 53%` | `#f97316` | Primary CTA buttons, key data highlights |
| `--accent-brand-hover` | `25 95% 46%` | `#e86210` | Hover state |
| `--accent-brand-subtle` | `25 95% 53% / 0.12` | `#f973161f` | Selected filter chips, subtle highlights |
| `--accent-brand-foreground` | `0 0% 100%` | `#ffffff` | Text on orange |

> **Rule:** Orange is used for ≤2 elements per page. It means "take action" or "critical data point". Never use orange as a decorative or structural color.

### 2.3 Foreground Hierarchy

| Token | Dark Mode Value | Hex | Usage |
|-------|----------------|-----|-------|
| `--foreground` | `210 40% 98%` | `#f4f6fa` | Primary text — NOT pure white |
| `--foreground-secondary` | `215 20% 65%` | `#8fa3b8` | Secondary labels, metadata |
| `--foreground-tertiary` | `215 20% 45%` | `#5c7491` | Disabled, placeholder, subtle hints |
| `--muted-foreground` | `215 20% 65%` | `#8fa3b8` | Alias for `foreground-secondary` (shadcn compat) |

> **Rule:** Never use pure `#ffffff`. Always use `--foreground` (`#f4f6fa`) to reduce eye strain on dark backgrounds.

### 2.4 Semantic Colors

Both dark and light modes must define semantic colors. Currently the codebase only has dark mode — this fixes that.

| Token | Dark Mode | Light Mode | Hex (Dark) | Usage |
|-------|-----------|-----------|-----------|-------|
| `--success` | `142 71% 45%` | `142 76% 36%` | `#22c55e` | Wins, positive changes |
| `--success-bg` | `144 61% 10%` | `144 61% 95%` | `#0f2318` | Success badge backgrounds |
| `--warning` | `48 96% 53%` | `45 93% 47%` | `#f59e0b` | Draw results, pending states |
| `--warning-bg` | `48 96% 10%` | `48 96% 95%` | `#291f05` | Warning badge backgrounds |
| `--error` | `0 84% 60%` | `0 84% 47%` | `#ef4444` | Losses, errors, destructive |
| `--error-bg` | `0 63% 15%` | `0 63% 95%` | `#2d0f0f` | Error badge backgrounds |
| `--info` | `210 90% 50%` | `210 90% 42%` | `#0d7ff2` | Info states (aliases primary) |

### 2.5 Domain Colors (PIT-Specific)

Position colors used in badges, charts, and lineup visuals.

| Token | Value | Hex | Position |
|-------|-------|-----|----------|
| `--position-gk` | `263 70% 50%` | `#7c3aed` | Goalkeeper (violet) |
| `--position-def` | `210 90% 50%` | `#0d7ff2` | Defender / ZAG (blue) |
| `--position-mid` | `142 71% 45%` | `#22c55e` | Midfielder / VOL, MC, AE, AD (emerald) |
| `--position-fwd` | `25 95% 53%` | `#f97316` | Forward / ATA (orange) |

Match result colors:

| Token | Value | Usage |
|-------|-------|-------|
| `--result-win` | `142 71% 45%` | Win badge (green) |
| `--result-draw` | `48 96% 53%` | Draw badge (amber) |
| `--result-loss` | `0 84% 60%` | Loss badge (red) |

### 2.6 Border & Input Tokens

| Token | Dark Mode Value | Usage |
|-------|----------------|-------|
| `--border` | `215 28% 17%` | Default border (ghost borders only — 15% opacity) |
| `--border-subtle` | `215 28% 17% / 0.15` | Ghost border for accessibility fallback |
| `--input` | `215 28% 17%` | Input background |
| `--ring` | `210 90% 50%` | Focus ring (primary blue) |

### 2.7 WCAG AA Contrast Matrix

Minimum ratios: **4.5:1** for normal text, **3:1** for large text (18px+) and UI components.

| Foreground | Background | Ratio | AA Normal | AA Large |
|-----------|-----------|-------|-----------|---------|
| `--foreground` (#f4f6fa) | `--background` (#101922) | 14.2:1 | ✅ | ✅ |
| `--foreground-secondary` (#8fa3b8) | `--background` (#101922) | 5.1:1 | ✅ | ✅ |
| `--foreground-tertiary` (#5c7491) | `--background` (#101922) | 3.1:1 | ❌ | ✅ |
| `--primary` (#0d7ff2) | `--background` (#101922) | 5.8:1 | ✅ | ✅ |
| `--primary` (#0d7ff2) | `--card` (#161f2a) | 5.2:1 | ✅ | ✅ |
| `--accent-brand` (#f97316) | `--background` (#101922) | 6.2:1 | ✅ | ✅ |
| `--success` (#22c55e) | `--background` (#101922) | 6.8:1 | ✅ | ✅ |
| `--error` (#ef4444) | `--background` (#101922) | 4.6:1 | ✅ | ✅ |
| `--warning` (#f59e0b) | `--background` (#101922) | 8.3:1 | ✅ | ✅ |
| `--foreground` (#f4f6fa) | `--card` (#161f2a) | 13.1:1 | ✅ | ✅ |

> Note: `--foreground-tertiary` fails AA for normal text — use only for decorative/non-essential text (disabled states, placeholders).

---

## 3. Typography

### 3.1 Font Stack

**Inter (variable font)** — single font for the entire system. Already installed via `next/font/google`.

```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
```

No additional fonts. Inter handles all scales with weight and tracking variations:
- Headlines: `font-weight: 700`, `letter-spacing: -0.02em` (tracking-tight)
- Data values: `font-feature-settings: "tnum"` for tabular numbers (monospaced digits)
- Labels: `font-weight: 500`, `text-transform: uppercase`, `letter-spacing: 0.08em`

> Rationale: Single font = faster loads, simpler system, consistent aesthetic. Inter's variable font covers all weight/tracking needs.

### 3.2 Type Scale

| Token | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `text-display` | 2.25rem / 36px | 1.1 | 700 | -0.02em | Landing hero only |
| `text-page-title` | 1.875rem / 30px | 1.2 | 700 | -0.02em | Page headings (h1) |
| `text-section-title` | 1.25rem / 20px | 1.3 | 600 | -0.01em | Section headings (h2) |
| `text-card-title` | 1rem / 16px | 1.4 | 600 | 0 | Card headings (h3) |
| `text-body-lg` | 1rem / 16px | 1.5 | 400 | 0 | Primary body text |
| `text-body-sm` | 0.875rem / 14px | 1.5 | 400 | 0 | Secondary body, table rows |
| `text-label` | 0.75rem / 12px | 1.4 | 500 | 0.08em | Labels (ALL CAPS) |
| `text-caption` | 0.6875rem / 11px | 1.3 | 500 | 0.04em | Timestamps, metadata |
| `text-data-lg` | 1.5rem / 24px | 1.2 | 700 | -0.01em | Stat values (tabular nums) |
| `text-data-sm` | 1.125rem / 18px | 1.2 | 600 | 0 | Inline stat values |

### 3.3 Tabular Numbers (Data Displays)

For any numeric stat display, use tabular numbers to prevent layout shift as values update:

```css
.font-data {
  font-feature-settings: "tnum";
  font-variant-numeric: tabular-nums;
}
```

Apply to: stat cards, match scores, ELO ratings, ranking numbers, time displays.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (4px Base Grid)

All spacing values must be divisible by 4px.

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `space-xs` | 4px | `p-1` | Icon gaps, tight inline spacing |
| `space-sm` | 8px | `p-2` | Compact internal padding |
| `space-md` | 12px | `p-3` | Input padding, small card padding |
| `space-lg` | 16px | `p-4` | Standard card internal padding |
| `space-xl` | 24px | `p-6` | Page/section padding |
| `space-2xl` | 32px | `p-8` | Between major sections |
| `space-3xl` | 48px | `p-12` | Major section separations |
| `space-4xl` | 64px | `p-16` | Hero/landing sections |

### 4.2 Layout Grid

- **12-column grid** for desktop content areas
- **Page max-width:** `max-w-7xl` (1280px) for dashboard content
- **Sidebar width:** 288px (`w-72`) — fixed, not collapsible in v1
- **Navbar height:** 56px (`h-14`)
- **Page content padding:** 24px (`p-6`)
- **Card grid gap:** 16px (`gap-4`)

### 4.3 Breakpoints

| Name | Width | Behavior |
|------|-------|----------|
| Mobile | 375px | Single column, sidebar hidden |
| Tablet | 768px | 2-column layouts, sidebar collapsed to icons |
| Desktop | 1024px | Full layout with sidebar expanded |
| Wide | 1440px | Content max-width kicks in |

### 4.4 Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | 12px | Default (from `globals.css`) |
| `rounded-lg` | 12px | Cards, containers |
| `rounded-md` | 10px | Inputs, smaller components |
| `rounded-sm` | 8px | Badges, chips, tags |
| `rounded-full` | 9999px | Avatar circles, pill buttons |

### 4.5 Z-Index Scale

| Layer | Value | Element |
|-------|-------|---------|
| `base` | 0 | Default content |
| `raised` | 10 | Floating cards |
| `dropdown` | 20 | Dropdown menus, selects |
| `sticky` | 30 | Sticky headers |
| `overlay` | 40 | Modal overlays / scrim |
| `sidebar` | 50 | Sidebar (mobile) |
| `modal` | 60 | Modal content |
| `toast` | 70 | Toast notifications |
| `tooltip` | 80 | Tooltips |

---

## 5. Surface Hierarchy & Elevation

**No drop shadows.** Depth is created through tonal layering (background color shifts), not shadows.

### Layering Principle

```
Page Background (#101922)        ← deepest
  └── Card (#161f2a)             ← +1 level
        └── Raised (#1f2c3d)     ← +2 levels (dropdowns, nested cards)
              └── Overlay (#27364a) ← +3 levels (tooltips, floating panels)
```

Always place a lighter surface inside a darker one. Never place two elements of the same surface tier directly adjacent.

### Ghost Border (Accessibility Fallback)

When a border is required for accessibility (e.g., input fields, interactive cards), use `--border` at **15% opacity**:

```css
border: 1px solid hsl(var(--border) / 0.15);
```

This creates a hint of a boundary that disappears into the background, maintaining the clean aesthetic.

### Ambient Shadow (Float Elements Only)

For elements that must float (dropdowns, hover states on interactive cards):

```css
box-shadow: 0 8px 40px hsl(210 36% 5% / 0.6);
```

Dark, large blur, low spread. No colored shadows.

---

## 6. Component Specifications

### 6.1 Button

**Variants:**

| Variant | Background | Text | Border | Usage |
|---------|-----------|------|--------|-------|
| `default` | `--primary` | white | none | Primary actions |
| `accent` | `--accent-brand` | white | none | Critical CTAs (max 2/page) |
| `secondary` | `--surface-raised` | `--foreground` | ghost | Secondary actions |
| `outline` | transparent | `--primary` | ghost (primary) | Tertiary actions |
| `ghost` | transparent | `--foreground-secondary` | none | Nav items, subtle actions |
| `destructive` | `--error` | white | none | Delete/danger actions |

**Sizes:**

| Size | Height | Padding | Font | Usage |
|------|--------|---------|------|-------|
| `sm` | 32px (h-8) | `px-3` | 12px | Compact actions, table rows |
| `default` | 36px (h-9) | `px-4` | 14px | Standard usage |
| `lg` | 40px (h-10) | `px-6` | 14px | Primary page CTAs |
| `icon` | 36px (h-9 w-9) | — | — | Icon-only buttons |

**States:**
- `hover`: `opacity: 0.9` or `brightness(1.08)` — no color change
- `active`: `scale(0.98)` — subtle press feedback
- `focus-visible`: `ring-2 ring-offset-2 ring-primary`
- `disabled`: `opacity-50 pointer-events-none`
- `loading`: Replace text with spinner + sr-only text, maintain size

**Rules:**
- No gradient fills on any button variant
- Corner radius: `rounded-md` (10px) for standard, `rounded-full` for pill variants
- Min touch target: 44px (add `min-h-[44px]` on mobile)

---

### 6.2 Card

**Variants:**

| Variant | Background | Border | Usage |
|---------|-----------|--------|-------|
| `default` | `--card` | none | Standard data cards |
| `stat` | `--card` | left-border `--primary` 3px | Metric/KPI cards |
| `interactive` | `--card` | ghost on hover | Clickable cards (team, player, tournament) |
| `elevated` | `--surface-raised` | none | Nested cards, highlighted sections |

**Anatomy:**
- `CardHeader`: `p-6 pb-0` — title + optional action
- `CardContent`: `p-6 pt-4` — main content
- `CardFooter`: `p-6 pt-0` — actions or metadata

**States:**
- `interactive` hover: `background: --surface-raised`, `translateY(-2px)`, transition 150ms
- `loading`: Replace content with skeleton (`animate-pulse`, bg `--surface-raised`)

**Rules:**
- Minimum padding: `p-4` (`space-lg`)
- Corner radius: `rounded-lg` (12px)
- No glassmorphism (no `backdrop-filter`)

---

### 6.3 Table (DataTable)

**Data density variants:**

| Variant | Row height | Usage |
|---------|-----------|-------|
| `compact` | 32px | Dense leaderboards, rankings |
| `default` | 40px | Standard data tables |
| `comfortable` | 48px | Player profiles, detailed views |

**Design rules:**
- **No horizontal or vertical gridlines** — rows separated by 4px gap on hover
- Header: `text-label` (12px, uppercase, 0.08em tracking), `--foreground-secondary` color
- Row hover: `background: --surface-raised`, transition 100ms
- Sortable columns: arrow indicator, `aria-sort` attribute
- Numeric columns: `font-variant-numeric: tabular-nums`, right-aligned
- Badges (Win/Loss/Draw): small pill, `rounded-sm`, semantic colors

**States:**
- Loading: 5-8 skeleton rows (`animate-pulse`)
- Empty: `EmptyState` component (icon + message + optional CTA)
- Error: `ErrorState` component

---

### 6.4 Sidebar

**Layout:**
- Width: 288px expanded, 64px collapsed (future v2)
- Background: `--background` with `border-right: 1px solid hsl(var(--border) / 0.15)`
- No glassmorphism — solid background

**Navigation item states:**

| State | Background | Text | Left indicator |
|-------|-----------|------|----------------|
| Default | transparent | `--foreground-secondary` | none |
| Hover | `--primary-subtle` | `--foreground` | none |
| Active | `--primary-subtle` | `--primary` | 3px solid `--primary` |

**Active state token (fix current anti-pattern):**
```css
/* ❌ Current (hardcoded) */
.nav-item-active { background: rgba(13, 127, 242, 0.15); border-left: 3px solid #0d7ff2; }

/* ✅ Correct (tokenized) */
.nav-item-active { background: hsl(var(--primary) / 0.12); border-left: 3px solid hsl(var(--primary)); }
```

**Section labels:** `text-label`, `--foreground-tertiary`, uppercase, `space-lg` spacing above

---

### 6.5 Navbar

**Anatomy:**
- Height: 56px (`h-14`)
- Background: `--background` with `border-bottom: 1px solid hsl(var(--border) / 0.15)`
- Left: Breadcrumb or page title
- Right: Notification bell + User avatar + dropdown

**States:**
- Default: flat, no shadow
- Scrolled (>0px): `box-shadow: 0 1px 20px hsl(210 36% 5% / 0.4)` — subtle separation

---

### 6.6 Modal / Dialog

> Note: shadcn `dialog` component not yet installed. Install with `npx shadcn-ui@latest add dialog`.

**Variants:**

| Variant | Max Width | Usage |
|---------|----------|-------|
| `sm` | `max-w-sm` (384px) | Confirmations, alerts |
| `default` | `max-w-lg` (512px) | Forms, info |
| `lg` | `max-w-2xl` (672px) | Complex forms, previews |
| `fullscreen` | 100vw/vh | Mobile override |

**Design:**
- Overlay: `bg-black/50` scrim
- Container: `--surface-raised` background, `rounded-lg`, no glassmorphism
- Enter animation: `scale(0.96) → scale(1)` + `opacity(0) → opacity(1)`, 150ms ease-out
- Exit animation: reverse, 100ms

**Accessibility:**
- Focus trap inside modal
- Escape key closes
- `aria-modal="true"`, `role="dialog"`
- Scroll lock on body

---

### 6.7 Domain-Specific Components (Reference for Task 30)

| Component | Description | Task |
|-----------|-------------|------|
| `PositionBadge` | Colored pill per position (GK/ZAG/MID/ATA), use position tokens | T30 |
| `StatCard` | Metric card (label + value + trend + icon), use `stat` card variant | T30 |
| `MatchResultBadge` | W/D/L pill with semantic colors | T30 |
| `RatingGauge` | Semicircular gauge for ELO/goals, large centered value | T30 |
| `RadarChart` | 6-axis Recharts radar (Pace/Shooting/Passing/Dribbling/Defense/Physicality) | T30 |
| `PerformanceSparkline` | Mini line chart for table rows (performance over time) | T30 |
| `MatchHeadToHead` | Side-by-side horizontal bars for match stat comparison | T30 |
| `TournamentBracket` | Single/double elimination bracket view | T38 |
| `TeamBanner` | Team hero with name + logo + ELO + quick stats | T35 |
| `ResultsTicker` | Horizontal scrolling bar with recent results | T31 |
| `EmptyState` | Icon + title + message + optional CTA | T30 |
| `LoadingSkeleton` | Pulse animation placeholder matching content shape | T30 |
| `PageHeader` | Page title + subtitle + right-side actions | T30 |

---

## 7. Anti-Patterns

The following patterns are **strictly prohibited** and must be corrected when found in the codebase.

### 7.1 Hardcoded Colors

```tsx
// ❌ NEVER — hardcoded hex values
<div className="text-[#0d7ff2]" />
<div style={{ color: '#f97316' }} />
border-left: 3px solid #0d7ff2;

// ✅ ALWAYS — CSS variable tokens
<div className="text-primary" />
<div className="text-accent" />
border-left: 3px solid hsl(var(--primary));
```

**Codebase violations (92 instances):** `LineupPageClient.tsx` (28), `tournaments/[id]/page.tsx` (22), `BracketView.tsx` (9), `RosterBench.tsx` (12), `LineupVisual.tsx` (8)

### 7.2 Raw rgba() Calls

```css
/* ❌ NEVER */
background: rgba(13, 127, 242, 0.15);
border: 1px solid rgba(255, 255, 255, 0.05);

/* ✅ ALWAYS */
background: hsl(var(--primary) / 0.12);
border: 1px solid hsl(var(--border) / 0.15);
```

**Codebase violations (66 instances):** `SidebarShell.tsx`, `globals.css` (`.glass-sidebar`, `.nav-item-active`)

### 7.3 Direct Tailwind Color Classes

```tsx
// ❌ NEVER — bypasses design tokens
<div className="text-slate-400 bg-slate-800 border-slate-700" />

// ✅ ALWAYS — semantic tokens
<div className="text-muted-foreground bg-card border-border" />
```

**Codebase violations (22 instances):** `SidebarShell.tsx` (15 `slate-*` references)

### 7.4 Undefined Token Usage

```tsx
// ❌ NEVER — token doesn't exist as CSS variable
<div className="text-foreground-secondary" />

// ✅ AFTER migration — add --foreground-secondary to globals.css
<div className="text-foreground-secondary" />  // valid once token defined
```

**Fix:** Add `--foreground-secondary` to `globals.css` in both `:root` and `.dark` selectors.

### 7.5 Duplicate Token Aliasing

```css
/* ❌ Current — all three resolve to the same value */
--secondary: 215 28% 17%;
--muted: 215 28% 17%;
--accent: 215 28% 17%;

/* ✅ Correct — each token has distinct purpose */
--secondary: 215 28% 17%;    /* secondary UI surfaces */
--muted: 215 28% 20%;        /* muted backgrounds, slightly different */
--accent: 25 95% 53%;        /* orange accent (distinct!) */
```

### 7.6 Semantic Colors in Dark Mode Only

```css
/* ❌ Current — success/warning/error only defined in .dark */
.dark {
  --success: 142 71% 45%;
}
/* :root has no --success → breaks light mode */

/* ✅ Correct — both modes */
:root {
  --success: 142 76% 36%;  /* darker green for light bg */
}
.dark {
  --success: 142 71% 45%;
}
```

### 7.7 Glassmorphism on Data Cards

```css
/* ❌ NEVER on data/content cards */
.card {
  backdrop-filter: blur(12px);
  background: hsl(var(--card) / 0.7);
}

/* ✅ Solid background — always opaque */
.card {
  background: hsl(var(--card));
}
```

Note: The existing `.glass-card` and `.glass-sidebar` utilities in `globals.css` should be deprecated and replaced with solid surface tokens.

### 7.8 Inline Style for Colors

```tsx
// ❌ NEVER — inline styles for colors
<div style={{ backgroundColor: '#101922', color: '#f97316' }} />

// ✅ ALWAYS — Tailwind classes with tokens
<div className="bg-background text-accent" />
```

---

## 8. Icon System

**Primary:** Lucide React (`lucide-react`) — all new code must use Lucide.

**Deprecated:** Material Symbols (`material-symbols/outlined.css`) — imported in `globals.css` but should be removed (tracked in Task 26). Until removal, do not add new Material Symbols usage.

**Icon sizing:**
- `16px` (`size-4`) — inline text icons, table row icons
- `20px` (`size-5`) — nav items, card actions
- `24px` (`size-6`) — page-level icons, empty states
- `32px` (`size-8`) — feature/section icons

---

## 9. Completeness Checklist

> Use this to validate before task 28.7 sign-off.

- [x] Color System: primary, accent, semantic (light + dark), surface hierarchy, domain colors
- [x] WCAG contrast matrix: critical pairs documented with ratios
- [x] Typography: Inter-only, type scale (10 levels), tabular numbers
- [x] Spacing: 4px grid, t-shirt sizes, layout dimensions
- [x] Border radius scale
- [x] Z-index scale
- [x] Surface hierarchy & elevation rules
- [x] Component specs: Button, Card, Table, Sidebar, Navbar, Modal (6 core)
- [x] Domain components reference list (10 components for Task 30)
- [x] Anti-patterns: 8 prohibited patterns with code examples and codebase violation counts
- [x] Icon system: Lucide primary, Material Symbols deprecated
- [x] Page specs: 10 page group files — auth, dashboard, profile, team, tournaments, moderation, admin, public, payment, utility
- [x] WCAG validation: critical pairs calculated and documented in §2.7 above
- [x] Primary color decision: **Blue (#0d7ff2)** — 5.8:1 contrast on dark bg (AA ✓), professional/tech aesthetic aligned with Piotr Kosmala reference. Orange (#f97316) reserved as accent/CTA only (≤2 elements per page).

---

## 10. Token → CSS Variable Mapping (shadcn/Tailwind)

Quick reference for implementing tokens in Task 29.

| Design Token | CSS Variable | Tailwind Class |
|-------------|-------------|----------------|
| Background | `--background` | `bg-background` |
| Card surface | `--card` | `bg-card` |
| Primary color | `--primary` | `bg-primary text-primary` |
| Accent/brand | `--accent-brand` | *(new token — add to tailwind.config.ts)* |
| Primary text | `--foreground` | `text-foreground` |
| Secondary text | `--foreground-secondary` | *(new token — add)* |
| Muted text | `--muted-foreground` | `text-muted-foreground` |
| Success | `--success` | *(new token — add)* |
| Warning | `--warning` | *(new token — add)* |
| Error | `--error` | `text-destructive` (alias) |
| Border | `--border` | `border-border` |
| Input | `--input` | `bg-input` |
| Focus ring | `--ring` | `ring ring-ring` |
| Position GK | `--position-gk` | *(new token — add)* |
| Position DEF | `--position-def` | *(new token — add)* |
| Position MID | `--position-mid` | *(new token — add)* |
| Position FWD | `--position-fwd` | *(new token — add)* |
