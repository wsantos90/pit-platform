'use client';

import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <nav className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6">
            <span className="text-sm text-muted-foreground">Dashboard</span>

            {!loading && user ? (
                <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-sm text-foreground">
                        {user.display_name ?? user.email}
                    </span>
                </div>
            ) : null}
        </nav>
    );
}
