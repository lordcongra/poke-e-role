import { useEffect, useCallback } from 'react';

export interface UseInitiativeThemeSyncOptions {
    theme: string;
    isStandalone: boolean;
}

export function useInitiativeThemeSync({ theme, isStandalone }: UseInitiativeThemeSyncOptions) {
    const applyDynamicColors = useCallback(
        (data?: { enabled: boolean; primary?: string; secondary?: string }) => {
            if (isStandalone) return;
            if (data?.enabled && data?.primary) {
                document.body.style.setProperty('--dynamic-type-color', data.primary);
                document.documentElement.style.setProperty('--dynamic-type-color', data.primary);
                if (data.secondary) {
                    document.body.style.setProperty('--dynamic-secondary-color', data.secondary);
                    document.documentElement.style.setProperty('--dynamic-secondary-color', data.secondary);
                } else {
                    document.body.style.removeProperty('--dynamic-secondary-color');
                    document.documentElement.style.removeProperty('--dynamic-secondary-color');
                }
            } else {
                document.body.style.removeProperty('--dynamic-type-color');
                document.documentElement.style.removeProperty('--dynamic-type-color');
                document.body.style.removeProperty('--dynamic-secondary-color');
                document.documentElement.style.removeProperty('--dynamic-secondary-color');
            }
        },
        [isStandalone]
    );

    // Dynamic Popover Color Sync via localStorage
    useEffect(() => {
        if (isStandalone) return;

        try {
            const rawColors = localStorage.getItem('pkr_active_theme_colors');
            if (rawColors) applyDynamicColors(JSON.parse(rawColors));
        } catch (err) {
            console.warn('[useInitiativeThemeSync] Failed to parse dynamic colors from localStorage:', err);
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pkr_active_theme_colors') {
                try {
                    applyDynamicColors(JSON.parse(e.newValue || '{}'));
                } catch (err) {
                    console.warn('[useInitiativeThemeSync] Failed to parse dynamic colors on storage update:', err);
                }
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [isStandalone, applyDynamicColors]);

    // Theme (light/dark mode) DOM attribute & class toggle
    useEffect(() => {
        if (isStandalone) return;

        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.setAttribute('data-theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.setAttribute('data-theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [isStandalone, theme]);

    return { applyDynamicColors };
}
