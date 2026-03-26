# Research Query: FIFA-style player cards, Recharts RadarChart for player attributes (5-8 axes), data-dense stat cards with sparklines in React/Next.js. Compound component patterns, skeleton loading, responsive card grids. Dark theme, tabular-nums for stats, accessibility.

**Detail Level:** medium
**Context Size:** 10147 characters
**Timestamp:** 2026-03-26T04:51:20.656Z

## Results

# Componentes de Cartas de Jogador FIFA com Recharts e Padrões Avançados

Com base no contexto do seu projeto, aqui está uma estratégia completa para implementar cartas de jogador estilo FIFA com gráficos de radar, dados densos e padrões de componentes compostos.

## Arquitetura de Componentes Compostos

Para o **PlayerCard** (Task 49) e a **página de stats** (Task 61), recomenda-se usar o padrão de componentes compostos, similar ao React Bootstrap[3]. Estruture assim:

```typescript
// src/components/shared/PlayerCard/index.tsx
import { PlayerCardRoot } from './PlayerCardRoot';
import { PlayerCardHeader } from './PlayerCardHeader';
import { PlayerCardStats } from './PlayerCardStats';
import { PlayerCardSkeleton } from './PlayerCardSkeleton';

export const PlayerCard = Object.assign(PlayerCardRoot, {
  Header: PlayerCardHeader,
  Stats: PlayerCardStats,
  Skeleton: PlayerCardSkeleton,
});
```

Isso permite uso flexível:
```typescript
<PlayerCard variant="full" isLoading={isLoading}>
  <PlayerCard.Header position="MC" rating={87} tier="pro" />
  <PlayerCard.Stats goals={12} assists={5} matches={24} />
</PlayerCard>
```

## Implementação do RadarChart com Recharts

Para a **StatsRadarSection** (Task 61), implemente um wrapper customizado do Recharts RadarChart[1]:

```typescript
// src/components/shared/StatsRadar/StatsRadar.tsx
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsRadarProps {
  data: Array<{
    attribute: string;
    value: number;
    fullMark: number;
  }>;
  position: string;
  compareData?: typeof data;
  isDark?: boolean;
}

export function StatsRadar({ data, position, compareData, isDark }: StatsRadarProps) {
  const attributes = ['Pace', 'Shooting', 'Passing', 'Dribbling', 'Defending', 'Physical'];
  
  const chartData = attributes.map(attr => ({
    attribute: attr,
    player: data.find(d => d.attribute === attr)?.value || 0,
    compare: compareData?.find(d => d.attribute === attr)?.value,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={chartData}>
        <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
        <PolarAngleAxis dataKey="attribute" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar 
          name="Seu Rating" 
          dataKey="player" 
          stroke="#8b5cf6" 
          fill="#8b5cf6" 
          fillOpacity={0.6}
        />
        {compareData && (
          <Radar 
            name="Comparação" 
            dataKey="compare" 
            stroke="#06b6d4" 
            fill="#06b6d4" 
            fillOpacity={0.3}
          />
        )}
        <Tooltip 
          contentStyle={{ 
            backgroundColor: isDark ? '#1f2937' : '#fff',
            border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
          }}
        />
        <Legend />
      </RadarChart>
    </ResponsiveContainer>
  );
}
```

## Cards de Dados Densos com Sparklines

Para **KPICard** (Task 54) com sparklines integrados:

```typescript
// src/components/shared/KPICard/KPICard.tsx
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  sparklineData?: Array<{ date: string; value: number }>;
  icon?: React.ReactNode;
  variant?: 'default' | 'compact';
}

export function KPICard({ 
  label, 
  value, 
  trend, 
  trendValue, 
  sparklineData,
  icon,
  variant = 'default'
}: KPICardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 dark">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-heading font-bold text-white tabular-nums">
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-semibold ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-slate-500'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}%
          </span>
        )}
      </div>

      {sparklineData && (
        <ResponsiveContainer width="100%" height={40}>
          <LineChart data={sparklineData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8b5cf6" 
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
```

## Grid Responsivo com Skeleton Loading

Para a página de perfil (Task 60), implemente um grid responsivo com skeleton:

```typescript
// src/components/shared/PlayerCard/PlayerCardSkeleton.tsx
export function PlayerCardSkeleton() {
  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden animate-pulse">
      <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-700" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-slate-800 rounded w-3/4" />
        <div className="h-4 bg-slate-800 rounded w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-8 bg-slate-800 rounded" />
          <div className="h-8 bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  );
}

// src/components/shared/StatsGrid.tsx
export function StatsGrid({ children, isLoading }: { children: React.ReactNode; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <PlayerCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {children}
    </div>
  );
}
```

## Tema Escuro e Acessibilidade

Implemente tokens CSS customizados no seu `globals.css`:

```css
:root {
  --pos-gk: #fbbf24;    /* Amber */
  --pos-zag: #ef4444;   /* Red */
  --pos-vol: #3b82f6;   /* Blue */
  --pos-mc: #8b5cf6;    /* Purple */
  --pos-ae: #06b6d4;    /* Cyan */
  --pos-ad: #10b981;    /* Green */
  --pos-ata: #f97316;   /* Orange */
  
  --result-win: #10b981;
  --result-draw: #64748b;
  --result-loss: #ef4444;
}

@layer utilities {
  .tabular-nums {
    font-variant-numeric: tabular-nums;
    font-family: 'JetBrains Mono', monospace;
  }
}
```

Para acessibilidade, use `aria-label` em badges e adicione suporte a `prefers-reduced-motion`:

```typescript
<div 
  className="transition-all duration-300 data-[reduced-motion]:transition-none"
  style={{
    animationDuration: prefersReducedMotion ? '0s' : '0.3s'
  }}
>
  {/* conteúdo */}
</div>
```

## Integração com Suas Tasks

- **Task 49 (PlayerCard)**: Use o padrão composto com variantes `full`/`compact` e skeleton
- **Task 54 (KPICard)**: Implemente com sparklines opcionais e trend indicators
- **Task 61 (Stats Page)**: Integre RadarChart com comparação lado a lado
- **Task 60 (Profile Dashboard)**: Use `StatsGrid` com skeleton loading durante fetch

Essa arquitetura oferece componentes reutilizáveis, responsivos e acessíveis, alinhados com as necessidades de dados densos do seu projeto.
