import type { CharacterState, CustomType } from '../../../store/storeTypes';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { METADATA_ID, setActiveTokenId } from '../../../utils/sync/obr';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { resolveCharacterThemeColors, applyDynamicThemeColors } from '../../../utils/common/colorUtils';
import { useCharacterStore } from '../../../store/useCharacterStore';

/**
 * Pure predicate checking if any persistent character sheet slice changed in Zustand.
 * Ignores non-character slices (pcData, homebrew, generatorConfig, etc.) to prevent infinite loops.
 */
export function hasCharacterSheetChanged(state: CharacterState, prevState: CharacterState): boolean {
    return (
        state.health !== prevState.health ||
        state.will !== prevState.will ||
        state.derived !== prevState.derived ||
        state.extras !== prevState.extras ||
        state.stats !== prevState.stats ||
        state.socials !== prevState.socials ||
        state.skills !== prevState.skills ||
        state.moves !== prevState.moves ||
        state.skillChecks !== prevState.skillChecks ||
        state.wishlist !== prevState.wishlist ||
        state.inventory !== prevState.inventory ||
        state.notes !== prevState.notes ||
        state.customInfo !== prevState.customInfo ||
        state.tp !== prevState.tp ||
        state.currency !== prevState.currency ||
        state.passives !== prevState.passives ||
        state.statuses !== prevState.statuses ||
        state.effects !== prevState.effects ||
        state.trackers !== prevState.trackers ||
        state.extraCategories !== prevState.extraCategories ||
        state.identity !== prevState.identity
    );
}

/**
 * Constructs a refreshed PcPokemonSummary and flattened metadata payload
 * from the active Zustand character store.
 */
