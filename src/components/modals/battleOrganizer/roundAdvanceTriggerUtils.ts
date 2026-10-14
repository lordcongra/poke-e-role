import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import { getEffectsByCategory } from '../../../utils/combat/fieldEffectsData';
import { getKnownAbility } from '../../../data/abilities/knownAbilities';
import type { CombatantRowData, BattlefieldData } from '../../../types/battleOrganizerTypes';

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
 * Rapid check to determine if any active weather or terrain could trigger end-of-round effects.
 */
export function hasPotentialRoundAdvanceTriggers(battlefield: BattlefieldData): boolean {
    const activeWeathers = getEffectsByCategory(battlefield, 'weather');
    const activeTerrains = getEffectsByCategory(battlefield, 'terrain');

    return (
        activeWeathers.some((w) => {
            const n = (w.name || '').toLowerCase();
            return (
                n.includes('sand') ||
                n.includes('hail') ||
                n.includes('sun') ||
                n.includes('rain') ||
                n.includes('snow')
            );
        }) || activeTerrains.some((t) => (t.name || '').toLowerCase().includes('grassy'))
    );
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
    const activeTerrains = getEffectsByCategory(battlefield, 'terrain');

    const hasSandstorm = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('sand'));
    const hasHail = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('hail'));
    const hasSun = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('sun'));
    const hasRain = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('rain'));
    const hasSnow = activeWeathers.some((w) => {
        const n = (w.name || '').toLowerCase();
        return n.includes('snow') || n.includes('hail');
    });
    const hasGlobalGrassy = activeTerrains.some((t) => (t.name || '').toLowerCase().includes('grassy'));

    // Sort combatants in initiative order (descending)
    const sorted = [...combatants].sort((a, b) => {
        const initA = parseFloat(a.initiative) || 0;
        const initB = parseFloat(b.initiative) || 0;
        return initB - initA;
    });

    return sorted.map((c) => {
        const charInfo = (c.tokenId && charDataMap.get(c.tokenId)) ||
            charDataMap.get(c.name.toLowerCase().trim()) || {
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
        } else if (hasSandstorm) {
            hasDamageTrigger = true;
            damageAmount = 1;
            if (cleanTypes.some((t) => ['rock', 'ground', 'steel'].includes(t))) {
                isDamageImmune = true;
                const matchType = types.find((t) => ['rock', 'ground', 'steel'].includes(t.toLowerCase()));
                damageImmuneReason = `Immune (${matchType || 'Type'})`;
            } else {
                damageReason = 'Sandstorm (1 Dmg)';
            }
        } else if (hasHail) {
            hasDamageTrigger = true;
            damageAmount = 1;
            if (cleanTypes.includes('ice')) {
                isDamageImmune = true;
                damageImmuneReason = 'Immune (Ice)';
            } else {
                damageReason = 'Hail (1 Dmg)';
            }
        }

        // Additional ability damage triggers (Sun: Solar Power, Dry Skin)
        if (!isFainted && hasSun) {
            if (hasSolarPower) {
                hasDamageTrigger = true;
                damageAmount = Math.max(damageAmount, 1);
                damageReason = damageReason ? `${damageReason} & Solar Power` : 'Solar Power (1 Dmg)';
                isDamageImmune = false;
            }
            if (hasDrySkin) {
                hasDamageTrigger = true;
                damageAmount = Math.max(damageAmount, 1);
                damageReason = damageReason ? `${damageReason} & Dry Skin` : 'Dry Skin (1 Dmg)';
                isDamageImmune = false;
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

            // Grassy Terrain (applies to grounded Pokémon on Grassy Terrain; Flying is airborne)
            const cSide = c.isPlayerSide ? battlefield?.playerSide : battlefield?.foeSide;
            const sideHasGrassy = Boolean(
                cSide?.forceFields?.some(
                    (ff) =>
                        (ff?.name || '').toLowerCase().includes('grassy') &&
                        (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                ) ||
                (cSide?.other || '').toLowerCase().includes('grassy') ||
                cSide?.extraOther?.some((o) => o.toLowerCase().includes('grassy')) ||
                (cSide?.entryHazard || '').toLowerCase().includes('grassy') ||
                cSide?.extraHazards?.some((h) => h.toLowerCase().includes('grassy'))
            );
            const hasGrassy = hasGlobalGrassy || sideHasGrassy;

            if (hasGrassy) {
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

            if (healSum > 0) {
                hasHealingTrigger = true;
                healingAmount = healSum;
                healingReason = reasons.join(' & ');
                if (c.hpCurr !== undefined && c.hpMax !== undefined && c.hpCurr >= c.hpMax) {
                    healingIneligibleReason = 'Full HP';
                }
            } else if (hasGrassy && cleanTypes.includes('flying')) {
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
