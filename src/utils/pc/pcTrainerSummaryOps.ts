import type { TrainerRoster, PcPokemonSummary } from '../../types/pcStorageTypes';
import type { Rank } from '../../store/entityTypes';
import { METADATA_ID } from '../sync/obr';
import { useCharacterStore } from '../../store/useCharacterStore';

export const VALID_RANKS = new Set([
    'Starter',
    'Rookie',
    'Standard',
    'Advanced',
    'Expert',
    'Ace',
    'Master',
    'Champion'
]);

export function parseNumericMeta(
    keys: string[],
    sources: (Record<string, unknown> | null | undefined)[],
    fallback: number
): number {
    for (const src of sources) {
        if (!src) continue;
        for (const k of keys) {
            const val = src[k];
            if (val !== undefined && val !== null && val !== '') {
                const num = Number(val);
                if (!isNaN(num)) return num;
            }
        }
    }
    return fallback;
}

/**
 * Builds a PcPokemonSummary representation of a Trainer profile for sheet viewing.
 */
export function buildTrainerSummary(trainer: TrainerRoster): PcPokemonSummary | null {
    if (trainer.profileType === 'storage' || trainer.id.startsWith('__pmd_')) return null;
    let localMeta: Record<string, unknown> | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const raw = window.localStorage.getItem(`pkr_char_${trainer.id}`);
            if (raw) localMeta = JSON.parse(raw);
            if (!localMeta && trainer.savedTokenItem?.id) {
                const rawTok = window.localStorage.getItem(`pkr_char_${trainer.savedTokenItem.id}`);
                if (rawTok) localMeta = JSON.parse(rawTok);
            }
        } catch {}
    }

    const tokenMeta =
        (trainer.savedTokenItem?.metadata?.[METADATA_ID] as Record<string, unknown>) ||
        (trainer.savedTokenItem?.metadata?.['pokerole-pmd-extension/stats'] as Record<string, unknown>) ||
        null;

    const sources = [tokenMeta, localMeta, trainer.fullMetadata];

    const store = useCharacterStore.getState();
    const isStoreTrainer = store.identity.mode === 'Trainer' || (store.identity.rank as string) === 'Trainer';
    const storeMatchesTrainer =
        isStoreTrainer &&
        (store.identity.nickname === trainer.name || store.identity.species === trainer.name || !trainer.name);

    const hpCurr =
        storeMatchesTrainer && store.health.hpCurr !== undefined
            ? store.health.hpCurr
            : parseNumericMeta(['hp-curr', 'hp', 'currentHp'], sources, 5);

    const hpMax =
        storeMatchesTrainer && store.health.hpMax !== undefined
            ? store.health.hpMax
            : parseNumericMeta(['hp-max-display', 'hpMax', 'maxHp'], sources, 5);

    const willCurr =
        storeMatchesTrainer && store.will.willCurr !== undefined
            ? store.will.willCurr
            : parseNumericMeta(['will-curr', 'will', 'currentWill'], sources, 4);

    const willMax =
        storeMatchesTrainer && store.will.willMax !== undefined
            ? store.will.willMax
            : parseNumericMeta(['will-max-display', 'willMax', 'maxWill'], sources, 4);

    const trainerType1 =
        (tokenMeta?.type1 as string) || (localMeta?.type1 as string) || (trainer.fullMetadata?.type1 as string) || '';
    const trainerType2 =
        (tokenMeta?.type2 as string) || (localMeta?.type2 as string) || (trainer.fullMetadata?.type2 as string);
    const resolvedAvatar =
        (tokenMeta?.['token-image-url'] as string) ||
        (localMeta?.['token-image-url'] as string) ||
        (localMeta?.tokenImageUrl as string) ||
        (trainer.fullMetadata?.['token-image-url'] as string) ||
        trainer.avatarUrl;
    const primaryOverride =
        ((tokenMeta?.['theme-primary-override'] || tokenMeta?.themePrimaryOverride) as string) ||
        ((localMeta?.['theme-primary-override'] || localMeta?.themePrimaryOverride) as string) ||
        ((trainer.fullMetadata?.['theme-primary-override'] || trainer.fullMetadata?.themePrimaryOverride) as string) ||
        (storeMatchesTrainer ? store.identity.themePrimaryOverride : '') ||
        '';
    const secondaryOverride =
        ((tokenMeta?.['theme-secondary-override'] || tokenMeta?.themeSecondaryOverride) as string) ||
        ((localMeta?.['theme-secondary-override'] || localMeta?.themeSecondaryOverride) as string) ||
        ((trainer.fullMetadata?.['theme-secondary-override'] ||
            trainer.fullMetadata?.themeSecondaryOverride) as string) ||
        (storeMatchesTrainer ? store.identity.themeSecondaryOverride : '') ||
        '';

    const rawRank =
        (tokenMeta?.rank as string) ||
        (localMeta?.rank as string) ||
        (trainer.fullMetadata?.['rank'] as string) ||
        (trainer.fullMetadata?.rank as string) ||
        (storeMatchesTrainer ? store.identity.rank : 'Starter');
    const trainerRank: Rank = typeof rawRank === 'string' && VALID_RANKS.has(rawRank) ? (rawRank as Rank) : 'Starter';
    const trainerSpecies = (localMeta?.species as string) || (trainer.fullMetadata?.species as string) || trainer.name;
    const trainerMode = (localMeta?.mode as string) || (trainer.fullMetadata?.mode as string) || 'Trainer';

    return {
        entityId: trainer.id,
        name: trainer.name,
        species: trainerSpecies,
        rank: trainerRank,
        type1: trainerType1,
        type2: trainerType2,
        hp: hpCurr,
        maxHp: hpMax,
        will: willCurr,
        maxWill: willMax,
        tokenImageUrl: resolvedAvatar,
        isOnMap: Boolean(trainer.mapTokenId),
        mapTokenId: trainer.mapTokenId,
        savedTokenItem: trainer.savedTokenItem,
        fullMetadata: {
            ...(trainer.fullMetadata || {}),
            ...(localMeta || {}),
            name: trainer.name,
            nickname: trainer.name,
            species: trainerSpecies,
            mode: trainerMode,
            rank: trainerRank,
            'str-base': localMeta?.['str-base'] ?? trainer.fullMetadata?.['str-base'] ?? 1,
            'dex-base': localMeta?.['dex-base'] ?? trainer.fullMetadata?.['dex-base'] ?? 1,
            'vit-base': localMeta?.['vit-base'] ?? trainer.fullMetadata?.['vit-base'] ?? 1,
            'ins-base': localMeta?.['ins-base'] ?? trainer.fullMetadata?.['ins-base'] ?? 1,
            'spe-base': localMeta?.['spe-base'] ?? trainer.fullMetadata?.['spe-base'] ?? 1,
            type1: trainerType1,
            type2: trainerType2 || '',
            'token-image-url': trainer.avatarUrl,
            'hp-curr': hpCurr,
            'hp-max-display': hpMax,
            'will-curr': willCurr,
            'will-max-display': willMax,
            'theme-primary-override': primaryOverride,
            'theme-secondary-override': secondaryOverride,
            themePrimaryOverride: primaryOverride,
            themeSecondaryOverride: secondaryOverride
        },
        lastModified: 0
    };
}
