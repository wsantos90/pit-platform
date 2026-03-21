'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
    { href: '/rankings', label: 'Rankings' },
    { href: '/hall-of-fame', label: 'Hall of Fame' },
] as const;

export function LandingNavbar() {
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-sticky h-navbar border-b border-border/15 bg-background">
            <nav
                className="mx-auto flex h-full max-w-7xl items-center justify-between px-content"
                aria-label="Navegação principal"
            >
                {/* Logo */}
                <Link
                    href="/"
                    className="group flex items-center gap-2.5"
                    aria-label="P.I.T — Início"
                >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary transition-colors group-hover:bg-primary/80">
                        <BarChart3 className="size-4 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-foreground">
                        P.I.T
                    </span>
                </Link>

                {/* Nav links (desktop only) */}
                <ul className="hidden items-center gap-1 md:flex" role="list">
                    {NAV_LINKS.map(({ href, label }) => {
                        const active =
                            pathname === href || pathname.startsWith(href + '/');
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                                        active
                                            ? 'bg-surface-raised text-foreground'
                                            : 'text-foreground-secondary hover:bg-surface-raised/50 hover:text-foreground',
                                    )}
                                >
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* CTAs */}
                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className="hidden rounded-lg px-3 py-1.5 text-body-sm font-semibold text-foreground-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/register"
                        className="flex rounded-lg bg-primary px-4 py-1.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        Criar conta
                    </Link>
                </div>
            </nav>
        </header>
    );
}
