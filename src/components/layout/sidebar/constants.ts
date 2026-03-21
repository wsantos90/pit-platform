import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    Award,
    BarChart3,
    ChevronsUpDown,
    Gamepad2,
    Gavel,
    LayoutDashboard,
    Link,
    LogOut,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Swords,
    Trophy,
    User,
    UserPlus,
    Users,
    Waypoints,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
    insights: BarChart3,
    person: User,
    groups: Users,
    verified_user: ShieldCheck,
    shield_person: ShieldAlert,
    unfold_more: ChevronsUpDown,
    dashboard: LayoutDashboard,
    group: Users,
    strategy: Waypoints,
    sports_esports: Gamepad2,
    trophy: Trophy,
    add_link: Link,
    report_problem: AlertTriangle,
    gavel: Gavel,
    emoji_events: Award,
    settings: Settings,
    swords: Swords,
    group_add: UserPlus,
    logout: LogOut,
};

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    badge?: number;
}

export interface NavSection {
    label: string;
    items: NavItem[];
}

export function getNavSections(
    context: string,
    isAdmin: boolean,
): NavSection[] {
    if (context === 'team_id') {
        return [
            {
                label: 'Gestão do Clube',
                items: [
                    { href: '/team', icon: LayoutDashboard, label: 'Visão Geral' },
                    { href: '/team/roster', icon: Users, label: 'Elenco' },
                    { href: '/team/lineup', icon: Waypoints, label: 'Escalação' },
                    { href: '/team/matches', icon: Gamepad2, label: 'Partidas' },
                ],
            },
            {
                label: 'Competições',
                items: [
                    { href: '/team/matchmaking', icon: Trophy, label: 'Matchmaking' },
                    { href: '/team/claim', icon: Link, label: 'Vincular Equipe' },
                ],
            },
        ];
    }

    if (context === 'moderation') {
        const sections: NavSection[] = [
            {
                label: 'Menu Staff',
                items: [
                    { href: '/moderation', icon: LayoutDashboard, label: 'Visão Geral' },
                    { href: '/moderation/claims', icon: AlertTriangle, label: 'Claims' },
                    { href: '/moderation/disputes', icon: Gavel, label: 'Disputas' },
                    { href: '/moderation/tournaments', icon: Award, label: 'Torneios' },
                    { href: '/moderation/users', icon: Users, label: 'Usuários' },
                ],
            },
        ];

        if (isAdmin) {
            sections.push({
                label: 'Sistema',
                items: [
                    { href: '/admin', icon: ShieldAlert, label: 'Admin Control' },
                    { href: '/profile/settings', icon: Settings, label: 'Configurações' },
                ],
            });
        }

        return sections;
    }

    if (context === 'admin') {
        return [
            {
                label: 'Administração',
                items: [
                    { href: '/admin', icon: LayoutDashboard, label: 'Painel Admin' },
                ],
            },
        ];
    }

    return [
        {
            label: 'Perfil do Jogador',
            items: [
                { href: '/profile', icon: User, label: 'Meu Perfil' },
                { href: '/profile/matches', icon: Gamepad2, label: 'Minhas Partidas' },
                { href: '/profile/settings', icon: Settings, label: 'Configurações' },
            ],
        },
        {
            label: 'Competições',
            items: [
                { href: '/matchmaking', icon: Swords, label: 'Matchmaking' },
                { href: '/tournaments', icon: Award, label: 'Torneios' },
                { href: '/team/claim', icon: UserPlus, label: 'Reivindicar Time' },
            ],
        },
    ];
}

export function getContextIcon(context: string): LucideIcon {
    if (context === 'moderation') return ShieldCheck;
    if (context === 'admin') return ShieldAlert;
    if (context === 'team_id') return Users;
    return User;
}

export function getRoleLabel(roles: string[]): string {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('moderator')) return 'Moderador';
    if (roles.includes('manager')) return 'Manager';
    return 'Jogador';
}

export const BREADCRUMB_LABELS: Record<string, string> = {
    profile: 'Perfil',
    dashboard: 'Dashboard',
    team: 'Time',
    roster: 'Elenco',
    players: 'Jogadores',
    lineup: 'Escalação',
    matches: 'Partidas',
    matchmaking: 'Matchmaking',
    settings: 'Configurações',
    moderation: 'Moderação',
    claims: 'Claims',
    disputes: 'Disputas',
    tournaments: 'Torneios',
    admin: 'Admin',
    users: 'Usuários',
    claim: 'Reivindicar',
    payment: 'Pagamento',
    failure: 'Falha',
    pending: 'Pendente',
    success: 'Sucesso',
    unauthorized: 'Não Autorizado',
    notifications: 'Notificações',
    'hall-of-fame': 'Hall of Fame',
    rankings: 'Rankings',
    'design-system': 'Design System',
};
