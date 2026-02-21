'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
    const { user, loading, signOut } = useAuth();
    const shouldShowEmail = Boolean(user?.email && user?.display_name && user.email !== user.display_name);

    return (
        <nav className="h-14 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between px-6">
            <span className="text-sm text-gray-400">Dashboard</span>

            <div className="flex items-center gap-3">
                {loading ? (
                    <span className="text-xs text-gray-500">Carregando...</span>
                ) : null}

                {!loading && user ? (
                    <>
                        <div className="hidden sm:flex flex-col items-end leading-tight">
                            <span className="text-sm text-gray-200">
                                {user.display_name ?? user.email}
                            </span>
                            {shouldShowEmail ? (
                                <span className="text-xs text-gray-400">{user.email}</span>
                            ) : null}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={signOut}
                            className="border-orange-500/60 text-orange-300 hover:bg-orange-500 hover:text-black"
                        >
                            <LogOut className="h-4 w-4" />
                            Sair
                        </Button>
                    </>
                ) : null}
            </div>
        </nav>
    );
}
