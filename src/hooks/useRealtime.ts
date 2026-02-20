'use client';

/**
 * useRealtime Hook
 * Subscriptions do Supabase Realtime para notificações e chat.
 * Princípio SRP: Apenas subscriptions de realtime.
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface RealtimeOptions {
    table: string;
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onPayload: (payload: unknown) => void;
}

export function useRealtime({ table, event = '*', filter, onPayload }: RealtimeOptions) {
    const [isConnected, setIsConnected] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel(`realtime:${table}`)
            .on(
                'postgres_changes' as const,
                {
                    event,
                    schema: 'public',
                    table,
                    filter,
                },
                (payload: unknown) => {
                    onPayload(payload);
                }
            )
            .subscribe((status: string) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [table, event, filter]);

    return { isConnected };
}
