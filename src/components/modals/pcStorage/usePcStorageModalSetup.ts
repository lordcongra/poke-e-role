import { useState, useEffect, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { PcStorageData } from '../../../types/pcStorageTypes';
import { sanitizePcData, savePcStorage } from '../../../utils/pc/pcStorageAdapter';
import { refreshSummariesFromLocalStorage, isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import { setCachedObrPlayerId } from '../../../utils/pc/pcCampaignTrainerOps';

export function usePcStorageModalSetup(
    pcData: PcStorageData,
    activeTokenId: string | null | undefined,
    role?: 'PLAYER' | 'GM'
) {
    const [myPlayerId, setMyPlayerId] = useState<string | undefined>();
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

    // Lock page scrolling & cache player ID
    useEffect(() => {
        document.body.classList.add('pc-modal-open');
        document.documentElement.classList.add('pc-modal-open');
        const [prevBodyOverflow, prevHtmlOverflow] = [
            document.body.style.overflow,
            document.documentElement.style.overflow
        ];
        document.body.style.overflow = document.documentElement.style.overflow = 'hidden';
        if (OBR.isAvailable) {
            OBR.player
                .getId()
                .then((id) => {
                    setMyPlayerId(id);
                    setCachedObrPlayerId(id);
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

    // Token lock check
    useEffect(() => {
        if (!OBR.isAvailable || role === 'GM') {
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
    }, [activeTokenId, role]);

    // Sanitize PC data on mount
    useEffect(() => {
        const sanitized = sanitizePcData(pcData);
        const { updated, hasChanges } = refreshSummariesFromLocalStorage(sanitized.pokemonSummaries || {});
        if (hasChanges || JSON.stringify(sanitized) !== JSON.stringify(pcData)) {
            const nextData = { ...sanitized, pokemonSummaries: updated };
            useCharacterStore.setState({ pcData: nextData });
            savePcStorage(nextData);
        }
    }, []);

    return {
        myPlayerId,
        isActiveTokenLocked,
        dismissBackupWarning,
        handleDismissWarning,
        desktopPartyLayout,
        handleTogglePartyLayout
    };
}
