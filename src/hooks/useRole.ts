'use client';

/**
 * useRole Hook
 * Verifica roles do usuário para controle de acesso na UI.
 * Ref: FC11 — Roles & Context System.
 * Princípio SRP: Apenas verificação de roles.
 */

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

export function useRole() {
    const { user, loading } = useAuth();
    const supabase = useMemo(() => createClient(), []);
    const [dbRoles, setDbRoles] = useState<UserRole[] | null>(null);
    const [rolesLoading, setRolesLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadRoles = async () => {
            if (!user?.id) {
                if (isMounted) {
                    setDbRoles(null);
                    setRolesLoading(false);
                }
                return;
            }

            try {
                setRolesLoading(true);
                const { data } = await supabase
                    .from('users')
                    .select('roles')
                    .eq('id', user.id)
                    .maybeSingle();

                if (isMounted) {
                    setDbRoles((data?.roles ?? null) as UserRole[] | null);
                }
            } catch {
                if (isMounted) {
                    setDbRoles(null);
                }
            } finally {
                if (isMounted) {
                    setRolesLoading(false);
                }
            }
        };

        void loadRoles();

        return () => {
            isMounted = false;
        };
    }, [supabase, user?.id]);

    const roles = useMemo(
        () => (dbRoles?.length ? dbRoles : (user?.roles ?? [])),
        [dbRoles, user],
    );

    const hasRole = (role: UserRole) => roles.includes(role);
    const isAdmin = hasRole('admin');
    const isModerator = hasRole('moderator') || isAdmin;
    const isManager = hasRole('manager');
    const isPlayer = hasRole('player');

    /** Contextos de UI disponíveis baseado nas roles */
    const availableContexts = useMemo(() => {
        const contexts: string[] = ['profile']; // Todos têm perfil
        if (isManager || isModerator || isAdmin) contexts.push('team');
        if (isModerator) contexts.push('moderation');
        if (isAdmin) contexts.push('admin');
        return contexts;
    }, [isAdmin, isModerator, isManager]);

    return {
        user,
        loading: loading || rolesLoading,
        roles,
        hasRole,
        isAdmin,
        isModerator,
        isManager,
        isPlayer,
        availableContexts,
    };
}
