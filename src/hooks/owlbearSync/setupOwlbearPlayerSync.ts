import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { fetchMoveData } from '../../utils/api/api';
import { saveToOwlbear, getIsPcSheetActive } from '../../utils/sync/obr';
import { harvestTokensItemArt } from '../../utils/graphics/itemArtCatalog';
import { METADATA_ID } from './owlbearSyncConstants';
import { hydrateActiveSheet } from '../../utils/sync/unifiedSheetHydration';

export interface OwlbearPlayerSyncResult {
    loadTokenAndLearnset: (targetTokenId: string, overrideRole?: 'PLAYER' | 'GM') => Promise<void>;
    unsubs: Array<() => void>;
}

export async function setupOwlbearPlayerSync(params: { role: 'PLAYER' | 'GM' }): Promise<OwlbearPlayerSyncResult> {
    const { role } = params;
    const unsubs: Array<() => void> = [];

    const loadTokenAndLearnset = async (targetTokenId: string, overrideRole?: 'PLAYER' | 'GM') => {
        if (getIsPcSheetActive()) {
            return;
        }
        try {
            const items = await OBR.scene.items.getItems([targetTokenId]);
            if (items.length > 0) {
                harvestTokensItemArt(items).catch(() => {});
                const tokenItem = items[0];
                const rawMeta = tokenItem.metadata[METADATA_ID] || tokenItem.metadata['pokerole-pmd-extension/stats'];
                if (tokenItem.layer !== 'CHARACTER' && !rawMeta) {
                    return;
                }

                const currentRole = overrideRole || (await OBR.player.getRole()) || role;
                if (currentRole !== 'GM' && tokenItem.locked) {
                    const myId = await OBR.player.getId().catch(() => undefined);
                    const claim = tokenItem.metadata?.['pokerole-pmd-extension/claimed-by'] as
                        | { playerId?: string }
                        | undefined;
                    if (tokenItem.createdUserId !== myId && claim?.playerId !== myId) {
                        if (OBR.isAvailable) {
                            OBR.notification.show(
                                'This character sheet is locked by the GM. Ask your GM to unlock it to view or add it!',
                                'INFO'
                            );
                        }
                        return;
                    }
                }
                const store = useCharacterStore.getState();
                const meta = rawMeta as Record<string, unknown> | undefined;

                if (meta) {
                    try {
                        await hydrateActiveSheet({
                            targetId: targetTokenId,
                            overrideRole: currentRole,
                            sourceMeta: meta,
                            tokenItem,
                            saveIfNewer: true,
                            applyTheme: true,
                            fetchSpecies: true
                        });
                    } catch (e) {
                        console.error(
                            '[SyncEngine] CRITICAL: Corrupted token metadata detected. Resetting sheet to protect engine.',
                            e
                        );
                        if (OBR.isAvailable) {
                            OBR.notification.show('Corrupted character data on token! Please re-import.', 'ERROR');
                        }
                    }

                    // Legacy v2 token move migration (GM only)
                    try {
                        const isOldToken = meta['v2-migrated'] !== true;
                        const migrationTokenId = targetTokenId;
                        if (isOldToken && role === 'GM') {
                            const currentStore = useCharacterStore.getState();
                            for (const move of currentStore.moves) {
                                if (move.name) {
                                    fetchMoveData(move.name)
                                        .then((data) => {
                                            if (data && useCharacterStore.getState().tokenId === migrationTokenId) {
                                                useCharacterStore
                                                    .getState()
                                                    .applyMoveData(move.id, data as Record<string, unknown>);
                                            }
                                        })
                                        .catch(() => {});
                                }
                            }
                            if (useCharacterStore.getState().tokenId === migrationTokenId) {
                                saveToOwlbear({ 'v2-migrated': true });
                            }
                        }
                    } catch (e) {
                        console.error('[SyncEngine] Error during legacy v2 migration:', e);
                    }
                } else {
                    store.loadFromOwlbear({});
                    store.applyLearnset({ Moves: [] });
                }
            }
        } catch (error) {
            console.error('[SyncEngine] FATAL: Engine prevented from crashing during token load.', error);
        }
    };

    try {
        const selected = await OBR.player.getSelection();
        if (selected && selected.length > 0) {
            await loadTokenAndLearnset(selected[0], role);
        }
    } catch (e) {
        console.error('[SyncEngine] Engine recovered from startup selection crash:', e);
    }

    const unsubPlayer = OBR.player.onChange(async (player) => {
        const currentRole = player.role || (await OBR.player.getRole());
        const store = useCharacterStore.getState();
        if (store.role !== currentRole) {
            store.setTokenData(store.tokenId || '', currentRole);
        }
        if (player.selection && player.selection.length > 0) {
            try {
                await loadTokenAndLearnset(player.selection[0], currentRole);
            } catch (e) {
                console.error('[SyncEngine] Engine recovered from token click crash:', e);
            }
        }
    });
    unsubs.push(unsubPlayer);

    return { loadTokenAndLearnset, unsubs };
}
