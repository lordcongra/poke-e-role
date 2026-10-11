import { useState, useEffect, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { BattlefieldData, BattleRoundData } from '../../../types/battleOrganizerTypes';

export const SCENE_ID_META_KEY = 'pokerole-pmd-extension/scene-id';

export async function getOrCreateSceneId(): Promise<string | null> {
    try {
        if (!OBR.isAvailable) return null;
        const isReady = await OBR.scene.isReady();
        if (!isReady) return null;
        const meta = await OBR.scene.getMetadata();
        let sid = meta[SCENE_ID_META_KEY] as string | undefined;
        if (!sid) {
            const role = await OBR.player.getRole().catch(() => 'PLAYER');
            if (role === 'GM') {
                sid = crypto.randomUUID();
                await OBR.scene.setMetadata({ [SCENE_ID_META_KEY]: sid });
            }
        }
        return sid || null;
    } catch {
        return null;
    }
}

export interface UseSceneSwapDetectionProps {
    battlefield: BattlefieldData;
    rounds: BattleRoundData[];
    updateBattlefield: <K extends keyof BattlefieldData>(key: K, value: BattlefieldData[K]) => void;
    clearAll: () => void;
}

export function useSceneSwapDetection({
    battlefield,
    rounds,
    updateBattlefield,
    clearAll
}: UseSceneSwapDetectionProps) {
    const [showSceneSwapModal, setShowSceneSwapModal] = useState(false);
    const pendingSceneIdRef = useRef<string | null>(null);

    useEffect(() => {
        const handleSimulatedSwap = (e: Event) => {
            const newSid =
                (e as CustomEvent<{ sceneId?: string }>).detail?.sceneId || `simulated-scene-${Date.now()}`;
            const hasCombatants = rounds.some((r) => r.combatants.length > 0);
            if (hasCombatants) {
                pendingSceneIdRef.current = newSid;
                setShowSceneSwapModal(true);
            } else {
                updateBattlefield('sceneId', newSid);
            }
        };
        window.addEventListener('pkr-simulate-scene-swap', handleSimulatedSwap);

        if (!OBR.isAvailable) {
            return () => {
                window.removeEventListener('pkr-simulate-scene-swap', handleSimulatedSwap);
            };
        }

        let isMounted = true;

        // Check scene ID on mount
        getOrCreateSceneId().then((currentSid) => {
            if (!isMounted || !currentSid) return;
            if (!battlefield.sceneId) {
                updateBattlefield('sceneId', currentSid);
            } else if (battlefield.sceneId !== currentSid) {
                const hasCombatants = rounds.some((r) => r.combatants.length > 0);
                if (hasCombatants) {
                    pendingSceneIdRef.current = currentSid;
                    setShowSceneSwapModal(true);
                } else {
                    updateBattlefield('sceneId', currentSid);
                }
            }
        });

        const unsubReady = OBR.scene.onReadyChange(async (ready) => {
            if (!isMounted || !ready) return;
            const role = await OBR.player.getRole().catch(() => 'PLAYER');
            if (role !== 'GM') return;

            const currentSid = await getOrCreateSceneId();
            if (!isMounted || !currentSid) return;

            if (!battlefield.sceneId) {
                updateBattlefield('sceneId', currentSid);
            } else if (battlefield.sceneId !== currentSid) {
                const hasCombatants = rounds.some((r) => r.combatants.length > 0);
                if (hasCombatants) {
                    pendingSceneIdRef.current = currentSid;
                    setShowSceneSwapModal(true);
                } else {
                    updateBattlefield('sceneId', currentSid);
                }
            }
        });

        return () => {
            isMounted = false;
            unsubReady();
            window.removeEventListener('pkr-simulate-scene-swap', handleSimulatedSwap);
        };
    }, [battlefield.sceneId, rounds, updateBattlefield]);

    const handleClearForNewScene = () => {
        clearAll();
        const newSid = pendingSceneIdRef.current;
        if (newSid) {
            updateBattlefield('sceneId', newSid);
        }
        setShowSceneSwapModal(false);
        pendingSceneIdRef.current = null;
    };

    const handleKeepCurrentBattle = () => {
        const newSid = pendingSceneIdRef.current;
        if (newSid) {
            updateBattlefield('sceneId', newSid);
        }
        setShowSceneSwapModal(false);
        pendingSceneIdRef.current = null;
    };

    return {
        showSceneSwapModal,
        handleClearForNewScene,
        handleKeepCurrentBattle
    };
}
