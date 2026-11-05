import type {
    CharacterIdentity,
    CharacterHealth,
    CharacterWill,
    CharacterState,
    CustomAbility,
    Rank
} from '../storeTypes';
import { saveToOwlbear, getIsRemoteSyncActive } from '../../utils/sync/obr';
import OBR from '@owlbear-rodeo/sdk';
import { syncHealthAndWill } from '../../utils/common/macroHelpers';
import { getKnownAbility } from '../../data/abilities/knownAbilities';

export function handleInitiativeTrackerSetting(
    field: string,
    value: unknown,
    currentIdentity: CharacterIdentity
): CharacterIdentity | null {
    if (!field.startsWith('initiativeTracker')) return null;

    const newIdentity = { ...currentIdentity, [field]: value };
    const settings = {
        preset: newIdentity.initiativeTrackerPreset,
        offsetX: newIdentity.initiativeTrackerOffsetX,
        offsetY: newIdentity.initiativeTrackerOffsetY,
        layout: newIdentity.initiativeTrackerLayout,
        shape: newIdentity.initiativeTrackerAvatarShape,
        mw: newIdentity.initiativeTrackerMaxWidth,
        mh: newIdentity.initiativeTrackerMaxHeight
    };
    try {
        localStorage.setItem('pkr_init_settings', JSON.stringify(settings));
        if (OBR.isAvailable) {
            // Immediately broadcast to our own popover to live-update the iframe!
            OBR.broadcast.sendMessage('pkr-init-settings-update', settings, { destination: 'LOCAL' });
        }
    } catch (e) {
        console.warn('[IdentitySlice] Failed to save initiative settings to localStorage.', e);
    }
    return newIdentity;
}

export function updateAbilityData(
    value: unknown,
    currentIdentity: CharacterIdentity,
    newIdentity: CharacterIdentity,
    roomCustomAbilities: CustomAbility[] | undefined,
    updatesToSave: Record<string, unknown>
): void {
    const currentAbility = String(currentIdentity.ability ?? '').trim();
    const newAbilityStr = String(value ?? '').trim();
    const nativeList = currentIdentity.availableAbilities ?? [];
    const isCurrentNative = nativeList.some((a) => a.toLowerCase() === currentAbility.toLowerCase());
    const isNewNative = nativeList.some((a) => a.toLowerCase() === newAbilityStr.toLowerCase());

    if (isCurrentNative && !isNewNative && currentAbility) {
        newIdentity.previousNativeAbility = currentAbility;
        updatesToSave['previous-native-ability'] = currentAbility;
    } else if (isNewNative) {
        newIdentity.previousNativeAbility = newAbilityStr;
        updatesToSave['previous-native-ability'] = newAbilityStr;
    }

    const cleanAbilityName = newAbilityStr.replace(/\s*\(HA\)$/i, '').trim();
    const known = getKnownAbility(cleanAbilityName, newIdentity.rank);
    const customAbility = roomCustomAbilities?.find(
        (ca) => ca.name.trim().toLowerCase() === cleanAbilityName.toLowerCase()
    );
    newIdentity.abilityBoostActive = false;
    newIdentity.abilityBoostLevel = 0;
    newIdentity.abilityChoiceIndex = 0;
    updatesToSave['ability-boost-active'] = false;
    updatesToSave['ability-boost-level'] = 0;
    updatesToSave['ability-choice-index'] = 0;
    if (known) {
        newIdentity.abilityTags = known.tags;
        newIdentity.abilityActive = known.autoActive ?? true;
        updatesToSave['ability-tags'] = known.tags;
        updatesToSave['ability-active'] = newIdentity.abilityActive;
    } else if (customAbility) {
        const customTags = `${customAbility.effect ?? ''} ${customAbility.description ?? ''}`.trim();
        newIdentity.abilityTags = customTags;
        newIdentity.abilityActive = true;
        updatesToSave['ability-tags'] = customTags;
        updatesToSave['ability-active'] = true;
    } else {
        newIdentity.abilityTags = '';
        newIdentity.abilityActive = true;
        updatesToSave['ability-tags'] = '';
        updatesToSave['ability-active'] = true;
    }
}

