'use client';

/**
 * useAuth Hook
 * Gerencia estado de autenticação do Supabase.
 * Princípio SRP: Apenas autenticação.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User as AuthUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { User, UserRole } from '@/types';

function toFallbackUser(authUser: AuthUser): User {
    const email = authUser.email ?? '';
    const metadataName = authUser.user_metadata?.display_name
        ?? authUser.user_metadata?.name
        ?? authUser.user_metadata?.gamertag;
    const metadataRolesRaw = authUser.app_metadata?.roles;
    const metadataRoles = Array.isArray(metadataRolesRaw)
        ? metadataRolesRaw.filter((role): role is UserRole => typeof role === 'string')
        : [];

    return {
        id: authUser.id,
        email,
        display_name: metadataName ?? (email || null),
        avatar_url: null,
        roles: metadataRoles,
        is_active: true,
        created_at: authUser.created_at ?? new Date(0).toISOString(),
        updated_at: authUser.updated_at ?? new Date(0).toISOString(),
    };
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        router.replace('/login');
    };

    useEffect(() => {
        const hydrateUserFromDatabase = async (authUser: AuthUser) => {
            try {
                const { data: byId } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUser.id)
                    .maybeSingle();

                if (byId) {
                    setUser(byId);
                    return;
                }

                if (!authUser.email) {
                    return;
                }

                const { data: byEmail } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', authUser.email)
                    .maybeSingle();

                if (byEmail) {
                    setUser(byEmail);
                }
            } catch {
                // Mantém fallback já aplicado em memória.
            }
        };

        const syncUser = async () => {
            try {
                setLoading(true);
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.user) {
                    setUser(null);
                    return;
                }

                setUser(toFallbackUser(session.user));
                void hydrateUserFromDatabase(session.user);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        syncUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                setUser(null);
                setLoading(false);
                return;
            }

            // Importante: não aguardar query Supabase aqui para não segurar auth lock.
            setUser(toFallbackUser(session.user));
            setLoading(false);
            void hydrateUserFromDatabase(session.user);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    return { user, loading, signOut };
}
