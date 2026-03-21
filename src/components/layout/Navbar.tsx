'use client';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/hooks/useAuth';

function NavbarPlaceholder() {
    return (
        <div className="flex items-center gap-4" aria-hidden="true">
            <div className="h-9 w-9 rounded-md bg-muted/70 animate-pulse" />
            <div className="hidden sm:flex flex-col items-end gap-1">
                <div className="h-3 w-28 rounded bg-muted/70 animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted/50 animate-pulse" />
            </div>
        </div>
    );
}

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <nav className="flex h-navbar items-center justify-between border-b border-border/15 bg-background px-content">
            <span className="text-sm text-muted-foreground">Dashboard</span>

            {loading ? (
                <NavbarPlaceholder />
            ) : user ? (
                <div className="flex items-center gap-4">
                    <NotificationBell userId={user.id} />

                    <div className="hidden sm:flex flex-col items-end leading-tight">
                        <span className="text-sm text-foreground">
                            {user.display_name ?? user.email}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="h-9 w-9" aria-hidden="true" />
            )}
        </nav>
    );
}
