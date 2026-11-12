import { useState, useEffect, useMemo } from 'react';
import type { TrainerRoster, PcPokemonSummary } from '@/types/pcStorageTypes';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { idbGetCharacter } from '@/utils/sync/standaloneIdb';
import { buildTrainerSummary } from '@/utils/pc/pcTrainerOps';

/**
 * Hydrates a Trainer's standalone sheet metadata from IndexedDB and builds
 * a `PcPokemonSummary` for PC sheet viewing.
 */
export function usePcTrainerSummary(
    trainer: TrainerRoster | undefined,
    isPmdMode: boolean
): PcPokemonSummary | null {
    const [localMeta, setLocalMeta] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        if (!isStandaloneMode || isPmdMode || !trainer) {
            setLocalMeta(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const byId = await idbGetCharacter(trainer.id);
                if (!cancelled && byId?.metadata) {
                    setLocalMeta(byId.metadata);
                    return;
                }
                if (trainer.savedTokenItem?.id) {
                    const byTok = await idbGetCharacter(trainer.savedTokenItem.id);
                    if (!cancelled && byTok?.metadata) {
                        setLocalMeta(byTok.metadata);
                        return;
                    }
                }
                if (!cancelled) setLocalMeta(null);
            } catch {
                if (!cancelled) setLocalMeta(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [trainer?.id, trainer?.savedTokenItem?.id, isPmdMode]);

    return useMemo(
        () => (!isPmdMode && trainer ? buildTrainerSummary(trainer, localMeta) : null),
        [trainer, isPmdMode, localMeta]
    );
}

