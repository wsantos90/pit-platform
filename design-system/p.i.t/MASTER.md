# P.I.T Design System — MASTER.md

> **REGRA:** Ao construir uma página específica, verificar primeiro `design-system/pages/[nome-da-pagina].md`.
> Se o arquivo existir, suas regras **substituem** este Master file.
> Se não existir, seguir **estritamente** as regras abaixo.

---

**Projeto:** P.I.T — Performance · Intelligence · Tracking
**Produto:** Plataforma competitiva de gestão para FIFA Pro Clubs 11v11
**Gerado:** 2026-03-26 (curado manualmente)
**Categoria:** Esports Dashboard + SaaS
**Estilo:** Dark Mode (OLED) + Data-Dense Analytics + Minimalism

---

## 1. PALETA DE CORES

### 1.1 Tokens Principais

| Token | Hex | HSL | Uso |
|-------|-----|-----|-----|
| `--background` | `#0A0A0F` | `240 33% 4%` | Background base da app |
| `--background-raised` | `#141420` | `240 25% 10%` | Cards, painéis, sidebar |
| `--background-overlay` | `#1C1C2E` | `240 24% 14%` | Cards elevated, modais |
| `--background-muted` | `#22223A` | `240 25% 18%` | Inputs, hover states |
| `--foreground` | `#F8F9FC` | `225 60% 98%` | Texto primário |
| `--foreground-muted` | `#94A3B8` | `215 20% 65%` | Texto secundário, labels |
| `--foreground-subtle` | `#64748B` | `215 19% 47%` | Texto terciário, placeholders |
| `--border` | `rgba(255,255,255,0.08)` | — | Bordas de cards e dividers |
| `--border-hover` | `rgba(255,255,255,0.16)` | — | Bordas ao hover |

### 1.2 Accent — Laranja/Amber (Identidade P.I.T)

| Token | Hex | Uso |
|-------|-----|-----|
| `--primary` | `#F97316` | Botões primários, links ativos, highlights |
| `--primary-hover` | `#EA580C` | Hover de botões primários |
| `--primary-active` | `#C2410C` | Active state de botões |
| `--primary-subtle` | `#431407` | Background sutil (badges, alerts leves) |
| `--primary-foreground` | `#FFFFFF` | Texto sobre fundo laranja |
| `--secondary` | `#F59E0B` | Gold/Premium — trophies, top ranks, badges premium |
| `--secondary-subtle` | `#451A03` | Background gold sutil |

### 1.3 Semantic Colors

| Token | Hex | Uso |
|-------|-----|-----|
| `--success` | `#22C55E` | Vitória (W), pagamento pago, claim aprovado |
| `--success-subtle` | `#052E16` | Background de success |
| `--warning` | `#EAB308` | Aviso, pagamento pendente, matchmaking aguardando |
| `--warning-subtle` | `#422006` | Background de warning |
| `--error` | `#EF4444` | Derrota (L), erro, claim rejeitado, banimento |
| `--error-subtle` | `#450A0A` | Background de error |
| `--info` | `#3B82F6` | Informação, empate (D) |
| `--info-subtle` | `#172554` | Background de info |

### 1.4 Position Colors (7 posições P.I.T)

| Posição | Token | Hex | Uso |
|---------|-------|-----|-----|
| GK (Goleiro) | `--pos-gk` | `#EAB308` | Badge amarelo |
| ZAG (Zagueiro) | `--pos-zag` | `#3B82F6` | Badge azul |
| VOL (Volante) | `--pos-vol` | `#22C55E` | Badge verde |
| MC (Meia Central) | `--pos-mc` | `#10B981` | Badge verde esmeralda |
| AE (Ala Esquerdo) | `--pos-ae` | `#F97316` | Badge laranja |
| AD (Ala Direito) | `--pos-ad` | `#FB923C` | Badge laranja claro |
| ATA (Atacante) | `--pos-ata` | `#EF4444` | Badge vermelho |

### 1.5 Result Colors

| Resultado | Token | Hex |
|-----------|-------|-----|
| Vitória (W) | `--result-win` | `#22C55E` |
| Empate (D) | `--result-draw` | `#64748B` |
| Derrota (L) | `--result-loss` | `#EF4444` |

