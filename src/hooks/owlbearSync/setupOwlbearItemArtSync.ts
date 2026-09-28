import OBR from '@owlbear-rodeo/sdk';
import {
    setItemArt,
    getItemArt,
    getRemoteShareableItemArt,
    isRemoteShareableUrl,
    mergeItemArt
} from '../../utils/graphics/itemArtCatalog';
import { EXTENSION_ID } from './owlbearSyncConstants';

export interface OwlbearItemArtSyncResult {
    unsubs: Array<() => void>;
    cleanup: () => void;
}

export function setupOwlbearItemArtSync(isMounted: () => boolean): OwlbearItemArtSyncResult {
    const unsubs: Array<() => void> = [];
    let itemArtHandshakeTimeout: ReturnType<typeof setTimeout> | null = null;

    const unsubItemArtUpdate = OBR.broadcast.onMessage(`${EXTENSION_ID}/item-art-update`, (event) => {
        const data = event.data as { name?: string; imageUrl?: string };
        if (data && data.name && data.imageUrl) {
            setItemArt(data.name, data.imageUrl, true /* skipBroadcast */);
        }
    });
    unsubs.push(unsubItemArtUpdate);

    const unsubItemArtRequest = OBR.broadcast.onMessage(`${EXTENSION_ID}/item-art-request`, () => {
        const catalog = getRemoteShareableItemArt();
        if (Object.keys(catalog).length > 0) {
            OBR.broadcast
                .sendMessage(`${EXTENSION_ID}/item-art-sync`, catalog, {
                    destination: 'REMOTE'
                })
                .catch(() => {});
        }
    });
    unsubs.push(unsubItemArtRequest);

    const unsubItemArtQuery = OBR.broadcast.onMessage(`${EXTENSION_ID}/item-art-query`, (event) => {
        const data = event.data as { name?: string };
        if (data && data.name) {
            const art = getItemArt(data.name);
            if (art && isRemoteShareableUrl(art)) {
                OBR.broadcast
                    .sendMessage(
                        `${EXTENSION_ID}/item-art-update`,
                        { name: data.name, imageUrl: art },
                        { destination: 'REMOTE' }
                    )
                    .catch(() => {});
            }
        }
    });
    unsubs.push(unsubItemArtQuery);

    const unsubItemArtSync = OBR.broadcast.onMessage(`${EXTENSION_ID}/item-art-sync`, (event) => {
        const catalog = event.data as Record<string, string>;
        if (catalog && typeof catalog === 'object') {
            mergeItemArt(catalog, true /* skipBroadcast */);
        }
    });
    unsubs.push(unsubItemArtSync);

    // Proactively broadcast our shareable item art catalog to any active peers
    const initialShareable = getRemoteShareableItemArt();
    if (Object.keys(initialShareable).length > 0) {
        OBR.broadcast
            .sendMessage(`${EXTENSION_ID}/item-art-sync`, initialShareable, { destination: 'REMOTE' })
            .catch(() => {});
    }

    // Request item art catalog from active peers in the room
    OBR.broadcast.sendMessage(`${EXTENSION_ID}/item-art-request`, {}, { destination: 'REMOTE' }).catch(() => {});

    // Follow-up handshake request to catch late-arriving peers
    itemArtHandshakeTimeout = setTimeout(() => {
        if (!isMounted()) return;
        OBR.broadcast.sendMessage(`${EXTENSION_ID}/item-art-request`, {}, { destination: 'REMOTE' }).catch(() => {});

        const currentShareable = getRemoteShareableItemArt();
        if (Object.keys(currentShareable).length > 0) {
            OBR.broadcast
                .sendMessage(`${EXTENSION_ID}/item-art-sync`, currentShareable, { destination: 'REMOTE' })
                .catch(() => {});
        }
    }, 1500);

    const cleanup = () => {
        if (itemArtHandshakeTimeout) clearTimeout(itemArtHandshakeTimeout);
        unsubs.forEach((unsub) => unsub());
    };

    return { unsubs, cleanup };
}
