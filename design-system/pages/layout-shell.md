# Layout Shell Redesign — UI/UX Spec (Task #31)

> **Status:** Design Spec | **Task:** 31 | **Dependencies:** Task 30 (shared components)
> **Creative Direction:** "Clean Data Stadium" (MASTER.md v1.0)
> **Primary Reference:** Piotr Kosmala football statistics UI (Transfermarkt-style)
> **Stack:** Next.js + Tailwind + shadcn/ui + Lucide React
> **Font:** Inter (variable) — UNICA FONTE, ignorar qualquer sugestao externa
> **UX Guidelines:** ui-ux-pro-max (apenas patterns de interacao, NAO cores/fontes)
>
> ### Decisao de Cores (alinhada com usuario)
> - **Orange ampliado:** usar `--accent-brand` (#f97316) mais livremente — em bordas
>   de stat cards, linhas de chart, destaques de dados numericos, active nav indicator,
>   alem dos CTAs. Mais fiel a referencia Piotr Kosmala.
> - **Blue para UI interativa:** `--primary` (#0d7ff2) continua para links, focus rings,
>   hover states, breadcrumb links, badges informativos.
> - Regra anterior "max 2 orange por pagina" e RELAXADA para dados/destaques.
>   Orange em botoes CTA continua limitado (max 1-2 por pagina).

---

## 1. Sidebar (Desktop — Expanded, w=288px)

### 1.1 Layout Anatomy

```
+---------------------------+ ← bg-background, border-r border-border/15
| [Logo] P.I.T             | ← Brand (h=72px, p-6)
| Performance·Intelligence  |
|                           |
| +-------+--------------+ | ← User Card (mx-4, mb-6, p-3, rounded-xl)
| | [Av]  | displayName  | |    bg-surface-raised/40, border border-border/15
| |       | roleLabel    | |
| +-------+--------------+ |
|                           |
| CONTEXTO ATUAL            | ← text-label, text-foreground-tertiary, uppercase
| +------------------------+|
| | [icon] contextLabel  v || ← Context Switcher (rounded-lg, bg-surface-raised)
| +------------------------+|    border border-border/15
|                           |
| PERFIL DO JOGADOR         | ← Section Label (text-label)
|  > Meu Perfil        (/) | ← Nav Items (px-4, py-2.5, rounded-lg)
|  > Minhas Partidas       |
|  > Configuracoes         |
|                           |
| COMPETICOES               |
|  > Matchmaking           |
|  > Torneios              |
|  > Reivindicar Time      |
|                           |
| ─────────────────────     | ← border-t border-border/15
| [x] Sair do Sistema      | ← text-error, p-4
+---------------------------+
```

### 1.2 Token Usage

| Element | Background | Text | Border | Other |
|---------|-----------|------|--------|-------|
| Sidebar container | `bg-background` | — | `border-r border-border/15` | `w-sidebar` (288px), `z-sidebar` (50) |
| Brand title | — | `text-foreground` | — | `text-2xl font-black tracking-tight` |
| Brand tagline | — | `text-foreground-tertiary` | — | `text-caption uppercase tracking-[0.2em]` |
| Logo icon bg | `bg-primary` | `text-primary-foreground` | — | `rounded-lg p-1.5` |
| User card | `bg-surface-raised/40` | — | `border-border/15` | `rounded-xl p-3 mx-4 mb-6` |
| User name | — | `text-foreground` | — | `text-sm font-bold truncate` |
| User role | — | `text-foreground-secondary` | — | `text-caption font-medium` |
| Avatar | `bg-primary/15` | `text-primary` | `border-primary/30` | `size-10 rounded-full font-bold` |
| Online indicator | `bg-success` | — | `border-background` | `size-3 rounded-full border-2` |
| Section label | — | `text-foreground-tertiary` | — | `text-label font-semibold uppercase px-4 mb-2` |
| Nav item (default) | transparent | `text-foreground-secondary` | — | `px-4 py-2.5 rounded-lg` |
| Nav item (hover) | `bg-primary-subtle` | `text-foreground` | — | `transition-colors duration-150` |
| Nav item (active) | `bg-primary/12` | `text-primary` | `border-l-[3px] border-l-primary` | `font-bold` |
| Nav icon (default) | — | `text-foreground-secondary` | — | `size-5` (20px) |
| Nav icon (hover) | — | `text-primary` | — | `transition-colors duration-150` |
| Badge | `bg-primary` | `text-primary-foreground` | — | `rounded-full px-1.5 py-0.5 text-[10px] font-black` |
| Context switcher | `bg-surface-raised` | `text-foreground` | `border-border/15` | `rounded-lg px-3 py-2.5` |
| Context dropdown | `bg-surface-overlay` | — | `border-border/15` | `rounded-lg shadow-float z-dropdown` |
| Sign out button | — | `text-error` | — | `hover:bg-error/10` |
| Scrollbar | — | — | — | `4px width, track transparent, thumb foreground-tertiary/30` |

### 1.3 Interaction States

**Nav Item Transitions:**
- Default → Hover: `bg-primary-subtle`, text `foreground`. Duration: 150ms, ease-out
- Default → Active: `bg-primary/12`, text `primary`, left border 3px `primary`. Font bold
- Active → Hover: no change (already highlighted)
- Focus-visible: `ring-2 ring-primary ring-offset-2 ring-offset-background`
- Keyboard: Tab navigates items sequentially. Enter/Space activates

**Context Switcher:**
- Click: toggle dropdown open/close
- Dropdown item hover: `bg-surface-raised/60`, text `foreground`
- Active context: `bg-primary/15`, text `primary`
- Outside click: close dropdown
- Keyboard: ArrowDown/Up to navigate, Enter to select, Escape to close

**Sign Out:**
- Hover: `bg-error/10`
- Active: `scale(0.98)`, 100ms
- Focus-visible: `ring-2 ring-error ring-offset-2`

### 1.4 Scrolling

- Nav area (`<nav>`) has `overflow-y: auto` with custom scrollbar
- Scrollbar: 4px width, transparent track, `foreground-tertiary/30` thumb, rounded
- Brand + user card + context switcher are FIXED (not scrollable)
- Footer (sign out) is FIXED at bottom
- Only nav sections scroll

---

## 2. Sidebar (Desktop — Collapsed, w=64px)

### 2.1 Layout Anatomy

```
+------+ ← w-16 (64px), same bg-background + border-r
| [Lo] | ← Logo icon only (centered, no text)
|      |
| [Av] | ← Avatar only (centered, size-8)
|      |
| [Ic] | ← Context icon only (centered)
|      |
| [ic] | ← Nav icon only + Tooltip (side="right")
| [ic] |
| [ic] |
| [ic] |
| [ic] |
|      |
| [x]  | ← LogOut icon only + Tooltip
+------+
```

### 2.2 Collapsed Behavior

| Element | Expanded | Collapsed |
|---------|----------|-----------|
| Brand | Logo + "P.I.T" + tagline | Logo icon only, centered |
| User card | Avatar + name + role | Avatar only (size-8), centered |
| Context switcher | Icon + label + chevron | Context icon only, centered. Click opens full dropdown overlay |
| Section labels | Text visible | Hidden (`sr-only`) |
| Nav items | Icon + label + badge | Icon only (size-5, centered). Tooltip on hover with label |
| Nav badges | Visible inline | Small dot indicator (size-2, bg-primary) on icon corner |
| Sign out | Icon + "Sair do Sistema" | LogOut icon only + Tooltip |
| Toggle button | PanelLeftClose icon | PanelLeftOpen icon |

### 2.3 Tooltip Specs

- Component: shadcn `Tooltip` + `TooltipTrigger` + `TooltipContent`
- Position: `side="right"`, `sideOffset={8}`
- Background: `bg-surface-overlay`
- Text: `text-foreground text-body-sm`
- Radius: `rounded-sm` (8px)
- Delay: 0ms (`<TooltipProvider delayDuration={0}>`)
- Animation: fade + scale from left, 100ms ease-out
- ONLY shown when sidebar is collapsed

---

## 3. Sidebar Collapse Toggle

### 3.1 Position & Style

- Location: Top-right of sidebar header, aligned with brand row
- When expanded: right edge of brand row, `absolute right-2 top-6`
- When collapsed: centered below brand icon, `mt-2`
- Button style: ghost button, `size-8 rounded-md`
- Icon: `PanelLeftClose` (expanded) / `PanelLeftOpen` (collapsed), `size-4`
- Color: `text-foreground-tertiary`, hover `text-foreground`

### 3.2 Animation

```css
/* Sidebar width transition */
.sidebar {
  transition: width 200ms ease-in-out;
}

/* Content area margin transition */
.main-content {
  transition: margin-left 200ms ease-in-out;
}

/* Element show/hide (text labels, names) */
.sidebar-text {
  transition: opacity 150ms ease-in-out;
  /* Collapsed: opacity-0, w-0, overflow-hidden */
  /* Expanded: opacity-100, w-auto */
}
```

- Width: 288px → 64px (200ms, ease-in-out)
- Text opacity: fade out 150ms on collapse, fade in 150ms on expand (50ms delay)
- Transform performance: use `width` transition (acceptable for sidebar, not per-frame)
- `prefers-reduced-motion`: instant transition (duration: 0ms)

### 3.3 State Persistence

- localStorage key: `sidebar-collapsed`
- Default: `false` (expanded)
- Read on mount via `useEffect` (hydration-safe)
- Cross-tab sync: `window.addEventListener('storage')` to detect changes
- SSR: always render expanded initially, then hydrate

---

## 4. Mobile Drawer (< 768px)

### 4.1 Trigger

- Hamburger button in Navbar, left side
- Icon: Lucide `Menu`, `size-5`
- Visibility: `md:hidden` (only visible below 768px)
- Button style: ghost, `size-9`, `text-foreground-secondary`
- Hover: `text-foreground`, `bg-surface-raised`

### 4.2 Sheet Specs

- Component: shadcn `Sheet` (wraps Radix Dialog)
- Side: `left`
- Width: `w-sidebar` (288px) — same as desktop expanded
- Background: `bg-background` (matches sidebar)
- Overlay: default shadcn overlay (`bg-black/80`)
- Z-index: `z-sidebar` (50) for content, `z-overlay` (40) for scrim

### 4.3 Animation

- Open: slide from left, 300ms, ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`)
- Close: slide to left, 200ms, ease-in (exit faster than enter per UX guidelines)
- Overlay: fade 200ms
- `prefers-reduced-motion`: instant open/close (no slide)

### 4.4 Behavior

- Close on nav link click (via `onNavClick` callback)
- Close on overlay click (default Sheet behavior)
- Close on Escape key (default Radix behavior)
- Focus trap inside drawer (default Radix behavior)
- Body scroll lock when open

### 4.5 Accessibility

- `<SheetTitle className="sr-only">Menu de Navegacao</SheetTitle>`
- First focusable element: first nav link
- Focus returns to hamburger button on close
- `aria-label="Abrir menu"` on hamburger button
- `role="navigation"` on nav container inside sheet

### 4.6 Content

- Same `SidebarContent` component as desktop
- NO collapse toggle (always expanded in drawer)
- Includes: Brand, User card, Context switcher, Nav sections, Sign out
- Sign out click: close drawer first, then execute signOut

---

## 5. Navbar (h=56px)

### 5.1 Layout Anatomy

```
+------------------------------------------------------------------------+
| [=](mobile) [Home > Profile > Settings]     [bell] [avatar name v]    |
+------------------------------------------------------------------------+
  ↑ hamburger    ↑ breadcrumb (left)            ↑ right section
  md:hidden      flex-1                         flex items-center gap-4
```

**Dimensions:**
- Height: `h-navbar` (56px / 3.5rem)
- Background: `bg-background`
- Border: `border-b border-border/15`
- Padding: `px-content` (24px / 1.5rem)
- Z-index: `z-sticky` (30)
- Content: `flex items-center justify-between`

### 5.2 Breadcrumb

**Component:** shadcn `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`

**Segments:**
- Source: `usePathname()` split on `/`
- Map each segment via `BREADCRUMB_LABELS` lookup:
  ```
  profile → Perfil
  team → Time
  roster → Elenco
  lineup → Escalacao
  matches → Partidas
  matchmaking → Matchmaking
  settings → Configuracoes
  moderation → Moderacao
  claims → Claims
  disputes → Disputas
  tournaments → Torneios
  admin → Admin
  users → Usuarios
  ```
- First segment: always present (context root)
- Last segment: `BreadcrumbPage` (non-clickable, `text-foreground`)
- Other segments: `BreadcrumbLink` (clickable, `text-foreground-secondary`)
- Separator: `ChevronRight` icon, `size-3.5`, `text-foreground-tertiary`

**Responsive:**
- Desktop (>= 768px): all segments visible
- Mobile (< 768px): show only last 2 segments, first segments collapsed into "..."

**Tokens:**
| Element | Text | Style |
|---------|------|-------|
| Link segments | `text-foreground-secondary` | `text-body-sm`, hover: `text-foreground` |
| Current page | `text-foreground` | `text-body-sm font-medium` |
| Separator | `text-foreground-tertiary` | `size-3.5` |

### 5.3 User Dropdown

**Trigger:**
```
+-----+------------+---+
| [A] | userName   | v |
+-----+------------+---+
  ↑ PlayerAvatar     ↑ ChevronDown
  size="sm"          size-4, text-foreground-tertiary
```

- Button style: ghost, `rounded-lg px-2 py-1.5`
- Hover: `bg-surface-raised`
- Avatar: `PlayerAvatar` component (size="sm" = 32px)
- Name: `text-body-sm text-foreground`, hidden on small screens (`hidden sm:inline`)
- Chevron: `size-4 text-foreground-tertiary`, rotates 180deg when open

**Dropdown Menu (shadcn DropdownMenu):**
- Align: `end`
- Width: `w-56` (224px)
- Background: `bg-surface-overlay`
- Border: `border border-border/15`
- Radius: `rounded-lg`
- Shadow: `shadow-float`

**Menu Items:**
| Item | Icon | Action | Style |
|------|------|--------|-------|
| Header | — | — | `text-foreground font-semibold` + `text-foreground-secondary text-caption` for email |
| Separator | — | — | `bg-border/15 my-1` |
| Meu Perfil | `User` size-4 | Link to `/profile` | default item |
| Configuracoes | `Settings` size-4 | Link to `/profile/settings` | default item |
| Separator | — | — | — |
| Sair | `LogOut` size-4 | `signOut()` | `text-error focus:text-error` |

**Item States:**
- Default: `text-foreground-secondary`
- Hover: `bg-surface-raised text-foreground`
- Focus: `bg-surface-raised text-foreground` (keyboard)
- Destructive (Sair): `text-error`, hover: `bg-error/10 text-error`

**Keyboard:**
- Enter/Space opens dropdown
- ArrowDown/Up navigates items
- Enter/Space selects item
- Escape closes dropdown
- Tab moves to next element

### 5.4 Notification Bell

- Existing `NotificationBell` component, stays in place
- Position: between breadcrumb and user dropdown
- Size: `size-9` button with `size-5` icon

### 5.5 Scroll Shadow

- Default state: flat, no shadow
- Scrolled state (content scrollY > 0): `shadow-scroll` (`0 1px 20px hsl(210 36% 5% / 0.4)`)
- Transition: `transition-shadow duration-200 ease-out`
- Detection: listen to scroll event on content container (not window)
- Implementation: pass `isScrolled` state from layout to Navbar via SidebarContext or prop

---

## 6. Landing/Public Navbar

### 6.1 Layout Anatomy

```
+------------------------------------------------------------------------+
| [P.I.T]                    Rankings | Hall of Fame | [Entrar] [Criar]  |
+------------------------------------------------------------------------+
  ↑ logo/wordmark             ↑ nav links              ↑ CTA buttons
  flex items-center           hidden md:flex             flex gap-2
```

**Dimensions:**
- Height: `h-navbar` (56px)
- Position: `sticky top-0`
- Z-index: `z-sticky` (30)
- Background: `bg-background`
- Border: `border-b border-border/15`
- Padding: `px-6` or `px-content`
- Content: `max-w-7xl mx-auto flex items-center justify-between`

### 6.2 Elements

**Brand (left):**
- Logo icon (same as sidebar, `bg-primary rounded-lg p-1`) + "P.I.T" text
- `text-section-title font-black tracking-tight text-foreground`
- Link to `/` (home)

**Nav Links (center/right on desktop):**
- "Rankings" → `/rankings`
- "Hall of Fame" → `/hall-of-fame`
- Style: ghost buttons, `text-body-sm text-foreground-secondary`
- Hover: `text-foreground`
- Active (current route): `text-primary font-medium`
- Hidden on mobile (`hidden md:flex`)

**CTA Buttons (right):**
- "Entrar" → `/login` — ghost variant, `text-foreground-secondary`
- "Criar conta" → `/signup` — default variant, `bg-primary text-primary-foreground`
- Both: `rounded-md h-9 px-4 text-body-sm`

### 6.3 Mobile (< 768px)

**Option A (simple):** Hide nav links, show only logo + CTAs
**Option B (hamburger):** Hamburger → Sheet with nav links + CTAs

Recommended: **Option A** (only 2 nav links, not worth a drawer)

```
Mobile:
+----------------------------------------------+
| [P.I.T]                    [Entrar] [Criar]  |
+----------------------------------------------+
```

### 6.4 States

- Sticky: always visible on scroll
- No scroll shadow needed (public pages are simpler)
- Focus-visible on all interactive elements: `ring-2 ring-primary`

---

## 7. Design System Page (/design-system)

### 7.1 Page Structure

Full-width page inside `(public)` layout (LandingNavbar, no sidebar).

```
+-------------------------------------------------------------+
| [LandingNavbar]                                              |
+-------------------------------------------------------------+
| # P.I.T Design System                                        |
| Living style guide — tokens, tipografia, cores, componentes  |
|                                                              |
| [Tab: Cores | Tipografia | Espacamento | Icones | Componentes] |
|                                                              |
| ┌─── Section Content ──────────────────────────────────────┐ |
| │                                                           │ |
| │  (renders based on active tab)                            │ |
| │                                                           │ |
| └───────────────────────────────────────────────────────────┘ |
+-------------------------------------------------------------+
```

### 7.2 Sections

#### 7.2.1 Cores (Colors)

Grid of color swatches organized by category:

**Background & Surfaces:**
| Swatch | Token | Hex | CSS Var |
4 swatches: background, card, surface-raised, surface-overlay

**Primary & Accent:**
| Swatch | Token | Hex |
5 swatches: primary, primary-hover, primary-active, accent-brand, accent-brand-hover

**Foreground:**
3 swatches: foreground, foreground-secondary, foreground-tertiary

**Semantic:**
6 swatches: success, success-bg, warning, warning-bg, error, error-bg

**Position:**
4 swatches: position-gk, position-def, position-mid, position-fwd

**Chart:**
5 swatches: chart-1 through chart-5

Each swatch: `size-16 rounded-lg` with token name, hex value, and contrast ratio vs background below.

#### 7.2.2 Tipografia (Typography)

Render all 11 type scale tokens with example text:

```
text-display    36px/1.1/700    P.I.T Platform
text-page-title 30px/1.2/700   Perfil do Jogador
text-section-title 20px/1.3/600 Estatisticas
text-card-title 16px/1.4/600   Ultimas Partidas
text-body-lg   16px/1.5/400    Texto principal do sistema
text-body-sm   14px/1.5/400    Texto secundario, tabelas
text-label     12px/1.4/500    LABEL MAIUSCULA
text-caption   11px/1.3/500    timestamp · metadata
text-data-lg   24px/1.2/700    1,234
text-data-sm   18px/1.2/600    456
```

Each row: rendered example + token name + size/weight/line-height specs.

#### 7.2.3 Espacamento (Spacing)

Visual demo of 4px grid:
- Row of boxes at each spacing token (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
- Each box: `bg-primary/20` with width equal to the spacing value
- Label: token name + pixel value

Layout dimensions:
- Sidebar width (288px) visual bar
- Navbar height (56px) visual bar
- Content padding (24px) visual indicator

#### 7.2.4 Icones (Icons)

Grid of all Lucide icons used in the project with names:

```
[BarChart3] insights     [User] person        [Users] groups
[ShieldCheck] verify     [LayoutDashboard]     [Gamepad2] sports
[Trophy] trophy          [Settings] settings   [LogOut] logout
[Swords] matchmaking     [Award] tournaments   [Gavel] disputes
[AlertTriangle] claims   [UserPlus] add user   [Link] link
[ChevronDown] chevron    [Menu] hamburger      [PanelLeftClose]
```

Each: icon rendered at 20px + 24px sizes, with label below.

#### 7.2.5 Componentes (Components)

Render each shared component with example props:

1. **PageHeader** — title="Meu Perfil", subtitle="Estatisticas e configuracoes"
2. **StatCard** — icon, label="Partidas", value="142", trend="+12%"
3. **EmptyState** — icon, title="Sem dados", description="Nenhuma partida encontrada"
4. **ErrorState** — title="Erro ao carregar", onRetry
5. **NoPermissionState** — message="Voce nao tem permissao"
6. **LoadingSkeleton** — all 5 variants (card, tableRow, textBlock, avatar, statCard)
7. **StatusBadge** — all 3 variants (approved, pending, rejected)
8. **ScoreDisplay** — homeScore=3, awayScore=1
9. **PlayerAvatar** — all 3 sizes (sm, md, lg)
10. **DataTable** — sample 5-row table with sorting

### 7.3 Design Tokens for the Page

- Page background: `bg-background`
- Sections: `bg-card rounded-lg p-8`
- Section titles: `text-page-title text-foreground mb-6`
- Tab navigation: shadcn `Tabs` component
- Spacing between sections: `space-y-8` (32px)
- Max width: `max-w-6xl mx-auto px-6`

---

## 8. Responsive Breakpoints Summary

| Breakpoint | Sidebar | Navbar | Content |
|------------|---------|--------|---------|
| 375px (mobile) | Hidden (drawer via hamburger) | Hamburger + truncated breadcrumb + user dropdown | Full-width, `px-4` |
| 768px (tablet) | Visible, collapsed (64px) | Breadcrumb + user dropdown | `ml-16`, `px-6` |
| 1024px (desktop) | Visible, expanded (288px) | Full breadcrumb + user dropdown | `ml-sidebar`, `px-6` |
| 1366px | Same as 1024 | Same | Same |
| 1440px | Same | Same | `max-w-7xl mx-auto` content |

---

## 9. Accessibility Checklist

- [ ] All interactive elements reachable via Tab key
- [ ] Tab order: Sidebar toggle → Nav items → Main content → Navbar items
- [ ] Skip link: "Pular para conteudo principal" (first focusable element)
- [ ] Focus-visible rings: `ring-2 ring-primary ring-offset-2 ring-offset-background`
- [ ] ARIA: `role="navigation"` on sidebar nav, `aria-current="page"` on active nav item
- [ ] ARIA: `aria-expanded` on collapse toggle and context switcher
- [ ] ARIA: `aria-label` on icon-only buttons (hamburger, collapse toggle, sign out when collapsed)
- [ ] Screen reader: section labels as `<h3>` headings (semantic, not just visual)
- [ ] Reduced motion: `@media (prefers-reduced-motion: reduce)` disables all transitions
- [ ] Contrast: all text meets WCAG AA (4.5:1 normal, 3:1 large)
- [ ] Touch targets: minimum 44px on mobile (hamburger, nav items, dropdown trigger)

---

## 10. Animation Summary

| Animation | Duration | Easing | Trigger | Reduced Motion |
|-----------|----------|--------|---------|----------------|
| Sidebar collapse/expand | 200ms | ease-in-out | Toggle click | Instant (0ms) |
| Sidebar text fade | 150ms | ease-in-out | Collapse state change | Instant |
| Mobile drawer open | 300ms | cubic-bezier(0.16,1,0.3,1) | Hamburger click | Instant |
| Mobile drawer close | 200ms | ease-in | Link click / overlay / escape | Instant |
| Nav item hover | 150ms | ease-out | Mouse enter | Instant |
| Nav item active press | 100ms | — | scale(0.98) on click | None |
| Dropdown open | 150ms | ease-out | Click trigger | Instant |
| Scroll shadow | 200ms | ease-out | Content scroll > 0 | Instant |
| Tooltip appear | 100ms | ease-out | Mouse hover on collapsed icon | Instant |
| Breadcrumb separator | — | — | Static (no animation) | — |

All durations within 150-300ms range per UX guidelines. Exit animations faster than enter.
