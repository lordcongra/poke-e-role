import { useState, useEffect, useCallback } from 'react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { setActiveTokenId } from '@/utils/sync/obr';
import { hydrateActiveSheet } from '@/utils/sync/unifiedSheetHydration';
import { fetchPokemonData } from '@/utils/api/api';
import { setItemArt } from '@/utils/graphics/itemArtCatalog';
import { storageAdapter } from '@/utils/sync/storageAdapter';
import type { TreeItem } from './sidebarTypes';

export function useSidebarNavigation() {
    const activeTokenId = useCharacterStore((state) => state.tokenId);

    // Modal & Layout Toggles
    const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 768);
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: TreeItem } | null>(null);

    const toggleExpand = useCallback((e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const expandNode = useCallback((id: string) => {
        setExpandedNodes((prev) => ({ ...prev, [id]: true }));
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    const openContextMenuAt = useCallback((clientX: number, clientY: number, item: TreeItem) => {
        const menuHeightEstimate = 220;
        const menuWidthEstimate = 180;
        let safeY = clientY;
        let safeX = clientX;
        if (safeY + menuHeightEstimate > window.innerHeight) {
            safeY = Math.max(10, window.innerHeight - menuHeightEstimate);
        }
        if (safeX + menuWidthEstimate > window.innerWidth) {
            safeX = Math.max(10, window.innerWidth - menuWidthEstimate);
        }
        setContextMenu({ x: safeX, y: safeY, item });
    }, []);

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, item: TreeItem) => {
            e.preventDefault();
            openContextMenuAt(e.clientX, e.clientY, item);
        },
        [openContextMenuAt]
    );

    // Active Sheet Routing
    const handleSelectCharacter = useCallback(async (id: string, meta: Record<string, unknown>) => {
        await hydrateActiveSheet({
            targetId: id,
            sourceMeta: meta,
            overrideRole: 'GM',
            applyTheme: true
        });

        const store = useCharacterStore.getState();

        // Harvest any item artwork from selected character into catalog
        const rawInv = meta['inv-data'];
        if (typeof rawInv === 'string') {
            try {
                const items = JSON.parse(rawInv);
                if (Array.isArray(items)) {
                    for (const it of items) {
                        if (it?.name && it?.imageUrl) {
                            setItemArt(it.name, it.imageUrl);
                        }
                    }
                }
            } catch {
                // Ignore parse errors
            }
        }

        if (meta['species']) {
            try {
                const data = await fetchPokemonData(String(meta['species']));
                if (data) store.refreshSpeciesData(data as Record<string, unknown>, false);
            } catch {
                // Ignore fetch errors
            }
        } else {
            store.applyLearnset({ Moves: [] });
        }
    }, []);

    const clearActiveSheetIfMatch = useCallback((id: string) => {
        if (useCharacterStore.getState().tokenId === id) {
            useCharacterStore.setState({ tokenId: null });
            setActiveTokenId(null);
            useCharacterStore.getState().loadFromOwlbear({});
        }
    }, []);

    const updateActiveIdentityNickname = useCallback((id: string, newName: string) => {
        if (useCharacterStore.getState().tokenId === id) {
            useCharacterStore.getState().setIdentity('nickname', newName);
        }
    }, []);

    // Global listeners for active sheet switching and context menu dismissal
    useEffect(() => {
        const handleActiveCharStorage = async (e: StorageEvent) => {
            if (e.key === 'pkr_active_char_id' && e.newValue) {
                const chars = await storageAdapter.getLocalCharacters();
                const match = chars.find((c) => c.id === e.newValue);
                if (match) {
                    handleSelectCharacter(match.id, (match.metadata || {}) as Record<string, unknown>);
                }
            }
        };

        const handleActiveCharCustomEvent = async (e: Event) => {
            const detail = (e as CustomEvent<{ id: string }>).detail;
            if (detail?.id) {
                const chars = await storageAdapter.getLocalCharacters();
                const match = chars.find((c) => c.id === detail.id);
                if (match) {
                    handleSelectCharacter(match.id, (match.metadata || {}) as Record<string, unknown>);
                }
            }
        };

        const handleExpandNodeEvent = (e: Event) => {
            const detail = (e as CustomEvent<{ id: string }>).detail;
            if (detail?.id) {
                expandNode(detail.id);
            }
        };

        const handleDocClick = () => closeContextMenu();

        window.addEventListener('storage', handleActiveCharStorage);
        window.addEventListener('pkr-select-character', handleActiveCharCustomEvent);
        window.addEventListener('pkr-expand-sidebar-node', handleExpandNodeEvent);
        document.addEventListener('click', handleDocClick);

        return () => {
            window.removeEventListener('storage', handleActiveCharStorage);
            window.removeEventListener('pkr-select-character', handleActiveCharCustomEvent);
            window.removeEventListener('pkr-expand-sidebar-node', handleExpandNodeEvent);
            document.removeEventListener('click', handleDocClick);
        };
    }, [handleSelectCharacter, expandNode, closeContextMenu]);

    return {
        activeTokenId,
        isCollapsed,
        setIsCollapsed,
        expandedNodes,
        setExpandedNodes,
        toggleExpand,
        expandNode,
        contextMenu,
        setContextMenu,
        openContextMenuAt,
        handleContextMenu,
        closeContextMenu,
        handleSelectCharacter,
        clearActiveSheetIfMatch,
        updateActiveIdentityNickname
    };
}

