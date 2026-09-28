import OBR from '@owlbear-rodeo/sdk';
import { fetchItemData } from './api';
import { KNOWN_ITEMS } from '../data/constants';
import { getItemArt, harvestTokensItemArt } from './itemArtCatalog';
import { isStandaloneMode } from './storageAdapter';

export interface ItemLookupResult {
    found: boolean;
    name: string;
    description: string;
    tags: string;
    fullDescription: string;
    imageUrl?: string;
}

/**
 * Looks up item data by name from the PokéRole dataset, homebrew items, and known items constants.
 * Assembles the official description / effect alongside canonical tags (e.g. [Acc +2], [Dmg +1: Fire]).
 */
export async function lookupItemDetails(rawName: string): Promise<ItemLookupResult | null> {
    const trimmed = rawName.trim();
    if (!trimmed) return null;

    const data = await fetchItemData(trimmed);
    const knownItemMatch = KNOWN_ITEMS.find((known) => known.name.toLowerCase() === trimmed.toLowerCase());

    let descText = '';
    if (data && (data.Description || data.Effect)) {
        descText = String(data.Description || data.Effect || '').trim();
    }

    // Keep description clean by stripping any legacy bracket tags
    const cleanDesc = descText
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
    const tags = knownItemMatch?.tags ? knownItemMatch.tags.trim() : '';

    const found = Boolean(data || knownItemMatch);
    const canonicalName = data?.Name || knownItemMatch?.name || trimmed;
    let knownArt = getItemArt(canonicalName) || getItemArt(trimmed);

    // If artwork is not yet cached in memory and we are in Owlbear Rodeo,
    // actively harvest scene tokens and query connected peers for this item
    if (!knownArt && OBR.isAvailable && !isStandaloneMode) {
        try {
            const sceneTokens = await OBR.scene.items.getItems();
            await harvestTokensItemArt(sceneTokens);
            knownArt = getItemArt(canonicalName) || getItemArt(trimmed);
        } catch {}

        try {
            OBR.broadcast
                .sendMessage(
                    'pokerole-pmd-extension/item-art-query',
                    { name: canonicalName },
                    { destination: 'REMOTE' }
                )
                .catch(() => {});
        } catch {}
    }

    return {
        found,
        name: canonicalName,
        description: cleanDesc,
        tags,
        fullDescription: cleanDesc,
        imageUrl: knownArt
    };
}

/**
 * Strips bracket tags [ ... ] and cleans excess newlines from an item description.
 */
export function cleanItemDescription(desc: string): string {
    if (!desc) return '';
    return desc
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
}

/**
 * Splits legacy bracket tags out of an item description, returning both the clean text
 * and the extracted bracket tags.
 */
export function splitItemLegacyTags(desc: string): { cleanDesc: string; legacyTags: string[] } {
    if (!desc) return { cleanDesc: '', legacyTags: [] };
    const matches = Array.from(desc.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
    const cleanDesc = desc
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n+/g, '\n')
        .trim();
    return { cleanDesc, legacyTags: matches };
}
