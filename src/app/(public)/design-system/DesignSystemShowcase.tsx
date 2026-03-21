'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    ShieldAlert,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ColorToken = {
    name: string;
    cssVar: string;
    value: string;
    description: string;
};

type TypographyToken = {
    className: string;
    name: string;
    sample: string;
    spec: string;
};

type SpacingToken = {
    className: string;
    label: string;
    size: string;
};

type TableRow = {
    player: string;
    role: string;
    status: 'approved' | 'pending' | 'rejected';
    score: number;
};

const COLOR_SECTIONS: Array<{ title: string; tokens: ColorToken[] }> = [
    {
        title: 'Backgrounds',
        tokens: [
            { name: 'background', cssVar: '--background', value: '200 12% 97%', description: 'Base app canvas' },
            { name: 'card', cssVar: '--card', value: '0 0% 100%', description: 'Surface cards' },
            { name: 'surface-raised', cssVar: '--surface-raised', value: '210 20% 95%', description: 'Raised surfaces' },
            { name: 'surface-overlay', cssVar: '--surface-overlay', value: '210 20% 92%', description: 'Menus and overlays' },
        ],
    },
    {
        title: 'Text',
        tokens: [
            { name: 'foreground', cssVar: '--foreground', value: '210 36% 10%', description: 'Primary text' },
            { name: 'foreground-secondary', cssVar: '--foreground-secondary', value: '215 16% 40%', description: 'Supporting copy' },
            { name: 'foreground-tertiary', cssVar: '--foreground-tertiary', value: '215 12% 55%', description: 'Captions and hints' },
        ],
    },
    {
        title: 'Interactive',
        tokens: [
            { name: 'primary', cssVar: '--primary', value: '210 90% 50%', description: 'Core actions' },
            { name: 'accent-brand', cssVar: '--accent-brand', value: '25 95% 53%', description: 'Highlight accents' },
        ],
    },
    {
        title: 'Semantic',
        tokens: [
            { name: 'success', cssVar: '--success', value: '142 76% 36%', description: 'Positive state' },
            { name: 'warning', cssVar: '--warning', value: '45 93% 47%', description: 'Attention state' },
            { name: 'error', cssVar: '--error', value: '0 84% 47%', description: 'Critical state' },
            { name: 'info', cssVar: '--info', value: '210 90% 42%', description: 'Informational state' },
        ],
    },
    {
        title: 'Position',
        tokens: [
            { name: 'position-gk', cssVar: '--position-gk', value: '263 70% 50%', description: 'Goalkeeper' },
            { name: 'position-def', cssVar: '--position-def', value: '210 90% 50%', description: 'Defense' },
            { name: 'position-mid', cssVar: '--position-mid', value: '142 71% 45%', description: 'Midfield' },
            { name: 'position-fwd', cssVar: '--position-fwd', value: '25 95% 53%', description: 'Forward' },
        ],
    },
    {
        title: 'Result',
        tokens: [
            { name: 'result-win', cssVar: '--result-win', value: '142 71% 45%', description: 'Winning state' },
            { name: 'result-draw', cssVar: '--result-draw', value: '48 96% 53%', description: 'Draw state' },
            { name: 'result-loss', cssVar: '--result-loss', value: '0 84% 60%', description: 'Loss state' },
        ],
    },
    {
        title: 'Chart',
        tokens: [
            { name: 'chart-1', cssVar: '--chart-1', value: '12 76% 61%', description: 'Series 1' },
            { name: 'chart-2', cssVar: '--chart-2', value: '173 58% 39%', description: 'Series 2' },
            { name: 'chart-3', cssVar: '--chart-3', value: '197 37% 24%', description: 'Series 3' },
            { name: 'chart-4', cssVar: '--chart-4', value: '43 74% 66%', description: 'Series 4' },
            { name: 'chart-5', cssVar: '--chart-5', value: '27 87% 67%', description: 'Series 5' },
        ],
    },
];

