'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShieldCheck, User, Users } from 'lucide-react';
import { useContext } from '@/hooks/useContext';
import { useRole } from '@/hooks/useRole';

type SidebarLink = {
    href: string;
    label: string;
};

function getTitleByContext(context: 'profile' | 'team_id' | 'moderation' | 'admin') {
    if (context === 'team_id') return 'Menu do Time';
    if (context === 'moderation') return 'Menu de Moderação';
    if (context === 'admin') return 'Menu Admin';
    return 'Menu Perfil';
}

export function Sidebar() {
    const pathname = usePathname();
    const { context } = useContext();
    const { availableContexts } = useRole();
    const normalizedContext = useMemo(() => {
        if (context === 'team_id' && availableContexts.includes('team')) return 'team_id';
        if (context === 'moderation' && availableContexts.includes('moderation')) return 'moderation';
        if (context === 'admin' && availableContexts.includes('admin')) return 'admin';
        return 'profile';
    }, [availableContexts, context]);

    const links = useMemo<SidebarLink[]>(() => {
        if (normalizedContext === 'team_id') {
            return [
                { href: '/team', label: 'Visão Geral' },
                { href: '/team/roster', label: 'Elenco' },
                { href: '/team/lineup', label: 'Escalação' },
                { href: '/team/matches', label: 'Partidas' },
                { href: '/team/matchmaking', label: 'Matchmaking' },
                { href: '/team/claim', label: 'Reivindicar Time' },
            ];
        }

        if (normalizedContext === 'moderation') {
            return [
                { href: '/moderation', label: 'Visão Geral' },
                { href: '/moderation/claims', label: 'Claims' },
                { href: '/moderation/tournaments', label: 'Torneios' },
                { href: '/moderation/disputes', label: 'Disputas' },
                { href: '/moderation/users', label: 'Usuários' },
            ];
        }

        if (normalizedContext === 'admin') {
            return [{ href: '/admin', label: 'Painel Admin' }];
        }

        return [
            { href: '/profile', label: 'Meu Perfil' },
            { href: '/profile/matches', label: 'Minhas Partidas' },
            { href: '/profile/settings', label: 'Configurações' },
            { href: '/matchmaking', label: 'Matchmaking' },
            { href: '/tournaments', label: 'Torneios' },
            { href: '/team/claim', label: 'Reivindicar Time' },
        ];
    }, [normalizedContext]);

    const Icon = normalizedContext === 'admin'
        ? ShieldCheck
        : normalizedContext === 'moderation'
            ? Users
            : normalizedContext === 'team_id'
                ? LayoutDashboard
                : User;

    return (
        <nav className="space-y-3 border-t border-border pt-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {getTitleByContext(normalizedContext)}
            </p>
            <div className="space-y-1">
                {links.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`block rounded-md px-2.5 py-2 text-sm transition ${
                                isActive
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                        >
                            {link.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
