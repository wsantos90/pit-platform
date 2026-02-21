/**
 * Dashboard Layout
 * Layout compartilhado para todas as páginas autenticadas.
 * Inclui Sidebar, Navbar, e ContextSwitcher.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';

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
        <div className="flex h-screen bg-background">
            {/* TODO: <Sidebar /> */}
            <aside className="w-64 bg-card border-r border-border">
                <div className="p-4">
                    <h1 className="text-xl font-bold text-primary">P.I.T</h1>
                    <p className="text-xs text-muted-foreground">Performance · Intelligence · Tracking</p>
                </div>
                {/* TODO: Nav items baseados em role */}
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <Navbar />

                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