### 1.6 Chart Colors

| Token | Hex | Uso |
|-------|-----|-----|
| `--chart-1` | `#F97316` | Primary data series (laranja) |
| `--chart-2` | `#3B82F6` | Secondary data series (azul) |
| `--chart-3` | `#22C55E` | Tertiary data series (verde) |
| `--chart-4` | `#F59E0B` | Quaternary (amber) |
| `--chart-5` | `#A855F7` | Quinary (roxo) |
| `--chart-avg` | `#64748B` | Average player / benchmark lines |

---

## 2. TIPOGRAFIA

### 2.1 Font Families

```css
/* Heading: Russo One — Gaming, bold, esports energy */
/* Body: Inter — Clean, readable, neutral */
/* Data: JetBrains Mono / Fira Code — Numbers, stats, codes */

--font-heading: 'Russo One', 'system-ui', sans-serif;
--font-body: 'Inter', 'system-ui', sans-serif;
--font-data: 'JetBrains Mono', 'Fira Code', monospace;
```

**Notas de uso:**
- **Russo One**: Hero titles, page titles, nomes de jogadores (display)
- **Inter**: Todo o restante — labels, tabelas, formulários, descrições
- **JetBrains Mono**: Scores, ratings, stats numéricas (tabular figures)

### 2.2 Escala Tipográfica

| Nome | Tailwind | px | Font | Weight | Tracking | Line-height |
|------|----------|----|------|--------|----------|-------------|
| `display` | `text-4xl` | 36px | Russo One | 400 | -0.02em | 1.1 |
| `page-title` | `text-3xl` | 30px | Russo One | 400 | -0.01em | 1.15 |
| `section-title` | `text-xl` | 20px | Inter | 600 | 0 | 1.3 |
| `card-title` | `text-base` | 16px | Inter | 600 | 0 | 1.4 |
| `body-lg` | `text-base` | 16px | Inter | 400 | 0 | 1.6 |
| `body` | `text-sm` | 14px | Inter | 400 | 0 | 1.6 |
| `label` | `text-xs` | 12px | Inter | 500 | 0.06em | 1.4 |
| `caption` | `text-xs` | 11px | Inter | 500 | 0.08em | 1.3 |
| `data-lg` | `text-2xl` | 24px | JetBrains Mono | 700 | -0.02em | 1.2 |
| `data-md` | `text-lg` | 18px | JetBrains Mono | 600 | -0.01em | 1.3 |
| `data-sm` | `text-sm` | 14px | JetBrains Mono | 500 | 0 | 1.4 |

---

## 3. ESPAÇAMENTO & LAYOUT

### 3.1 Sistema de Espaçamento (grid 4px)

| Token | px | rem | Tailwind | Uso |
|-------|----|----|----------|-----|
| `--space-1` | 4px | 0.25rem | `p-1` | Micro gaps, ícones inline |
| `--space-2` | 8px | 0.5rem | `p-2` | Icon gaps, badges |
| `--space-3` | 12px | 0.75rem | `p-3` | Padding compacto |
| `--space-4` | 16px | 1rem | `p-4` | Padding padrão de cards |
| `--space-5` | 20px | 1.25rem | `p-5` | Cards médios |
| `--space-6` | 24px | 1.5rem | `p-6` | Padding generoso |
| `--space-8` | 32px | 2rem | `p-8` | Seções |
| `--space-10` | 40px | 2.5rem | `p-10` | Large sections |
| `--space-12` | 48px | 3rem | `p-12` | Hero padding |
| `--space-16` | 64px | 4rem | `p-16` | Page-level spacing |

### 3.2 Layout Grid

| Token | Valor | Uso |
|-------|-------|-----|
| `--sidebar-width` | `288px` | Sidebar expandida |
| `--sidebar-collapsed` | `64px` | Sidebar colapsada |
| `--navbar-height` | `56px` | Top navbar |
| `--content-padding` | `24px` | Padding do content area |
| `--page-max-width` | `1400px` | Largura máxima do layout |
| `--card-gap` | `16px` | Gap entre cards em grid |
| `--section-gap` | `32px` | Gap entre seções da página |

