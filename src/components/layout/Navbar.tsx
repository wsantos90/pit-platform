'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
    const { user, loading, signOut } = useAuth();
    const shouldShowEmail = Boolean(user?.email && user?.display_name && user.email !== user.display_name);

    return (
        <nav className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
            <span className="text-sm text-muted-foreground">Dashboard</span>

            <div className="flex items-center gap-3">
                {loading ? (
                    <span className="text-xs text-muted-foreground">Carregando...</span>
                ) : null}

                {!loading && user ? (
                    <>
                        <div className="hidden sm:flex flex-col items-end leading-tight">
                            <span className="text-sm text-foreground">
                                {user.display_name ?? user.email}
                            </span>
                            {shouldShowEmail ? (
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                            ) : null}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={signOut}
                            className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground gap-1"
                        >
                            <Icon name="logout" size="sm" />
                            Sair
                        </Button>
                    </>
                ) : null}
            </div>
        </nav>
    );
}