const TYPOGRAPHY_TOKENS: TypographyToken[] = [
    { className: 'text-display', name: 'text-display', sample: 'Performance Intelligence Tracking', spec: '36px / 700 / -0.02em' },
    { className: 'text-page-title', name: 'text-page-title', sample: 'Dashboard de Controle', spec: '30px / 700 / -0.02em' },
    { className: 'text-section-title', name: 'text-section-title', sample: 'Indicadores em tempo real', spec: '20px / 600 / -0.01em' },
    { className: 'text-card-title', name: 'text-card-title', sample: 'Resumo do elenco', spec: '16px / 600' },
    { className: 'text-body-lg', name: 'text-body-lg', sample: 'Texto principal para descrições de interface e contexto.', spec: '16px / 400 / 1.5' },
    { className: 'text-body-sm', name: 'text-body-sm', sample: 'Texto secundário para listas, helpers e metadata.', spec: '14px / 400 / 1.5' },
    { className: 'text-label uppercase tracking-wide', name: 'text-label', sample: 'TOKEN LABEL', spec: '12px / 500 / uppercase / tracking wide' },
    { className: 'text-caption', name: 'text-caption', sample: 'Legenda compacta para suporte visual.', spec: '11px / 500 / 1.3' },
];

const SPACING_TOKENS: SpacingToken[] = [
    { className: 'gap-1', label: 'gap-1', size: '4px' },
    { className: 'gap-2', label: 'gap-2', size: '8px' },
    { className: 'gap-3', label: 'gap-3', size: '12px' },
    { className: 'gap-4', label: 'gap-4', size: '16px' },
    { className: 'gap-6', label: 'gap-6', size: '24px' },
    { className: 'gap-8', label: 'gap-8', size: '32px' },
];

const TABLE_DATA: TableRow[] = [
    { player: 'Rafael Silva', role: 'Capitão', status: 'approved', score: 92 },
    { player: 'Marcos Lima', role: 'Meia', status: 'pending', score: 86 },
    { player: 'Thiago Costa', role: 'Zagueiro', status: 'rejected', score: 78 },
    { player: 'Caio Torres', role: 'Atacante', status: 'approved', score: 89 },
];

function SectionShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[28px] border border-border/15 bg-card/80 p-6 shadow-[0_24px_80px_hsl(var(--foreground)/0.06)] backdrop-blur-sm md:p-8">
            <PageHeader
                title={title}
                subtitle={subtitle}
                className="border-b border-border/15 pb-6 [&_h1]:text-section-title [&_p]:max-w-3xl"
            />
            <div className="pt-6">{children}</div>
        </section>
    );
}

function ColorSwatch({ token }: { token: ColorToken }) {
    const style = {
        backgroundColor: `hsl(var(${token.cssVar}))`,
    } as CSSProperties;

    return (
        <article className="rounded-2xl border border-border/15 bg-background p-4">
            <div
                className="mb-4 h-16 rounded-xl border border-border/15 shadow-inner"
                style={style}
            />
            <div className="space-y-1">
                <p className="text-card-title text-foreground">{token.name}</p>
                <p className="text-body-sm text-foreground-secondary">{token.description}</p>
                <code className="block text-caption text-foreground-tertiary">{token.value}</code>
            </div>
        </article>
    );
}

function IconGalleryCard({
    name,
    Icon,
}: {
    name: string;
    Icon: (typeof ICON_MAP)[keyof typeof ICON_MAP];
}) {
    return (
        <article className="rounded-2xl border border-border/15 bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
                <p className="text-card-title text-foreground">{name}</p>
                <span className="rounded-full bg-surface-raised px-2 py-1 text-caption text-foreground-secondary">
                    Lucide
                </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {[16, 20, 24, 32].map((size) => (
                    <div
                        key={size}
                        className="flex flex-col items-center gap-2 rounded-xl border border-border/15 bg-card p-3"
                    >
                        <Icon aria-hidden="true" size={size} className="text-foreground" />
                        <span className="text-caption text-foreground-tertiary">{size}px</span>
                    </div>
                ))}
            </div>
        </article>
    );
}