### 3.3 Breakpoints

| Nome | px | Tailwind | Comportamento |
|------|----|----------|---------------|
| mobile | 375px | `sm:` | 1 coluna, sidebar hidden |
| tablet | 768px | `md:` | 2 colunas, sidebar overlay |
| desktop | 1024px | `lg:` | Sidebar permanente, 3 col |
| wide | 1440px | `xl:` | Layout máximo, 4 col possível |

### 3.4 Grid de Cards por Contexto

```
Stat Cards (KPIs): grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
Data Cards: grid-cols-1 md:grid-cols-2 xl:grid-cols-3
Tournament Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
Player Cards: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

---

## 4. ELEVAÇÃO & SOMBRAS

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Pequenos elementos |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Cards padrão |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.6)` | Modais, dropdowns |
| `--shadow-glow` | `0 0 20px rgba(249,115,22,0.3)` | Highlight do accent laranja |
| `--shadow-glow-sm` | `0 0 8px rgba(249,115,22,0.2)` | Glow sutil em elementos ativos |

---

## 5. BORDAS & RAIOS

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `6px` | Badges, chips, inputs |
| `--radius-md` | `10px` | Cards padrão |
| `--radius-lg` | `14px` | Cards grandes, modais |
| `--radius-xl` | `20px` | Player cards, tournament banners |
| `--radius-full` | `9999px` | Avatares, pills |

---

## 6. COMPONENTES — ESPECIFICAÇÕES

### 6.1 Buttons

```
PRIMARY:
  bg: --primary (#F97316)
  text: white
  hover: --primary-hover (#EA580C)
  active: --primary-active (#C2410C)
  padding: 10px 20px
  radius: --radius-sm (6px)
  font: Inter 500 14px
  transition: 150ms ease-out

SECONDARY (ghost):
  bg: transparent
  text: --primary
  border: 1px solid rgba(249,115,22,0.4)
  hover: bg rgba(249,115,22,0.1)
  padding: 10px 20px
  radius: --radius-sm
  transition: 150ms ease-out

GHOST:
  bg: transparent
  text: --foreground-muted
  hover: bg rgba(255,255,255,0.06)
  padding: 10px 20px

DESTRUCTIVE:
  bg: --error (#EF4444)
  text: white
  hover: bg #DC2626
  padding: 10px 20px

SIZE VARIANTS:
  sm: px-3 py-1.5 text-xs
  md: px-4 py-2 text-sm (default)
  lg: px-6 py-3 text-base
```

### 6.2 Cards

```
BASE CARD:
  bg: --background-raised (#141420)
  border: 1px solid rgba(255,255,255,0.08)
  radius: --radius-md (10px)
  padding: 20px
  shadow: --shadow-md
  hover: border rgba(255,255,255,0.14), shadow --shadow-lg

STAT CARD (KPI):
  layout: flex-col gap-2
  label: text-xs 500 tracking-wide --foreground-muted
  value: data-lg (JetBrains Mono 24px 700) --foreground
  delta: text-xs com ícone (verde=+, vermelho=-)
  sparkline: optional, 40px height
  icon: 36x36px, bg --primary-subtle, color --primary, rounded-lg

PLAYER CARD (FIFA-style):
  size: 160px × 220px (card portrait ratio)
  bg: gradient do --background-overlay to --background-muted
  border: 1px solid --border, radius --radius-xl
  top section: rating (data-lg, --secondary), position badge
  middle: avatar circular 80px
  bottom: gamertag (Inter 500), club badge
  accent bar: 3px bottom, cor da posição

TOURNAMENT CARD:
  banner image: 16:9 top, radius-md top
  content area: p-4
  title: card-title Inter 600
  meta: text-xs --foreground-muted
  status badge: top-right absolute
  CTA button: full width primary

TROPHY CARD (Hall of Fame):
  bg: gradient dark to gold-subtle
  trophy icon/image: centered, 80px
  tournament name: section-title
  winner: card-title --secondary
  date + roster: text-xs --foreground-muted
```

