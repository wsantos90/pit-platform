'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/hooks/useSidebar';
import { BREADCRUMB_LABELS } from '@/components/layout/sidebar/constants';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PlayerAvatar } from '@/components/shared/PlayerAvatar';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const DYNAMIC_SEGMENT_PATTERNS = [
    /^[0-9a-f]{8}-/i,
    /^[0-9a-f]{20,}$/i,
    /^\d+$/,
];

function isDynamicIdSegment(segment: string) {
    return DYNAMIC_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment));
}

function useBreadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    return segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;

        const label = isDynamicIdSegment(segment)
            ? 'Detalhes'
            : BREADCRUMB_LABELS[segment] ??
              segment.charAt(0).toUpperCase() + segment.slice(1);

        return { href, label, isLast };
    });
}

export function Navbar() {
    const { user, loading, signOut } = useAuth();
    const { setMobileOpen } = useSidebar();
    const breadcrumbs = useBreadcrumbs();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const container = document.getElementById('main-content-scroll');
        if (!container) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('[Navbar] main-content-scroll element not found');
            }
            return;
        }

        const handleScroll = () => setScrolled(container.scrollTop > 0);
        handleScroll();
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    const displayName = user?.display_name ?? user?.email ?? '';

    return (
        <header
            role="banner"
            aria-label="Barra de navegação"
            className={cn(
                'z-sticky flex h-navbar shrink-0 items-center justify-between border-b border-border/15 bg-background px-content transition-shadow duration-200',
                scrolled && 'shadow-scroll',
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
                    aria-label="Abrir menu de navegação"
                >
                    <Menu className="size-5" />
                </button>

                {breadcrumbs.length > 0 && (
                    <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap">
                            {breadcrumbs.map(({ href, label, isLast }) =>
                                isLast ? (
                                    <BreadcrumbItem key={href}>
                                        <BreadcrumbPage className="max-w-[120px] truncate text-body-sm font-semibold text-foreground sm:max-w-none">
                                            {label}
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                ) : (
                                    <BreadcrumbItem key={href}>
                                        <BreadcrumbLink asChild>
                                            <Link
                                                href={href}
                                                className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground"
                                            >
                                                {label}
                                            </Link>
                                        </BreadcrumbLink>
                                        <BreadcrumbSeparator />
                                    </BreadcrumbItem>
                                ),
                            )}
                        </BreadcrumbList>
                    </Breadcrumb>
                )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {user && <NotificationBell userId={user.id} />}

                {loading ? (
                    <div className="h-8 w-32 animate-pulse rounded-lg bg-surface-raised" />
                ) : user ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-foreground-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <PlayerAvatar
                                    name={displayName}
                                    src={user.avatar_url}
                                    size="sm"
                                />
                                <span className="hidden max-w-[120px] truncate text-body-sm font-semibold text-foreground sm:block">
                                    {displayName}
                                </span>
                                <ChevronDown className="size-4 shrink-0 text-foreground-tertiary" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-52 border-border/15 bg-surface-overlay shadow-float"
                        >
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/profile"
                                    className="flex cursor-pointer items-center gap-2"
                                >
                                    <User className="size-4 text-foreground-secondary" />
                                    <span>Meu Perfil</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link
                                    href="/profile/settings"
                                    className="flex cursor-pointer items-center gap-2"
                                >
                                    <Settings className="size-4 text-foreground-secondary" />
                                    <span>Configurações</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border/15" />
                            <DropdownMenuItem
                                onClick={signOut}
                                className="flex cursor-pointer items-center gap-2 text-error focus:bg-error/10 focus:text-error"
                            >
                                <LogOut className="size-4" />
                                <span>Sair</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}
            </div>
        </header>
    );
}
