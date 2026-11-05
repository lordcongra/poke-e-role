import type { TempBuild, CharacterState } from '@/store/storeTypes';
import { CombatStat, SocialStat, Skill } from '@/types/enums';
import { getBase, getLimit, extractAbilities } from '@/utils/common/macroHelpers';
import { calculateMaxHp, calculateMaxWill } from '@/utils/combat/combatMath';

export function buildTokenMetadataFromBuild(
    build: TempBuild,
    nickname: string,
    imageUrl: string,
    privacy?: {
        privacyDefaults?: boolean;
        privateNpcLock?: boolean;
        privateRolls?: boolean;
        privateGmTrackers?: boolean;
    }
): Record<string, unknown> {
    const pd = (build.pokemonData || {}) as Record<string, unknown>;
    const rank = build.rank || 'Starter';

    const baseVit = Number(getBase(pd, 'Vitality', 2)) || 2;
    const baseIns = Number(getBase(pd, 'Insight', 1)) || 1;

    const hpBase = Number(pd.BaseHP) || 4;
    const willBase = Number(pd.BaseWill) || 3;

    const fakeState = {
        identity: { rank: rank, ruleset: 'vg-vit-hp', ability: '' },
        health: { hpBase: hpBase },
        will: { willBase: willBase },
        stats: {
            [CombatStat.STR]: { base: 2, rank: build.attr['str'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.DEX]: { base: 2, rank: build.attr['dex'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.VIT]: { base: baseVit, rank: build.attr['vit'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.SPE]: { base: 2, rank: build.attr['spe'] || 0, buff: 0, debuff: 0, limit: 5 },
            [CombatStat.INS]: { base: baseIns, rank: build.attr['ins'] || 0, buff: 0, debuff: 0, limit: 5 }
        },
        socials: {},
        inventory: [],
        extraCategories: [],
        roomCustomAbilities: []
    } as unknown as CharacterState;

    const hpMax = calculateMaxHp(fakeState);
    const willMax = calculateMaxWill(fakeState);

    const abilities = extractAbilities(pd);
    const abilityName = String(pd.Ability1 || pd.ability1 || (abilities.length > 0 ? abilities[0] : '') || '');

    const metadata: Record<string, unknown> = {
        nickname: nickname.trim(),
        species: build.species,
        rank: rank,
        type1: String(pd.Type1 || pd.type1 || 'Normal'),
        type2:
            pd.Type2 && String(pd.Type2).toLowerCase() !== 'none'
                ? String(pd.Type2)
                : pd.type2 && String(pd.type2).toLowerCase() !== 'none'
                  ? String(pd.type2)
                  : '',
        ability: abilityName,
        'ability-list': abilities.join(','),
        nature: build.nature || '-- Select --',
        gender: build.gender !== undefined ? build.gender : 'Genderless',
        age: '',
        mode: 'Pokémon',
        'show-trackers': true,
        ruleset: 'vg-vit-hp',
        'token-image-url': imageUrl,
        'v2-migrated': true,
        'hp-base': hpBase,
        'hp-curr': hpMax,
        'hp-max-display': hpMax,
        'will-base': willBase,
        'will-curr': willMax,
        'will-max-display': willMax,
        'def-buff': 0,
        'def-debuff': 0,
        'spd-buff': 0,
        'spd-debuff': 0,
        'actions-curr': 0,
        'evade-used': false,
        'clash-used': false,
        'chances-curr': 0,
        'fate-curr': 0,
        'global-acc': 0,
        'global-dmg': 0,
        'global-succ': 0,
        'dex-id': String(pd.Number || pd.DexID || pd.dexId || ''),
        'dex-category': String(pd.Category || pd.Species || ''),
        height: String(pd.Height || ''),
        weight: String(pd.Weight || ''),
        'dex-description': String(pd.Description || pd.dexDescription || '')
    };

    const STAT_MAP: Record<CombatStat, string> = {
        [CombatStat.STR]: 'Strength',
        [CombatStat.DEX]: 'Dexterity',
        [CombatStat.VIT]: 'Vitality',
        [CombatStat.SPE]: 'Special',
        [CombatStat.INS]: 'Insight'
    };

    Object.values(CombatStat).forEach((stat) => {
        const fallback = stat === 'ins' ? 1 : 2;
        const statName = STAT_MAP[stat] || stat;
        const resolvedBase = build.baseStats?.[stat] ?? (Number(getBase(pd, statName, fallback)) || fallback);
        metadata[`${stat}-base`] = resolvedBase;
        metadata[`${stat}-rank`] = build.attr[stat] || 0;
        metadata[`${stat}-buff`] = 0;
        metadata[`${stat}-debuff`] = 0;
        metadata[`${stat}-limit`] = Number(getLimit(pd, statName)) || 5;
    });

    Object.values(SocialStat).forEach((stat) => {
        metadata[`${stat}-base`] = 1;
        metadata[`${stat}-rank`] = build.soc[stat] || 0;
        metadata[`${stat}-buff`] = 0;
        metadata[`${stat}-debuff`] = 0;
        metadata[`${stat}-limit`] = 5;
    });

    Object.values(Skill).forEach((skill) => {
        metadata[`${skill}-base`] = build.skills[skill] || 0;
        metadata[`${skill}-buff`] = 0;
    });

    const movesData = build.moves.map((move) => {
        const categoryString = String(move.cat);
        const properCategory = categoryString.startsWith('Phys')
            ? 'Physical'
            : categoryString.startsWith('Spec')
              ? 'Special'
              : 'Status';

        return {
            ...move,
            id: crypto.randomUUID(),
            active: false,
            category: properCategory as 'Physical' | 'Special' | 'Status',
            accBonus: 0,
            acc1: move.attr,
            acc2: move.skill,
            dmg1: move.dmgStat,
            marker: move.marker || '',
            dualScaleSelected: move.dualScaleSelected ?? true
        };
    });

    metadata['moves-data'] = JSON.stringify(movesData);
    metadata['extra-skills-data'] = '[]';

    if (build.loyalty !== undefined) {
        metadata['loyalty-curr'] = build.loyalty;
    }
    if (build.happiness !== undefined) {
        metadata['happiness-curr'] = build.happiness;
    }

    if (privacy?.privacyDefaults) {
        if (privacy.privateNpcLock) {
            metadata['is-npc'] = true;
        }
        if (privacy.privateRolls) {
            metadata['rolls'] = 'Private (GM)';
        }
        if (privacy.privateGmTrackers) {
            metadata['gm-hp-bar'] = true;
            metadata['gm-hp-text'] = true;
            metadata['gm-will-bar'] = true;
            metadata['gm-will-text'] = true;
            metadata['gm-def-badge'] = true;
            metadata['gm-eco-badge'] = true;
        }
    }

    return metadata;
}

