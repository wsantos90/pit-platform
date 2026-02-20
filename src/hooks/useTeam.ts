'use client';

/**
 * useTeam Hook
 * Dados do time ativo do usuário logado.
 * Princípio SRP: Apenas dados do time.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import type { Club } from '@/types';

export function useTeam() {
    const { user } = useAuth();
    const [team, setTeam] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (!user) {
            setTeam(null);
            setLoading(false);
            return;
        }

        const fetchTeam = async () => {
            const { data } = await supabase
                .from('clubs')
                .select('*')
                .eq('manager_id', user.id)
                .eq('status', 'active')
                .single();

            setTeam(data);
            setLoading(false);
        };

        fetchTeam();
    }, [user]);

    return { team, loading };
}
