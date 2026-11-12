import { useEffect, useState, useCallback } from 'react';
import { storageAdapter, getBackupReminderReason, BACKUP_STATUS_EVENT } from '@/utils/sync/storageAdapter';
import { useCharacterStore } from '@/store/useCharacterStore';
import { useSidebarBackup } from './useSidebarBackup';
import { useLegacyNestingModal } from './useLegacyNestingModal';
import { useSidebarPcOps } from './useSidebarPcOps';
import { useSidebarNavigation } from './useSidebarNavigation';
import { useSidebarDragOps } from './useSidebarDragOps';
import { useSidebarTreeCrud } from './useSidebarTreeCrud';
import { buildTreeItems, parseStandaloneInitTags } from './sidebarUtils';
import type { TreeItem } from './sidebarTypes';

export type { TreeItem } from './sidebarTypes';

export function useSidebarEngine() {
    const [items, setItems] = useState<TreeItem[]>([]);
    const [newName, setNewName] = useState<string>('');
    const [initTags, setInitTags] = useState<Record<string, string>>({});

    const pcOps = useSidebarPcOps();
    const nav = useSidebarNavigation();
    const backup = useSidebarBackup();
    const legacyNesting = useLegacyNestingModal();

    const { autoHealBelt } = pcOps;
    const { checkLegacyNesting, resetLegacyCheck } = legacyNesting;
    const { setBackupReminderReason } = backup;

    const loadData = useCallback(async () => {
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();
            await autoHealBelt(chars, flds);
            checkLegacyNesting(chars, flds);

            const customOrder = JSON.parse(localStorage.getItem('pkr_sidebar_order') || '[]') as string[];
            setItems(buildTreeItems(chars, flds, customOrder));
            const pcSummaryCount = Object.keys(useCharacterStore.getState().pcData.pokemonSummaries || {}).length;
            setBackupReminderReason(getBackupReminderReason(chars.length, flds.length, pcSummaryCount));
        } catch (error) {
            console.error('[SidebarEngine] Failed to load data:', error);
        }
    }, [autoHealBelt, checkLegacyNesting, setBackupReminderReason]);

    const dragOps = useSidebarDragOps({
        items,
        onLoadData: loadData,
        onSyncMoveToPc: pcOps.syncMoveToPc,
        onOpenContextMenu: nav.openContextMenuAt,
        onCloseContextMenu: nav.closeContextMenu,
        onExpandNode: nav.expandNode
    });

    const treeCrud = useSidebarTreeCrud({
        items,
        newName,
        setNewName,
        onLoadData: loadData,
        onCloseContextMenu: nav.closeContextMenu,
        onExpandNode: nav.expandNode,
        onSelectCharacter: nav.handleSelectCharacter,
        onClearActiveSheetIfMatch: nav.clearActiveSheetIfMatch,
        onUpdateActiveIdentityNickname: nav.updateActiveIdentityNickname,
        onSyncFolderRename: pcOps.syncFolderRename,
        onSyncCharacterRename: pcOps.syncCharacterRename,
        onSyncMoveToPc: pcOps.syncMoveToPc,
        onCleanUpPcOnDelete: pcOps.cleanUpPcOnDelete
    });

    const handleAutoFolderLegacyNesting = useCallback(async () => {
        await legacyNesting.handleAutoFolderLegacyNesting();
        await loadData();
    }, [legacyNesting, loadData]);

    const handleFlattenLegacyNesting = useCallback(async () => {
        await legacyNesting.handleFlattenLegacyNesting();
        await loadData();
    }, [legacyNesting, loadData]);

    const updateInitTags = useCallback(() => {
        setInitTags(parseStandaloneInitTags(localStorage.getItem('pkr_standalone_init_list')));
    }, []);

    useEffect(() => {
        loadData();
        updateInitTags();

        const handleDataChange = () => {
            loadData();
            updateInitTags();
        };
        const handleBackupRestored = () => {
            legacyNesting.resetLegacyCheck();
            loadData();
        };
        window.addEventListener('pkr-local-data-changed', handleDataChange);
        window.addEventListener('pkr-backup-restored', handleBackupRestored);
        window.addEventListener('pkr-standalone-init-update', updateInitTags);

        const handleBackupStatus = async () => {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const flds = await storageAdapter.getFolders();
                const pcSummaryCount = Object.keys(useCharacterStore.getState().pcData.pokemonSummaries || {}).length;
                setBackupReminderReason(getBackupReminderReason(chars.length, flds.length, pcSummaryCount));
            } catch (err) {
                console.error('[SidebarEngine] Failed to check backup status:', err);
            }
        };
        const handleVisibility = () => {
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                handleBackupStatus();
            }
        };
        window.addEventListener(BACKUP_STATUS_EVENT, handleBackupStatus);
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibility);
        }

        return () => {
            window.removeEventListener('pkr-local-data-changed', handleDataChange);
            window.removeEventListener('pkr-backup-restored', handleBackupRestored);
            window.removeEventListener('pkr-standalone-init-update', updateInitTags);
            window.removeEventListener(BACKUP_STATUS_EVENT, handleBackupStatus);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibility);
            }
        };
    }, [loadData, updateInitTags, resetLegacyCheck, setBackupReminderReason]);

    const handleOrganizeTrainerFolders = useCallback(
        (item: TreeItem) => {
            nav.closeContextMenu();
            pcOps.handleOrganizeTrainerFolders(item, () => {
                nav.expandNode(item.id);
                loadData();
            });
        },
        [nav, pcOps, loadData]
    );

    const handleOpenPc = useCallback(
        (item: TreeItem) => {
            nav.closeContextMenu();
            pcOps.handleOpenPc(item);
        },
        [nav, pcOps]
    );

    const characterCount = items.filter((i) => i.type === 'character').length;
    const folderCount = items.filter((i) => i.type === 'folder').length;

    return {
        activeTokenId: nav.activeTokenId,
        items,
        characterCount,
        folderCount,
        isCollapsed: nav.isCollapsed,
        setIsCollapsed: nav.setIsCollapsed,
        newName,
        setNewName,
        expandedNodes: nav.expandedNodes,
        initTags,
        contextMenu: nav.contextMenu,
        partyMemberMap: pcOps.partyMemberMap,
        isBackupModalOpen: backup.isBackupModalOpen,
        setIsBackupModalOpen: backup.setIsBackupModalOpen,
        hasUnbackedChanges: backup.hasUnbackedChanges,
        backupReminderReason: backup.backupReminderReason,
        restoreInputRef: backup.restoreInputRef,
        pendingRestoreData: backup.pendingRestoreData,
        handleCreate: treeCrud.handleCreate,
        handleExportMasterBackup: backup.handleExportMasterBackup,
        confirmExportMasterBackup: backup.confirmExportMasterBackup,
        handleRestoreMasterBackup: backup.handleRestoreMasterBackup,
        confirmRestoreMerge: backup.confirmRestoreMerge,
        confirmRestoreOverwrite: backup.confirmRestoreOverwrite,
        cancelRestore: backup.cancelRestore,
        handleSelectCharacter: nav.handleSelectCharacter,
        handleOrganizeTrainerFolders,
        handleOpenPc,
        executeRename: treeCrud.executeRename,
        executeDuplicate: treeCrud.executeDuplicate,
        executeMove: treeCrud.executeMove,
        executeDelete: treeCrud.executeDelete,
        toggleExpand: nav.toggleExpand,
        handleDragStart: dragOps.handleDragStart,
        handleDragOver: dragOps.handleDragOver,
        handleDragLeave: dragOps.handleDragLeave,
        handleDrop: dragOps.handleDrop,
        handleContextMenu: nav.handleContextMenu,
        closeContextMenu: nav.closeContextMenu,
        getDragClass: dragOps.getDragClass,
        setDragOverInfo: dragOps.setDragOverInfo,
        dragOverInfo: dragOps.dragOverInfo,
        treeContainerRef: dragOps.treeContainerRef,
        liftedItemId: dragOps.liftedItemId,
        touchGhostItem: dragOps.touchGhostItem,
        touchGhostPos: dragOps.touchGhostPos,
        isTouchDragActive: dragOps.isTouchDragActive,
        handleItemTouchStart: dragOps.handleItemTouchStart,
        isClickBlocked: dragOps.isClickBlocked,
        isLegacyNestingModalOpen: legacyNesting.isLegacyNestingModalOpen,
        legacyNestedCount: legacyNesting.legacyNestedCount,
        handleAutoFolderLegacyNesting,
        handleFlattenLegacyNesting,
        handleDismissLegacyNesting: legacyNesting.handleDismissLegacyNesting
    };
}
