import type {
    CharacterState,
    ExtraCategory,
    SkillCheck,
    ActiveCombatBoost,
    Badge,
    TrainerPokedexData,
    Rank,
    TransformationType
} from '@/store/storeTypes';
import { getKnownAbility } from '@/data/abilities/knownAbilities';
import { mapAttr, mapSkill, parseFiniteNumber } from './mapperHelpers';
import { parsePokedex } from './parseCharacterFeatures';

export function parseExtraCategories(meta: Record<string, unknown>): ExtraCategory[] {
    try {
        const data = meta['extra-skills-data'];
        return data ? JSON.parse(String(data)) : [];
    } catch (e) {
        console.warn('[StateMapper] Failed to parse extra categories from metadata:', e);
        return [];
    }
}

export function parseWishlist(meta: Record<string, unknown>): string[] {
    try {
        const raw = meta['moves-wishlist-data'] ?? meta['wishlist-data'] ?? meta['wishlist'];
        if (!raw) return [];
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
        return [];
    } catch (e) {
        console.warn('[StateMapper] Failed to parse wishlist from metadata:', e);
        return [];
    }
}

export function parseSkillChecks(meta: Record<string, unknown>, parsedExtraCats: ExtraCategory[]): SkillCheck[] {
    try {
        const rawChecks = meta['skill-checks-data'] ? JSON.parse(String(meta['skill-checks-data'])) : [];
        if (!Array.isArray(rawChecks)) return [];

        return rawChecks.map((c: Record<string, unknown>) => ({
            id: (c.id as string) || crypto.randomUUID(),
            name: String(c.name || c.Name || ''),
            attr: mapAttr(String(c.attr || c.Attribute || 'ins')) || 'ins',
            skill: mapSkill(String(c.skill || c.Skill || 'none'), parsedExtraCats)
        }));
    } catch (e) {
        console.warn('[StateMapper] Failed to parse skill checks from metadata:', e);
        return [];
    }
}

export function parseTrackers(meta: Record<string, unknown>) {
    let parsedBankedAccDice: Record<string, number> = {};
    try {
        const bankedStr = String(meta['banked-acc-dice'] || '{}');
        parsedBankedAccDice = JSON.parse(bankedStr);
    } catch (e) {
        console.warn('[StateMapper] Failed to parse banked accuracy dice from metadata:', e);
        parsedBankedAccDice = {};
    }

    let parsedBoostLevels: Record<string, number> = {};
    try {
        const boostStr = String(meta['boost-levels'] || '{}');
        parsedBoostLevels = JSON.parse(boostStr);
    } catch {
        parsedBoostLevels = {};
    }

    let parsedActiveCombatBoost: ActiveCombatBoost | null = null;
    if (meta['active-combat-boost']) {
        try {
            const rawBoost =
                typeof meta['active-combat-boost'] === 'string'
                    ? JSON.parse(meta['active-combat-boost'])
                    : meta['active-combat-boost'];
            if (rawBoost && typeof rawBoost === 'object' && rawBoost.sourceName) {
                parsedActiveCombatBoost = rawBoost as ActiveCombatBoost;
            }
        } catch {
            parsedActiveCombatBoost = null;
        }
    }

    return {
        actions: parseFiniteNumber(meta['actions-used'], 0),
        evade: meta['evasions-used'] === true || meta['evasions-used'] === 'true',
        clash: meta['clashes-used'] === true || meta['clashes-used'] === 'true',
        chances: parseFiniteNumber(meta['chances-used'], 0),
        fate: parseFiniteNumber(meta['fate-used'], 0),
        globalAcc: parseFiniteNumber(meta['global-acc-mod'], 0),
        globalDmg: parseFiniteNumber(meta['global-dmg-mod'], 0),
        globalSucc: parseFiniteNumber(meta['global-succ-mod'], 0),
        globalChance: parseFiniteNumber(meta['global-chance-mod'], 0),
        ignoredPain: parseFiniteNumber(meta['ignored-pain-mod'], 0),
        firstHitAcc: meta['first-hit-acc-active'] === true || meta['first-hit-acc-active'] === 'true',
        firstHitDmg: meta['first-hit-dmg-active'] === true || meta['first-hit-dmg-active'] === 'true',
        bankedAccDice: parsedBankedAccDice,
        boostLevels: parsedBoostLevels,
        activeCombatBoost: parsedActiveCombatBoost
    };
}

