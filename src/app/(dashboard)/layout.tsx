/**
 * Dashboard Layout
 * Layout compartilhado para todas as páginas autenticadas.
 * Inclui Sidebar, Navbar, e ContextSwitcher.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarShell } from '@/components/layout/SidebarShell';
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
        <AppContextProvider>
            <div className="flex h-screen bg-background">
                <SidebarShell />

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
