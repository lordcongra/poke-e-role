import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import { getEffectsByCategory } from '../../../utils/combat/fieldEffectsData';
import { getKnownAbility } from '../../../data/abilities/knownAbilities';
import { checkCondition } from '../../../utils/tagParser/conditionChecker';
import type { CombatantRowData, BattlefieldData } from '../../../types/battleOrganizerTypes';
import { compareCombatantsByInitiative } from './battleOrganizerUtils';

export interface CombatantCharacterData {
    types: string[];
    ability: string;
    abilityActive: boolean;
    abilityTags: string;
}

export interface CombatantRoundTriggerInfo {
    combatant: CombatantRowData;
    types: string[];
    ability: string;
    abilityActive: boolean;
    // Damage
    hasDamageTrigger: boolean;
    damageAmount: number;
    damageReason: string;
    isDamageImmune: boolean;
    damageImmuneReason: string;
    // Healing
    hasHealingTrigger: boolean;
    healingAmount: number;
    healingReason: string;
    isHealingIneligible: boolean;
    healingIneligibleReason: string;
}

/**
 * Rapid check to determine if any active weather, terrain, combatant status, or smart tags could trigger end-of-round effects.
 */
export function hasPotentialRoundAdvanceTriggers(
    battlefield: BattlefieldData,
    combatants?: CombatantRowData[]
): boolean {
    const activeWeathers = getEffectsByCategory(battlefield, 'weather');
    const activeTerrains = getEffectsByCategory(battlefield, 'terrain');

    const hasActiveWeather = activeWeathers.some((w) => {
        const n = (w.name || '').toLowerCase();
        return (
            n.includes('sand') ||
            n.includes('hail') ||
            n.includes('sun') ||
            n.includes('rain') ||
            n.includes('snow')
        );
    });
    const hasActiveTerrain = activeTerrains.some((t) => (t.name || '').toLowerCase().includes('grassy'));

    if (hasActiveWeather || hasActiveTerrain) {
        return true;
    }

    if (combatants && combatants.length > 0) {
        const dealOrHealTagRegex =
            /\[\s*(?:heal\s*\d+(?:\s*hp)?\s*(?:round end|at end of round|at round end)|(?:deal\s*)?\d+\s*(?:damage|dmg)\s*(?:at end of round|at round end|round end)|(?:end of round damage|end of round dmg)\s*:\s*\d+)/i;

        for (const c of combatants) {
            const statusLower = (c.status || '').toLowerCase();
            if (
                statusLower.includes('burn') ||
                statusLower.includes('poison') ||
                statusLower.includes('badly poisoned')
            ) {
                return true;
            }

            const heldItemLower = (c.heldItem || '').toLowerCase();
            if (heldItemLower.includes('leftovers')) {
                return true;
            }

            const allTags = `${c.heldItem || ''} ${c.abilityTags || ''} ${c.status || ''}`;
            if (dealOrHealTagRegex.test(allTags)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Fetches token metadata or local character data to extract types and abilities.
 */
export async function getCombatantCharacterDataMap(): Promise<Map<string, CombatantCharacterData>> {
    const map = new Map<string, CombatantCharacterData>();

    try {
        if (OBR.isAvailable && !isStandaloneMode) {
            const items = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
            items.forEach((item) => {
                const meta = item.metadata as Record<string, unknown>;
                const pmdMeta = (meta['pokerole-pmd-extension/stats'] || {}) as Record<string, unknown>;
                const statsMeta = (meta['pokerole-extension/stats'] || {}) as Record<string, unknown>;

                const type1 = String(meta['type1'] || pmdMeta['type1'] || statsMeta['type1'] || '');
                const type2 = String(meta['type2'] || pmdMeta['type2'] || statsMeta['type2'] || '');
                const types = [type1, type2].filter(Boolean);

                const ability = String(meta['ability'] || pmdMeta['ability'] || statsMeta['ability'] || '');
                const abilityActive =
                    meta['ability-active'] !== false &&
                    pmdMeta['ability-active'] !== false &&
                    statsMeta['ability-active'] !== false;
                const abilityTags = String(
                    meta['ability-tags'] || pmdMeta['ability-tags'] || statsMeta['ability-tags'] || ''
                );

                const info: CombatantCharacterData = { types, ability, abilityActive, abilityTags };
                map.set(item.id, info);
                if (item.name) map.set(item.name.toLowerCase().trim(), info);
            });
        } else {
            const localChars = await storageAdapter.getLocalCharacters();
            localChars.forEach((c) => {
                const meta = c.metadata || {};
                const type1 = String(meta['type1'] || '');
                const type2 = String(meta['type2'] || '');
                const types = [type1, type2].filter(Boolean);

                const ability = String(meta['ability'] || '');
                const abilityActive = meta['ability-active'] !== false;
                const abilityTags = String(meta['ability-tags'] || '');

                const info: CombatantCharacterData = { types, ability, abilityActive, abilityTags };
                map.set(c.id, info);
                if (c.name) map.set(c.name.toLowerCase().trim(), info);
            });
        }
    } catch (err) {
        console.warn('[roundAdvanceTriggerUtils] Failed to inspect token character data:', err);
    }

    return map;
}

/**
 * Resolves damage and healing triggers for all combatants based on active weather, terrains, and abilities.
 */
export function resolveCombatantRoundTriggers(
    combatants: CombatantRowData[],
    battlefield: BattlefieldData,
    charDataMap: Map<string, CombatantCharacterData>
): CombatantRoundTriggerInfo[] {
    const activeWeathers = getEffectsByCategory(battlefield, 'weather');

    const hasSandstorm = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('sand'));
    const hasHail = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('hail'));
    const hasSun = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('sun'));
    const hasRain = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('rain'));
    const hasSnow = activeWeathers.some((w) => {
        const n = (w.name || '').toLowerCase();
        return n.includes('snow') || n.includes('hail');
    });

    // Sort combatants in initiative order (descending hierarchy: total, base, tiebreaker)
    const sorted = [...combatants].sort(compareCombatantsByInitiative);

    return sorted.map((c) => {
        const charInfo = charDataMap.get(c.name.toLowerCase().trim()) ||
            (c.tokenId && charDataMap.get(c.tokenId)) || {
                types: [],
                ability: '',
                abilityActive: true,
                abilityTags: ''
            };

        const types = charInfo.types;
        const cleanTypes = types.map((t) => t.toLowerCase());
        const isFainted = Boolean(c.isFainted) || (c.hpCurr !== undefined && c.hpCurr <= 0);

        // Normalize ability and tags
        const abilityName = charInfo.ability.trim();
        let abilityTags = charInfo.abilityTags;
        const known = getKnownAbility(abilityName);
        if (known) {
            abilityTags = `${abilityTags} ${known.tags}`.trim();
        }
        const abilityLower = abilityName.toLowerCase();
        const abilityActive = charInfo.abilityActive !== false;

        const hasSolarPower =
            abilityActive && (abilityLower === 'solar power' || /deal\s*1\s*damage.*@\s*sun/i.test(abilityTags));
        const hasDrySkin =
            abilityActive &&
            (abilityLower === 'dry skin' ||
                (/heal\s*1.*@\s*rain/i.test(abilityTags) && /deal\s*1.*@\s*sun/i.test(abilityTags)));
        const hasRainDish =
            abilityActive &&
            (abilityLower === 'rain dish' || (abilityLower !== 'dry skin' && /heal\s*1.*@\s*rain/i.test(abilityTags)));
        const hasIceBody =
            abilityActive && (abilityLower === 'ice body' || /heal\s*1.*@\s*(?:snow|hail)/i.test(abilityTags));

        // --- 1. DAMAGE EVALUATION ---
        let hasDamageTrigger = false;
        let damageAmount = 0;
        let damageReason = '';
        let isDamageImmune = false;
        let damageImmuneReason = '';

        if (isFainted) {
            isDamageImmune = true;
            damageImmuneReason = 'Fainted';
        } else {
            const damageReasons: string[] = [];
            let damageSum = 0;

            if (hasSandstorm) {
                const hasSandstormImmunityAbility =
                    abilityActive &&
                    (['sand rush', 'sand force', 'overcoat', 'magic guard'].includes(abilityLower) ||
                        /immune:\s*(?:weather\s*dmg|sandstorm)/i.test(abilityTags));

                if (cleanTypes.some((t) => ['rock', 'ground', 'steel'].includes(t))) {
                    const matchType = types.find((t) => ['rock', 'ground', 'steel'].includes(t.toLowerCase()));
                    damageImmuneReason = `Immune (${matchType || 'Type'})`;
                } else if (hasSandstormImmunityAbility) {
                    damageImmuneReason = 'Immune (Ability)';
                } else {
                    damageReasons.push('Sandstorm (1 Dmg)');
                    damageSum += 1;
                }
            }

            if (hasHail) {
                const hasHailImmunityAbility =
                    abilityActive &&
                    (['overcoat', 'magic guard', 'ice body'].includes(abilityLower) ||
                        hasIceBody ||
                        /immune:\s*(?:weather\s*dmg|hail)/i.test(abilityTags));

                if (cleanTypes.includes('ice')) {
                    damageImmuneReason = 'Immune (Ice)';
                } else if (hasHailImmunityAbility) {
                    damageImmuneReason = 'Immune (Ability)';
                } else {
                    damageReasons.push('Hail (1 Dmg)');
                    damageSum += 1;
                }
            }

            // Additional ability damage triggers (Sun: Solar Power, Dry Skin)
            if (hasSun) {
                if (hasSolarPower) {
                    damageReasons.push('Solar Power (1 Dmg)');
                    damageSum += 1;
                }
                if (hasDrySkin) {
                    damageReasons.push('Dry Skin (1 Dmg)');
                    damageSum += 1;
                }
            }

            // Status Damage: Burn, Poison, Badly Poisoned
            const statusLower = (c.status || '').toLowerCase();
            if (statusLower.includes('burn')) {
                damageReasons.push('Burn (1 Dmg)');
                damageSum += 1;
            }
            if (statusLower.includes('badly poisoned') || statusLower.includes('toxic')) {
                const bpMatch = c.status.match(/(?:badly poisoned|toxic)(?:\s*\((\d+)\))?/i);
                const badlyDmg = bpMatch && bpMatch[1] ? Math.max(1, parseInt(bpMatch[1], 10)) : 1;
                damageReasons.push(`Badly Poisoned (${badlyDmg} Dmg)`);
                damageSum += badlyDmg;
            } else if (statusLower.includes('poison')) {
                damageReasons.push('Poison (1 Dmg)');
                damageSum += 1;
            }

            // Smart Tags: [Deal X Damage at End of Round] or [End of Round Damage: X @ Condition]
            const isHalfHp =
                c.hpCurr !== undefined && c.hpMax !== undefined ? c.hpCurr <= Math.floor(c.hpMax / 2) : false;
            const dmgTagRegex =
                /\[\s*(?:(?:deal\s*)?(\d+)\s*(?:damage|dmg)\s*(?:at end of round|at round end|round end)|(?:end of round damage|end of round dmg)\s*:\s*(\d+))(?:\s*@\s*([^\]]+))?\s*\]/gi;
            const allDmgText = `${c.heldItem || ''} ${c.abilityTags || ''} ${charInfo.abilityTags || ''} ${c.status || ''}`;
            const dmgMatches = allDmgText.matchAll(dmgTagRegex);
            for (const m of dmgMatches) {
                const amt = parseInt(m[1] || m[2], 10);
                const condition = m[3] ? m[3].trim() : undefined;
                if (condition && !checkCondition(condition, isHalfHp, c.abilityBoostActive)) {
                    continue;
                }
                damageReasons.push(`Round End Tag (${amt} Dmg)`);
                damageSum += amt;
            }

            if (damageReasons.length > 0) {
                hasDamageTrigger = true;
                damageAmount = damageSum;
                damageReason = damageReasons.join(' & ');
                isDamageImmune = false;
            } else if ((hasSandstorm || hasHail) && damageImmuneReason) {
                hasDamageTrigger = true;
                isDamageImmune = true;
                damageReason = damageImmuneReason;
            }
        }

        // --- 2. HEALING EVALUATION ---
        let hasHealingTrigger = false;
        let healingAmount = 0;
        let healingReason = '';
        let isHealingIneligible = false;
        let healingIneligibleReason = '';

        if (isFainted) {
            isHealingIneligible = true;
            healingIneligibleReason = 'Fainted';
        } else {
            const reasons: string[] = [];
            let healSum = 0;

            // Grassy Terrain: In Pokerole, Grassy Terrain (+1 HP) ONLY applies to grounded Pokémon on the side that has it
            const cSide = c.isPlayerSide ? battlefield?.playerSide : battlefield?.foeSide;
            const sideHasGrassy = Boolean(
                cSide?.forceFields?.some(
                    (ff) =>
                        (ff?.name || '').toLowerCase().includes('grassy') &&
                        (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                ) ||
                cSide?.extraForceFields?.some(
                    (ff) =>
                        (ff?.name || '').toLowerCase().includes('grassy') &&
                        (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                ) ||
                (cSide?.other || '').toLowerCase().includes('grassy') ||
                cSide?.extraOther?.some((o) => o.toLowerCase().includes('grassy')) ||
                (cSide?.entryHazard || '').toLowerCase().includes('grassy') ||
                cSide?.extraHazards?.some((h) => h.toLowerCase().includes('grassy'))
            );

            if (sideHasGrassy) {
                if (cleanTypes.includes('flying')) {
                    // Flying type is airborne -> not grounded
                } else {
                    reasons.push('Grassy Terrain (+1 HP)');
                    healSum += 1;
                }
            }

            // Rain Dish & Dry Skin in Rain
            if (hasRain) {
                if (hasRainDish) {
                    reasons.push('Rain Dish (+1 HP)');
                    healSum += 1;
                }
                if (hasDrySkin) {
                    reasons.push('Dry Skin (+1 HP)');
                    healSum += 1;
                }
            }

            // Ice Body in Snow/Hail
            if (hasSnow && hasIceBody) {
                reasons.push('Ice Body (+1 HP)');
                healSum += 1;
            }

            // Leftovers (e.g. Held Item)
            const heldItemLower = (c.heldItem || '').toLowerCase();
            const hasLeftovers = heldItemLower.includes('leftovers');
            if (hasLeftovers) {
                reasons.push('Leftovers (+1 HP)');
                healSum += 1;
            }

            // Smart Tags: [Heal X Round End] or [Heal X HP Round End @ Condition]
            const isHalfHp =
                c.hpCurr !== undefined && c.hpMax !== undefined ? c.hpCurr <= Math.floor(c.hpMax / 2) : false;
            const healTagRegex =
                /\[\s*heal\s*(\d+)(?:\s*hp)?\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi;
            const allHealText = `${c.heldItem || ''} ${c.abilityTags || ''} ${charInfo.abilityTags || ''} ${c.status || ''}`;
            const healMatches = allHealText.matchAll(healTagRegex);
            for (const m of healMatches) {
                const amt = parseInt(m[1], 10);
                const condition = m[2] ? m[2].trim() : undefined;
                if (condition && !checkCondition(condition, isHalfHp, c.abilityBoostActive)) {
                    continue;
                }
                // Avoid double counting if Leftovers already added 1 HP and the tag is on Leftovers description
                if (hasLeftovers && amt === 1 && heldItemLower.includes('leftovers')) {
                    continue;
                }
                reasons.push(`Round End Tag (+${amt} HP)`);
                healSum += amt;
            }

            if (healSum > 0) {
                hasHealingTrigger = true;
                healingAmount = healSum;
                healingReason = reasons.join(' & ');
                if (c.hpCurr !== undefined && c.hpMax !== undefined && c.hpCurr >= c.hpMax) {
                    healingIneligibleReason = 'Full HP';
                }
            } else if (sideHasGrassy && cleanTypes.includes('flying')) {
                hasHealingTrigger = true;
                isHealingIneligible = true;
                healingIneligibleReason = 'Airborne (Flying)';
            }
        }

        return {
            combatant: c,
            types,
            ability: abilityName,
            abilityActive,
            hasDamageTrigger,
            damageAmount,
            damageReason: damageReason || (isDamageImmune ? damageImmuneReason : ''),
            isDamageImmune,
            damageImmuneReason,
            hasHealingTrigger,
            healingAmount,
            healingReason: healingReason || (isHealingIneligible ? healingIneligibleReason : ''),
            isHealingIneligible,
            healingIneligibleReason
        };
    });
}
