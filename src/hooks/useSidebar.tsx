'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

interface SidebarState {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    toggleCollapsed: () => void;
    setMobileOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'sidebar-collapsed';

const SidebarContext = createContext<SidebarState | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'true') setIsCollapsed(true);
        } catch {
            // localStorage unavailable
        }
        setHydrated(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, String(isCollapsed));
        } catch {
            // localStorage unavailable
        }
    }, [isCollapsed, hydrated]);

    // Cross-tab sync
    useEffect(() => {
        const handler = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setIsCollapsed(e.newValue === 'true');
            }
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const toggleCollapsed = useCallback(() => {
        setIsCollapsed((prev) => !prev);
    }, []);

    const setMobileOpen = useCallback((open: boolean) => {
        setIsMobileOpen(open);
    }, []);

    const value = useMemo(
        () => ({ isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen }),
        [isCollapsed, isMobileOpen, toggleCollapsed, setMobileOpen],
    );

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const value = useContext(SidebarContext);
    if (!value) {
        throw new Error('useSidebar deve ser usado dentro de SidebarProvider.');
    }
    return value;
}