export function DesignSystemShowcase() {
    const columns = useMemo<ColumnDef<TableRow>[]>(
        () => [
            {
                accessorKey: 'player',
                header: 'Jogador',
            },
            {
                accessorKey: 'role',
                header: 'Função',
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            {
                accessorKey: 'score',
                header: 'Score',
                cell: ({ row }) => (
                    <span className="font-data text-body-sm font-semibold text-foreground">
                        {row.original.score}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <div className="relative overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_40%),radial-gradient(circle_at_top_right,hsl(var(--accent-brand)/0.16),transparent_45%)]" />

            <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
                <section className="overflow-hidden rounded-[32px] border border-border/15 bg-card/90 p-6 shadow-[0_32px_100px_hsl(var(--foreground)/0.08)] md:p-10">
                    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
                        <PageHeader
                            title="Design System"
                            subtitle="Um living style guide para os tokens, estados e componentes compartilhados do novo layout shell."
                            actions={
                                <Button
                                    asChild
                                    className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary-hover"
                                >
                                    <a href="/rankings">Ver aplicação ao vivo</a>
                                </Button>
                            }
                        />

                        <div className="grid gap-3 rounded-[28px] border border-border/15 bg-background p-5">
                            <div className="flex items-center justify-between">
                                <span className="text-label text-foreground-secondary">Tom visual</span>
                                <span className="rounded-full bg-accent-brand/12 px-3 py-1 text-caption text-accent-brand">
                                    Sports editorial
                                </span>
                            </div>
                            <p className="text-body-lg text-foreground">
                                Contraste limpo, acentos quentes e superfícies sólidas para dados,
                                navegação e estados críticos.
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-2xl border border-border/15 bg-primary p-4 text-primary-foreground">
                                    <p className="text-caption uppercase tracking-[0.2em]">Primary</p>
                                    <p className="mt-3 text-card-title">Ação</p>
                                </div>
                                <div className="rounded-2xl border border-border/15 bg-accent-brand p-4 text-accent-brand-foreground">
                                    <p className="text-caption uppercase tracking-[0.2em]">Accent</p>
                                    <p className="mt-3 text-card-title">Destaque</p>
                                </div>
                                <div className="rounded-2xl border border-border/15 bg-surface-raised p-4">
                                    <p className="text-caption uppercase tracking-[0.2em] text-foreground-secondary">Surface</p>
                                    <p className="mt-3 text-card-title text-foreground">Estrutura</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <SectionShell
                    title="Cores"
                    subtitle="Todos os tokens cromáticos principais, agrupados por função na interface."
                >
                    <div className="space-y-8">
                        {COLOR_SECTIONS.map((section) => (
                            <div key={section.title} className="space-y-4">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-section-title text-foreground">{section.title}</h3>
                                    <span className="text-caption text-foreground-tertiary">
                                        {section.tokens.length} tokens
                                    </span>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    {section.tokens.map((token) => (
                                        <ColorSwatch key={token.name} token={token} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </SectionShell>

                <SectionShell
                    title="Tipografia"
                    subtitle="Escala tipográfica completa para hierarquia, leitura e dados."
                >
                    <div className="grid gap-4">
                        {TYPOGRAPHY_TOKENS.map((token) => (
                            <article
                                key={token.name}
                                className="grid gap-3 rounded-2xl border border-border/15 bg-background p-5 md:grid-cols-[1fr_auto]"
                            >
                                <div>
                                    <p className={cn(token.className, 'text-foreground')}>{token.sample}</p>
                                    <p className="mt-2 text-body-sm text-foreground-secondary">{token.name}</p>
                                </div>
                                <code className="self-start rounded-full bg-surface-raised px-3 py-1 text-caption text-foreground-secondary">
                                    {token.spec}
                                </code>
                            </article>
                        ))}
                    </div>
                </SectionShell>

                <SectionShell
                    title="Espaçamento"
                    subtitle="Ritmo visual baseado em grid de 4px e tokens estruturais do shell."
                >
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-4">
                            {SPACING_TOKENS.map((token) => (
                                <article
                                    key={token.label}
                                    className="rounded-2xl border border-border/15 bg-background p-4"
                                >
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-card-title text-foreground">{token.label}</p>
                                        <code className="text-caption text-foreground-tertiary">{token.size}</code>
                                    </div>
                                    <div className={cn('flex flex-wrap', token.className)}>
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div
                                                key={index}
                                                className="size-10 rounded-xl bg-primary/15"
                                            />
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="grid gap-4">
                            <article className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="text-card-title text-foreground">h-navbar</p>
                                <div className="mt-4 flex h-navbar items-center rounded-xl bg-surface-raised px-4">
                                    <span className="text-body-sm text-foreground-secondary">56px</span>
                                </div>
                            </article>
                            <article className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="text-card-title text-foreground">w-sidebar</p>
                                <div className="mt-4 w-sidebar max-w-full rounded-xl bg-surface-raised px-4 py-5">
                                    <span className="text-body-sm text-foreground-secondary">288px</span>
                                </div>
                            </article>
                            <article className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="text-card-title text-foreground">p-content</p>
                                <div className="mt-4 rounded-xl bg-surface-raised p-content">
                                    <span className="text-body-sm text-foreground-secondary">24px</span>
                                </div>
                            </article>
                        </div>
                    </div>
                </SectionShell>

                <SectionShell
                    title="Raio de borda"
                    subtitle="Três níveis de arredondamento para cards, chips e superfícies."
                >
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { label: 'rounded-lg', size: '12px', className: 'rounded-lg' },
                            { label: 'rounded-md', size: '10px', className: 'rounded-md' },
                            { label: 'rounded-sm', size: '8px', className: 'rounded-sm' },
                        ].map((radius) => (
                            <article
                                key={radius.label}
                                className="rounded-2xl border border-border/15 bg-background p-5"
                            >
                                <div
                                    className={cn(
                                        'h-28 border border-dashed border-border bg-surface-raised',
                                        radius.className,
                                    )}
                                />
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-card-title text-foreground">{radius.label}</p>
                                    <code className="text-caption text-foreground-tertiary">{radius.size}</code>
                                </div>
                            </article>
                        ))}
                    </div>
                </SectionShell>

                <SectionShell
                    title="Sombras"
                    subtitle="Elevação forte para overlays e separação sutil para o estado de scroll."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <article className="rounded-2xl border border-border/15 bg-background p-5">
                            <div className="rounded-2xl bg-card p-8 shadow-float">
                                <p className="text-card-title text-foreground">shadow-float</p>
                                <p className="mt-2 text-body-sm text-foreground-secondary">
                                    Ideal para menus, sheets e superfícies destacadas.
                                </p>
                            </div>
                        </article>
                        <article className="rounded-2xl border border-border/15 bg-background p-5">
                            <div className="rounded-2xl bg-card p-8 shadow-scroll">
                                <p className="text-card-title text-foreground">shadow-scroll</p>
                                <p className="mt-2 text-body-sm text-foreground-secondary">
                                    Marca a separação entre topo fixo e conteúdo rolável.
                                </p>
                            </div>
                        </article>
                    </div>
                </SectionShell>

                <SectionShell
                    title="Ícones"
                    subtitle="Todos os aliases do ICON_MAP com escala visual entre 16px e 32px."
                >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Object.entries(ICON_MAP).map(([name, Icon]) => (
                            <IconGalleryCard key={name} name={name} Icon={Icon} />
                        ))}
                    </div>
                </SectionShell>

                <SectionShell
                    title="Componentes Shared"
                    subtitle="Exemplos reais dos blocos compartilhados usados nas páginas internas."
                >
                    <div className="grid gap-6">
                        <div className="rounded-2xl border border-border/15 bg-background p-5">
                            <PageHeader
                                title="PageHeader"
                                subtitle="Título de página com área para ações rápidas."
                                actions={
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" type="button">
                                            Criar relatório
                                        </Button>
                                        <Button size="sm" type="button" variant="outline">
                                            Exportar
                                        </Button>
                                    </div>
                                }
                            />
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <StatCard
                                icon={<BarChart3 />}
                                label="Vitórias nas últimas 10"
                                value="7"
                                trend={{ direction: 'up', value: '+12%' }}
                                sparklineData={[32, 40, 38, 52, 49, 63, 71]}
                            />
                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <EmptyState
                                        icon={<ArrowUpRight />}
                                        title="EmptyState"
                                        description="Use quando ainda não há dados para a área atual."
                                        action={{ label: 'Criar item', href: '/register' }}
                                        className="rounded-2xl border border-dashed border-border/15 bg-card px-4"
                                    />
                                    <ErrorState
                                        title="ErrorState"
                                        description="Erro de sincronização com o serviço de partidas."
                                        onRetry={() => undefined}
                                        className="rounded-2xl border border-dashed border-border/15 bg-card px-4"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <NoPermissionState
                                    title="NoPermissionState"
                                    description="Exemplo para áreas com acesso limitado por papel."
                                    className="rounded-2xl border border-dashed border-border/15 bg-card px-4"
                                />
                            </div>

                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="mb-4 text-card-title text-foreground">LoadingSkeleton</p>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <LoadingSkeleton variant="card" className="rounded-2xl border border-border/15 bg-card" />
                                    <div className="space-y-4 rounded-2xl border border-border/15 bg-card p-4">
                                        <LoadingSkeleton variant="avatar" />
                                        <LoadingSkeleton variant="textBlock" rows={4} />
                                    </div>
                                    <LoadingSkeleton variant="statCard" />
                                    <div className="rounded-2xl border border-border/15 bg-card p-4">
                                        <LoadingSkeleton variant="tableRow" rows={3} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="mb-4 text-card-title text-foreground">StatusBadge</p>
                                <div className="flex flex-wrap gap-3">
                                    <StatusBadge status="approved" />
                                    <StatusBadge status="pending" />
                                    <StatusBadge status="rejected" />
                                    <StatusBadge status="in_review" />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="mb-4 text-card-title text-foreground">ScoreDisplay</p>
                                <div className="flex flex-wrap items-center gap-6">
                                    <ScoreDisplay homeScore={3} awayScore={1} result="win" />
                                    <ScoreDisplay homeScore={2} awayScore={2} result="draw" />
                                    <ScoreDisplay homeScore={0} awayScore={1} result="loss" size="sm" />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[0.6fr_1.4fr]">
                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <p className="mb-4 text-card-title text-foreground">PlayerAvatar</p>
                                <div className="flex items-end gap-4">
                                    <PlayerAvatar name="Lucas" size="sm" />
                                    <PlayerAvatar name="Marina" size="md" />
                                    <PlayerAvatar name="Eduardo" size="lg" />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border/15 bg-background p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-card-title text-foreground">DataTable</p>
                                        <p className="text-body-sm text-foreground-secondary">
                                            Mock de elenco com busca e status.
                                        </p>
                                    </div>
                                    <ShieldAlert aria-hidden="true" className="size-5 text-foreground-tertiary" />
                                </div>
                                <DataTable
                                    caption="Tabela de demonstração do design system"
                                    columns={columns}
                                    data={TABLE_DATA}
                                    emptyMessage="Nenhum atleta encontrado."
                                    pageSize={4}
                                    searchable
                                    searchPlaceholder="Buscar jogador"
                                />
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border/15 bg-background p-5">
                            <div className="flex items-center gap-3">
                                <AlertTriangle aria-hidden="true" className="size-5 text-accent-brand" />
                                <p className="text-body-sm text-foreground-secondary">
                                    Os exemplos acima usam os próprios componentes do projeto para
                                    facilitar regressão visual e alinhamento entre produto, design e implementação.
                                </p>
                            </div>
                        </div>
                    </div>
                </SectionShell>
            </div>
        </div>
    );
}
