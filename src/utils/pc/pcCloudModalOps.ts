import OBR from '@owlbear-rodeo/sdk';
import type { PcBox, CampaignProfile, TrainerRoster, PcStorageData } from '../../types/pcStorageTypes';
import { syncToActiveScene, exportBoxCloud } from './pcCloudBackupOps';
import { downloadAndRestoreCloudScene } from './pcCloudRestoreOps';
import { markBackupComplete } from '../sync/storageAdapter';
import { savePcStorage } from './pcStorageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';

export async function executeCloudExport(
    customSceneName: string,
    currentBox: PcBox,
    campaign: CampaignProfile,
    pcData: PcStorageData,
    trainer?: TrainerRoster,
    includeParty: boolean = true,
    includeTrainer: boolean = true,
    targetMode: 'cloud' | 'activeScene' = 'cloud',
    backupAllBoxes: boolean = true
): Promise<boolean> {
    const partyIds = includeParty && trainer ? trainer.party : undefined;
    const trainerToExport = includeTrainer && trainer ? trainer : undefined;
    const currentTrainerBoxes = trainer?.boxes && trainer.boxes.length > 0 ? trainer.boxes : campaign.boxes;
    const allBoxesToPass = backupAllBoxes ? currentTrainerBoxes : [currentBox];

    if (targetMode === 'activeScene') {
        const success = await syncToActiveScene(
            currentBox,
            campaign,
            pcData.pokemonSummaries,
            partyIds,
            trainerToExport,
            allBoxesToPass
        );
        if (success) {
            markBackupComplete();
            if (OBR.isAvailable) {
                const label = backupAllBoxes ? 'All PC' : currentBox.name;
                OBR.notification.show(`Updated current scene with ${label} Pokémon!`, 'SUCCESS');
            }
        }
        return success;
    }

    const success = await exportBoxCloud(
        currentBox,
        campaign,
        pcData.pokemonSummaries,
        customSceneName,
        partyIds,
        trainerToExport,
        allBoxesToPass
    );
    if (success) {
        markBackupComplete();
        if (OBR.isAvailable) {
            OBR.notification.show(`Saved "${customSceneName}" to Owlbear Rodeo Cloud!`, 'SUCCESS');
        }
    }
    return success;
}

export async function executeCloudRestore(
    campaignName: string,
    pcData: PcStorageData,
    activeBoxIndex: number,
    role: 'PLAYER' | 'GM' = 'PLAYER',
    myPlayerId?: string
): Promise<boolean> {
    const res = await downloadAndRestoreCloudScene(campaignName, pcData, activeBoxIndex, role, myPlayerId);
    if (res.success && res.nextData) {
        useCharacterStore.setState({ pcData: res.nextData });
        await savePcStorage(res.nextData);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('pkr-local-data-changed'));
        if (OBR.isAvailable) {
            const trMsg = res.trainerRestored ? ' & Trainer' : '';
            OBR.notification.show(
                `Restored ${res.totalImported} Pokémon (${res.partyCount} Belt, ${res.boxCount} Box)${trMsg}!`,
                'SUCCESS'
            );
        }
        return true;
    } else if (res.error && OBR.isAvailable) {
        OBR.notification.show(res.error, 'WARNING');
    }
    return false;
}
