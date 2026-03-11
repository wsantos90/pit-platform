'use client';

import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
    const { user, loading } = useAuth();

    return (
        <nav className="h-14 border-b border-slate-800/50 flex items-center justify-between px-6" style={{ background: 'rgba(16, 25, 34, 0.5)', backdropFilter: 'blur(8px)' }}>
            <span className="text-sm text-slate-500">Dashboard</span>

            {!loading && user ? (
                <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-sm text-slate-200">
                        {user.display_name ?? user.email}
                    </span>
                </div>
            ) : null}
        </nav>
    );
}
