'use client';

/**
 * useTeam Hook
 * Dados do time ativo do usuário logado.
 * Princípio SRP: Apenas dados do time.
 */

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Club } from '@/types';

export function useTeam() {
    const { user } = useAuth();
    const [team, setTeam] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchTeam = async () => {
            if (!user) {
                setTeam(null);
                setLoading(false);
                return;
            }

            const { data } = await supabase
                .from('clubs')
                .select('*')
                .eq('manager_id', user.id)
                .eq('status', 'active')
                .single();

            setTeam(data);
            setLoading(false);
        };

        void fetchTeam();
    }, [supabase, user]);

    return { team: user ? team : null, loading: user ? loading : false };
}