export function updateSpeciesAndNameData(
    field: string,
    newIdentity: CharacterIdentity,
    tokenId: string | null,
    entityId?: string
): void {
    if (field !== 'nickname' && field !== 'species') return;

    const nextNickname = String(newIdentity.nickname ?? '').trim();
    const nextSpecies = String(newIdentity.species ?? '').trim();
    const nextDisplayName = nextNickname || nextSpecies || 'Unknown';

    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const boData = JSON.parse(raw);
                if (boData && Array.isArray(boData.rounds)) {
                    let hasChanged = false;
                    const updatedRounds = boData.rounds.map((round: { combatants?: Array<Record<string, unknown>> }) => {
                        if (!round || !Array.isArray(round.combatants)) return round;
                        const updatedCombatants = round.combatants.map((c) => {
                            const cTokenId = c.tokenId as string | undefined;
                            const cEntityId = c.entityId as string | undefined;
                            const cId = c.id as string | undefined;
                            const matches =
                                (Boolean(tokenId) && cTokenId === tokenId) ||
                                (Boolean(entityId) && (cEntityId === entityId || cId === entityId));
                            if (matches) {
                                if (c.name !== nextDisplayName) {
                                    hasChanged = true;
                                    return { ...c, name: nextDisplayName };
                                }
                            }
                            return c;
                        });
                        return { ...round, combatants: updatedCombatants };
                    });

                    if (hasChanged) {
                        boData.rounds = updatedRounds;
                        localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(boData));
                        if (OBR.isAvailable) {
                            OBR.broadcast
                                .sendMessage(
                                    'pokerole-pmd-extension/battle-organizer-sync',
                                    boData,
                                    { destination: 'REMOTE' }
                                )
                                .catch(() => {});
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[IdentitySlice] Failed to sync name to battle organizer localStorage:', e);
        }
    }

    if (OBR.isAvailable && tokenId) {
        try {
            OBR.scene.items
                .updateItems([tokenId], (items) => {
                    for (const item of items) {
                        item.name = nextDisplayName;
                    }
                })
                .catch(() => {});
        } catch (e) {
            console.warn('[IdentitySlice] Failed to update scene item name:', e);
        }
    }
}

