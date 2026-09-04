import OBR from '@owlbear-rodeo/sdk';
import { flattenStateToMetadata } from './stateMapper';
import type { CharacterState } from '../store/storeTypes';

/**
 * Safely downloads a Blob by creating an object URL, triggering the download,
 * and delaying revocation and DOM cleanup.
 *
 * NOTE: In Chromium-based browsers (Microsoft Edge, Chrome), downloads are initiated
 * asynchronously. Calling URL.revokeObjectURL immediately after click() will revoke the
 * blob URL before the browser's download manager can read it, silently dropping the download.
 * Delaying revocation ensures all browsers have time to process the request.
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = filename;
    linkElement.target = '_self';
    linkElement.style.display = 'none';

    document.body.appendChild(linkElement);
    linkElement.click();

    setTimeout(() => {
        try {
            if (linkElement.parentNode) {
                linkElement.parentNode.removeChild(linkElement);
            }
            URL.revokeObjectURL(url);
        } catch (error) {
            console.warn('[fileSystemHelpers] Failed to clean up blob URL:', error);
        }
    }, 2000);
};

/**
 * Serializes and triggers a formatted JSON file download.
 */
export const downloadJson = (data: unknown, filename: string): void => {
    const dataString = JSON.stringify(data, null, 2);
    const blob = new Blob([dataString], { type: 'application/json' });
    downloadBlob(blob, filename);
};

/**
 * Handles generating and downloading a complete JSON representation
 * of the character token metadata or standalone state.
 */
export const exportCharacterData = (state: CharacterState, isStandaloneMode: boolean, isObrReady: boolean): void => {
    try {
        if (!isStandaloneMode) {
            if (!state.tokenId || !OBR.isAvailable || !isObrReady) {
                if (OBR.isAvailable && isObrReady) {
                    OBR.notification.show('Please select a token to export.', 'WARNING');
                }
                return;
            }
        } else {
            if (!state.tokenId) {
                alert('Please select a character to export.');
                return;
            }
        }

        const exportData = flattenStateToMetadata(state);
        const name = state.identity.nickname || state.identity.species || 'character';
        const filename = `${name.replace(/\s+/g, '_')}_pokerole.json`;

        downloadJson(exportData, filename);

        if (!isStandaloneMode && OBR.isAvailable && isObrReady) {
            OBR.notification.show(`Exported ${name} successfully.`, 'SUCCESS');
        }
    } catch (error) {
        console.error('[fileSystemHelpers] Export failed:', error);
        if (!isStandaloneMode && OBR.isAvailable && isObrReady) {
            OBR.notification.show('Failed to export data.', 'ERROR');
        } else {
            alert('Failed to export character data.');
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
