import { useState, useEffect, useCallback } from 'react';
import OBR, { type Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, TrainerRoster, CampaignProfile } from '../../../types/pcStorageTypes';
import { METADATA_ID } from '../../../utils/sync/obr';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { resolveSceneCandidateMatch, scanStandaloneCandidates } from '../../../utils/pc/pcCandidateMatching';
import type { SceneCandidate } from './PcDepositCandidateCard';

interface UseSceneCandidatesParams {
    isGm: boolean;
    currentRole: 'PLAYER' | 'GM';
    currentMyPlayerId?: string;
    partySlots: (string | null)[];
    pokemonSummaries: Record<string, PcPokemonSummary>;
    trainerName?: string;
    activeTrainerId?: string;
    trainers?: TrainerRoster[];
    campaign?: CampaignProfile;
    allCampaigns?: Record<string, CampaignProfile>;
}

export function useSceneCandidates({
    isGm,
    currentRole,
    currentMyPlayerId,
    partySlots,
    pokemonSummaries,
    trainerName,
    activeTrainerId,
    trainers,
    campaign,
    allCampaigns
}: UseSceneCandidatesParams) {
    const [sceneCandidates, setSceneCandidates] = useState<SceneCandidate[]>([]);
    const [isLoadingScene, setIsLoadingScene] = useState(false);

    const scanScene = useCallback(
        async (showLoading = false) => {
            if (showLoading) setIsLoadingScene(true);
            try {
                let items: Item[] = [];
                if (isGm) {
                    items = await OBR.scene.items.getItems();
                } else {
                    const selection = await OBR.player.getSelection();
                    if (selection && selection.length > 0) {
                        items = await OBR.scene.items.getItems(selection);
                    }
                }

                const myPlayerId = await OBR.player.getId().catch(() => currentMyPlayerId);
                const found: SceneCandidate[] = [];

                for (const item of items) {
                    const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                    const mode = (meta.mode as string) || '';
                    if (mode === 'Trainer' || mode === 'Trainer (Special)') continue;

                    const species = (meta.species as string) || (meta.name as string);
                    if (species) {
                        const imgUrl =
                            (meta['token-image-url'] as string) ||
                            ((item as { image?: { url?: string } }).image?.url ?? getAbsolutePokeballUrl());
                        const hpCurr = Number(meta['hp-curr']) || (typeof meta.hp === 'number' ? meta.hp : 10);
                        const hpMax =
                            Number(meta['hp-max-display']) || (typeof meta.hpMax === 'number' ? meta.hpMax : 10);
                        const willCurr = Number(meta['will-curr']) || (typeof meta.will === 'number' ? meta.will : 5);
                        const willMax =
                            Number(meta['will-max-display']) || (typeof meta.willMax === 'number' ? meta.willMax : 5);

                        const { matchedEntityId, isInParty, isInBoxes, claimedBy } = resolveSceneCandidateMatch(
                            item,
                            pokemonSummaries,
                            partySlots,
                            myPlayerId,
                            activeTrainerId,
                            trainerName,
                            trainers,
                            campaign,
                            allCampaigns,
                            currentRole
                        );

                        found.push({
                            id: item.id,
                            name: (meta.name as string) || (meta.nickname as string) || item.name || species,
                            species,
                            imageUrl: imgUrl,
                            hp: hpCurr,
                            maxHp: hpMax,
                            will: willCurr,
                            maxWill: willMax,
                            type1: (meta.type1 as string) || 'Normal',
                            type2: meta.type2 as string | undefined,
                            rank: (meta.rank as string) || 'Starter',
                            item,
                            metadata: meta,
                            claimedBy: !isGm && item.locked ? 'Locked by GM (Ask GM to unlock)' : claimedBy,
                            isInParty,
                            isInBoxes,
                            matchedEntityId
                        });
                    }
                }
                setSceneCandidates(found);
            } catch (e) {
                console.error('[PcDepositDrawer] Error scanning scene:', e);
            } finally {
                if (showLoading) setIsLoadingScene(false);
            }
        },
        [
            isGm,
            currentRole,
            currentMyPlayerId,
            partySlots,
            pokemonSummaries,
            trainerName,
            activeTrainerId,
            trainers,
            campaign,
            allCampaigns
        ]
    );

    useEffect(() => {
        if (!OBR.isAvailable) {
            setIsLoadingScene(true);
            scanStandaloneCandidates(pokemonSummaries, partySlots)
                .then((candidates) => setSceneCandidates(candidates as SceneCandidate[]))
                .finally(() => setIsLoadingScene(false));
            return;
        }

        scanScene(true);

        let debouncedTimer: ReturnType<typeof setTimeout> | null = null;
        const unsub = OBR.scene.items.onChange(() => {
            if (debouncedTimer) clearTimeout(debouncedTimer);
            debouncedTimer = setTimeout(() => {
                scanScene(false);
            }, 300);
        });

        return () => {
            if (debouncedTimer) clearTimeout(debouncedTimer);
            unsub();
        };
    }, [scanScene, partySlots, pokemonSummaries]);

    return {
        sceneCandidates,
        isLoadingScene,
        scanScene
    };
}