export function buildSummaryFromStore(
    currentStore: CharacterState,
    curr: PcPokemonSummary
): { updatedSummary: PcPokemonSummary; nextMeta: Record<string, unknown> } {
    const nextMeta = flattenStateToMetadata(currentStore);
    nextMeta.entityId = curr.entityId;
    const now = Math.max(Date.now(), (Number(curr.lastModified) || 0) + 1);
    nextMeta.lastModified = now;

    const nextHp = currentStore.health.hpCurr ?? curr.hp;
    const nextMaxHp = currentStore.health.hpMax ?? curr.maxHp;
    const nextWill = currentStore.will.willCurr ?? curr.will;
    const nextMaxWill = currentStore.will.willMax ?? curr.maxWill;
    const nextName = currentStore.identity.nickname || currentStore.identity.species || curr.name;

    // Keep savedTokenItem metadata synchronized if cached token item exists
    let updatedSavedTokenItem = curr.savedTokenItem;
    if (updatedSavedTokenItem) {
        updatedSavedTokenItem = {
            ...updatedSavedTokenItem,
            name: nextName,
            metadata: {
                ...(updatedSavedTokenItem.metadata || {}),
                [METADATA_ID]: {
                    ...((updatedSavedTokenItem.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                    ...nextMeta
                },
                'pokerole-pmd-extension/stats': {
                    ...((updatedSavedTokenItem.metadata?.['pokerole-pmd-extension/stats'] as Record<string, unknown>) ||
                        {}),
                    ...nextMeta
                }
            }
        };
    }

    const updatedSummary: PcPokemonSummary = {
        ...curr,
        name: nextName,
        species: currentStore.identity.species || curr.species,
        rank: currentStore.identity.rank || curr.rank,
        type1: currentStore.identity.type1 || curr.type1,
        type2:
            currentStore.identity.type2 && currentStore.identity.type2.toLowerCase() !== 'none'
                ? currentStore.identity.type2
                : undefined,
        hp: nextHp,
        maxHp: nextMaxHp,
        will: nextWill,
        maxWill: nextMaxWill,
        tokenImageUrl: currentStore.identity.tokenImageUrl || curr.tokenImageUrl,
        fullMetadata: nextMeta,
        savedTokenItem: updatedSavedTokenItem,
        lastModified: now
    };

    return { updatedSummary, nextMeta };
}

/**
 * Builds a complete metadata dictionary from an incoming PcPokemonSummary,
 * ensuring top-level summary fields (HP, Will, Identity) are properly reflected for hydration.
 */
export function buildHydrationMetadataFromSummary(summary: PcPokemonSummary): Record<string, unknown> {
    const meta: Record<string, unknown> = {
        ...(summary.fullMetadata || {}),
        entityId: summary.entityId
    };

    if (summary.hp !== undefined) meta['hp-curr'] = summary.hp;
    if (summary.maxHp !== undefined) meta['hp-max-display'] = summary.maxHp;
    if (summary.will !== undefined) meta['will-curr'] = summary.will;
    if (summary.maxWill !== undefined) meta['will-max-display'] = summary.maxWill;
    if (summary.name) meta['nickname'] = summary.name;
    if (summary.species) meta['species'] = summary.species;
    if (summary.rank) meta['rank'] = summary.rank;
    if (summary.type1) meta['type1'] = summary.type1;
    if (summary.type2 !== undefined) meta['type2'] = summary.type2;
    if (summary.tokenImageUrl) meta['token-image-url'] = summary.tokenImageUrl;
    if (summary.lastModified) meta['lastModified'] = summary.lastModified;

    return meta;
}

/**
 * Resolves character theme colors based on Pokémon types or custom overrides.
 */
export function resolvePcSheetThemeColors(
    summary: PcPokemonSummary,
    mode: string,
    storeState: CharacterState,
    roomCustomTypes: CustomType[]
): { primary: string; secondary: string } {
    const isTrainer = summary.rank === 'Trainer' || summary.fullMetadata?.mode === 'Trainer' || mode === 'Trainer';

    const rawPrimary =
        (summary.fullMetadata?.['theme-primary-override'] as string) ||
        (summary.fullMetadata?.themePrimaryOverride as string) ||
        storeState.identity.themePrimaryOverride ||
        '';

    const rawSecondary =
        (summary.fullMetadata?.['theme-secondary-override'] as string) ||
        (summary.fullMetadata?.themeSecondaryOverride as string) ||
        storeState.identity.themeSecondaryOverride ||
        '';

    const themeIdentity = {
        type1: isTrainer ? '' : summary.type1 || storeState.identity.type1 || '',
        type2: isTrainer ? '' : summary.type2 || storeState.identity.type2 || '',
        themePrimaryOverride: rawPrimary,
        themeSecondaryOverride: rawSecondary
    };

    return resolveCharacterThemeColors(themeIdentity, roomCustomTypes);
}

export interface RestorePreviousCharacterParams {
    prevTokenId: string | null;
    prevMeta: Record<string, unknown> | null;
    prevTheme: { primary: string; secondary: string } | null;
    currentSummary: PcPokemonSummary;
    initialMapTokenId?: string;
    initialEntityId?: string;
    mode: string;
    roomCustomTypes: CustomType[];
}

/**
 * Restores previous character store state and dynamic theming on modal unmount.
 */
export function restorePreviousCharacterState(params: RestorePreviousCharacterParams): void {
    const {
        prevTokenId,
        prevMeta,
        prevTheme,
        currentSummary,
        initialMapTokenId,
        initialEntityId,
        mode,
        roomCustomTypes
    } = params;

    const targetId = currentSummary.entityId;
    const targetMapId = currentSummary.mapTokenId;

    const isSameEntity =
        (prevTokenId &&
            (prevTokenId === targetId ||
                (targetMapId && prevTokenId === targetMapId) ||
                (initialMapTokenId && prevTokenId === initialMapTokenId) ||
                (initialEntityId && prevTokenId === initialEntityId))) ||
        (prevMeta &&
            (prevMeta.entityId === targetId ||
                prevMeta['entityId'] === targetId ||
                (initialEntityId &&
                    (prevMeta.entityId === initialEntityId || prevMeta['entityId'] === initialEntityId))));

    if (!prevTokenId) {
        // No token was selected prior to opening PC: restore clean empty state
        setActiveTokenId(null);
        const s = useCharacterStore.getState();
        s.setTokenData('', s.role || 'PLAYER');
        s.loadFromOwlbear({});
        if (prevTheme) {
            applyDynamicThemeColors(prevTheme.primary, prevTheme.secondary);
        } else {
            applyDynamicThemeColors('', '');
        }
    } else if (!isSameEntity) {
        // A different token was selected prior to opening PC: restore it
        setActiveTokenId(prevTokenId);
        const s = useCharacterStore.getState();
        s.setTokenData(prevTokenId, s.role || 'PLAYER');
        if (prevMeta) {
            s.loadFromOwlbear(prevMeta);
        }
        if (prevTheme) {
            applyDynamicThemeColors(prevTheme.primary, prevTheme.secondary);
        }
    } else if (currentSummary.isOnMap && currentSummary.mapTokenId && prevTokenId === currentSummary.mapTokenId) {
        // Same entity was already selected on map before opening PC: keep map token active
        setActiveTokenId(currentSummary.mapTokenId);
        const s = useCharacterStore.getState();
        s.setTokenData(currentSummary.mapTokenId, s.role || 'PLAYER');
        const colors = resolvePcSheetThemeColors(currentSummary, mode, s, roomCustomTypes);
        applyDynamicThemeColors(colors.primary, colors.secondary);
    } else {
        // Opened purely from storage without active map selection: clear to empty state
        setActiveTokenId(null);
        const s = useCharacterStore.getState();
        s.setTokenData('', s.role || 'PLAYER');
        s.loadFromOwlbear({});
        if (prevTheme) {
            applyDynamicThemeColors(prevTheme.primary, prevTheme.secondary);
        } else {
            applyDynamicThemeColors('', '');
        }
    }

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('theme-override-updated'));
    }
}
