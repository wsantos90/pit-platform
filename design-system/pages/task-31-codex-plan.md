# Task #31 — Layout Shell Redesign — Plano Codex

## Contexto

Branch: `feat/task-31-layout-shell-redesign`
Estado: Código implementado pelo Claude Sonnet (NÃO commitado), auditado pelo Claude Opus.
Build: ✅ `tsc --noEmit` + `npm run build` passam.
Tudo está unstaged/untracked — nenhum commit existe na branch ainda.

### Arquivos já criados/modificados (funcionais, com bugs listados abaixo)

| Arquivo | Tipo | Linhas |
|---|---|---|
| `src/hooks/useSidebar.tsx` | Novo | ~87 |
| `src/components/layout/sidebar/constants.ts` | Novo | ~192 |
| `src/components/layout/SidebarShell.tsx` | Reescrito | ~594 |
| `src/components/layout/Navbar.tsx` | Reescrito | ~170 |
| `src/components/layout/LandingNavbar.tsx` | Novo | ~80 |
| `src/app/(public)/layout.tsx` | Novo | ~14 |
| `src/app/(dashboard)/layout.tsx` | Modificado | ~48 |
| `src/app/layout.tsx` | Modificado (font fix) | ~31 |
| `src/app/globals.css` | Modificado (removeu deprecated) | ~192 |

### Arquivos deletados (correto, sem imports pendentes)
- `src/components/layout/ContextSwitcher.tsx`
- `src/components/layout/Sidebar.tsx`

---

## FASE 1: Bug Fixes (OBRIGATÓRIO)

### 1.1 — Corrigir acentos PT-BR em `constants.ts`

**Arquivo:** `src/components/layout/sidebar/constants.ts`

Todas as labels de navegação e breadcrumb estão sem acentos/cedilha. Corrigir:

```
// getNavSections() — context 'team_id'
'Gestao do Clube'    → 'Gestão do Clube'
'Visao Geral'        → 'Visão Geral'
'Escalacao'          → 'Escalação'
'Competicoes'        → 'Competições'

// getNavSections() — context 'moderation'
'Usuarios'           → 'Usuários'

// getNavSections() — context 'admin'
'Administracao'      → 'Administração'

// getNavSections() — context 'profile' (default)
'Configuracoes'      → 'Configurações'
'Competicoes'        → 'Competições'

// BREADCRUMB_LABELS
'Escalacao'          → 'Escalação'
'Configuracoes'      → 'Configurações'
'Moderacao'          → 'Moderação'
'Usuarios'           → 'Usuários'
```

### 1.2 — Corrigir acentos em `SidebarShell.tsx`

**Arquivo:** `src/components/layout/SidebarShell.tsx`

Nas funções `getContextLabel()` e `contextOptions`:
```
'Moderacao'  → 'Moderação'
```

### 1.3 — Adicionar BREADCRUMB_LABELS faltantes em `constants.ts`

Adicionar ao `BREADCRUMB_LABELS`:
```typescript
dashboard: 'Dashboard',
players: 'Jogadores',
payment: 'Pagamento',
failure: 'Falha',
pending: 'Pendente',
success: 'Sucesso',
unauthorized: 'Não Autorizado',
notifications: 'Notificações',
```

### 1.4 — Tratar segmentos dinâmicos `[id]` no breadcrumb

**Arquivo:** `src/components/layout/Navbar.tsx`

Na função `useBreadcrumbs()`, detectar segmentos que parecem UUIDs ou IDs e substituir por label genérica:

```typescript
function useBreadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;

        // Detectar UUIDs e IDs numéricos/alfanuméricos
        const isId = /^[0-9a-f]{8}-/.test(segment) || // UUID
                     /^[0-9a-f]{20,}$/.test(segment) || // Hex long ID
                     /^\d+$/.test(segment); // Numeric ID

        let label: string;
        if (isId) {
            label = 'Detalhes';
        } else {
            label = BREADCRUMB_LABELS[segment] ??
                segment.charAt(0).toUpperCase() + segment.slice(1);
        }

        return { href, label, isLast };
    });
}
```

### 1.5 — Corrigir `glass-card` residual (fora da task, mas quebra visual)

