import { useState, useEffect, useMemo } from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { homebrewStorage, type HomebrewStorageStats } from '../../utils/sync/homebrewStorage';

export function HomebrewStorageTracker() {
    const customTypes = useCharacterStore((state) => state.roomCustomTypes);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const customMoves = useCharacterStore((state) => state.roomCustomMoves);
    const customPokemon = useCharacterStore((state) => state.roomCustomPokemon);
    const customItems = useCharacterStore((state) => state.roomCustomItems);
    const customForms = useCharacterStore((state) => state.roomCustomForms);
    const customStatuses = useCharacterStore((state) => state.roomCustomStatuses);

    const payload = useMemo(
        () => ({
            customTypes,
            customAbilities,
            customMoves,
            customPokemon,
            customItems,
            customForms,
            customStatuses
        }),
        [customTypes, customAbilities, customMoves, customPokemon, customItems, customForms, customStatuses]
    );

    const [stats, setStats] = useState<HomebrewStorageStats>({
        isIndexedDB: true,
        dataBytes: 0,
        dataFormatted: '0.0 KB',
        quotaFormatted: 'Expanded',
        percent: 0,
        storageType: 'IndexedDB',
        isNearLimit: false
    });

    useEffect(() => {
        let isMounted = true;

        const updateStats = async () => {
            const calculated = await homebrewStorage.getStorageStats(payload);
            if (isMounted) {
                setStats(calculated);
            }
        };

        updateStats();

        const unsub = homebrewStorage.subscribeHomebrewStorageChange(() => {
            updateStats();
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, [payload]);

    let progressColor = 'var(--primary)';
    if (stats.isNearLimit || stats.percent > 90) {
        progressColor = 'var(--semantic-danger)';
    } else if (stats.percent > 70) {
        progressColor = 'var(--secondary)';
    }

    const tooltip = stats.isIndexedDB
        ? `Stored in IndexedDB with room ID isolation. Capacity: ${stats.quotaFormatted || 'Expanded Quota'}.`
        : 'IndexedDB is unavailable. Storing via localStorage (~5MB limit). Export backups if near limit!';

    return (
        <div
            className="homebrew-modal__storage-tracker"
            title={tooltip}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                width: '100%'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    gap: '8px'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={14} />
                    <span style={{ fontWeight: 500 }}>
                        {stats.storageType === 'IndexedDB' ? 'IndexedDB Storage' : stats.storageType}
                    </span>
                    {stats.isNearLimit && (
                        <span
                            title="Storage space is running low!"
                            style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={14} />
                        </span>
                    )}
                </span>
                <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{stats.dataFormatted}</span>
                    {stats.quotaFormatted ? ` / ${stats.quotaFormatted}` : ''}
                </span>
            </div>
            <div
                style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--border)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${Math.max(stats.dataBytes > 0 ? 1 : 0, Math.min(100, stats.percent))}%`,
                        backgroundColor: progressColor,
                        transition: 'width 0.3s ease, background-color 0.3s ease'
                    }}
                />
            </div>
        </div>
    );
}
