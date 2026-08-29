import React, { useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';

interface UseOwlbearPopoverResizeProps {
    isReady: boolean;
    isStandaloneMode: boolean;
    layout: 'vertical' | 'horizontal';
    maxTrackerWidth: number;
    maxTrackerHeight: number;
    viewportMaxWidth: number;
    // We pass dependencies like 'combatants' or 'showAddMenu' so the observer knows when to recalculate
    dependencies: React.DependencyList;
}

export function useOwlbearPopoverResize({
    isReady,
    isStandaloneMode,
    layout,
    maxTrackerWidth,
    maxTrackerHeight,
    viewportMaxWidth,
    dependencies
}: UseOwlbearPopoverResizeProps) {
    const ghostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isReady || !ghostRef.current || !OBR.isAvailable || isStandaloneMode) return;

        let animationFrameId: number;

        const resizeObserver = new ResizeObserver(() => {
            cancelAnimationFrame(animationFrameId);

            animationFrameId = requestAnimationFrame(async () => {
                const ghostEl = ghostRef.current;
                if (!ghostEl) return;

                const naturalWidth = ghostEl.offsetWidth;
                const naturalHeight = ghostEl.offsetHeight;

                const limitW = maxTrackerWidth > 0 ? maxTrackerWidth : viewportMaxWidth > 0 ? viewportMaxWidth : 800;
                const limitH = maxTrackerHeight > 0 ? maxTrackerHeight : 9999;

                let targetWidth = naturalWidth + 12; // 6px padding on each side for wrapper shadow
                let targetHeight = naturalHeight + 12; // 6px padding on top/bottom

                if (targetWidth > limitW && layout === 'horizontal') {
                    targetHeight += 8;
                }
                if (targetHeight > limitH && layout === 'vertical') {
                    targetWidth += 8;
                }

                targetWidth = Math.min(targetWidth, limitW);
                targetHeight = Math.min(targetHeight, limitH);

                try {
                    const currentW = (await OBR.popover.getWidth('pkr-initiative-tracker')) ?? 0;
                    const currentH = (await OBR.popover.getHeight('pkr-initiative-tracker')) ?? 0;

                    if (Math.abs(currentW - targetWidth) > 2 || Math.abs(currentH - targetHeight) > 2) {
                        localStorage.setItem('pkr_init_width', targetWidth.toString());
                        localStorage.setItem('pkr_init_height', targetHeight.toString());

                        await OBR.popover.setWidth('pkr-initiative-tracker', targetWidth).catch(() => {});
                        await OBR.popover.setHeight('pkr-initiative-tracker', targetHeight).catch(() => {});
                    }
                } catch (error) {
                    console.error('[InitiativeTracker] Resize observer error:', error);
                }
            });
        });

        resizeObserver.observe(ghostRef.current);
        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, isStandaloneMode, layout, maxTrackerWidth, maxTrackerHeight, viewportMaxWidth, ...dependencies]);

    return ghostRef;
}
