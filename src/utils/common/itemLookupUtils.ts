import OBR from '@owlbear-rodeo/sdk';
import { fetchItemData } from '../api';
import { KNOWN_ITEMS } from '../../data/constants';
import { getItemArt, harvestTokensItemArt } from '../graphics/itemArtCatalog';
import { isStandaloneMode } from '../sync/storageAdapter';

import { getBaseItemCharges } from '../items/itemCharges';
import { getBaseItemEffect } from '../items/itemUsageEffects';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/entityTypes';

export interface ItemLookupResult {
    found: boolean;
    name: string;
    description: string;
    tags: string;
    fullDescription: string;
    imageUrl?: string;
    charges?: number;
    maxCharges?: number;
    destroyOnDepletion?: boolean;
    healHp?: number;
    healWill?: number;
    cures?: string[];
    permanentStatBoost?: {
        stat: 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight' | 'PlayerChoice';
        value: number;
    };
    statBuff?: { stat: string; value: number };
    statDebuff?: { stat: string; value: number };
    gainTempHp?: number;
    dungeonPassive?: string;
    inflictsStatus?: string[];
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

    let customItem: CustomItem | undefined;
    try {
        const customItems = useCharacterStore.getState().roomCustomItems || [];
        customItem = customItems.find(
            (ci) =>
                ci.name.trim().toLowerCase() === canonicalName.toLowerCase() ||
                ci.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
    } catch {}

    const defaultCharges =
        typeof data?.charges === 'number'
            ? data.charges
            : customItem?.charges !== undefined
              ? customItem.charges
              : (getBaseItemCharges(canonicalName) ?? getBaseItemCharges(trimmed));

    const maxCharges =
        typeof data?.maxCharges === 'number'
            ? data.maxCharges
            : customItem?.maxCharges !== undefined
              ? customItem.maxCharges
              : defaultCharges;

    const baseEffect = getBaseItemEffect(canonicalName) ?? getBaseItemEffect(trimmed);

    const healHp =
        typeof customItem?.healHp === 'number'
            ? customItem.healHp
            : typeof data?.healHp === 'number'
              ? data.healHp
              : typeof baseEffect?.healHp === 'number'
                ? baseEffect.healHp
                : typeof data?.HealthRestored === 'number'
                  ? defaultCharges && defaultCharges > 1
                      ? 1
                      : data.HealthRestored
                  : typeof data?.healthRestored === 'number'
                    ? defaultCharges && defaultCharges > 1
                        ? 1
                        : data.healthRestored
                    : undefined;

    const healWill =
        typeof customItem?.healWill === 'number'
            ? customItem.healWill
            : typeof data?.healWill === 'number'
              ? data.healWill
              : typeof data?.HealWill === 'number'
                ? data.HealWill
                : baseEffect?.healWill;

    let cures: string[] | undefined = undefined;
    const rawCures = customItem?.cures ?? data?.Cures ?? data?.cures ?? baseEffect?.cures;
    if (Array.isArray(rawCures)) {
        cures = rawCures.map(String);
    } else if (typeof rawCures === 'string' && rawCures.trim()) {
        cures = [rawCures.trim()];
    }

    const destroyOnDepletion =
        typeof customItem?.destroyOnDepletion === 'boolean'
            ? customItem.destroyOnDepletion
            : typeof data?.destroyOnDepletion === 'boolean'
              ? data.destroyOnDepletion
              : undefined;

    const permanentStatBoost = customItem?.permanentStatBoost ?? data?.permanentStatBoost;
    const statBuff = customItem?.statBuff ?? data?.statBuff;
    const statDebuff = customItem?.statDebuff ?? data?.statDebuff;
    const gainTempHp = customItem?.gainTempHp ?? data?.gainTempHp;
    const dungeonPassive = customItem?.dungeonPassive ?? data?.dungeonPassive;
    const inflictsStatus = customItem?.inflictsStatus ?? data?.inflictsStatus;

    const effectiveImageUrl = customItem?.imageUrl || knownArt;

    return {
        found: found || Boolean(customItem),
        name: canonicalName,
        description: cleanDesc || customItem?.description || '',
        tags,
        fullDescription: cleanDesc || customItem?.description || '',
        imageUrl: effectiveImageUrl,
        charges: defaultCharges,
        maxCharges,
        destroyOnDepletion,
        healHp,
        healWill,
        cures,
        permanentStatBoost,
        statBuff,
        statDebuff,
        gainTempHp,
        dungeonPassive,
        inflictsStatus
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
