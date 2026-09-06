import { useEffect, useCallback } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { isStandaloneMode } from '../utils/storageAdapter';

export function useInitiativePopover(isObrReady: boolean) {
    const identity = useCharacterStore((state) => state.identity);

    const openTracker = useCallback(async () => {
        const isReady = isObrReady || Boolean(OBR.isAvailable && OBR.isReady);
        if (!isReady || !OBR.isAvailable) {
            console.warn('[useInitiativePopover] Cannot open tracker - OBR not ready:', {
                isAvailable: OBR.isAvailable,
                isReady: OBR.isReady,
                isObrReady
            });
            return;
        }

        try {
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

            // Safe viewport query with fallbacks to avoid NaN coordinates or unhandled rejections
            let width = 1200;
            let height = 800;
            try {
                const [wRes, hRes] = await Promise.allSettled([
                    OBR.viewport.getWidth(),
                    OBR.viewport.getHeight()
                ]);
                if (wRes.status === 'fulfilled' && typeof wRes.value === 'number') {
                    width = wRes.value;
                }
                if (hRes.status === 'fulfilled' && typeof hRes.value === 'number') {
                    height = hRes.value;
                }
            } catch (vpErr) {
                console.warn('[useInitiativePopover] Failed to query viewport dimensions, using defaults:', vpErr);
            }

            let anchorPosition = { top: 0, left: 0 };
            let transformOrigin: {
                vertical: 'TOP' | 'CENTER' | 'BOTTOM';
                horizontal: 'LEFT' | 'CENTER' | 'RIGHT';
            } = { vertical: 'TOP', horizontal: 'LEFT' };

            const posX = typeof initiativeTrackerOffsetX === 'number' ? initiativeTrackerOffsetX : 0;
            const posY = typeof initiativeTrackerOffsetY === 'number' ? initiativeTrackerOffsetY : 0;

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
                    anchorPosition = { top: Math.round(height / 2) + posY, left: posX };
                    transformOrigin = { vertical: 'CENTER', horizontal: 'LEFT' };
                    break;
                case 'center-right':
                    anchorPosition = { top: Math.round(height / 2) + posY, left: width + posX };
                    transformOrigin = { vertical: 'CENTER', horizontal: 'RIGHT' };
                    break;
                case 'top-center':
                    anchorPosition = { top: posY, left: Math.round(width / 2) + posX };
                    transformOrigin = { vertical: 'TOP', horizontal: 'CENTER' };
                    break;
                case 'bottom-center':
                    anchorPosition = { top: height + posY, left: Math.round(width / 2) + posX };
                    transformOrigin = { vertical: 'BOTTOM', horizontal: 'CENTER' };
                    break;
                default:
                    anchorPosition = { top: posY, left: width + posX };
                    transformOrigin = { vertical: 'TOP', horizontal: 'RIGHT' };
                    break;
            }

            // Ensure coordinates are strictly finite numbers to prevent OBR popover placement rejection
            if (isNaN(anchorPosition.left) || !isFinite(anchorPosition.left)) anchorPosition.left = 0;
            if (isNaN(anchorPosition.top) || !isFinite(anchorPosition.top)) anchorPosition.top = 0;

            const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
            const themeToPass = document.body.getAttribute('data-theme') || 'dark';
            const url = `${baseUrl}/initiative-tracker.html?layout=${initiativeTrackerLayout || 'vertical'}&theme=${themeToPass}&shape=${initiativeTrackerAvatarShape || 'circle'}&mw=${initiativeTrackerMaxWidth || 400}&mh=${initiativeTrackerMaxHeight || 600}`;

            const isVertical = (initiativeTrackerLayout || 'vertical') === 'vertical';
            const defaultWidth = isVertical ? 180 : 400;
            const defaultHeight = isVertical ? 380 : 120;

            let savedW = defaultWidth;
            let savedH = defaultHeight;
            try {
                const rawW = localStorage.getItem('pkr_init_width');
                const rawH = localStorage.getItem('pkr_init_height');
                if (rawW) savedW = parseInt(rawW, 10) || defaultWidth;
                if (rawH) savedH = parseInt(rawH, 10) || defaultHeight;
            } catch (storageErr) {
                console.warn('[useInitiativePopover] Storage access failed or denied, using defaults:', storageErr);
            }

            await OBR.popover.open({
                id: 'pkr-initiative-tracker',
                url: url,
                height: savedH || defaultHeight,
                width: savedW || defaultWidth,
                disableClickAway: true,
                anchorReference: 'POSITION',
                anchorPosition: anchorPosition,
                transformOrigin: transformOrigin
            });
        } catch (e) {
            console.error('[useInitiativePopover] Failed to open OBR popover:', e);
        }
    }, [isObrReady, identity]);

    useEffect(() => {
        if (!isObrReady || !OBR.isAvailable || isStandaloneMode) return;

        const timeout = setTimeout(() => {
            const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
                unsub();
                openTracker().catch((e) => {
                    console.error('[useInitiativePopover] openTracker failed on initial ping:', e);
                });
            });
            OBR.broadcast.sendMessage('pkr-init-ping-check', {}, { destination: 'LOCAL' }).catch(() => {});
            setTimeout(() => unsub(), 100);
        }, 300);
        return () => clearTimeout(timeout);
    }, [isObrReady, openTracker]);

    const handleInitiativeToggle = async () => {
        if (isStandaloneMode) {
            window.dispatchEvent(new Event('toggle-standalone-tracker'));
            return;
        }

        const isReady = isObrReady || Boolean(OBR.isAvailable && OBR.isReady);
        if (!OBR.isAvailable || !isReady) {
            console.warn('[useInitiativePopover] Cannot toggle tracker - OBR not ready:', {
                isAvailable: OBR.isAvailable,
                isReady: OBR.isReady,
                isObrReady
            });
            return;
        }

        let handled = false;
        const unsub = OBR.broadcast.onMessage('pkr-init-pong', () => {
            handled = true;
            unsub();
            OBR.popover.close('pkr-initiative-tracker').catch((e) => {
                console.warn('[useInitiativePopover] Failed to close OBR popover:', e);
            });
        });

        try {
            await OBR.broadcast.sendMessage('pkr-init-ping-toggle', {}, { destination: 'LOCAL' });
        } catch (bErr) {
            console.warn('[useInitiativePopover] Broadcast send failed:', bErr);
        }

        setTimeout(() => {
            unsub();
            if (!handled) {
                openTracker().catch((e) => {
                    console.error('[useInitiativePopover] openTracker failed on toggle:', e);
                });
            }
        }, 200);
    };

    return { handleInitiativeToggle };
}
