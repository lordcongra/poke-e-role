import { useState, useRef } from 'react';
import { storageAdapter, markBackupComplete, type LocalFolder } from '../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getAllItemArt, mergeItemArt } from '../../utils/graphics/itemArtCatalog';
import { downloadJson } from '../../utils/common/fileSystemHelpers';
import { savePcStorage } from '../../utils/pc/pcStorageAdapter';
import type { PcStorageData } from '../../types/pcStorageTypes';

export interface MasterBackupData {
    type?: string;
    folders?: LocalFolder[] | Record<string, unknown>[];
    characters?: Array<{ id: string; metadata: Record<string, unknown> }>;
    itemArt?: Record<string, string>;
    pcData?: PcStorageData;
}

export function useSidebarBackup() {
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [hasUnbackedChanges, setHasUnbackedChanges] = useState(false);
    const [pendingRestoreData, setPendingRestoreData] = useState<MasterBackupData | null>(null);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleExportMasterBackup = () => {
        setIsBackupModalOpen(true);
    };

    const confirmExportMasterBackup = async () => {
        try {
            const chars = await storageAdapter.getLocalCharacters();
            const flds = await storageAdapter.getFolders();
            const artCatalog = getAllItemArt();
            const pcData = useCharacterStore.getState().pcData;
            const backup: MasterBackupData = {
                type: 'pokerole-master-backup',
                folders: flds,
                characters: chars,
                itemArt: Object.keys(artCatalog).length > 0 ? artCatalog : undefined,
                pcData: pcData
            };

            downloadJson(backup, `PokeRole_Master_Backup_${new Date().toISOString().split('T')[0]}.json`);
            markBackupComplete();
            setIsBackupModalOpen(false);
        } catch (error) {
            console.error('[SidebarBackup] Failed to create master backup', error);
            alert('Failed to generate Master Backup.');
        }
    };

    const handleRestoreMasterBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.type === 'pokerole-master-backup') {
                    setPendingRestoreData(data);
                } else {
                    alert('Invalid Master Backup file.');
                }
            } catch (err) {
                console.error('[SidebarBackup] Failed to read backup file:', err);
                alert('Failed to read backup file. It may be corrupted.');
            }
            if (restoreInputRef.current) restoreInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const confirmRestoreMerge = async () => {
        if (!pendingRestoreData) return;
        const data = pendingRestoreData;

        const existingFolders = await storageAdapter.getFolders();
        const folderMap = new Map(existingFolders.map((f) => [String(f.id), f]));
        const incomingFolders = (data.folders || []) as LocalFolder[];
        incomingFolders.forEach((f) => {
            folderMap.set(String(f.id), f);
        });
        const mergedFolders = Array.from(folderMap.values());

        const existingChars = await storageAdapter.getLocalCharacters();
        const charMap = new Map(existingChars.map((c) => [c.id, c]));
        for (const char of data.characters || []) {
            const meta = char.metadata || {};
            const nick = meta.nickname ? String(meta.nickname).trim() : '';
            const spec = meta.species ? String(meta.species).trim() : '';
            charMap.set(char.id, {
                id: char.id,
                name: nick || spec || 'Unnamed Character',
                parentId: (meta.parentId as string | null) ?? null,
                metadata: meta
            });
        }
        const mergedCharacters = Array.from(charMap.values());

        await storageAdapter.overwriteAll(mergedCharacters, mergedFolders);

        if (data.itemArt && typeof data.itemArt === 'object') {
            mergeItemArt(data.itemArt, true);
        }

        if (data.pcData) {
            await savePcStorage(data.pcData);
            useCharacterStore.setState({ pcData: data.pcData });
        }

        markBackupComplete();
        window.dispatchEvent(new Event('pkr-local-data-changed'));
        setPendingRestoreData(null);
        alert('Master Backup Merged Successfully!');
    };

    const confirmRestoreOverwrite = async () => {
        if (!pendingRestoreData) return;
        if (
            !window.confirm(
                'FINAL WARNING: Overwriting will delete all current local files not in the backup. Are you completely sure?'
            )
        ) {
            return;
        }

        const data = pendingRestoreData;
        const incomingFolders = (data.folders || []) as LocalFolder[];
        const incomingChars = (data.characters || []).map((char) => {
            const meta = char.metadata || {};
            const nick = meta.nickname ? String(meta.nickname).trim() : '';
            const spec = meta.species ? String(meta.species).trim() : '';
            return {
                id: char.id,
                name: nick || spec || 'Unnamed Character',
                parentId: (meta.parentId as string | null) ?? null,
                metadata: meta
            };
        });

        await storageAdapter.overwriteAll(incomingChars, incomingFolders);

        if (data.itemArt && typeof data.itemArt === 'object') {
            mergeItemArt(data.itemArt, true);
        }

        if (data.pcData) {
            await savePcStorage(data.pcData);
            useCharacterStore.setState({ pcData: data.pcData });
        }

        markBackupComplete();
        window.dispatchEvent(new Event('pkr-local-data-changed'));
        setPendingRestoreData(null);
        alert('Master Backup Restored (Overwritten) Successfully!');
    };

    const cancelRestore = () => {
        setPendingRestoreData(null);
    };

    return {
        isBackupModalOpen,
        setIsBackupModalOpen,
        hasUnbackedChanges,
        setHasUnbackedChanges,
        pendingRestoreData,
        restoreInputRef,
        handleExportMasterBackup,
        confirmExportMasterBackup,
        handleRestoreMasterBackup,
        confirmRestoreMerge,
        confirmRestoreOverwrite,
        cancelRestore
    };
}
