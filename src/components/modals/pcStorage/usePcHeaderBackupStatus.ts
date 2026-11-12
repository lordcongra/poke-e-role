import { useState, useEffect } from 'react';
import {
    getBackupReminderReason,
    storageAdapter,
    BACKUP_STATUS_EVENT,
    type BackupReminderReason
} from '@/utils/sync/storageAdapter';
import { useCharacterStore } from '@/store/useCharacterStore';

export interface PcHeaderBackupStatus {
    hasUnbackedChanges: boolean;
    reminderReason: BackupReminderReason;
}

export function usePcHeaderBackupStatus(): PcHeaderBackupStatus {
    const [reminderReason, setReminderReason] = useState<BackupReminderReason>(null);
    const pcSummaryCount = useCharacterStore((s) => Object.keys(s.pcData.pokemonSummaries || {}).length);

    useEffect(() => {
        let active = true;
        const checkBackupStatus = async () => {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const flds = await storageAdapter.getFolders();
                if (!active) return;
                setReminderReason(getBackupReminderReason(chars.length, flds.length, pcSummaryCount));
            } catch {}
        };

        checkBackupStatus();
        const handleVisibility = () => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                checkBackupStatus();
            }
        };

        window.addEventListener(BACKUP_STATUS_EVENT, checkBackupStatus);
        window.addEventListener('pkr-local-data-changed', checkBackupStatus);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibility);
        }

        return () => {
            active = false;
            window.removeEventListener(BACKUP_STATUS_EVENT, checkBackupStatus);
            window.removeEventListener('pkr-local-data-changed', checkBackupStatus);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibility);
            }
        };
    }, [pcSummaryCount]);

    return {
        hasUnbackedChanges: reminderReason !== null,
        reminderReason
    };
}
