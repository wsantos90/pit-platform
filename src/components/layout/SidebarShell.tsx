'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    BarChart3,
    ChevronsUpDown,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useContext } from '@/hooks/useContext';
import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    getContextIcon,
    getNavSections,
    getRoleLabel,
    type NavItem,
    type NavSection,
} from '@/components/layout/sidebar/constants';

interface ManagedClub {
    id: string;
    display_name: string;
}

const SidebarBrand = React.memo(function SidebarBrand({
    collapsed,
}: {
    collapsed: boolean;
}) {
    const { toggleCollapsed } = useSidebar();

    return (
        <div className="relative flex flex-col gap-1 p-6">
            <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                    <BarChart3 className="size-5 text-primary-foreground" />
                </div>
                {!collapsed && (
                    <>
                        <h1 className="text-2xl font-black tracking-tight text-foreground">
                            P.I.T
                        </h1>
                        <button
                            onClick={toggleCollapsed}
                            className="absolute right-3 top-6 flex size-8 items-center justify-center rounded-md text-foreground-tertiary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label="Recolher sidebar"
                        >
                            <PanelLeftClose className="size-4" />
                        </button>
                    </>
                )}
            </div>
            {!collapsed && (
                <p className="text-caption uppercase tracking-[0.2em] text-foreground-tertiary">
                    Performance · Intelligence · Tracking
                </p>
            )}
            {collapsed && (
                <button
                    onClick={toggleCollapsed}
                    className="mt-2 flex size-8 items-center justify-center self-center rounded-md text-foreground-tertiary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label="Expandir sidebar"
                >
                    <PanelLeftOpen className="size-4" />
                </button>
            )}
        </div>
    );
});

SidebarBrand.displayName = 'SidebarBrand';

const SidebarUserCard = React.memo(function SidebarUserCard({
    name,
    roleLabel,
    collapsed,
}: {
    name: string;
    roleLabel: string;
    collapsed: boolean;
}) {
    const initial = (name ?? '?').charAt(0).toUpperCase();

    const avatar = (
        <div className="relative shrink-0">
            <div
                className={cn(
                    'flex items-center justify-center rounded-full border border-primary/30 bg-primary/15 font-bold text-primary',
                    collapsed ? 'size-8 text-xs' : 'size-10 text-sm',
                )}
            >
                {initial}
            </div>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-success" />
        </div>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="mx-auto mb-4 flex justify-center">{avatar}</div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="bg-surface-overlay text-foreground">
                    <p className="font-semibold">{name}</p>
                    <p className="text-caption text-foreground-secondary">{roleLabel}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-border/15 bg-surface-raised/40 p-3">
            {avatar}
            <div className="flex min-w-0 flex-col">
                <span className="truncate text-body-sm font-bold leading-tight text-foreground">
                    {name}
                </span>
                <span className="text-caption font-medium text-foreground-secondary">
                    {roleLabel}
                </span>
            </div>
        </div>
    );
});

SidebarUserCard.displayName = 'SidebarUserCard';