export function syncAbilityAndTargetState(
    field: string,
    value: unknown,
    newIdentity: CharacterIdentity,
    state: CharacterState,
    updatesToSave: Record<string, unknown>
): void {
    if (field === 'abilityTargetIds') {
        const targetList = Array.isArray(value) ? (value as string[]) : undefined;
        newIdentity.abilityTargetIds = targetList;
        updatesToSave['ability-target-ids'] = Array.isArray(value)
            ? (value as string[]).join(',')
            : String(value ?? '');
    } else if (field === 'abilityBoostActive') {
        const isActive = Boolean(value);
        newIdentity.abilityBoostActive = isActive;
        newIdentity.abilityBoostLevel = isActive
            ? newIdentity.abilityBoostLevel && newIdentity.abilityBoostLevel > 0
                ? newIdentity.abilityBoostLevel
                : 1
            : 0;
        updatesToSave['ability-boost-active'] = isActive;
        updatesToSave['ability-boost-level'] = newIdentity.abilityBoostLevel;
    } else if (field === 'abilityBoostLevel') {
        const lvl = Math.max(0, Number(value) || 0);
        newIdentity.abilityBoostLevel = lvl;
        newIdentity.abilityBoostActive = lvl > 0;
        updatesToSave['ability-boost-level'] = lvl;
        updatesToSave['ability-boost-active'] = lvl > 0;
    } else if (field === 'abilityChoiceIndex') {
        const idx = Math.max(0, Number(value) || 0);
        newIdentity.abilityChoiceIndex = idx;
        updatesToSave['ability-choice-index'] = idx;
    }

    if (
        field === 'abilityActive' ||
        field === 'ability' ||
        field === 'abilityTargetIds' ||
        field === 'abilityBoostActive' ||
        field === 'abilityBoostLevel' ||
        field === 'abilityChoiceIndex'
    ) {
        if (typeof window === 'undefined' || !window.localStorage) return;
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (!raw) return;
            const boData = JSON.parse(raw);
            if (!boData || !Array.isArray(boData.rounds)) return;

            let hasChanged = false;
            const tokenId = state.tokenId;
            const nickname = state.identity.nickname?.trim().toLowerCase();
            const species = state.identity.species?.trim().toLowerCase();
            const entityId = state.identity.entityId;

            const targetActive = newIdentity.abilityActive !== false;
            const targetBoostActive = Boolean(newIdentity.abilityBoostActive);
            const targetBoostLevel = newIdentity.abilityBoostLevel ?? 0;
            const targetChoiceIndex = newIdentity.abilityChoiceIndex ?? 0;
            const targetList = newIdentity.abilityTargetIds;

            const updatedRounds = boData.rounds.map((round: { combatants?: Array<Record<string, unknown>> }) => {
                if (!round || !Array.isArray(round.combatants)) return round;
                const updatedCombatants = round.combatants.map((c) => {
                    const cTokenId = c.tokenId as string | undefined;
                    const cName = ((c.name as string) || '').trim().toLowerCase();
                    const cEntityId = c.entityId as string | undefined;
                    const cId = c.id as string | undefined;
                    const matches =
                        (Boolean(tokenId) && cTokenId === tokenId) ||
                        (Boolean(entityId) && (cEntityId === entityId || cId === entityId)) ||
                        (Boolean(nickname) && cName === nickname) ||
                        (Boolean(species) && cName === species);
                    if (!matches) return c;

                    let combatantUpdated = false;
                    const updatedC = { ...c };

                    if (field === 'abilityActive' || field === 'ability') {
                        if (c.abilityActive !== targetActive) {
                            updatedC.abilityActive = targetActive;
                            combatantUpdated = true;
                        }
                        if (field === 'ability') {
                            if (c.ability !== newIdentity.ability) {
                                updatedC.ability = newIdentity.ability;
                                combatantUpdated = true;
                            }
                            if (c.abilityBoostActive) {
                                updatedC.abilityBoostActive = false;
                                combatantUpdated = true;
                            }
                            if (c.abilityBoostLevel) {
                                updatedC.abilityBoostLevel = 0;
                                combatantUpdated = true;
                            }
                            if (c.abilityChoiceIndex) {
                                updatedC.abilityChoiceIndex = 0;
                                combatantUpdated = true;
                            }
                        }
                    }

                    if (field === 'abilityTargetIds') {
                        updatedC.abilityTargetIds = targetList;
                        combatantUpdated = true;
                    }

                    if (
                        field === 'abilityBoostActive' ||
                        field === 'abilityBoostLevel' ||
                        field === 'abilityChoiceIndex'
                    ) {
                        if (c.abilityBoostActive !== targetBoostActive) {
                            updatedC.abilityBoostActive = targetBoostActive;
                            combatantUpdated = true;
                        }
                        if (c.abilityBoostLevel !== targetBoostLevel) {
                            updatedC.abilityBoostLevel = targetBoostLevel;
                            combatantUpdated = true;
                        }
                        if (c.abilityChoiceIndex !== targetChoiceIndex) {
                            updatedC.abilityChoiceIndex = targetChoiceIndex;
                            combatantUpdated = true;
                        }
                    }

                    if (combatantUpdated) {
                        hasChanged = true;
                        return updatedC;
                    }
                    return c;
                });
                return { ...round, combatants: updatedCombatants };
            });

            if (hasChanged) {
                boData.rounds = updatedRounds;
                localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(boData));
                if (OBR.isAvailable) {
                    OBR.broadcast
                        .sendMessage(
                            'pokerole-pmd-extension/battle-organizer-sync',
                            boData,
                            { destination: 'REMOTE' }
                        )
                        .catch(() => {});
                }
            }
        } catch (e) {
            console.warn('[IdentitySlice] Failed to sync ability boost/choice to battle organizer localStorage:', e);
        }
    }
}

export function updateRankAndRuleset(
    field: string,
    value: unknown,
    state: CharacterState,
    newIdentity: CharacterIdentity,
    newHealth: CharacterHealth,
    newWill: CharacterWill,
    updatesToSave: Record<string, unknown>
): void {
    if (field !== 'ruleset' && field !== 'rank') return;

    syncHealthAndWill(state, state.stats, newIdentity, newHealth, newWill, updatesToSave);
    if (field === 'rank') {
        const cleanAbilityName = String(newIdentity.ability ?? '')
            .replace(/\s*\(HA\)$/i, '')
            .trim();
        if (cleanAbilityName === 'Huge Power' || cleanAbilityName === 'Pure Power') {
            const newKnown = getKnownAbility(cleanAbilityName, String(value));
            if (newKnown) {
                newIdentity.abilityTags = newKnown.tags;
                updatesToSave['ability-tags'] = newKnown.tags;
            }
        }
    }
}

