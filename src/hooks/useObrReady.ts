import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';

/**
 * A React hook that tracks the readiness state of the Owlbear Rodeo SDK.
 * Use this to conditionally render loaders or block UI interactions
 * until OBR is fully connected.
 */
export const useObrReady = (): boolean => {
    const [isObrReady, setIsObrReady] = useState<boolean>(() => Boolean(OBR.isAvailable && OBR.isReady));

    useEffect(() => {
        if (!OBR.isAvailable || OBR.isReady) return;

        OBR.onReady(() => {
            setIsObrReady(true);
        });
    }, []);

    return isObrReady;
};
