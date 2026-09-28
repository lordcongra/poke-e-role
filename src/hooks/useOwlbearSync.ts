import { useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { isStandaloneMode } from '../utils/sync/storageAdapter';
import { initItemArtCatalog, harvestTokensItemArt } from '../utils/graphics/itemArtCatalog';
import { setupOwlbearRoomSync } from './owlbearSync/setupOwlbearRoomSync';
import { setupOwlbearTokenSync } from './owlbearSync/setupOwlbearTokenSync';
import { setupOwlbearPlayerSync } from './owlbearSync/setupOwlbearPlayerSync';
import { setupOwlbearHomebrewSync } from './owlbearSync/setupOwlbearHomebrewSync';
import { setupOwlbearItemArtSync } from './owlbearSync/setupOwlbearItemArtSync';
import { setupOwlbearRollSync } from './owlbearSync/setupOwlbearRollSync';

export function useOwlbearSync() {
    useEffect(() => {
        let isMounted = true;
        const unsubs: Array<() => void> = [];
        let cleanupTokenSync: (() => void) | null = null;
        let cleanupItemArtSync: (() => void) | null = null;

        // 1. Load Local Homebrew for this specific room immediately
        useCharacterStore.getState().loadHomebrewLocal();

        // 2. Initialize Item Art Catalog (IndexedDB -> in-memory) for both Standalone and OBR
        initItemArtCatalog().catch((e) => console.warn('[SyncEngine] Failed to init item art catalog:', e));

        // Skip Owlbear bindings entirely if running as a standalone app!
        if (isStandaloneMode) {
            return;
        }

        if (OBR.isAvailable) {
            OBR.onReady(async () => {
                if (!isMounted) return;

                const role = await OBR.player.getRole();
                const currentStore = useCharacterStore.getState();
                currentStore.setTokenData(currentStore.tokenId || '', role);

                // Passively harvest scene tokens for item art immediately upon ready
                OBR.scene.items
                    .getItems()
                    .then(harvestTokensItemArt)
                    .catch(() => {});

                // Forward declaration for token re-rendering
                let renderTokens: ((forceRebuild?: boolean | 'badges-only') => Promise<void>) | null = null;

                // 1. Load Room Settings and Scene Settings FIRST, so roomDefaultScale is applied BEFORE any scene tokens are rendered
                const roomSync = await setupOwlbearRoomSync(role, async (forceRebuild) => {
                    if (renderTokens) {
                        await renderTokens(forceRebuild);
                    }
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
