'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRole } from '@/hooks/useRole';
import { useContext } from '@/hooks/useContext';

interface ManagedClub {
    id: string;
    display_name: string;
}

export function ContextSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = useMemo(() => createClient(), []);
    const { user, availableContexts, loading: rolesLoading } = useRole();
    const { context, teamId, setContext, hydrated } = useContext();
    const [teams, setTeams] = useState<ManagedClub[]>([]);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const hasTeamContext = availableContexts.includes('team');
    const hasModerationContext = availableContexts.includes('moderation');
    const hasAdminContext = availableContexts.includes('admin');

    useEffect(() => {
        let isMounted = true;

        const loadManagedTeams = async () => {
            if (!hasTeamContext || !user?.id) {
                if (isMounted) {
                    setTeams([]);
                    setLoadingTeams(false);
                }
                return;
            }

            try {
                setLoadingTeams(true);
                const { data } = await supabase
                    .from('clubs')
                    .select('id, display_name')
                    .eq('manager_id', user.id)
                    .order('display_name', { ascending: true });

                if (isMounted) {
                    setTeams((data ?? []) as ManagedClub[]);
                }
            } catch {
                if (isMounted) {
                    setTeams([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingTeams(false);
                }
            }
        };

        void loadManagedTeams();

        return () => {
            isMounted = false;
        };
    }, [hasTeamContext, supabase, user?.id]);

    const value = useMemo(() => {
        if (context === 'team_id' && teamId && teams.some((team) => team.id === teamId)) {
            return `team:${teamId}`;
        }
        if (context === 'moderation' && hasModerationContext) {
            return 'moderation';
        }
        if (context === 'admin' && hasAdminContext) {
            return 'admin';
        }
        return 'profile';
    }, [context, hasAdminContext, hasModerationContext, teamId, teams]);

    const disabled = rolesLoading || loadingTeams || !hydrated;
    const navigateTo = (targetPath: string) => {
        if (pathname !== targetPath) {
            router.push(targetPath);
            return;
        }
        router.refresh();
    };

    return (
        <div className="space-y-2">
            <label htmlFor="context-switcher" className="text-label font-medium text-foreground-secondary">
                Contexto
            </label>
            <select
                id="context-switcher"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus-visible:ring-1 focus-visible:ring-ring"
                value={value}
                onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === 'profile') {
                        setContext('profile');
                        navigateTo('/profile');
                        return;
                    }

                    if (nextValue.startsWith('team:')) {
                        const nextTeamId = nextValue.replace('team:', '');
                        setContext('team_id', nextTeamId || null);
                        navigateTo('/team');
                        return;
                    }

                    if (nextValue === 'moderation') {
                        setContext('moderation');
                        navigateTo('/moderation');
                        return;
                    }

                    if (nextValue === 'admin') {
                        setContext('admin');
                        navigateTo('/admin');
                    }
                }}
                disabled={disabled}
            >
                <option value="profile">Meu Perfil</option>
                {teams.map((team) => (
                    <option key={team.id} value={`team:${team.id}`}>
                        {team.display_name}
                    </option>
                ))}
                {hasModerationContext ? (
                    <option value="moderation">Moderação</option>
                ) : null}
                {hasAdminContext ? (
                    <option value="admin">Painel Admin</option>
                ) : null}
            </select>
            {hasTeamContext && !loadingTeams && teams.length === 0 ? (
                <a href="/team/claim" className="text-xs text-accent-brand hover:underline">
                    Reivindicar um time →
                </a>
            ) : null}
        </div>
    );
}
