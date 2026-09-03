import { useEffect, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { isStandaloneMode } from '../utils/storageAdapter';

export function useInitiativePopover(isObrReady: boolean) {
    const identity = useCharacterStore((state) => state.identity);

    const openTracker = useCallback(async () => {
        if (!isObrReady || !OBR.isAvailable) return;

        const identityStore = identity || {};
        const {
            initiativeTrackerPreset,
            initiativeTrackerOffsetX,
            initiativeTrackerOffsetY,
            initiativeTrackerLayout,
            initiativeTrackerAvatarShape,
            initiativeTrackerMaxWidth,
            initiativeTrackerMaxHeight
        } = identityStore;

        const width = await OBR.viewport.getWidth();
        const height = await OBR.viewport.getHeight();

        let anchorPosition = { top: 0, left: 0 };
        let transformOrigin = { vertical: 'TOP', horizontal: 'LEFT' };

        const posX = initiativeTrackerOffsetX || 0;
        const posY = initiativeTrackerOffsetY || 0;

        switch (initiativeTrackerPreset) {
            case 'top-left':
                anchorPosition = { top: posY, left: posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'LEFT' };
                break;
            case 'top-right':
                anchorPosition = { top: posY, left: width + posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'RIGHT' };
                break;
            case 'bottom-left':
                anchorPosition = { top: height + posY, left: posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'LEFT' };
                break;
            case 'bottom-right':
                anchorPosition = { top: height + posY, left: width + posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'RIGHT' };
                break;
            case 'center-left':
                anchorPosition = { top: height / 2 + posY, left: posX };
                transformOrigin = { vertical: 'CENTER', horizontal: 'LEFT' };
                break;
            case 'center-right':
                anchorPosition = { top: height / 2 + posY, left: width + posX };
                transformOrigin = { vertical: 'CENTER', horizontal: 'RIGHT' };
                break;
            case 'top-center':
                anchorPosition = { top: posY, left: width / 2 + posX };
                transformOrigin = { vertical: 'TOP', horizontal: 'CENTER' };
                break;
            case 'bottom-center':
                anchorPosition = { top: height + posY, left: width / 2 + posX };
                transformOrigin = { vertical: 'BOTTOM', horizontal: 'CENTER' };
                break;
        }

        const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        const themeToPass = document.body.getAttribute('data-theme') || 'dark';
        const url = `${baseUrl}/initiative-tracker.html?layout=${initiativeTrackerLayout || 'vertical'}&theme=${themeToPass}&shape=${initiativeTrackerAvatarShape || 'circle'}&mw=${initiativeTrackerMaxWidth || 400}&mh=${initiativeTrackerMaxHeight || 600}`;

        const isVertical = (initiativeTrackerLayout || 'vertical') === 'vertical';
        const defaultWidth = isVertical ? 180 : 400;
        const defaultHeight = isVertical ? 380 : 120;

        const savedW = parseInt(localStorage.getItem('pkr_init_width') || String(defaultWidth), 10);
        const savedH = parseInt(localStorage.getItem('pkr_init_height') || String(defaultHeight), 10);

        OBR.popover
            .open({
                id: 'pkr-initiative-tracker',
                url: url,
                height: savedH || defaultHeight,
                width: savedW || defaultWidth,
                disableClickAway: true,
                anchorReference: 'POSITION',
                anchorPosition: anchorPosition,
                // @ts-expect-error OBR SDK types expect exact enum for transformOrigin
                transformOrigin: transformOrigin
            })
            .catch((e) => {
                console.warn('[useInitiativePopover] Failed to open OBR popover:', e);
            });
    }, [isObrReady, identity]);

    useEffect(() => {
        if (!isObrReady || !OBR.isAvailable || isStandaloneMode) return;

        const timeout = setTimeout(() => {
            const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
                unsub();
                openTracker();
            });
            OBR.broadcast.sendMessage('pkr-init-ping-check', {}, { destination: 'LOCAL' });
            setTimeout(() => unsub(), 100);
        }, 300);
        return () => clearTimeout(timeout);
    }, [isObrReady, openTracker]);

    const handleInitiativeToggle = async () => {
        if (isStandaloneMode) {
            window.dispatchEvent(new Event('toggle-standalone-tracker'));
            return;
        }

        if (!OBR.isAvailable || !isObrReady) return;

        let handled = false;
        const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
            handled = true;
            unsub();
            OBR.popover.close('pkr-initiative-tracker').catch((e) => {
                console.warn('[useInitiativePopover] Failed to close OBR popover:', e);
            });
        });

        OBR.broadcast.sendMessage('pkr-init-ping-toggle', {}, { destination: 'LOCAL' });

        setTimeout(() => {
            unsub();
            if (!handled) {
                openTracker();
            }
        }, 150);
    };

    return { handleInitiativeToggle };
}
