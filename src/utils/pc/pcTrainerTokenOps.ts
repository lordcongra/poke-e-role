import OBR from '@owlbear-rodeo/sdk';
import type { PcStorageData, TrainerRoster } from '../../types/pcStorageTypes';
import { spawnTrainerToMap } from './pcTrainerOps';
import { initStandaloneTrainerSheet } from './pcStorageStoreOps';
import { savePcStorage } from './pcStorageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';

export interface LinkAndSpawnTrainerTokenParams {
    trainer: TrainerRoster;
    imageUrl: string;
    role: 'PLAYER' | 'GM';
    pcData: PcStorageData;
    campaignId: string;
}

/**
 * Spawns a token for an unlinked trainer (in OBR or standalone) and marks the trainer as linked.
 */
export async function linkAndSpawnTrainerToken(
    params: LinkAndSpawnTrainerTokenParams
): Promise<{ nextPcData: PcStorageData; newMapTokenId?: string }> {
    const { trainer, imageUrl, role, pcData, campaignId } = params;
    const camp = pcData.campaigns[campaignId];
    if (!camp) return { nextPcData: pcData };

    let newMapTokenId: string | undefined;

    if (OBR.isAvailable) {
        const res = await spawnTrainerToMap({ ...trainer, avatarUrl: imageUrl }, role);
        newMapTokenId = res.newMapTokenId;
    } else {
        initStandaloneTrainerSheet(trainer.id, trainer.name);
    }

    const nextTrainer: TrainerRoster = {
        ...trainer,
        isLinked: true,
        avatarUrl: imageUrl,
        mapTokenId: newMapTokenId || trainer.mapTokenId,
        fullMetadata: {
            ...(trainer.fullMetadata || {}),
            entityId: newMapTokenId || trainer.id,
            name: trainer.name,
            nickname: trainer.name,
            species: trainer.name,
            mode: 'Trainer',
            rank: (trainer.fullMetadata?.rank as string) || 'Starter',
            'token-image-url': imageUrl,
            'str-base': trainer.fullMetadata?.['str-base'] ?? 1,
            'dex-base': trainer.fullMetadata?.['dex-base'] ?? 1,
            'vit-base': trainer.fullMetadata?.['vit-base'] ?? 1,
            'ins-base': trainer.fullMetadata?.['ins-base'] ?? 1,
            'spe-base': trainer.fullMetadata?.['spe-base'] ?? 1,
            'hp-curr': trainer.fullMetadata?.['hp-curr'] ?? 5,
            'hp-max-display': trainer.fullMetadata?.['hp-max-display'] ?? 5,
            'hp-base': 4,
            'will-curr': trainer.fullMetadata?.['will-curr'] ?? 4,
            'will-max-display': trainer.fullMetadata?.['will-max-display'] ?? 4,
            'will-base': 3
        }
    };

    const nextPcData: PcStorageData = {
        ...pcData,
        campaigns: {
            ...pcData.campaigns,
            [campaignId]: {
                ...camp,
                trainers: {
                    ...camp.trainers,
                    [trainer.id]: nextTrainer
                }
            }
        }
    };

    useCharacterStore.setState({ pcData: nextPcData });
    savePcStorage(nextPcData);

    if (typeof window !== 'undefined') {
        try {
            window.dispatchEvent(new Event('pkr-local-data-changed'));
        } catch {}
    }

    return { nextPcData, newMapTokenId };
}
