'use client';

/**
 * useRole Hook
 * Verifica roles do usuário para controle de acesso na UI.
 * Ref: FC11 — Roles & Context System.
 * Princípio SRP: Apenas verificação de roles.
 */

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { UserRole } from '@/types';

export function useRole() {
    const { user, loading } = useAuth();

    const roles = useMemo(() => user?.roles ?? [], [user]);

    const hasRole = (role: UserRole) => roles.includes(role);
    const isAdmin = hasRole('admin');
    const isModerator = hasRole('moderator') || isAdmin;
    const isManager = hasRole('manager');
    const isPlayer = hasRole('player');

    /** Contextos de UI disponíveis baseado nas roles */
    const availableContexts = useMemo(() => {
        const contexts: string[] = ['profile']; // Todos têm perfil
        if (isManager) contexts.push('team');
        if (isPlayer) contexts.push('matchmaking');
        if (isModerator) contexts.push('moderation');
        if (isAdmin) contexts.push('admin');
        return contexts;
    }, [isAdmin, isModerator, isManager, isPlayer]);

    return {
        user,
        loading,
        roles,
        hasRole,
        isAdmin,
        isModerator,
        isManager,
        isPlayer,
        availableContexts,
    };
}