export function parseIdentity(
    meta: Record<string, unknown>,
    state: CharacterState,
    parsedBadges: Badge[],
    parsedPokedex?: TrainerPokedexData
) {
    const abilityListStr = String(meta['ability-list'] || '');
    const loadedAbilities = abilityListStr ? abilityListStr.split(',') : [];

    const rawRank =
        (meta['rank'] as Rank) ||
        (meta['Rank'] as Rank) ||
        ((meta.identity as { rank?: Rank })?.rank as Rank) ||
        'Starter';
    const VALID_RANKS = new Set<string>([
        'Starter',
        'Rookie',
        'Standard',
        'Advanced',
        'Expert',
        'Ace',
        'Master',
        'Champion'
    ]);
    const loadedRank: Rank = VALID_RANKS.has(rawRank) ? (rawRank as Rank) : 'Starter';
    const loadedAbility = String(meta['ability'] || '');
    let loadedTags = String(meta['ability-tags'] || '');
    const cleanLoadedAbility = loadedAbility.replace(/\s*\(HA\)$/i, '').trim();
    if (cleanLoadedAbility) {
        const known = getKnownAbility(cleanLoadedAbility, loadedRank);
        const custom = state.roomCustomAbilities?.find(
            (ca) => ca.name.trim().toLowerCase() === cleanLoadedAbility.toLowerCase()
        );
        if (known) {
            loadedTags = known.tags;
            const rawMetaTags = String(meta['ability-tags'] || '').trim();
            if (rawMetaTags && rawMetaTags !== known.tags) {
                let cleanOldTags = rawMetaTags;
                if (cleanLoadedAbility.toLowerCase() === 'super luck') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*high crit(?:ical)?\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'compound eyes') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*acc\s*\+?1\s*:\s*low acc(?:uracy)?\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'mega launcher') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*projectile move\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'reckless') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*recoil\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'dragon maw') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*dragon\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'transistor') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dmg\s*\+?1\s*:\s*electric\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'solar power') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*spe\s*\+?1\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'sand rush') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dex\s*\+?2\s*\]/gi, '').trim();
                } else if (cleanLoadedAbility.toLowerCase() === 'slush rush') {
                    cleanOldTags = cleanOldTags.replace(/\[\s*dex\s*\+?2\s*\]/gi, '').trim();
                }
                const knownLower = known.tags.toLowerCase();
                const extra = cleanOldTags
                    .split(/\s+(?=\[)/)
                    .map((t) => t.trim())
                    .filter((t) => t && !knownLower.includes(t.toLowerCase()))
                    .join(' ');
                if (extra) loadedTags = `${loadedTags} ${extra}`.trim();
            }
        } else if (custom) {
            if (!loadedTags) {
                loadedTags = `${custom.effect || ''} ${custom.description || ''}`.trim();
            }
        } else if (!loadedTags) {
            // No tags
        } else {
            const isCustom = Boolean(custom);
            if (
                !isCustom &&
                (loadedTags.includes('[Str +1]') || loadedTags.includes('[Str +2]')) &&
                cleanLoadedAbility !== 'Huge Power' &&
                cleanLoadedAbility !== 'Pure Power'
            ) {
                loadedTags = '';
            }
        }
    }
    if (cleanLoadedAbility === 'Huge Power' || cleanLoadedAbility === 'Pure Power') {
        const cleanRank = String(loadedRank).toLowerCase().trim();
        const isHigh =
            cleanRank === 'expert' || cleanRank === 'ace' || cleanRank === 'master' || cleanRank === 'champion';
        if (!isHigh && loadedTags.includes('[Str +2]')) {
            loadedTags = loadedTags.replace(/\[Str \+2\]/g, '[Str +1]');
        } else if (isHigh && loadedTags.includes('[Str +1]')) {
            loadedTags = loadedTags.replace(/\[Str \+1\]/g, '[Str +2]');
        }
    }

    const loadedBoostActive = meta['ability-boost-active'] === true || meta['ability-boost-active'] === 'true';
    const loadedBoostLevel = parseFiniteNumber(meta['ability-boost-level'], loadedBoostActive ? 1 : 0);
    const loadedChoiceIndex = parseFiniteNumber(meta['ability-choice-index'], 0);

    return {
        ...state.identity,
        entityId: String(
            meta['entityId'] ||
                meta.entityId ||
                (meta['pokerole-pmd-extension/claimed-by'] as { entityId?: string } | undefined)?.entityId ||
                ''
        ),
        nickname: String(meta['nickname'] || ''),
        species: String(meta['species'] || ''),
        nature: String(meta['nature'] || ''),
        rank: loadedRank,

        type1: String(meta['type1'] || meta['Type1'] || ''),
        type2: (() => {
            const raw = String(meta['type2'] || meta['Type2'] || '').trim();
            return raw.toLowerCase() === 'none' ? '' : raw;
        })(),

        ability: loadedAbility,
        abilityActive:
            meta['ability-active'] === undefined
                ? true
                : meta['ability-active'] === true || meta['ability-active'] === 'true',
        abilityBoostActive: loadedBoostActive,
        abilityBoostLevel: loadedBoostLevel,
        abilityChoiceIndex: loadedChoiceIndex,
        abilityTags: loadedTags,
        abilityTargetIds: (() => {
            if (meta['ability-target-ids'] === undefined || meta['ability-target-ids'] === null) {
                return undefined;
            }
            const raw = String(meta['ability-target-ids']).trim();
            return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
        })(),
        availableAbilities: loadedAbilities,
        previousNativeAbility: String(meta['previous-native-ability'] || ''),
        mode: String(meta['mode'] || 'Pokémon'),
        age: String(meta['age'] || ''),
        gender: String(meta['gender'] || ''),
        rolls: String(meta['rolls'] || 'Public (Everyone)'),
        combat: String(meta['combat'] || ''),
        social: String(meta['social'] || ''),
        hand: String(meta['hand'] || ''),
        isNPC: meta['is-npc'] === true || meta['is-npc'] === 'true',
        isPlayerSide: meta['is-player-side'] !== undefined ? Boolean(meta['is-player-side']) : undefined,
        coreLocked: meta['core-locked'] !== undefined ? Boolean(meta['core-locked']) : true,
        socialLocked: meta['social-locked'] !== undefined ? Boolean(meta['social-locked']) : true,
        hpLocked: meta['hp-locked'] !== undefined ? Boolean(meta['hp-locked']) : true,
        willLocked: meta['will-locked'] !== undefined ? Boolean(meta['will-locked']) : true,
        pokemonBackup: String(meta['pokemon-backup'] || ''),
        trainerBackup: String(meta['trainer-backup'] || ''),

        tokenImageUrl: (() => {
            const raw = meta['token-image-url']
                ? String(meta['token-image-url'])
                : meta['tokenImageUrl']
                  ? String(meta['tokenImageUrl'])
                  : '';
            const defaultTokenUrl = `${((typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/').replace(/\/$/, '')}/pokeball-token.svg`;
            if (!raw || raw.endsWith('pokeball.svg')) {
                return defaultTokenUrl;
            }
            return raw;
        })(),

        activeTransformation: (meta['active-transformation'] as TransformationType) || 'None',
        activeFormId: String(meta['active-form-id'] || ''),
        formSaves: meta['form-saves'] ? JSON.parse(String(meta['form-saves'])) : {},
        customFormConfig: meta['custom-form-config'] ? JSON.parse(String(meta['custom-form-config'])) : {},
        customFormImages: meta['custom-form-images'] ? JSON.parse(String(meta['custom-form-images'])) : {},

        baseFormData: String(meta['base-form-data'] || ''),
        altFormData: String(meta['alt-form-data'] || ''),
        maxFormData: String(meta['max-form-data'] || ''),
        terastallizeAffinity: String(meta['terastallize-affinity'] || ''),
        terastallizeBonusActive:
            meta['terastallize-bonus-active'] === true || meta['terastallize-bonus-active'] === 'true',

        megaImageUrl: String(meta['mega-image-url'] || ''),
        maxImageUrl: String(meta['max-image-url'] || ''),
        teraImageUrl: String(meta['tera-image-url'] || ''),

        customFormFirstHitAccActive:
            meta['custom-form-first-hit-acc'] === true || meta['custom-form-first-hit-acc'] === 'true',
        customFormFirstHitDmgActive:
            meta['custom-form-first-hit-dmg'] === true || meta['custom-form-first-hit-dmg'] === 'true',

        badges: parsedBadges,
        pokedex:
            parsedPokedex ??
            (meta['pokedex-data'] !== undefined ? parsePokedex(meta) : (state.identity?.pokedex ?? {})),

        showTrackers: meta['show-trackers'] !== false && meta['show-trackers'] !== 'false',
        settingHpBar: meta['setting-hp-bar'] !== false && meta['setting-hp-bar'] !== 'false',
        gmHpBar: meta['gm-hp-bar'] === true || meta['gm-hp-bar'] === 'true',
        settingHpText: meta['setting-hp-text'] !== false && meta['setting-hp-text'] !== 'false',
        gmHpText: meta['gm-hp-text'] === true || meta['gm-hp-text'] === 'true',
        settingWillBar: meta['setting-will-bar'] !== false && meta['setting-will-bar'] !== 'false',
        gmWillBar: meta['gm-will-bar'] === true || meta['gm-will-bar'] === 'true',
        settingWillText: meta['setting-will-text'] !== false && meta['setting-will-text'] !== 'false',
        gmWillText: meta['gm-will-text'] === true || meta['gm-will-text'] === 'true',
        settingDefBadge: meta['setting-def-badge'] !== false && meta['setting-def-badge'] !== 'false',
        gmDefBadge: meta['gm-def-badge'] === true || meta['gm-def-badge'] === 'true',
        settingEcoBadge: meta['setting-eco-badge'] !== false && meta['setting-eco-badge'] !== 'false',
        gmEcoBadge: meta['gm-eco-badge'] === true || meta['gm-eco-badge'] === 'true',
        ignoreRoomHudRules: meta['ignore-room-hud-rules'] === true || meta['ignore-room-hud-rules'] === 'true',
        colorAct: String(meta['color-act'] || '#4890fc'),
        colorEva: String(meta['color-eva'] || '#c387fc'),
        colorCla: String(meta['color-cla'] || '#dfad43'),

        trackerScale: parseFiniteNumber(meta['tracker-scale'], 100),
        trackerLayer: (meta['tracker-layer'] as 'POPOVER' | 'ATTACHMENT' | 'CHARACTER' | 'MOUNT') || 'ATTACHMENT',
        xOffset: parseFiniteNumber(meta['x-offset'], 0),
        yOffset: parseFiniteNumber(meta['y-offset'], 0),
        hpOffsetX: parseFiniteNumber(meta['hp-offset-x'], 0),
        hpOffsetY: parseFiniteNumber(meta['hp-offset-y'], 0),
        willOffsetX: parseFiniteNumber(meta['will-offset-x'], 0),
        willOffsetY: parseFiniteNumber(meta['will-offset-y'], 0),
        defOffsetX: parseFiniteNumber(meta['def-offset-x'], 0),
        defOffsetY: parseFiniteNumber(meta['def-offset-y'], 0),
        actOffsetX: parseFiniteNumber(meta['act-offset-x'], 0),
        actOffsetY: parseFiniteNumber(meta['act-offset-y'], 0),
        evaOffsetX: parseFiniteNumber(meta['eva-offset-x'], 0),
        evaOffsetY: parseFiniteNumber(meta['eva-offset-y'], 0),
        claOffsetX: parseFiniteNumber(meta['cla-offset-x'], 0),
        claOffsetY: parseFiniteNumber(meta['cla-offset-y'], 0),

        // --- Hydrate overrides ---
        themePrimaryOverride: String(meta['theme-primary-override'] || ''),
        themeSecondaryOverride: String(meta['theme-secondary-override'] || ''),

        dexId: String(meta['dex-id'] || ''),
        dexCategory: String(meta['dex-category'] || ''),
        height: String(meta['height'] || ''),
        weight: String(meta['weight'] || ''),
        dexDescription: String(meta['dex-description'] || '')
    };
}