function SidebarContextSwitcher({
    activeValue,
    contextLabel,
    contextIcon: ContextIcon,
    options,
    collapsed,
    disabled,
    onSelect,
}: {
    activeValue: string;
    contextLabel: string;
    contextIcon: React.ElementType;
    options: Array<{ value: string; label: string; icon: React.ElementType }>;
    collapsed: boolean;
    disabled: boolean;
    onSelect: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const listboxId = React.useId();
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const wasOpenRef = useRef(false);
    const isInteractive = options.length > 1;

    const closeMenu = () => setOpen(false);

    const handleSelectOption = (value: string) => {
        setOpen(false);
        onSelect(value);
    };

    useEffect(() => {
        if (!open) return;

        const handleMouseDown = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                closeMenu();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [open]);

    useEffect(() => {
        if (open && isInteractive) {
            const activeIndex = options.findIndex((option) => option.value === activeValue);
            setFocusedIndex(activeIndex >= 0 ? activeIndex : 0);
        } else if (!open && wasOpenRef.current) {
            setFocusedIndex(-1);
            triggerRef.current?.focus();
        }

        wasOpenRef.current = open;
    }, [activeValue, isInteractive, open, options]);

    useEffect(() => {
        if (!open || focusedIndex < 0) return;

        optionRefs.current[focusedIndex]?.focus();
    }, [focusedIndex, open]);

    useEffect(() => {
        if (!open || !isInteractive) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu();
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setFocusedIndex((current) =>
                    current >= options.length - 1 ? 0 : current + 1,
                );
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setFocusedIndex((current) =>
                    current <= 0 ? options.length - 1 : current - 1,
                );
                return;
            }

            if (event.key === 'Enter' && focusedIndex >= 0) {
                event.preventDefault();
                const option = options[focusedIndex];
                if (option) {
                    handleSelectOption(option.value);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [focusedIndex, isInteractive, open, options]);

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        className="mx-auto mb-4 flex size-10 items-center justify-center rounded-lg text-primary transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Contexto: ${contextLabel}`}
                    >
                        <ContextIcon className="size-5" />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="bg-surface-overlay text-foreground">
                    {contextLabel}
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div className="mb-4 px-4" ref={containerRef}>
            <label className="mb-2 block px-2 text-label font-semibold uppercase text-foreground-tertiary">
                Contexto Atual
            </label>
            <div className="relative">
                <button
                    ref={triggerRef}
                    disabled={disabled}
                    onClick={() => {
                        if (!isInteractive) return;
                        setOpen((current) => !current);
                    }}
                    aria-controls={isInteractive ? listboxId : undefined}
                    aria-expanded={isInteractive ? open : false}
                    aria-haspopup="listbox"
                    className="flex w-full items-center justify-between rounded-lg border border-border/15 bg-surface-raised px-3 py-2.5 transition-colors hover:bg-surface-raised/80 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <div className="flex items-center gap-2">
                        <ContextIcon className="size-5 text-primary" />
                        <span className="text-body-sm font-semibold text-foreground">
                            {contextLabel}
                        </span>
                    </div>
                    <ChevronsUpDown className="size-4 text-foreground-tertiary" />
                </button>

                {open && isInteractive && (
                    <div
                        id={listboxId}
                        role="listbox"
                        aria-label="Alternar contexto"
                        className="absolute left-0 top-full z-dropdown mt-1 w-full overflow-hidden rounded-lg border border-border/15 bg-surface-overlay shadow-float"
                    >
                        {options.map((option, index) => {
                            const OptionIcon = option.icon;
                            const isActive = activeValue === option.value;

                            return (
                                <button
                                    key={option.value}
                                    ref={(element) => {
                                        optionRefs.current[index] = element;
                                    }}
                                    onClick={() => handleSelectOption(option.value)}
                                    onFocus={() => setFocusedIndex(index)}
                                    role="option"
                                    aria-selected={isActive}
                                    tabIndex={focusedIndex === index ? 0 : -1}
                                    className={cn(
                                        'flex w-full items-center gap-2 px-3 py-2.5 text-left text-body-sm transition-colors',
                                        isActive
                                            ? 'bg-accent-brand/12 text-accent-brand'
                                            : 'text-foreground-secondary hover:bg-surface-raised/60 hover:text-foreground',
                                    )}
                                >
                                    <OptionIcon
                                        className={cn(
                                            'size-4',
                                            isActive ? 'text-accent-brand' : 'text-foreground-secondary',
                                        )}
                                    />
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function SidebarNav({
    sections,
    collapsed,
    onNavClick,
}: {
    sections: NavSection[];
    collapsed: boolean;
    onNavClick?: () => void;
}) {
    const pathname = usePathname();

    return (
        <nav
            className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-2"
            role="navigation"
            aria-label="Menu principal"
        >
            {sections.map((section) => (
                <section key={section.label}>
                    {!collapsed && (
                        <h3 className="mb-2 px-4 text-label font-semibold uppercase text-foreground-tertiary">
                            {section.label}
                        </h3>
                    )}
                    {collapsed && <h3 className="sr-only">{section.label}</h3>}
                    <div className="space-y-0.5">
                        {section.items.map((item) => (
                            <SidebarNavItem
                                key={item.href}
                                item={item}
                                collapsed={collapsed}
                                pathname={pathname}
                                onNavClick={onNavClick}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </nav>
    );
}

const SidebarNavItem = React.memo(function SidebarNavItem({
    item,
    collapsed,
    pathname,
    onNavClick,
}: {
    item: NavItem;
    collapsed: boolean;
    pathname: string;
    onNavClick?: () => void;
}) {
    const Icon = item.icon;
    const isActive =
        pathname === item.href ||
        (item.href !== '/team' &&
            item.href !== '/moderation' &&
            item.href !== '/profile' &&
            pathname.startsWith(item.href + '/'));

    const content = (
        <Link
            href={item.href}
            onClick={onNavClick}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
                'group relative flex items-center justify-between rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                collapsed ? 'mx-auto size-10 justify-center' : 'px-4 py-2.5',
                isActive
                    ? 'border-l-[3px] border-l-accent-brand bg-accent-brand/12 text-accent-brand'
                    : 'border-l-[3px] border-l-transparent text-foreground-secondary hover:bg-surface-raised/50 hover:text-foreground',
            )}
        >
            <div className="flex items-center gap-3">
                <Icon
                    className={cn(
                        'size-5 shrink-0',
                        isActive ? '' : 'group-hover:text-accent-brand',
                    )}
                />
                {!collapsed && (
                    <span className={cn('text-body-sm', isActive ? 'font-bold' : 'font-medium')}>
                        {item.label}
                    </span>
                )}
            </div>
            {!collapsed && item.badge != null && item.badge > 0 && (
                <span className="rounded-full bg-accent-brand px-1.5 py-0.5 text-[10px] font-black text-white">
                    {item.badge}
                </span>
            )}
            {collapsed && item.badge != null && item.badge > 0 && (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-accent-brand" />
            )}
        </Link>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="bg-surface-overlay text-foreground">
                    {item.label}
                    {item.badge != null && item.badge > 0 && (
                        <span className="ml-2 text-accent-brand">({item.badge})</span>
                    )}
                </TooltipContent>
            </Tooltip>
        );
    }

    return content;
});

SidebarNavItem.displayName = 'SidebarNavItem';

const SidebarFooter = React.memo(function SidebarFooter({
    collapsed,
    onSignOut,
}: {
    collapsed: boolean;
    onSignOut: () => void;
}) {
    const button = (
        <button
            onClick={onSignOut}
            className={cn(
                'flex items-center gap-3 rounded-lg text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                collapsed ? 'mx-auto size-10 justify-center' : 'px-4 py-2',
            )}
            aria-label="Sair do sistema"
        >
            <LogOut className="size-5 shrink-0" />
            {!collapsed && <span className="text-body-sm font-bold">Sair do Sistema</span>}
        </button>
    );

    if (collapsed) {
        return (
            <div className="border-t border-border/15 p-2">
                <Tooltip>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="bg-surface-overlay text-error">
                        Sair do Sistema
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return <div className="border-t border-border/15 p-4">{button}</div>;
});

SidebarFooter.displayName = 'SidebarFooter';

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { isCollapsed } = useSidebar();
    const collapsed = onNavClick ? false : isCollapsed;

    const { user, signOut } = useAuth();
    const { roles, availableContexts, loading: rolesLoading } = useRole();
    const { context, teamId, setContext, hydrated } = useContext();
    const [teams, setTeams] = useState<ManagedClub[]>([]);

    const hasTeamContext = availableContexts.includes('team');
    const hasModerationContext = availableContexts.includes('moderation');
    const hasAdminContext = availableContexts.includes('admin');
    const isAdmin = roles.includes('admin');

    useEffect(() => {
        if (!hasTeamContext || !user?.id) return;

        let isMounted = true;

        supabase
            .from('clubs')
            .select('id, display_name')
            .eq('manager_id', user.id)
            .order('display_name', { ascending: true })
            .then(({ data }) => {
                if (isMounted) {
                    setTeams((data ?? []) as ManagedClub[]);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [hasTeamContext, supabase, user?.id]);

    const normalizedContext = useMemo(() => {
        if (context === 'team_id' && availableContexts.includes('team')) return 'team_id';
        if (context === 'moderation' && hasModerationContext) return 'moderation';
        if (context === 'admin' && hasAdminContext) return 'admin';
        return 'profile';
    }, [context, availableContexts, hasModerationContext, hasAdminContext]);

    const navSections = useMemo(
        () => getNavSections(normalizedContext, isAdmin),
        [normalizedContext, isAdmin],
    );

    const activeContextValue = useMemo(() => {
        if (normalizedContext === 'team_id' && teamId) return `team:${teamId}`;
        if (normalizedContext === 'moderation') return 'moderation';
        if (normalizedContext === 'admin') return 'admin';
        return 'profile';
    }, [normalizedContext, teamId]);

    const visibleTeams = useMemo(
        () => (hasTeamContext && user?.id ? teams : []),
        [hasTeamContext, teams, user?.id],
    );

    const contextOptions = useMemo(() => {
        const options: Array<{ value: string; label: string; icon: React.ElementType }> = [
            { value: 'profile', label: 'Meu Perfil', icon: getContextIcon('profile') },
        ];

        for (const team of visibleTeams) {
            options.push({
                value: `team:${team.id}`,
                label: team.display_name,
                icon: getContextIcon('team_id'),
            });
        }

        if (hasModerationContext) {
            options.push({
                value: 'moderation',
                label: 'Moderação',
                icon: getContextIcon('moderation'),
            });
        }

        if (hasAdminContext) {
            options.push({
                value: 'admin',
                label: 'Admin',
                icon: getContextIcon('admin'),
            });
        }

        return options;
    }, [visibleTeams, hasModerationContext, hasAdminContext]);

    function getContextLabel(): string {
        if (normalizedContext === 'moderation') return 'Moderação';
        if (normalizedContext === 'admin') return 'Admin';
        if (normalizedContext === 'team_id' && teamId) {
            const team = visibleTeams.find((entry) => entry.id === teamId);
            return team?.display_name ?? 'Meu Time';
        }
        return 'Meu Perfil';
    }

    function handleContextSelect(value: string) {
        if (value === 'profile') {
            setContext('profile');
            router.push('/profile');
            return;
        }

        if (value.startsWith('team:')) {
            const nextTeamId = value.replace('team:', '');
            setContext('team_id', nextTeamId || null);
            router.push('/team');
            return;
        }

        if (value === 'moderation') {
            setContext('moderation');
            router.push('/moderation');
            return;
        }

        if (value === 'admin') {
            setContext('admin');
            router.push('/admin');
        }
    }

    const displayName = user?.display_name ?? user?.email ?? '?';
    const roleLabel = getRoleLabel(roles);
    const disabled = rolesLoading || !hydrated;

    const handleSignOut = () => {
        if (onNavClick) onNavClick();
        signOut();
    };

    return (
        <div className="flex h-full flex-col">
            <SidebarBrand collapsed={collapsed} />

            <SidebarUserCard
                name={displayName}
                roleLabel={roleLabel}
                collapsed={collapsed}
            />

            <SidebarContextSwitcher
                activeValue={activeContextValue}
                contextLabel={getContextLabel()}
                contextIcon={getContextIcon(normalizedContext)}
                options={contextOptions}
                collapsed={collapsed}
                disabled={disabled}
                onSelect={handleContextSelect}
            />

            <SidebarNav
                sections={navSections}
                collapsed={collapsed}
                onNavClick={onNavClick}
            />

            <SidebarFooter
                collapsed={collapsed}
                onSignOut={handleSignOut}
            />
        </div>
    );
}

export function SidebarShell() {
    const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebar();

    return (
        <>
            <aside
                className={cn(
                    'z-sidebar hidden h-full shrink-0 flex-col border-r border-border/15 bg-background transition-[width] duration-200 ease-in-out md:flex',
                    isCollapsed ? 'w-16' : 'w-sidebar',
                )}
                style={{ willChange: 'width' }}
            >
                <SidebarContent />
            </aside>

            <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent
                    side="left"
                    className="w-sidebar border-r border-border/15 bg-background p-0 [&>button]:hidden"
                >
                    <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
                    <SidebarContent onNavClick={() => setMobileOpen(false)} />
                </SheetContent>
            </Sheet>
        </>
    );
}
