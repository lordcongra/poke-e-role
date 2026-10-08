import { useState, useEffect } from 'react';
import { hasUnbackedData, storageAdapter, BACKUP_STATUS_EVENT } from '../../../utils/sync/storageAdapter';

export function usePcHeaderBackupStatus(): boolean {
    const [hasUnbackedChanges, setHasUnbackedChanges] = useState(false);

    useEffect(() => {
        const checkBackupStatus = async () => {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const flds = await storageAdapter.getFolders();
                setHasUnbackedChanges(hasUnbackedData(chars.length, flds.length));
            } catch {}
        };

        checkBackupStatus();
        window.addEventListener(BACKUP_STATUS_EVENT, checkBackupStatus);
        window.addEventListener('pkr-local-data-changed', checkBackupStatus);

        return () => {
            window.removeEventListener(BACKUP_STATUS_EVENT, checkBackupStatus);
            window.removeEventListener('pkr-local-data-changed', checkBackupStatus);
        };
    }, []);

    return hasUnbackedChanges;
}
