'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useContext } from '@/hooks/useContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavItem = {
    href: string;
    label: string;
    icon: string;
    badge?: number;
};

type NavSection = {
    label: string;
    items: NavItem[];
};

interface ManagedClub {
    id: string;
    display_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRoleLabel(roles: string[]): string {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('moderator')) return 'Moderador';
    if (roles.includes('manager')) return 'Manager';
    return 'Jogador';
}

function getContextLabel(
    context: string,
    teamId: string | null,
    teams: ManagedClub[],
): string {
    if (context === 'moderation') return 'Moderação';
    if (context === 'admin') return 'Admin';
    if (context === 'team_id' && teamId) {
        const team = teams.find((t) => t.id === teamId);
        return team?.display_name ?? 'Meu Time';
    }
    return 'Meu Perfil';
}

function getContextIcon(context: string): string {
    if (context === 'moderation') return 'verified_user';
    if (context === 'admin') return 'shield_person';
    if (context === 'team_id') return 'groups';
    return 'person';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MSIcon({ name, className }: { name: string; className?: string }) {
    return (
        <span
            className={`material-symbols-outlined select-none ${className ?? ''}`}
            aria-hidden="true"
        >
            {name}
        </span>
    );
}

function UserAvatar({ name }: { name: string }) {
    const initial = (name ?? '?').charAt(0).toUpperCase();
    return (
        <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-sm font-bold text-primary">
                {initial}
            </div>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-success" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SidebarShell() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const { user, signOut } = useAuth();
    const { roles, availableContexts, loading: rolesLoading } = useRole();
    const { context, teamId, setContext, hydrated } = useContext();

    const [teams, setTeams] = useState<ManagedClub[]>([]);
    const [contextOpen, setContextOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const hasTeamContext = availableContexts.includes('team');
    const hasModerationContext = availableContexts.includes('moderation');
    const hasAdminContext = availableContexts.includes('admin');
    const isAdmin = roles.includes('admin');

    // Load managed clubs
    useEffect(() => {
        if (!hasTeamContext || !user?.id) return;
        let isMounted = true;
        supabase
            .from('clubs')
            .select('id, display_name')
            .eq('manager_id', user.id)
            .order('display_name', { ascending: true })
            .then(({ data }) => {
                if (isMounted) setTeams((data ?? []) as ManagedClub[]);
            });
        return () => { isMounted = false; };
    }, [hasTeamContext, supabase, user?.id]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setContextOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Normalize context
    const normalizedContext = useMemo(() => {
        if (context === 'team_id' && availableContexts.includes('team')) return 'team_id';
        if (context === 'moderation' && hasModerationContext) return 'moderation';
        if (context === 'admin' && hasAdminContext) return 'admin';
        return 'profile';
    }, [context, availableContexts, hasModerationContext, hasAdminContext]);

    // Navigation sections per context
    const navSections = useMemo<NavSection[]>(() => {
        if (normalizedContext === 'team_id') {
            return [
                {
                    label: 'Gestão do Clube',
                    items: [
                        { href: '/team', icon: 'dashboard', label: 'Visão Geral' },
                        { href: '/team/roster', icon: 'group', label: 'Elenco' },
                        { href: '/team/lineup', icon: 'strategy', label: 'Escalação' },
                        { href: '/team/matches', icon: 'sports_esports', label: 'Partidas' },
                    ],
                },
                {
                    label: 'Competições',
                    items: [
                        { href: '/team/matchmaking', icon: 'trophy', label: 'Matchmaking' },
                        { href: '/team/claim', icon: 'add_link', label: 'Vincular Equipe' },
                    ],
                },
            ];
        }

        if (normalizedContext === 'moderation') {
            const staffItems: NavItem[] = [
                { href: '/moderation', icon: 'dashboard', label: 'Visão Geral' },
                { href: '/moderation/claims', icon: 'report_problem', label: 'Claims' },
                { href: '/moderation/disputes', icon: 'gavel', label: 'Disputas' },
                { href: '/moderation/tournaments', icon: 'emoji_events', label: 'Torneios' },
                { href: '/moderation/users', icon: 'group', label: 'Usuários' },
            ];
            const sections: NavSection[] = [{ label: 'Menu Staff', items: staffItems }];
            if (isAdmin) {
                sections.push({
                    label: 'Sistema',
                    items: [
                        { href: '/admin', icon: 'shield_person', label: 'Admin Control' },
                        { href: '/profile/settings', icon: 'settings', label: 'Configurações' },
                    ],
                });
            }
            return sections;
        }

        if (normalizedContext === 'admin') {
            return [
                {
                    label: 'Administração',
                    items: [{ href: '/admin', icon: 'dashboard', label: 'Painel Admin' }],
                },
            ];
        }

        // profile (default)
        return [
            {
                label: 'Perfil do Jogador',
                items: [
                    { href: '/profile', icon: 'person', label: 'Meu Perfil' },
                    { href: '/profile/matches', icon: 'sports_esports', label: 'Minhas Partidas' },
                    { href: '/profile/settings', icon: 'settings', label: 'Configurações' },
                ],
            },
            {
                label: 'Competições',
                items: [
                    { href: '/matchmaking', icon: 'swords', label: 'Matchmaking' },
                    { href: '/tournaments', icon: 'emoji_events', label: 'Torneios' },
                    { href: '/team/claim', icon: 'group_add', label: 'Reivindicar Time' },
                ],
            },
        ];
    }, [normalizedContext, isAdmin]);

    const activeContextValue = useMemo(() => {
        if (normalizedContext === 'team_id' && teamId) return `team:${teamId}`;
        if (normalizedContext === 'moderation') return 'moderation';
        if (normalizedContext === 'admin') return 'admin';
        return 'profile';
    }, [normalizedContext, teamId]);

    const visibleTeams = useMemo(
        () => (hasTeamContext && user?.id ? teams : []),
        [hasTeamContext, teams, user?.id]
    );

    // Available context options for the dropdown
    const contextOptions = useMemo(() => {
        const options: Array<{ value: string; label: string; icon: string }> = [
            { value: 'profile', label: 'Meu Perfil', icon: 'person' },
        ];
        for (const team of visibleTeams) {
            options.push({ value: `team:${team.id}`, label: team.display_name, icon: 'groups' });
        }
        if (hasModerationContext) {
            options.push({ value: 'moderation', label: 'Moderação', icon: 'verified_user' });
        }
        if (hasAdminContext) {
            options.push({ value: 'admin', label: 'Admin', icon: 'shield_person' });
        }
        return options;
    }, [visibleTeams, hasModerationContext, hasAdminContext]);

    function handleContextSelect(value: string) {
        setContextOpen(false);
        if (value === 'profile') {
            setContext('profile');
            router.push('/profile');
        } else if (value.startsWith('team:')) {
            const nextTeamId = value.replace('team:', '');
            setContext('team_id', nextTeamId || null);
            router.push('/team');
        } else if (value === 'moderation') {
            setContext('moderation');
            router.push('/moderation');
        } else if (value === 'admin') {
            setContext('admin');
            router.push('/admin');
        }
    }

    const displayName = user?.display_name ?? user?.email ?? '?';
    const roleLabel = getRoleLabel(roles);
    const contextLabel = getContextLabel(normalizedContext, teamId, visibleTeams);
    const contextIcon = getContextIcon(normalizedContext);
    const disabled = rolesLoading || !hydrated;

    return (
        <aside className="glass-sidebar z-sidebar flex h-full w-sidebar shrink-0 flex-col">
            {/* Brand */}
            <div className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg p-1.5 bg-primary flex items-center justify-center">
                        <MSIcon name="insights" className="text-2xl text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">P.I.T</h1>
                </div>
                <p className="text-caption uppercase tracking-[0.2em] text-foreground-tertiary">
                    Performance · Intelligence · Tracking
                </p>
            </div>

            {/* User profile card */}
            <div className="mx-4 mb-6 flex items-center gap-3 rounded-xl border border-border/15 bg-surface-raised/40 p-3">
                <UserAvatar name={displayName} />
                <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-bold leading-tight text-foreground">
                        {displayName}
                    </span>
                    <span className="text-caption font-medium text-foreground-secondary">{roleLabel}</span>
                </div>
            </div>

            {/* Context switcher */}
            <div className="px-4 mb-6" ref={dropdownRef}>
                <label className="mb-2 block px-2 text-label font-semibold uppercase text-foreground-tertiary">
                    Contexto Atual
                </label>
                <div className="relative">
                    <button
                        disabled={disabled}
                        onClick={() => setContextOpen((o) => !o)}
                        className="flex w-full items-center justify-between rounded-lg border border-border/15 bg-surface-raised px-3 py-2.5 transition-colors disabled:opacity-50"
                    >
                        <div className="flex items-center gap-2">
                            <MSIcon name={contextIcon} className="text-primary text-xl" />
                            <span className="text-body-sm font-semibold text-foreground">{contextLabel}</span>
                        </div>
                        <MSIcon name="unfold_more" className="text-xl text-foreground-tertiary" />
                    </button>

                    {contextOpen && contextOptions.length > 1 && (
                        <div className="absolute left-0 top-full z-dropdown mt-1 w-full overflow-hidden rounded-lg border border-border/15 bg-surface-overlay shadow-float">
                            {contextOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleContextSelect(opt.value)}
                                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                                        activeContextValue === opt.value
                                            ? 'bg-primary/15 text-primary'
                                            : 'text-foreground-secondary hover:bg-surface-raised/60 hover:text-foreground'
                                    }`}
                                >
                                    <MSIcon
                                        name={opt.icon}
                                        className={`text-lg ${
                                            activeContextValue === opt.value ? 'text-primary' : 'text-foreground-secondary'
                                        }`}
                                    />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 space-y-6 overflow-y-auto custom-scrollbar">
                {navSections.map((section) => (
                    <section key={section.label}>
                        <h3 className="mb-2 px-4 text-label font-semibold uppercase text-foreground-tertiary">
                            {section.label}
                        </h3>
                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== '/team' && pathname.startsWith(item.href + '/'));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`group flex items-center justify-between rounded-lg px-4 py-2.5 transition-all ${
                                            isActive
                                                ? 'nav-item-active rounded-r-lg'
                                                : 'text-foreground-secondary hover:bg-surface-raised/50 hover:text-foreground'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <MSIcon
                                                name={item.icon}
                                                className={`text-[22px] ${isActive ? '' : 'group-hover:text-primary'}`}
                                            />
                                            <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        {item.badge != null && item.badge > 0 && (
                                            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black text-primary-foreground">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </nav>

            {/* Footer */}
            <div className="flex flex-col gap-2 border-t border-border/15 p-4">
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 rounded-lg px-4 py-2 text-error transition-all hover:bg-error-bg hover:text-error"
                >
                    <MSIcon name="logout" className="text-[22px]" />
                    <span className="text-sm font-bold">Sair do Sistema</span>
                </button>
            </div>
        </aside>
    );
}