### 6.3 Badges

```
POSITION BADGE:
  px-2 py-0.5 rounded-sm
  font: text-xs 600 tracking-wide
  GK: bg amber-950/50, text amber-400, border amber-800/50
  ZAG: bg blue-950/50, text blue-400, border blue-800/50
  VOL: bg green-950/50, text green-400, border green-800/50
  MC: bg emerald-950/50, text emerald-400, border emerald-800/50
  AE: bg orange-950/50, text orange-400, border orange-800/50
  AD: bg orange-950/50, text orange-300, border orange-800/50
  ATA: bg red-950/50, text red-400, border red-800/50

STATUS BADGE:
  active/aprovado: --success bg-subtle, text success
  pending/aguardando: --warning bg-subtle, text warning
  rejected/suspenso: --error bg-subtle, text error
  cancelled: bg muted, text muted-foreground

ROLE BADGE:
  admin: --primary bg-subtle, text primary
  moderador: bg violet-950/50, text violet-400
  manager: bg blue-950/50, text blue-400
  jogador: bg slate-800/50, text slate-400

RESULT BADGE (W/D/L):
  W: bg green-950, text green-400, font 700
  D: bg slate-800, text slate-400, font 700
  L: bg red-950, text red-400, font 700
  size: w-8 h-8 flex-center rounded-sm
```

### 6.4 Form Strip (W/D/L Strip)

```
Componente para exibir forma recente (últimos N jogos):
  Container: flex gap-1
  Cada item: 28px × 28px ou 10px × 28px (pill mode)
  W: bg green-500/20, text green-400, border green-500/30
  D: bg slate-500/20, text slate-400, border slate-500/30
  L: bg red-500/20, text red-400, border red-500/30
  radius: rounded-sm
  font: text-xs 700
  tooltip: resultado completo + adversário ao hover
```

### 6.5 Radar Chart (Stats por Posição)

```
Biblioteca: Recharts RadarChart
  Background: transparent
  Grid lines: stroke rgba(255,255,255,0.1), strokeWidth 1
  Axis labels: fill --foreground-muted, fontSize 11
  Player data: fill rgba(249,115,22,0.2), stroke #F97316, strokeWidth 2
  Average line: fill rgba(100,116,139,0.1), stroke #64748B, strokeDash 4 4
  Axes: 6-8 max (Gols, Assistências, Rating, Passes, Tackles, Saves)
  Dot: r=4, fill #F97316
```

### 6.6 Sparkline (Mini Chart)

```
Biblioteca: Recharts LineChart (mini)
  height: 40px
  width: 100% do container
  line: stroke #F97316, strokeWidth 2, type "monotone"
  dot: false
  area: fill rgba(249,115,22,0.1)
  no axes, no grid, no legend
  tooltip: custom minimal
```

### 6.7 Data Table

```
  bg: transparent
  header: text-xs 500 tracking-wide --foreground-muted, border-b --border
  row: border-b rgba(255,255,255,0.04)
  row hover: bg rgba(255,255,255,0.04)
  row selected: bg rgba(249,115,22,0.08)
  cell: text-sm --foreground, p-3
  sortable col: cursor-pointer, hover text --primary
  sort icon: 14px, --foreground-subtle
  pagination: text-xs, buttons ghost sm
```

### 6.8 Inputs

```
BASE INPUT:
  bg: rgba(255,255,255,0.04)
  border: 1px solid rgba(255,255,255,0.12)
  radius: --radius-sm (6px)
  padding: 10px 14px
  font: Inter 400 14px --foreground
  placeholder: --foreground-subtle
  focus: border --primary, outline 2px rgba(249,115,22,0.2)
  transition: 150ms ease-out
  height: 40px

SEARCH INPUT:
  Mesmos estilos + ícone Search 16px à esquerda (pl-10)
  clearable: X icon à direita quando tem valor

SELECT:
  Mesmos estilos de input
  chevron icon à direita
  dropdown: bg --background-overlay, border, shadow-lg, radius-md
  option hover: bg rgba(255,255,255,0.06)
  option selected: text --primary
```

