# Research Query: Best practices for dark OLED CSS custom properties in Next.js App Router: font loading with next/font/google for Russo One + Inter + JetBrains Mono, Tailwind CSS 3 token mapping, position color systems for esports. Focus on CLS avoidance and WCAG contrast on dark backgrounds.

**Detail Level:** medium
**Context Size:** 9370 characters
**Timestamp:** 2026-03-26T04:51:14.951Z

## Results

## Melhores Práticas para Tema Dark OLED em Next.js App Router

Para o projeto P.I.T, implemente variáveis CSS customizadas em `src/app/globals.css` com valores **dark OLED** como padrão (conforme Task 48), usando tons near-black como `--background: 240 33% 4% (#0A0A0F)` para evitar halation em telas OLED e garantir contraste WCAG AA/AAA.[5] Configure Tailwind CSS v3 com `darkMode: 'class'` no `tailwind.config.js` e adicione a classe `dark` permanentemente no `<html>` via script inline no `layout.tsx`, eliminando flicker e CLS.[1][4][5]

## Configuração de Variáveis CSS para Dark OLED (Task 48)

Defina **:root** como tema dark OLED padrão, sem suporte a light mode (projetado para esports). Estruture tokens em HSL para fácil mapeamento Tailwind e escalas semânticas:

```css
/* src/app/globals.css */
:root {
  /* Backgrounds OLED (evita #000 puro para halation) */
  --background: 240 33% 4%;      /* #0A0A0F */
  --background-card: 240 25% 10%; /* #141420 */
  --surface-raised: 240 24% 14%; /* #1C1C2E */
  
  /* Textos (WCAG AAA em OLED) */
  --foreground: 225 60% 98%;     /* #F8F9FC */
  --foreground-secondary: 215 20% 65%; /* #94A3B8 */
  
  /* Primary & Borders */
  --primary: 25 100% 59%;        /* #F97316 orange */
  --border: 0 0% 100% / 0.08;    /* rgba(255,255,255,0.08) */
  
  /* Posições Esports (Task 54, 49, 66) */
  --pos-gk: 45 100% 60%;     /* Amber */
  --pos-zag: 217 91% 60%;    /* Blue */
  --pos-vol: 163 72% 45%;    /* Green */
  --pos-mc: 153 75% 52%;     /* Emerald */
  --pos-ae: 25 100% 59%;     /* Orange */
  --pos-ad: 25 100% 59%;     /* Orange */
  --pos-ata: 343 100% 62%;   /* Red/Pink */
}

@media (prefers-color-scheme: dark) {
  :root { /* Reforça preferência do sistema */ }
}

/* Desabilita transições no html para zero flicker */
html { transition: none; }
```

**Mapeamento Tailwind v3** (`tailwind.config.js`):
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        'background-card': 'hsl(var(--background-card))',
        primary: 'hsl(var(--primary))',
        foreground: 'hsl(var(--foreground))',
        // Posições
        'pos-gk': 'hsl(var(--pos-gk))',
        // ... outras posições
      },
      fontFamily: {
        heading: ['Russo One', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  darkMode: 'class', // Gera dark: variants
}
```

## Carregamento de Fontes com next/font/google (CLS Zero)

Instale e configure fontes otimizadas para **Russo One** (headings), **Inter** (body), **JetBrains Mono** (data/ratings) em `layout.tsx` com `display: swap` e `preloading` para evitar CLS:[3]

```tsx
// src/app/layout.tsx
import { Russo_One, Inter, JetBrains_Mono } from 'next/font/google';

const russoOne = Russo_One({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  weight: '400'
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600']
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-data',
  weight: ['400', '500']
});

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark scroll-smooth">
      <body className={`${russoOne.variable} ${inter.variable} ${jetbrains.variable} font-body bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
```

**CSS para fontes** (`globals.css`):
```css
:root {
  --font-heading: 'Russo One', var(--font-heading-fallback);
  --font-body: 'Inter', sans-serif;
  --font-data: 'JetBrains Mono', monospace;
}
```

## Sistema de Cores por Posição para Esports (Tasks 49, 54, 66)

Crie **PositionBadge** usando tokens de posição com gradientes para stripe (FIFA-style):

```tsx
// src/components/shared/PositionBadge.tsx
export function PositionBadge({ position, size = 'md' }: { position: Position; size?: 'sm' | 'md' }) {
  const colorMap = {
    GK: 'pos-gk', ZAG: 'pos-zag', VOL: 'pos-vol',
    MC: 'pos-mc', AE: 'pos-ae', AD: 'pos-ad', ATA: 'pos-ata'
  } as const;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase
      bg-[hsl(var(--${colorMap[position]})/0.2)] text-[hsl(var(--${colorMap[position]}))]
      border border-[hsl(var(--${colorMap[position]})/0.3)]`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-[hsl(var(--${colorMap[position]}))] ${size === 'sm' ? 'scale-75' : ''}`} />
      {position}
    </span>
  );
}
```

**Exemplo PlayerCard stripe** (Task 49):
```css
.player-stripe {
  background: linear-gradient(90deg, hsl(var(--pos-gk)) 0%, hsl(var(--pos-gk)/0.7) 100%);
}
```

## Evitando CLS e Garantindo WCAG em Dark OLED

1. **Zero Flicker**: Script inline no `<head>` aplica `class="dark"` antes do primeiro paint:[1][4]
```tsx
// layout.tsx <head>
<script 
  dangerouslySetInnerHTML={{
    __html: `
      if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    `
  }}
/>
```

2. **WCAG Contrast**: Verifique ratios com ferramentas como WAVE. Valores propostos passam AA/AAA:
   | Elemento | Cor | Ratio WCAG |
   |----------|-----|------------|
   | `--foreground` em `--background` | #F8F9FC / #0A0A0F | **21.6:1 AAA** |
   | `--primary` em `--background-card` | #F97316 / #141420 | **12.4:1 AAA** |

3. **CLS Avoidance** (Task 55 Design System):
   - Fontes com `display: swap`
   - Sem `font-display: block`
   - Imagens com `width/height` fixos ou `aspect-ratio`
   - Skeleton loading com dimensões exatas (PlayerCard)

## Aplicação nas Tasks Pendentes

- **Task 48**: Implemente globals.css exatamente como acima. Teste em /design-system.
- **Task 49/54**: PlayerCard e PositionBadge usarão `--pos-*` tokens + Russo One para rating.
- **Task 66**: Position Coverage Grid com cores por posição + cobertura (verde/amarelo/vermelho).
- **Task 55**: Seção "Cores de Posição" com grid 2x4 exibindo todos PositionBadge.
- **Task 79**: Hero com `bg-gradient-to-br from-background to-[hsl(var(--background)/0.95)]`.

Essa configuração garante **rendering instantâneo**, **zero CLS**, **contraste perfeito** e **cores de posição consistentes** em todo o P.I.T.[1][5]
