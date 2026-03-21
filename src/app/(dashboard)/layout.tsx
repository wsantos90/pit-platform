/**
 * Dashboard Layout
 * Layout compartilhado para todas as páginas autenticadas.
 * Inclui SidebarShell, Navbar, e providers de contexto.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { SidebarShell } from '@/components/layout/SidebarShell';
import { AppContextProvider } from '@/hooks/useContext';
import { SidebarProvider } from '@/hooks/useSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <AppContextProvider>
            <SidebarProvider>
                <TooltipProvider delayDuration={0}>
                    <div className="flex h-screen bg-background">
                        <SidebarShell />

                        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                            <Navbar />

                            <div
                                id="main-content-scroll"
                                className="flex-1 overflow-auto p-content"
                            >
                                {children}
                            </div>
                        </main>
                    </div>
                </TooltipProvider>
            </SidebarProvider>
        </AppContextProvider>
    );
}