### 6.9 Sidebar

```
Container:
  width: 288px (expandida) / 64px (colapsada)
  bg: --background-raised (#141420)
  border-right: 1px solid rgba(255,255,255,0.06)
  height: 100vh, overflow-y: auto

Brand section:
  logo: 32px, cor --primary
  title: "P.I.T" Russo One 18px --foreground
  tagline: text-xs --foreground-muted

User card:
  avatar: 36px circular, bg --background-overlay
  name: text-sm 600 --foreground
  role: text-xs --foreground-muted

Context switcher:
  bg: rgba(255,255,255,0.04), radius-md, p-2
  trigger: text-sm --foreground-muted + chevron
  dropdown: bg --background-overlay, shadow-lg

Nav item:
  px-3 py-2, radius-md, text-sm --foreground-muted
  icon: 18px, --foreground-subtle
  hover: bg rgba(255,255,255,0.06), text --foreground
  active: bg rgba(249,115,22,0.12), text --primary, border-l-2 --primary
  transition: 150ms ease-out

Nav section label:
  text-xs 600 tracking-wider --foreground-subtle
  px-3 pb-1 pt-4 uppercase
```

### 6.10 Navbar (Top)

```
Container:
  height: 56px
  bg: rgba(10,10,15,0.8) + backdrop-blur-md
  border-bottom: 1px solid rgba(255,255,255,0.06)
  position: sticky top-0, z-index: 30
  px-6

Content:
  breadcrumb: text-sm --foreground-muted, separador "/"
  active crumb: text-sm --foreground
  notification bell: 20px icon + badge count
  user avatar: 32px circular, dropdown ao clicar
```

### 6.11 Loading States (Skeletons)

```
Skeleton base:
  bg: rgba(255,255,255,0.06)
  animation: pulse 2s ease-in-out infinite
  radius: --radius-sm

Stat Card Skeleton: 120px height
Table Row Skeleton: 48px height, 4 cols
Player Card Skeleton: 160px × 220px
Chart Skeleton: full height com pulsing area
```

### 6.12 Empty States

```
Container: flex-col items-center gap-4 py-16
Icon: 48px, --foreground-subtle
Title: section-title --foreground
Description: body --foreground-muted, text-center, max-w-sm
CTA button: primary (quando aplicável)
```

### 6.13 Error States

```
Container: flex-col items-center gap-4 py-12
Icon: 40px text-error
Title: card-title --error
Description: body-sm --foreground-muted
Retry button: secondary
```

---

## 7. PADRÕES DE LAYOUT DE PÁGINA

### 7.1 Estrutura Padrão

```
Page Container:
  min-h: calc(100vh - 56px)  (navbar height)
  padding: 24px
  max-width: 1400px mx-auto

Seção 1 — Page Header:
  PageHeader component: título + descrição + ações opcionais
  mb-8

Seção 2 — KPI Cards:
  Grid de 2-4 StatCards
  mb-8

Seção 3 — Main Content:
  Conteúdo principal (tabela, gráficos, lista)
  mb-8

Seção 4 — Secondary Content:
  Painéis laterais ou secundários
```

### 7.2 Page Header

```
Container: flex justify-between items-start mb-8
Left:
  title: page-title (Russo One 30px)
  description: body-sm --foreground-muted mt-1
Right:
  Actions: botões de ação (CTA, filters, etc.)
```

---

## 8. ANIMAÇÕES & TRANSIÇÕES

| Propriedade | Duração | Easing | Uso |
|-------------|---------|--------|-----|
| Hover geral | 150ms | ease-out | Buttons, links, nav items |
| Card hover | 200ms | ease-out | Cards elevando |
| Modal open | 250ms | ease-out | Scale + fade in |
| Modal close | 200ms | ease-in | Scale + fade out |
| Sidebar collapse | 250ms | ease-in-out | Width transition |
| Toast | 300ms | ease-out | Slide in from right |
| Skeleton pulse | 2s | ease-in-out | Loading animation |
| Chart entrada | 400ms | ease-out | Recharts animation |

