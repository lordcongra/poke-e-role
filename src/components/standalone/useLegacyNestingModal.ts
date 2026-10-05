import { useState, useRef, useCallback } from 'react';
import { storageAdapter, type LocalCharacter, type LocalFolder } from '../../utils/sync/storageAdapter';
import {
    detectLegacyNestedCharacters,
    executeAutoFolderLegacyNesting,
    executeFlattenLegacyNesting
} from '../../utils/pc/pcLegacyNestingOps';

export function useLegacyNestingModal(onReload?: () => Promise<void>) {
    const [legacyNestedCount, setLegacyNestedCount] = useState(0);
    const [isLegacyNestingModalOpen, setIsLegacyNestingModalOpen] = useState(false);
    const legacyCheckDoneRef = useRef(false);
    const isMigratingRef = useRef(false);

    const checkLegacyNesting = useCallback((chars: LocalCharacter[], folders: LocalFolder[]) => {
        if (isMigratingRef.current) return;
        const detected = detectLegacyNestedCharacters(chars, folders);
        if (detected.length === 0) {
            setIsLegacyNestingModalOpen(false);
            setLegacyNestedCount(0);
            return;
        }
        if (legacyCheckDoneRef.current) return;
        setLegacyNestedCount(detected.length);
        setIsLegacyNestingModalOpen(true);
    }, []);

    const resetLegacyCheck = useCallback(() => {
        legacyCheckDoneRef.current = false;
    }, []);

    const handleAutoFolderLegacyNesting = useCallback(async () => {
        isMigratingRef.current = true;
        setIsLegacyNestingModalOpen(false);
        legacyCheckDoneRef.current = true;
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();
            await executeAutoFolderLegacyNesting(chars, flds);
        } finally {
            isMigratingRef.current = false;
        }
        if (onReload) await onReload();
    }, [onReload]);

    const handleFlattenLegacyNesting = useCallback(async () => {
        isMigratingRef.current = true;
        setIsLegacyNestingModalOpen(false);
        legacyCheckDoneRef.current = true;
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();
            await executeFlattenLegacyNesting(chars, flds);
        } finally {
            isMigratingRef.current = false;
        }
        if (onReload) await onReload();
    }, [onReload]);

    const handleDismissLegacyNesting = useCallback(() => {
        setIsLegacyNestingModalOpen(false);
        legacyCheckDoneRef.current = true;
    }, []);

    return {
        isLegacyNestingModalOpen,
        legacyNestedCount,
        checkLegacyNesting,
        resetLegacyCheck,
        handleAutoFolderLegacyNesting,
        handleFlattenLegacyNesting,
        handleDismissLegacyNesting
    };
}
