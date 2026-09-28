import type { InventoryItem, PassiveItem, MoveData, ExtraCategory } from '../../store/storeTypes';
import { Skill } from '../../types/enums';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getKnownAbility, getMaxBoost } from '../../data/abilities/knownAbilities';
import { KNOWN_ITEMS } from '../../data/constants';
import type { CombatBonuses, TagTriggers, ParsableEntity } from './tagTypes';
import {
    extractStats,
    extractSkills,
    extractDefenses,
    extractInitiativeAndChance,
    extractDamage,
    extractAccuracy,
    extractCritDamage,
    extractLowAccuracy,
    extractFirstHit,
    extractTempHp,
    extractRoundEffects,
    extractMechanics
} from './tagExtractors';
import { extractActiveEffectSummary } from './tagSummaries';

export function parseCombatTags(
    inventory: InventoryItem[],
    extraCategories: ExtraCategory[],
    move?: MoveData,
    abilityText: string = '',
    passives?: PassiveItem[]
): CombatBonuses {
    const bonuses: CombatBonuses = {
        stats: {},
        skills: {},
        def: 0,
        spd: 0,
        init: 0,
        dmg: 0,
        acc: 0,
        chance: 0,
        seDmg: 0,
        critDmg: 0,
        firstHitDmg: 0,
        firstHitAcc: 0,
        gainTempHp: 0,
        tempHpOnHit: 0,
        tempHpDmgRatio: '',
        highCritStacks: 0,
        stackingHighCritStacks: 0,
        ignoreLowAcc: 0,
        addLowAcc: 0,
        ignorePain: false,
        roundHeal: 0,
        roundDamage: 0,
        roundWillRestore: 0,
        roundWillDamage: 0,
        loseAction: 0,
        noReactions: false,
        extraReactions: 0,
        accFaceAddsDmg: 0,
        accFaceAddsDmgLimit: 0,
        itemNames: [],
        accItemNames: [],
        dmgItemNames: [],
        passiveNames: [],
        accPassiveNames: [],
        dmgPassiveNames: [],
        abilityNames: [],
        accAbilityNames: [],
        dmgAbilityNames: [],
        highCritItemNames: [],
        highCritPassiveNames: [],
        highCritAbilityNames: []
    };

    const state = useCharacterStore.getState();
    const hpCurr = Number(state.health.hpCurr) || 0;
    const hpMax = Math.max(1, Number(state.health.hpMax) || 1);
    const isHalfHp = hpCurr <= Math.floor(hpMax / 2);
    const boostLevels = state.trackers?.boostLevels || {};

    const cleanAbilityForBoost = (state.identity.ability || '').replace(/\s*\(HA\)$/i, '').trim();
    const abilityTagsForBoost = state.identity.abilityTags || '';
    const abilityMaxBoost = getMaxBoost(cleanAbilityForBoost, abilityTagsForBoost);
    const abilityBoostLevel =
        boostLevels['ability'] !== undefined
            ? boostLevels['ability']
            : state.identity.abilityBoostActive
              ? Math.max(1, state.identity.abilityBoostLevel ?? 1)
              : 0;

    const moveType = (move?.type || '').trim().toLowerCase();
    const moveDescription = (move?.desc || '').toLowerCase();
    const moveName = (move?.name || '').toLowerCase();
    const isComboMove =
        moveDescription.includes('successive') ||
        moveDescription.includes('double action') ||
        moveDescription.includes('triple action') ||
        moveName.includes('double') ||
        moveName.includes('triple');

    const customSkillNames = extraCategories
        .flatMap((category) => category.skills.map((skill) => (skill.name || '').toLowerCase()))
        .filter(Boolean);
    const skillsList = [...Object.values(Skill), ...customSkillNames];
    const escapedSkills = skillsList.map((skill) => skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

    const itemsToParse: ParsableEntity[] = [];

    // 1. Inventory Items
    inventory
        .filter((item) => item.active !== false)
        .forEach((item) => {
            const knownMatch = KNOWN_ITEMS.find((k) => k.name.toLowerCase() === (item.name || '').trim().toLowerCase());
            const canonicalTags = knownMatch?.tags || '';
            const combinedTagText = `${item.tags || ''} ${item.desc || ''}`.trim() || canonicalTags;
            const rawTags = Array.from(combinedTagText.matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
            const boostTags = rawTags.filter(
                (t) => /@\s*(?:stacking\s+)?boost\b|@\s*stacks\b/i.test(t) || /\[\s*stacking\s+high\s+crit\b/i.test(t)
            );

            if (boostTags.length > 1) {
                boostTags.forEach((t, idx) => {
                    const key = `item_${item.id}_${idx}`;
                    const bLvl =
                        boostLevels[key] !== undefined
                            ? boostLevels[key]
                            : boostLevels[`item_${item.id}`] !== undefined
                              ? boostLevels[`item_${item.id}`]
                              : (item.boostLevel ?? 0);
                    const mBoost = getMaxBoost(item.name, t);
                    itemsToParse.push({
                        kind: 'item',
                        id: `${item.id}_${idx}`,
                        name: item.name || 'Item',
                        desc: t,
                        showInRollLog: item.showInRollLog !== false,
                        boostLevel: bLvl,
                        maxBoost: mBoost
                    });
                });

                const nonBoostTags = rawTags.filter((t) => !boostTags.includes(t));
                if (nonBoostTags.length > 0) {
                    itemsToParse.push({
                        kind: 'item',
                        id: `${item.id}_nonboost`,
                        name: item.name || 'Item',
                        desc: nonBoostTags.join(' '),
                        showInRollLog: item.showInRollLog !== false,
                        boostLevel: 1,
                        maxBoost: 1
                    });
                }
            } else {
                const key = `item_${item.id}`;
                const bLvl =
                    boostLevels[key] !== undefined
                        ? boostLevels[key]
                        : boostLevels[`item_${item.id}_0`] !== undefined
                          ? boostLevels[`item_${item.id}_0`]
                          : boostLevels[item.id] !== undefined
                            ? boostLevels[item.id]
                            : (item.boostLevel ?? 0);
                const mBoost = getMaxBoost(item.name, combinedTagText);
                itemsToParse.push({
                    kind: 'item',
                    id: item.id,
                    name: item.name || 'Item',
                    desc: combinedTagText,
                    showInRollLog: item.showInRollLog !== false,
                    boostLevel: bLvl,
                    maxBoost: mBoost
                });
            }
        });

    // 2. Passives
    const effectivePassives = passives !== undefined ? passives : state.passives || [];
    effectivePassives
        .filter((item) => item.active !== false)
        .forEach((item) => {
            const rawTags = Array.from((item.desc || '').matchAll(/\[(.*?)\]/g)).map((m) => `[${m[1].trim()}]`);
            const boostTags = rawTags.filter(
                (t) => /@\s*(?:stacking\s+)?boost\b|@\s*stacks\b/i.test(t) || /\[\s*stacking\s+high\s+crit\b/i.test(t)
            );

            if (boostTags.length > 1) {
                boostTags.forEach((t, idx) => {
                    const key = `passive_${item.id}_${idx}`;
                    const bLvl =
                        boostLevels[key] !== undefined
                            ? boostLevels[key]
                            : boostLevels[`passive_${item.id}`] !== undefined
                              ? boostLevels[`passive_${item.id}`]
                              : (item.boostLevel ?? 0);
                    const mBoost = getMaxBoost(item.name, t);
                    itemsToParse.push({
                        kind: 'passive',
                        id: `${item.id}_${idx}`,
                        name: item.name || 'Passive',
                        desc: t,
                        showInRollLog: item.showInRollLog !== false,
                        boostLevel: bLvl,
                        maxBoost: mBoost
                    });
                });

                const nonBoostTags = rawTags.filter((t) => !boostTags.includes(t));
                if (nonBoostTags.length > 0) {
                    itemsToParse.push({
                        kind: 'passive',
                        id: `${item.id}_nonboost`,
                        name: item.name || 'Passive',
                        desc: nonBoostTags.join(' '),
                        showInRollLog: item.showInRollLog !== false,
                        boostLevel: 1,
                        maxBoost: 1
                    });
                }
            } else {
                const key = `passive_${item.id}`;
                const bLvl =
                    boostLevels[key] !== undefined
                        ? boostLevels[key]
                        : boostLevels[`passive_${item.id}_0`] !== undefined
                          ? boostLevels[`passive_${item.id}_0`]
                          : boostLevels[item.id] !== undefined
                            ? boostLevels[item.id]
                            : (item.boostLevel ?? 0);
                const mBoost = getMaxBoost(item.name, item.desc);
                itemsToParse.push({
                    kind: 'passive',
                    id: item.id,
                    name: item.name || 'Passive',
                    desc: item.desc || '',
                    showInRollLog: item.showInRollLog !== false,
                    boostLevel: bLvl,
                    maxBoost: mBoost
                });
            }
        });

    // 3. Ability
    if (state.identity.abilityActive !== false) {
        let desc = state.identity.abilityTags;
        const cleanAbility = (state.identity.ability || '').replace(/\s*\(HA\)$/i, '').trim();
        const known = getKnownAbility(cleanAbility, state.identity.rank);
        const customAbility = state.roomCustomAbilities?.find(
            (ca) => ca.name.trim().toLowerCase() === cleanAbility.toLowerCase()
        );

        if (known) {
            desc = known.tags;
            const currentTags = state.identity.abilityTags?.trim();
            if (currentTags && currentTags !== known.tags) {
                let cleanCurrent = currentTags;
                if (cleanAbility.toLowerCase() === 'super luck') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*high crit(?:ical)?\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'compound eyes') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*acc\s*\+?1\s*:\s*low acc(?:uracy)?\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'mega launcher') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*dmg\s*\+?1\s*:\s*projectile move\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'reckless') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*dmg\s*\+?1\s*:\s*recoil\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'dragon maw') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*dmg\s*\+?1\s*:\s*dragon\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'transistor') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*dmg\s*\+?1\s*:\s*electric\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'solar power') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*spe\s*\+?1\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'sand rush') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*dex\s*\+?2\s*\]/gi, '').trim();
                } else if (cleanAbility.toLowerCase() === 'slush rush') {
                    cleanCurrent = cleanCurrent.replace(/\[\s*dex\s*\+?2\s*\]/gi, '').trim();
                }
                const knownLower = known.tags.toLowerCase();
                const extra = cleanCurrent
                    .split(/\s+(?=\[)/)
                    .map((t) => t.trim())
                    .filter((t) => t && !knownLower.includes(t.toLowerCase()))
                    .join(' ');
                if (extra) desc = `${desc} ${extra}`.trim();
            }
        } else if (customAbility) {
            const customTags = `${customAbility.effect || ''} ${customAbility.description || ''}`.trim();
            if (desc) {
                if (customAbility.effect && desc.includes(customAbility.effect.trim())) {
                    // Tags are already contained in desc
                } else if (customTags && !desc.includes(customTags)) {
                    desc = `${desc} ${customTags}`.trim();
                }
            } else {
                desc = customTags;
            }
        } else if (abilityText) {
            desc = abilityText;
        } else {
            if (
                desc &&
                (desc.includes('[Str +1]') || desc.includes('[Str +2]')) &&
                cleanAbility !== 'Huge Power' &&
                cleanAbility !== 'Pure Power'
            ) {
                desc = '';
            }
        }

        if (desc) {
            if (cleanAbility === 'Huge Power' || cleanAbility === 'Pure Power') {
                const rank = (state.identity.rank || 'Starter').toLowerCase().trim();
                const isHigh = rank === 'expert' || rank === 'ace' || rank === 'master' || rank === 'champion';
                if (!isHigh && desc.includes('[Str +2]')) {
                    desc = desc.replace(/\[Str \+2\]/g, '[Str +1]');
                } else if (isHigh && desc.includes('[Str +1]')) {
                    desc = desc.replace(/\[Str \+1\]/g, '[Str +2]');
                }
            }
            const abilityDisplayName = state.identity.ability ? `Ability: ${state.identity.ability}` : 'Ability';
            itemsToParse.push({
                kind: 'ability',
                id: 'ability',
                name: abilityDisplayName,
                desc,
                showInRollLog: true,
                boostLevel: abilityBoostLevel,
                maxBoost: abilityMaxBoost
            });
        }
    }

    // 4. Move
    if (move && move.desc) {
        itemsToParse.push({
            kind: 'move',
            id: move.id || 'move',
            name: move.name || 'Move',
            desc: move.desc,
            showInRollLog: true,
            boostLevel: 1,
            maxBoost: 1
        });
    }

    // 5. Active Transformation Form
    if (state.identity.activeTransformation === 'Custom' && state.identity.activeFormId) {
        const customForm = state.roomCustomForms.find((f) => f.id === state.identity.activeFormId);
        if (customForm && customForm.tags) {
            itemsToParse.push({
                kind: 'form',
                id: customForm.id,
                name: customForm.name,
                desc: customForm.tags,
                showInRollLog: true,
                boostLevel: 1,
                maxBoost: 1
            });
        }
    }

    // 6. Active Statuses
    state.statuses.forEach((status) => {
        const custom = state.roomCustomStatuses.find(
            (cs) =>
                cs.name.toLowerCase() === status.name.toLowerCase() ||
                cs.name.toLowerCase() === status.customName.toLowerCase()
        );
        if (custom && custom.effects) {
            itemsToParse.push({
                kind: 'status',
                id: status.id,
                name: custom.name,
                desc: custom.effects,
                showInRollLog: true,
                boostLevel: 1,
                maxBoost: 1
            });
        }
    });

    itemsToParse.forEach((item) => {
        const description = item.desc.toLowerCase();
        const name = item.name.trim();
        const boostLevel = item.boostLevel;
        const maxBoost = item.maxBoost;
        const boostActive = boostLevel > 0;

        const triggers: TagTriggers = {
            general: false,
            accuracy: false,
            damage: false
        };

        extractStats(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive, move);
        extractSkills(description, escapedSkills, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive, move);
        extractDefenses(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractInitiativeAndChance(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractDamage(
            description,
            moveType,
            move,
            isComboMove,
            bonuses,
            triggers,
            isHalfHp,
            boostLevel,
            maxBoost,
            boostActive
        );
        extractCritDamage(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractLowAccuracy(description, moveType, move, bonuses, triggers, isHalfHp);
        extractAccuracy(description, moveType, move, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractFirstHit(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractTempHp(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractRoundEffects(description, bonuses, triggers, isHalfHp, boostLevel, maxBoost, boostActive);
        extractMechanics(description, moveType, move, bonuses, triggers, isHalfHp, item.kind, name, true, boostActive);

        if (item.kind === 'ability') {
            const cleanAbilityName = name.replace(/^Ability:\s*/i, '').trim();
            const generalEffect = extractActiveEffectSummary(item.desc, 'all', move, boostLevel);
            const generalLabel =
                generalEffect && !cleanAbilityName.toLowerCase().includes(generalEffect.toLowerCase())
                    ? `${cleanAbilityName} (${generalEffect})`
                    : cleanAbilityName;

            const accEffect = extractActiveEffectSummary(item.desc, 'acc', move, boostLevel);
            const accLabel =
                accEffect && !cleanAbilityName.toLowerCase().includes(accEffect.toLowerCase())
                    ? `${cleanAbilityName} (${accEffect})`
                    : cleanAbilityName;

            const dmgEffect = extractActiveEffectSummary(item.desc, 'dmg', move, boostLevel);
            const dmgLabel =
                dmgEffect && !cleanAbilityName.toLowerCase().includes(dmgEffect.toLowerCase())
                    ? `${cleanAbilityName} (${dmgEffect})`
                    : cleanAbilityName;

            if (triggers.general || (triggers.accuracy && accEffect) || (triggers.damage && dmgEffect)) {
                bonuses.abilityNames.push(generalLabel);
            }
            if ((triggers.general && accEffect) || (triggers.accuracy && accEffect)) {
                bonuses.accAbilityNames.push(accLabel);
            }
            if ((triggers.general && dmgEffect) || (triggers.damage && dmgEffect)) {
                bonuses.dmgAbilityNames.push(dmgLabel);
            }
        } else if (item.kind === 'passive') {
            const cleanPassiveName = name.replace(/^Passive:\s*/i, '').trim();
            const generalEffect = extractActiveEffectSummary(item.desc, 'all', move, boostLevel);
            const generalLabel =
                generalEffect && !cleanPassiveName.toLowerCase().includes(generalEffect.toLowerCase())
                    ? `${cleanPassiveName} (${generalEffect})`
                    : cleanPassiveName;

            const accEffect = extractActiveEffectSummary(item.desc, 'acc', move, boostLevel);
            const accLabel =
                accEffect && !cleanPassiveName.toLowerCase().includes(accEffect.toLowerCase())
                    ? `${cleanPassiveName} (${accEffect})`
                    : cleanPassiveName;

            const dmgEffect = extractActiveEffectSummary(item.desc, 'dmg', move, boostLevel);
            const dmgLabel =
                dmgEffect && !cleanPassiveName.toLowerCase().includes(dmgEffect.toLowerCase())
                    ? `${cleanPassiveName} (${dmgEffect})`
                    : cleanPassiveName;

            if (triggers.general || (triggers.accuracy && accEffect) || (triggers.damage && dmgEffect)) {
                bonuses.itemNames.push(generalLabel);
                bonuses.passiveNames.push(generalLabel);
            }
            if ((triggers.general && accEffect) || (triggers.accuracy && accEffect)) {
                bonuses.accItemNames.push(accLabel);
                bonuses.accPassiveNames.push(accLabel);
            }
            if ((triggers.general && dmgEffect) || (triggers.damage && dmgEffect)) {
                bonuses.dmgItemNames.push(dmgLabel);
                bonuses.dmgPassiveNames.push(dmgLabel);
            }
        } else if (item.kind === 'item') {
            const cleanItemName = name;
            const generalEffect = extractActiveEffectSummary(item.desc, 'all', move, boostLevel);
            const generalLabel =
                generalEffect && !cleanItemName.toLowerCase().includes(generalEffect.toLowerCase())
                    ? `${cleanItemName} (${generalEffect})`
                    : cleanItemName;

            const accEffect = extractActiveEffectSummary(item.desc, 'acc', move, boostLevel);
            const accLabel =
                accEffect && !cleanItemName.toLowerCase().includes(accEffect.toLowerCase())
                    ? `${cleanItemName} (${accEffect})`
                    : cleanItemName;

            const dmgEffect = extractActiveEffectSummary(item.desc, 'dmg', move, boostLevel);
            const dmgLabel =
                dmgEffect && !cleanItemName.toLowerCase().includes(dmgEffect.toLowerCase())
                    ? `${cleanItemName} (${dmgEffect})`
                    : cleanItemName;

            if (triggers.general || (triggers.accuracy && accEffect) || (triggers.damage && dmgEffect)) {
                bonuses.itemNames.push(generalLabel);
            }
            if ((triggers.general && accEffect) || (triggers.accuracy && accEffect)) {
                bonuses.accItemNames.push(accLabel);
            }
            if ((triggers.general && dmgEffect) || (triggers.damage && dmgEffect)) {
                bonuses.dmgItemNames.push(dmgLabel);
            }
        }
    });

    return bonuses;
}