**Arquivo:** `src/components/team/TeamDashboard.tsx`

A classe `glass-card` foi removida do CSS. Substituir:
```
glass-card rounded-xl p-5  →  rounded-xl border border-border/15 bg-card p-5
```

Buscar por `glass-card` em todo o projeto e substituir pelo mesmo padrão se houver mais ocorrências.

---

## FASE 2: Acessibilidade (OBRIGATÓRIO)

### 2.1 — Keyboard navigation no Context Switcher

**Arquivo:** `src/components/layout/SidebarShell.tsx` — função `SidebarContextSwitcher`

O dropdown do context switcher usa apenas `mousedown` para fechar. Adicionar:

1. Listener de `keydown` no document quando `open === true`:
   - `Escape` → fechar dropdown
   - `ArrowDown` → mover foco para próxima opção
   - `ArrowUp` → mover foco para opção anterior
   - `Enter` → selecionar opção focada

2. Adicionar `aria-expanded={open}` e `aria-haspopup="listbox"` no botão trigger.

3. Adicionar `role="listbox"` no container de opções e `role="option"` + `aria-selected` em cada opção.

4. Gerenciar foco: quando dropdown abre, focar primeira opção. Quando fecha, retornar foco ao trigger.

Exemplo da estrutura esperada:
```tsx
<button
    disabled={disabled}
    onClick={() => setOpen((o) => !o)}
    aria-expanded={open}
    aria-haspopup="listbox"
    className="..."
>
```

### 2.2 — Adicionar `prefers-reduced-motion` no `globals.css`

**Arquivo:** `src/app/globals.css`

Adicionar no final do arquivo (fora de qualquer `@layer`):
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 2.3 — Adicionar `aria-label` no Navbar

**Arquivo:** `src/components/layout/Navbar.tsx`

No `<header>`, adicionar:
```tsx
<header
    role="banner"
    aria-label="Barra de navegação"
    className={cn(...)}
>
```

---

## FASE 3: Quality Improvements (RECOMENDADO)

### 3.1 — Substituir getElementById por ref no scroll detection

**Arquivo:** `src/components/layout/Navbar.tsx` + `src/app/(dashboard)/layout.tsx`

Opção A (simples, manter getElementById mas adicionar warning):
```typescript
useEffect(() => {
    const container = document.getElementById('main-content-scroll');
    if (!container) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Navbar] main-content-scroll element not found');
        }
        return;
    }
    // ... rest unchanged
}, []);
```

Opção B (melhor, context-based — mais invasivo):
Criar ScrollContext no dashboard layout e consumir no Navbar. SKIP para esta task — Opção A é suficiente.

### 3.2 — React.memo nos sub-componentes do SidebarShell

**Arquivo:** `src/components/layout/SidebarShell.tsx`

Wrap com `React.memo`:
- `SidebarBrand`
- `SidebarUserCard`
- `SidebarNavItem`
- `SidebarFooter`

NÃO aplicar em `SidebarNav` e `SidebarContent` (recebem callbacks/state que mudam).

---

## FASE 4: Feature Faltante — Página `/design-system`

### 4.1 — Criar `/design-system` living style guide

**Arquivo novo:** `src/app/(public)/design-system/page.tsx`

Server component. Página funcional mostrando todos os tokens e componentes do design system.

**Seções obrigatórias:**

1. **Cores** — Renderizar TODOS os tokens de cor como swatches:
   - Backgrounds: background, card, surface-raised, surface-overlay
   - Text: foreground, foreground-secondary, foreground-tertiary
   - Interactive: primary, accent-brand
   - Semantic: success, warning, error, info
   - Position: position-gk, position-def, position-mid, position-fwd
   - Result: result-win, result-draw, result-loss
   - Chart: chart-1 a chart-5

   Cada swatch: quadrado ~64px com cor de fundo + label + valor HSL

2. **Tipografia** — Renderizar a type scale completa:
   - text-display (36px/700)
   - text-page-title (30px/700)
   - text-section-title (20px/600)
   - text-card-title (16px/600)
   - text-body-lg (16px/400)
   - text-body-sm (14px/400)
   - text-label (12px/500/uppercase/tracking-wide)
   - text-caption (11px/500)

   Cada um: texto de exemplo + nome da classe + specs

