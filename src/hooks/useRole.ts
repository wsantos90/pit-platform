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
    const currentUserId = user?.id ?? null;
    const currentUserEmail = user?.email ?? null;
    const supabase = useMemo(() => createClient(), []);
    const [dbRoles, setDbRoles] = useState<UserRole[] | null>(null);
    const [rolesLoading, setRolesLoading] = useState(true);
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadRoles = async () => {
            if (!currentUserId) {
                if (isMounted) {
                    setDbRoles(null);
                    setRolesLoading(false);
                    setResolvedUserId(null);
                }
                return;
            }

            try {
                setRolesLoading(true);
                setResolvedUserId(null);
                const { data: byId } = await supabase
                    .from('users')
                    .select('roles')
                    .eq('id', currentUserId)
                    .maybeSingle();

                let nextRoles = (byId?.roles ?? null) as UserRole[] | null;
                if (!nextRoles && currentUserEmail) {
                    const { data: byEmail } = await supabase
                        .from('users')
                        .select('roles')
                        .eq('email', currentUserEmail)
                        .maybeSingle();
                    nextRoles = (byEmail?.roles ?? null) as UserRole[] | null;
                }

                if (isMounted) {
                    setDbRoles(nextRoles);
                }
            } catch {
                if (isMounted) {
                    setDbRoles(null);
                }
            } finally {
                if (isMounted) {
                    setRolesLoading(false);
                    setResolvedUserId(currentUserId);
                }
            }
        };

        void loadRoles();

        return () => {
            isMounted = false;
        };
    }, [supabase, currentUserId, currentUserEmail]);

    const isHydratingCurrentUser = Boolean(currentUserId) && resolvedUserId !== currentUserId;

    const roles = useMemo(
        () => (dbRoles?.length ? dbRoles : (resolvedUserId === currentUserId ? (user?.roles ?? []) : [])),
        [dbRoles, resolvedUserId, currentUserId, user?.roles],
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
        loading: loading || rolesLoading || isHydratingCurrentUser,
        roles,
        hasRole,
        isAdmin,
        isModerator,
        isManager,
        isPlayer,
        availableContexts,
    };
}
