import OBR from '@owlbear-rodeo/sdk';
import { flattenStateToMetadata } from './stateMapper';
import { STATS_META_ID } from './graphicsManager';
import type { CharacterState } from '../store/storeTypes';

/**
 * Handles generating and downloading a complete JSON representation
 * of the character token metadata or standalone state.
 */
export const exportCharacterData = async (
    state: CharacterState,
    isStandaloneMode: boolean,
    isObrReady: boolean
): Promise<void> => {
    try {
        let exportData: Record<string, unknown> = {};

        if (isStandaloneMode) {
            exportData = flattenStateToMetadata(state);
        } else {
            if (!state.tokenId || !OBR.isAvailable || !isObrReady) {
                if (OBR.isAvailable && isObrReady) OBR.notification.show('Please select a token to export.', 'WARNING');
                return;
            }
            const items = await OBR.scene.items.getItems([state.tokenId]);
            if (items.length === 0) return;
            exportData = (items[0].metadata[STATS_META_ID] as Record<string, unknown>) || {};
        }

        const dataString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');

        const name = state.identity.nickname || state.identity.species || 'character';
        linkElement.href = url;
        linkElement.download = `${name.replace(/\s+/g, '_')}_pokerole.json`;

        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('[fileSystemHelpers] Export failed:', error);
        if (OBR.isAvailable && isObrReady) {
            OBR.notification.show('Failed to export data.', 'ERROR');
        }
    }
};

/**
 * Safely parses a JSON file triggered by an <input type="file"> event.
 */
export const parseImportedFile = (file: File): Promise<Record<string, unknown>> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            try {
                const imported = JSON.parse(fileEvent.target?.result as string);
                resolve(imported);
            } catch (error) {
                console.error('[fileSystemHelpers] Failed to parse JSON file:', error);
                reject(new Error('Invalid JSON structure'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file contents'));
        reader.readAsText(file);
    });
};
