import { useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { isStandaloneMode } from '../utils/sync/storageAdapter';
import { homebrewStorage, initHomebrewBroadcastSync } from '../utils/sync/homebrewStorage';
import { waitForObr } from '../utils/sync/obrHelpers';
import { initItemArtCatalog, harvestTokensItemArt } from '../utils/graphics/itemArtCatalog';
import {
    setupOwlbearRoomSync,
    setupOwlbearTokenSync,
    setupOwlbearPlayerSync,
    setupOwlbearHomebrewSync,
    setupOwlbearItemArtSync,
    setupOwlbearRollSync
} from './owlbearSync';

export function useOwlbearSync() {
    useEffect(() => {
        let isMounted = true;
        const unsubs: Array<() => void> = [];
        let cleanupTokenSync: (() => void) | null = null;
        let cleanupItemArtSync: (() => void) | null = null;

        // 1. Load Local Homebrew and run one-time localStorage migration
        useCharacterStore.getState().loadHomebrewLocal();
        homebrewStorage.runLocalStorageMigration().catch(() => {});

        // 2. Multi-tab BroadcastChannel sync for standalone mode
        unsubs.push(
            initHomebrewBroadcastSync((data) => {
                useCharacterStore.getState().applyHomebrewSync(data);
            })
        );

        // 3. Initialize Item Art Catalog (IndexedDB -> in-memory) for both Standalone and OBR
        initItemArtCatalog().catch((e) => console.warn('[SyncEngine] Failed to init item art catalog:', e));

        // Skip Owlbear bindings entirely if running as a standalone app!
        if (isStandaloneMode) return () => unsubs.forEach((u) => u());

        if (OBR.isAvailable) {
            waitForObr().then(async () => {
                if (!isMounted) return;

                const role = await OBR.player.getRole();
                const currentStore = useCharacterStore.getState();
                currentStore.setTokenData(currentStore.tokenId || '', role);
                currentStore.loadHomebrewLocal();

                // Passively harvest scene tokens for item art immediately upon ready
                OBR.scene.items.getItems().then(harvestTokensItemArt, () => {});

                // Forward declaration for token re-rendering
                let renderTokens: ((forceRebuild?: boolean | 'badges-only') => Promise<void>) | null = null;

                // 1. Load Room Settings and Scene Settings FIRST
                const roomSync = await setupOwlbearRoomSync(role, async (forceRebuild) => {
                    if (renderTokens) await renderTokens(forceRebuild);
                });
                unsubs.push(...roomSync.unsubs);
                if (!isMounted) return;

                // 2. Set up Token Sync with scene sync and ready management
                const tokenSync = await setupOwlbearTokenSync({
                    role,
                    syncSceneSettings: roomSync.syncSceneSettings,
                    resetSceneSyncState: roomSync.resetSceneSyncState,
                    isMounted: () => isMounted
                });
                renderTokens = tokenSync.renderAllTokens;
                cleanupTokenSync = tokenSync.cleanup;
                if (!isMounted) return;

                // 3. Set up Player Sync (active token selection & role changes)
                const playerSync = await setupOwlbearPlayerSync({ role });
                unsubs.push(...playerSync.unsubs);

                // 4. Set up Homebrew P2P Broadcasts
                const homebrewSync = setupOwlbearHomebrewSync(role);
                unsubs.push(...homebrewSync.unsubs);

                // 5. Set up Item Art P2P Broadcasts
                const itemArtSync = setupOwlbearItemArtSync(() => isMounted);
                cleanupItemArtSync = itemArtSync.cleanup;

                // 6. Set up Roll Results & Roll Log Broadcasts
                const rollSync = setupOwlbearRollSync();
                unsubs.push(...rollSync.unsubs);
            });
        }

        return () => {
            isMounted = false;
            if (cleanupTokenSync) cleanupTokenSync();
            if (cleanupItemArtSync) cleanupItemArtSync();
            unsubs.forEach((unsub) => unsub());
        };
    }, []);
}