export function saveIdentityToOwlbear(
    field: string,
    value: unknown,
    obrKey: string,
    excludedSet: Set<string>,
    updatesToSave: Record<string, unknown>
): void {
    if (excludedSet.has(field) || getIsRemoteSyncActive()) return;

    if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
        if (field === 'maxFormData') updatesToSave['max-form-data'] = value;
        else if (field === 'activeFormId') updatesToSave['active-form-id'] = value;
        else updatesToSave[obrKey] = value;
    } else if (field === 'abilityTargetIds' || (Array.isArray(value) && field === 'abilityTargetIds')) {
        updatesToSave['ability-target-ids'] = Array.isArray(value) ? value.join(',') : String(value ?? '');
    } else if (field === 'formSaves') {
        updatesToSave['form-saves'] = JSON.stringify(value);
    } else if (field === 'customFormConfig') {
        updatesToSave['custom-form-config'] = JSON.stringify(value);
    } else if (field === 'customFormImages') {
        updatesToSave['custom-form-images'] = JSON.stringify(value);
    } else if (field === 'badges') {
        updatesToSave['badges-data'] = JSON.stringify(value);
    } else if (field === 'pokedex') {
        updatesToSave['pokedex-data'] = JSON.stringify(value);
    }

    try {
        if (Object.keys(updatesToSave).length > 0) saveToOwlbear(updatesToSave);
    } catch (error) {
        console.error('[IdentitySlice] Failed to save identity update to Owlbear.', error);
    }
}

export function syncPcStorage(
    field: string,
    value: unknown,
    state: CharacterState,
    updatesToSave: Record<string, unknown>
): CharacterState['pcData'] {
    let nextPcData = state.pcData;
    if (
        state.pcData?.pokemonSummaries &&
        (field === 'type1' ||
            field === 'type2' ||
            field === 'nickname' ||
            field === 'species' ||
            field === 'rank' ||
            field === 'tokenImageUrl' ||
            Object.keys(updatesToSave).length > 0)
    ) {
        const summaries = state.pcData.pokemonSummaries;
        const matchEntry = Object.entries(summaries).find(
            ([k, s]) =>
                (state.tokenId &&
                    (k === state.tokenId ||
                        s.mapTokenId === state.tokenId ||
                        s.savedTokenItem?.id === state.tokenId)) ||
                (state.identity.entityId &&
                    (k === state.identity.entityId || s.entityId === state.identity.entityId))
        );
        if (matchEntry) {
            const [matchedKey, sum] = matchEntry;
            const cleanNick =
                field === 'nickname'
                    ? ((value as string) || '').trim()
                    : (sum.fullMetadata?.nickname as string) || '';
            const nextSpecies = field === 'species' ? (value as string) : sum.species;
            const nextDisplayName = cleanNick || nextSpecies || sum.name;
            const updatedSum = {
                ...sum,
                type1: field === 'type1' ? (value as string) : sum.type1,
                type2: field === 'type2' ? (value as string) : sum.type2,
                name: nextDisplayName,
                species: nextSpecies,
                rank: field === 'rank' ? (value as Rank) : sum.rank,
                tokenImageUrl: field === 'tokenImageUrl' ? (value as string) : sum.tokenImageUrl,
                fullMetadata: {
                    ...(sum.fullMetadata ?? {}),
                    ...updatesToSave,
                    nickname: cleanNick,
                    species: nextSpecies,
                    name: nextDisplayName,
                    type1: field === 'type1' ? (value as string) : sum.type1,
                    type2: field === 'type2' ? (value as string) : sum.type2,
                    rank: field === 'rank' ? (value as Rank) : sum.rank
                }
            };
            nextPcData = {
                ...state.pcData,
                pokemonSummaries: {
                    ...summaries,
                    [matchedKey]: updatedSum
                }
            };
            import('../../utils/pc/pcStorageAdapter')
                .then(({ savePcStorage }) => {
                    savePcStorage(nextPcData);
                })
                .catch(() => {});
        }
    }
    return nextPcData;
}

