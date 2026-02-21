'use client';

import {
    createContext,
    useCallback,
    useContext as useReactContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export type AppContextType = 'profile' | 'team_id' | 'moderation' | 'admin';

interface AppContextState {
    context: AppContextType;
    teamId: string | null;
    hydrated: boolean;
    setContext: (context: AppContextType, teamId?: string | null) => void;
}

const DEFAULT_CONTEXT: AppContextType = 'profile';
const STORAGE_KEY = 'appContext';

const AppContext = createContext<AppContextState | undefined>(undefined);

function isValidContext(value: string): value is AppContextType {
    return value === 'profile' || value === 'team_id' || value === 'moderation' || value === 'admin';
}

export function AppContextProvider({ children }: { children: React.ReactNode }) {
    const [context, setContextState] = useState<AppContextType>(DEFAULT_CONTEXT);
    const [teamId, setTeamId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            setHydrated(true);
            return;
        }

        try {
            const parsed = JSON.parse(stored) as { context?: string; teamId?: string | null };
            const nextContext = parsed.context;

            if (nextContext && isValidContext(nextContext)) {
                setContextState(nextContext);
                setTeamId(nextContext === 'team_id' ? (parsed.teamId ?? null) : null);
            }
        } catch {
            if (isValidContext(stored)) {
                setContextState(stored);
                setTeamId(null);
            }
        } finally {
            setHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!hydrated) return;

        localStorage.setItem(STORAGE_KEY, JSON.stringify({ context, teamId }));
    }, [context, hydrated, teamId]);

    const setContext = useCallback((nextContext: AppContextType, nextTeamId?: string | null) => {
        setContextState(nextContext);
        setTeamId(nextContext === 'team_id' ? (nextTeamId ?? null) : null);
    }, []);

    const value = useMemo(() => ({
        context,
        teamId,
        hydrated,
        setContext,
    }), [context, hydrated, setContext, teamId]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useContext() {
    const value = useReactContext(AppContext);
    if (!value) {
        throw new Error('useContext deve ser usado dentro de AppContextProvider.');
    }

    return value;
}
