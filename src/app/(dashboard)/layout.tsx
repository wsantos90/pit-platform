/**
 * Dashboard Layout
 * Layout compartilhado para todas as páginas autenticadas.
 * Inclui Sidebar, Navbar, e ContextSwitcher.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { ContextSwitcher } from '@/components/layout/ContextSwitcher';
import { AppContextProvider } from '@/hooks/useContext';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
<<<<<<< HEAD
        <AppContextProvider>
            <div className="flex h-screen bg-gray-950">
                {/* TODO: <Sidebar /> */}
                <aside className="w-64 bg-gray-900 border-r border-gray-800">
                    <div className="p-4">
                        <h1 className="text-xl font-bold text-orange-500">P.I.T</h1>
                        <p className="text-xs text-gray-400">Performance · Intelligence · Tracking</p>
                    </div>
                    <div className="px-4 pb-4">
                        <ContextSwitcher />
                    </div>
                    {/* TODO: Nav items baseados em role */}
                </aside>
=======
        <div className="flex h-screen bg-background">
            {/* TODO: <Sidebar /> */}
            <aside className="w-64 bg-card border-r border-border">
                <div className="p-4">
                    <h1 className="text-xl font-bold text-primary">P.I.T</h1>
                    <p className="text-xs text-muted-foreground">Performance · Intelligence · Tracking</p>
                </div>
                {/* TODO: Nav items baseados em role */}
            </aside>
>>>>>>> origin/main

                <main className="flex-1 flex flex-col overflow-hidden">
                    <Navbar />

                    <div className="flex-1 overflow-auto p-6">
                        {children}
                    </div>
                </main>
            </div>
        </AppContextProvider>
    );
}