**Regras:**
- Usar `transform` e `opacity` — nunca animar `width/height/top/left`
- Respeitar `prefers-reduced-motion` — desabilitar animações decorativas
- Máximo 2 elementos animando simultaneamente na mesma tela
- Exit animations: 70% da duração do enter

---

## 9. ACESSIBILIDADE

| Regra | Requisito |
|-------|-----------|
| Contraste texto | Mínimo 4.5:1 (WCAG AA) |
| Contraste grande | Mínimo 3:1 (WCAG AA) |
| Focus ring | 2px solid --primary, offset 2px |
| Keyboard nav | Tab order lógico, Enter/Space para ativar |
| Aria-labels | Em todos os ícones sem texto visível |
| Alt text | Em todas as imagens significativas |
| Cor não é único indicador | Sempre acompanhar cor com ícone ou texto |
| Input labels | label for explícito em todos os inputs |
| Error messages | aria-live="polite" ou role="alert" |

---

## 10. ANTI-PATTERNS (NÃO FAZER)

- ❌ **Cores hardcoded** — Sempre usar CSS variables / Tailwind tokens
- ❌ **Backgrounds claros** — O design é DARK ONLY, sem páginas com fundo branco
- ❌ **Emojis como ícones** — Usar exclusivamente Lucide React
- ❌ **Blue (#2563EB) como primary** — O accent do P.I.T é LARANJA (#F97316)
- ❌ **Material Symbols** — Removido, usar Lucide React
- ❌ **Componentes sem estados** — Toda tela deve ter: loading, empty, error
- ❌ **Animações de layout** — Nunca animar `width`, `height`, `margin`, `padding`
- ❌ **Fonte mista aleatória** — Russo One só para display/headings, Inter para o resto
- ❌ **Espaçamento arbitrário** — Sempre múltiplos de 4px via tokens
- ❌ **Tabelas sem hover state** — Toda linha deve ter hover sutil
- ❌ **Radar chart com mais de 8 eixos** — Limitar a 6-8 atributos máximo

---

## 11. CHECKLIST PRÉ-ENTREGA

Para cada componente ou página implementada:

- [ ] Paleta dark+amber correta — sem azul como primary, sem fundo claro
- [ ] Zero hardcoded colors fora dos tokens CSS
- [ ] Todos os estados presentes: loading (skeleton), empty, error, success
- [ ] Ícones: Lucide React exclusivamente
- [ ] Fonte de dados: Inter (body), Russo One (display/headings), JetBrains Mono (números)
- [ ] Cursor-pointer em todos os elementos clicáveis
- [ ] Focus ring visível (outline --primary 2px)
- [ ] Contraste WCAG AA verificado
- [ ] Hover states suaves (150-200ms ease-out)
- [ ] Responsive: funciona em 375px, 768px, 1024px, 1440px
- [ ] prefers-reduced-motion respeitado
- [ ] npm run build — sem erros TypeScript
- [ ] Nenhum componente duplicado — reusar os existentes

---

## 12. REFERÊNCIAS VISUAIS

- **Football Analytics Platform**: Dark bg + laranja, radar charts, player comparison lado a lado, match timeline
- **Virtual Nexus Arena (VXA)**: Player cards estilo FIFA, tournament banners, hall dos campeões com trophies
- **Tailwind + shadcn/ui**: Componentes base, sem reinventar primitivos

---

## 13. PÁGINAS — SPECS ESPECÍFICAS

Cada página tem seu arquivo em `design-system/pages/`. Abaixo o índice:

| Arquivo | Página | Status |
|---------|--------|--------|
| `pages/profile.md` | /profile — Dashboard do jogador | A criar |
| `pages/team.md` | /team — Dashboard do clube | A criar |
| `pages/tournaments.md` | /tournaments — Lista de torneios | A criar |
| `pages/rankings.md` | /rankings — Leaderboards | A criar |
| `pages/hall-of-fame.md` | /hall-of-fame — Hall dos campeões | A criar |
| `pages/design-system.md` | /design-system — Brand book | A criar |
| `pages/admin.md` | /admin — Painel admin | A criar |
| `pages/moderation.md` | /moderation — Painel moderação | A criar |
