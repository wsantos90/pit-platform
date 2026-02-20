/**
 * Dashboard Layout
 * Layout compartilhado para todas as páginas autenticadas.
 * Inclui Sidebar, Navbar, e ContextSwitcher.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="flex h-screen bg-gray-950">
            {/* TODO: <Sidebar /> */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800">
                <div className="p-4">
                    <h1 className="text-xl font-bold text-orange-500">P.I.T</h1>
                    <p className="text-xs text-gray-400">Performance · Intelligence · Tracking</p>
                </div>
                {/* TODO: Nav items baseados em role */}
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* TODO: <Navbar /> */}
                <header className="h-14 bg-gray-900/50 border-b border-gray-800 flex items-center px-6">
                    <span className="text-sm text-gray-400">Dashboard</span>
                </header>

                <div className="flex-1 overflow-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
