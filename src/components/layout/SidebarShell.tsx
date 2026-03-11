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
            <div className="w-10 h-10 rounded-full border-2 border-primary/50 bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                {initial}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
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
    const [unreadCount, setUnreadCount] = useState(0);
    const [contextOpen, setContextOpen] = useState(false);
    const [notificationRefreshKey, setNotificationRefreshKey] = useState(0);
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

    // Load unread notifications
    useEffect(() => {
        if (!user?.id) return;

        let isMounted = true;
        supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)
            .then(({ count }) => {
                if (isMounted) setUnreadCount(count ?? 0);
            });

        return () => {
            isMounted = false;
        };
    }, [notificationRefreshKey, supabase, user?.id]);

    useEffect(() => {
        const handler = () => {
            setNotificationRefreshKey((current) => current + 1);
        };

        window.addEventListener('pit:notifications-refresh', handler);
        return () => window.removeEventListener('pit:notifications-refresh', handler);
    }, []);

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
    const displayedUnreadCount = user?.id ? unreadCount : 0;

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
        <aside className="glass-sidebar w-72 flex flex-col h-full shrink-0 z-50">
            {/* Brand */}
            <div className="p-6 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg p-1.5 bg-primary flex items-center justify-center">
                        <MSIcon name="insights" className="text-white text-2xl" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tighter text-slate-100">P.I.T</h1>
                </div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                    Performance · Intelligence · Tracking
                </p>
            </div>

            {/* User profile card */}
            <div className="mx-4 mb-6 p-3 rounded-xl border border-slate-700/50 bg-slate-800/40 flex items-center gap-3">
                <UserAvatar name={displayName} />
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-100 leading-tight truncate">
                        {displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">{roleLabel}</span>
                </div>
            </div>

            {/* Context switcher */}
            <div className="px-4 mb-6" ref={dropdownRef}>
                <label className="text-[10px] uppercase font-bold text-slate-500 px-2 mb-2 block tracking-wider">
                    Contexto Atual
                </label>
                <div className="relative">
                    <button
                        disabled={disabled}
                        onClick={() => setContextOpen((o) => !o)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-800/60 transition-colors disabled:opacity-50"
                    >
                        <div className="flex items-center gap-2">
                            <MSIcon name={contextIcon} className="text-primary text-xl" />
                            <span className="text-sm font-semibold text-slate-100">{contextLabel}</span>
                        </div>
                        <MSIcon name="unfold_more" className="text-slate-500 text-xl" />
                    </button>

                    {contextOpen && contextOptions.length > 1 && (
                        <div className="absolute top-full left-0 w-full mt-1 rounded-lg border border-slate-700 bg-[hsl(210_36%_6%)] shadow-xl overflow-hidden z-10">
                            {contextOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleContextSelect(opt.value)}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors text-left ${
                                        activeContextValue === opt.value
                                            ? 'text-primary bg-primary/15'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                                    }`}
                                >
                                    <MSIcon name={opt.icon} className="text-lg text-slate-400" />
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
                        <h3 className="px-4 text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
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
                                        className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all group ${
                                            isActive
                                                ? 'nav-item-active rounded-r-lg'
                                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
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
                                            <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
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
            <div className="p-4 border-t border-slate-800/50 flex flex-col gap-2">
                <button className="flex items-center justify-between w-full px-4 py-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg transition-all group">
                    <div className="flex items-center gap-3">
                        <MSIcon name="notifications" className="text-[22px] group-hover:text-primary" />
                        <span className="text-sm font-medium">Notificações</span>
                    </div>
                        {displayedUnreadCount > 0 && (
                            <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                {displayedUnreadCount}
                            </span>
                        )}
                </button>

                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all"
                >
                    <MSIcon name="logout" className="text-[22px]" />
                    <span className="text-sm font-bold">Sair do Sistema</span>
                </button>
            </div>
        </aside>
    );
}
