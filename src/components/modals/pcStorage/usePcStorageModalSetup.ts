import { useState, useEffect, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { PcStorageData } from '../../../types/pcStorageTypes';
import { sanitizePcData, savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { refreshSummariesFromLocalStorage, isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import { setCachedObrPlayerId } from '../../../utils/pc/pcCampaignTrainerOps';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';

export function usePcStorageModalSetup(
    pcData: PcStorageData,
    activeTokenId: string | null | undefined,
    role?: 'PLAYER' | 'GM'
) {
    const isInitialized = useCharacterStore((state) => state.isInitialized);
    const [myPlayerId, setMyPlayerId] = useState<string | undefined>();
    const [currentRole, setCurrentRole] = useState<'PLAYER' | 'GM' | undefined>(role);
    const [isActiveTokenLocked, setIsActiveTokenLocked] = useState(false);
    const [dismissBackupWarning, setDismissBackupWarning] = useState(
        () => typeof localStorage !== 'undefined' && localStorage.getItem('pkr_pc_backup_warn_dismissed_v2') === 'true'
    );
    const [desktopPartyLayout, setDesktopPartyLayout] = useState<'vertical' | 'horizontal'>(() => {
        try {
            return (localStorage.getItem('pkr_pc_party_layout') as 'vertical' | 'horizontal') || 'horizontal';
        } catch {
            return 'horizontal';
        }
    });

    const handleTogglePartyLayout = useCallback(() => {
        setDesktopPartyLayout((prev) => {
            const next = prev === 'vertical' ? 'horizontal' : 'vertical';
            try {
                localStorage.setItem('pkr_pc_party_layout', next);
            } catch {}
            return next;
        });
    }, []);

    const handleDismissWarning = useCallback(() => {
        setDismissBackupWarning(true);
        try {
            localStorage.setItem('pkr_pc_backup_warn_dismissed_v2', 'true');
        } catch {}
    }, []);

    useEffect(() => {
        if (role && role !== currentRole) {
            setCurrentRole(role);
        }
    }, [role]);

    // Lock page scrolling & cache player ID / role
    useEffect(() => {
        document.body.classList.add('pc-modal-open');
        document.documentElement.classList.add('pc-modal-open');
        const [prevBodyOverflow, prevHtmlOverflow] = [
            document.body.style.overflow,
            document.documentElement.style.overflow
        ];
        document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
        if (OBR.isAvailable) {
            Promise.all([OBR.player.getId(), OBR.player.getRole()])
                .then(([id, playerRole]) => {
                    setMyPlayerId(id);
                    setCachedObrPlayerId(id);
                    setCurrentRole(playerRole);
                    if (role !== playerRole) {
                        useCharacterStore
                            .getState()
                            .setTokenData(useCharacterStore.getState().tokenId || '', playerRole);
                    }
                })
                .catch(() => {});
        }
        return () => {
            document.body.classList.remove('pc-modal-open');
            document.documentElement.classList.remove('pc-modal-open');
            document.body.style.overflow = prevBodyOverflow;
            document.documentElement.style.overflow = prevHtmlOverflow;
        };
    }, []);

    const effectiveIsGm = role === 'GM' || currentRole === 'GM' || isStandaloneMode;

    // Token lock check
    useEffect(() => {
        if (!OBR.isAvailable || effectiveIsGm) {
            setIsActiveTokenLocked(false);
            return;
        }
        if (activeTokenId) {
            OBR.scene.items
                .getItems([activeTokenId])
                .then((items) => {
                    setIsActiveTokenLocked(items[0] ? isEntityLockedByGm(items[0]) : false);
                })
                .catch(() => setIsActiveTokenLocked(false));
        } else {
            setIsActiveTokenLocked(false);
        }
    }, [activeTokenId, effectiveIsGm]);

    // Sanitize PC data on mount once initialized
    useEffect(() => {
        if (!isInitialized) return;
        const sanitized = sanitizePcData(pcData);
        const { updated, hasChanges } = refreshSummariesFromLocalStorage(sanitized.pokemonSummaries || {});
        if (hasChanges || JSON.stringify(sanitized) !== JSON.stringify(pcData)) {
            const nextData = { ...sanitized, pokemonSummaries: updated };
            useCharacterStore.setState({ pcData: nextData });
            savePcStorage(nextData);
        }
    }, [isInitialized]);

    return {
        myPlayerId,
        isActiveTokenLocked,
        dismissBackupWarning,
        handleDismissWarning,
        desktopPartyLayout,
        handleTogglePartyLayout,
        effectiveIsGm
    };
}