3. **Espaçamento** — Demonstrar grid 4px:
   - Mostrar blocos com gap-1 (4px), gap-2 (8px), gap-3 (12px), gap-4 (16px), gap-6 (24px), gap-8 (32px)
   - Tokens nomeados: h-navbar (56px), w-sidebar (288px), p-content (24px)

4. **Raio de borda** — Exemplos com radius lg (12px), md (10px), sm (8px)

5. **Sombras** — shadow-float e shadow-scroll com exemplos visuais

6. **Ícones** — Renderizar todos os ícones Lucide mapeados em `ICON_MAP`:
   - Grid de ícones com nome + componente renderizado
   - Tamanhos: 16, 20, 24, 32px

7. **Componentes Shared** — Renderizar cada um com props de exemplo:
   - `PageHeader` com título e subtítulo
   - `StatCard` com valor, label, trend, icon
   - `EmptyState` com mensagem e ação
   - `ErrorState` com mensagem de erro
   - `NoPermissionState`
   - `LoadingSkeleton` com variantes
   - `StatusBadge` com todos os status
   - `ScoreDisplay` com placar
   - `PlayerAvatar` nos 3 tamanhos (sm, md, lg)
   - `DataTable` com dados mock

**Design:**
- Usar `bg-background` como fundo
- Cada seção com `PageHeader` component
- Cards de exemplo em `bg-card` com `border border-border/15`
- Responsivo (grid adapta em mobile)

**Imports necessários:**
```typescript
import { ICON_MAP } from '@/components/layout/sidebar/constants';
import {
    DataTable,
    EmptyState,
    ErrorState,
    LoadingSkeleton,
    NoPermissionState,
    PageHeader,
    PlayerAvatar,
    ScoreDisplay,
    StatCard,
    StatusBadge,
} from '@/components/shared';
```

---

## FASE 5: Finalização

### 5.1 — Validação

Rodar em sequência:
```bash
npx tsc --noEmit
npm run build
npm test
```

Todos devem passar com zero erros.

### 5.2 — Commit

Commitar tudo com mensagem descritiva. Sugestão de commit structure:
```
feat(task-31): layout shell redesign — sidebar + navbar

- Rewrite SidebarShell: collapsible (288px/64px), Lucide icons, CSS tokens
- Add mobile drawer via shadcn Sheet
- Navbar: breadcrumb, user dropdown, hamburger, scroll shadow
- Landing navbar for public pages (/rankings, /hall-of-fame)
- SidebarProvider + useSidebar hook (localStorage, cross-tab sync)
- Design system page (/design-system) with all tokens and components
- Remove deprecated CSS classes and legacy components
- Fix Inter font rendering (CSS variable on html element)
```

---

## Arquivos Tocados (Resumo Final)

### Modificar (já existem, precisam de fix)
| Arquivo | Fixes |
|---|---|
| `src/components/layout/sidebar/constants.ts` | Acentos PT-BR + breadcrumb labels faltantes |
| `src/components/layout/SidebarShell.tsx` | Acentos + keyboard nav + aria-expanded + React.memo |
| `src/components/layout/Navbar.tsx` | Dynamic [id] handling + aria-label + scroll warning |
| `src/app/globals.css` | prefers-reduced-motion |
| `src/components/team/TeamDashboard.tsx` | glass-card → bg-card border |

### Criar (não existem)
| Arquivo | Descrição |
|---|---|
| `src/app/(public)/design-system/page.tsx` | Living style guide |

### Não tocar (já estão OK)
- `src/hooks/useSidebar.tsx`
- `src/components/layout/LandingNavbar.tsx`
- `src/app/(public)/layout.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/layout.tsx`

---

## Referências

- Design tokens: `design-system/MASTER.md`
- Shared components: `src/components/shared/index.ts` (10 exports)
- Icon map: `src/components/layout/sidebar/constants.ts` → `ICON_MAP`
- UX spec: `design-system/pages/layout-shell.md`
- Tailwind config: `tailwind.config.ts` (tokens, spacing, z-index, shadows)
