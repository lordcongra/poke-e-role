import { Sparkles } from 'lucide-react';
import { CombatStat } from '../../types/enums';
import { STATUS_COLORS } from '../../data/constants';
import {
    parseCombatTags,
    getStatusPenalties,
    type BoostTrackerSource
} from '../../utils/combat/combatUtils';
import { getAbilityBenefitSummary } from '../../data/abilities/knownAbilities';
import { resolveCharacterSide } from '../../utils/combat/combatantSideUtils';
import { isTargetAffectedByAbility } from '../../utils/combat/abilityTargetingUtils';
import type { CharacterState, Trackers } from '../../store/storeTypes';
import type { ConditionItem } from './TrackerConditionsList';
import { removeCharacterFromAuraSources } from './trackerAuraUtils';
import { useCharacterStore } from '../../store/useCharacterStore';

export interface BuildTrackerConditionsParams {
    state: CharacterState;
    boostSources: BoostTrackerSource[];
    updateTracker: <K extends keyof Trackers>(field: K, value: Trackers[K]) => void;
    clearActiveCombatBoost: () => void;
    onRefresh?: () => void;
}

export function buildTrackerConditions({
    state,
    boostSources,
    updateTracker,
    clearActiveCombatBoost,
    onRefresh
}: BuildTrackerConditionsParams): ConditionItem[] {
    const conditions: ConditionItem[] = [];

    // 1. Pain Penalties
    const painEnabled = String(state.identity.pain || 'Enabled').toLowerCase() === 'enabled';
    if (painEnabled) {
        const hpCurr = state.health.hpCurr;
        const hpMax = Math.max(1, state.health.hpMax);
        let rawPenalty = 0;

        if (hpCurr <= 1) rawPenalty = 3;
        else if (hpCurr <= Math.floor(hpMax / 2)) rawPenalty = 1;

        const finalPenalty = Math.max(0, rawPenalty - (state.trackers.ignoredPain || 0));
        if (finalPenalty > 0) {
            conditions.push({ id: 'pain', label: `Pain (-${finalPenalty} Succ)`, bg: '#c62828', text: '#ffffff' });
        }
    }

    // 2. Ignored Pain (1-click scene-end clear)
    if ((state.trackers.ignoredPain || 0) > 0) {
        conditions.push({
            id: 'ignored-pain',
            label: `Ignored Pain (+${state.trackers.ignoredPain})`,
            bg: '#059669',
            text: '#ffffff',
            onClear: () => updateTracker('ignoredPain', 0)
        });
    }

    // 3. Pushing Fate
    if ((state.trackers.fate || 0) > 0) {
        conditions.push({
            id: 'pushing-fate',
            label: 'Pushing Fate',
            bg: '#4338ca',
            text: '#ffffff',
            onClear: () => updateTracker('fate', 0)
        });
    }

    // 4. Take Your Chances
    if ((state.trackers.chances || 0) > 0) {
        conditions.push({
            id: 'take-your-chances',
            label: `Take Your Chances: ${state.trackers.chances} Reroll${state.trackers.chances > 1 ? 's' : ''}`,
            bg: '#7c3aed',
            text: '#ffffff',
            onClear: () => updateTracker('chances', 0)
        });
    }

    // 5. Active Statuses
    const statusPenalties = getStatusPenalties(state);
    (state.statuses || []).forEach((status) => {
        if (status.name !== 'Healthy') {
            const handleClearStatus = () => {
                useCharacterStore.getState().removeStatus(status.id);
                onRefresh?.();
            };

            const customStatusData = (state.roomCustomStatuses || []).find(
                (s) => s.name === status.name || s.name === status.customName
            );

            if (customStatusData) {
                let label = customStatusData.shorthand || customStatusData.name;

                const parsedEffects = parseCombatTags([], [], undefined, customStatusData.effects);
                const penalties: string[] = [];
                Object.entries(parsedEffects.stats).forEach(([stat, val]) => {
                    if (val !== 0) penalties.push(`${val > 0 ? '+' : ''}${val} ${stat.toUpperCase()}`);
                });

                if (penalties.length > 0) label += ` (${penalties.join(', ')})`;

                conditions.push({
                    id: status.id,
                    label,
                    bg: customStatusData.color,
                    text: customStatusData.textColor,
                    onClear: handleClearStatus
                });
            } else {
                const name = status.name === 'Custom...' ? status.customName || 'Custom' : status.name;
                let label = name;

                if (status.name === 'Paralysis' && statusPenalties.paralysisDexterityPenalty < 0) {
                    label = `Paralysis (${statusPenalties.paralysisDexterityPenalty} Dex)`;
                } else if (status.name === 'Confusion' && statusPenalties.confusionPenalty < 0) {
                    label = `Confusion (${statusPenalties.confusionPenalty} Succ)`;
                }

                const colors = STATUS_COLORS[status.name] || { bg: '#9C27B0', text: '#ffffff' };
                conditions.push({
                    id: status.id,
                    label,
                    bg: colors.bg,
                    text: colors.text,
                    onClear: handleClearStatus
                });
            }
        }
    });

    // 6. Stat Buffs / Debuffs
    const addStatCondition = (
        label: string,
        buff: number,
        debuff: number,
        onClearBuff?: () => void,
        onClearDebuff?: () => void
    ) => {
        if (buff > 0)
            conditions.push({
                id: `buff-${label}`,
                label: `${label} +${buff}`,
                bg: '#1976d2',
                text: '#ffffff',
                onClear: onClearBuff
            });
        if (debuff > 0)
            conditions.push({
                id: `debuff-${label}`,
                label: `${label} -${debuff}`,
                bg: '#d32f2f',
                text: '#ffffff',
                onClear: onClearDebuff
            });
    };

    if (state.stats) {
        addStatCondition(
            'STR',
            state.stats[CombatStat.STR]?.buff || 0,
            state.stats[CombatStat.STR]?.debuff || 0,
            () => {
                useCharacterStore.getState().setStat(CombatStat.STR, 'buff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setStat(CombatStat.STR, 'debuff', 0);
                onRefresh?.();
            }
        );
        addStatCondition(
            'DEX',
            state.stats[CombatStat.DEX]?.buff || 0,
            state.stats[CombatStat.DEX]?.debuff || 0,
            () => {
                useCharacterStore.getState().setStat(CombatStat.DEX, 'buff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setStat(CombatStat.DEX, 'debuff', 0);
                onRefresh?.();
            }
        );
        addStatCondition(
            'VIT',
            state.stats[CombatStat.VIT]?.buff || 0,
            state.stats[CombatStat.VIT]?.debuff || 0,
            () => {
                useCharacterStore.getState().setStat(CombatStat.VIT, 'buff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setStat(CombatStat.VIT, 'debuff', 0);
                onRefresh?.();
            }
        );
        addStatCondition(
            'SPE',
            state.stats[CombatStat.SPE]?.buff || 0,
            state.stats[CombatStat.SPE]?.debuff || 0,
            () => {
                useCharacterStore.getState().setStat(CombatStat.SPE, 'buff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setStat(CombatStat.SPE, 'debuff', 0);
                onRefresh?.();
            }
        );
        addStatCondition(
            'INS',
            state.stats[CombatStat.INS]?.buff || 0,
            state.stats[CombatStat.INS]?.debuff || 0,
            () => {
                useCharacterStore.getState().setStat(CombatStat.INS, 'buff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setStat(CombatStat.INS, 'debuff', 0);
                onRefresh?.();
            }
        );
    }
    if (state.derived) {
        addStatCondition(
            'DEF',
            state.derived.defBuff || 0,
            state.derived.defDebuff || 0,
            () => {
                useCharacterStore.getState().setDerived('defBuff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setDerived('defDebuff', 0);
                onRefresh?.();
            }
        );
        addStatCondition(
            'S.DEF',
            state.derived.sdefBuff || 0,
            state.derived.sdefDebuff || 0,
            () => {
                useCharacterStore.getState().setDerived('sdefBuff', 0);
                onRefresh?.();
            },
            () => {
                useCharacterStore.getState().setDerived('sdefDebuff', 0);
                onRefresh?.();
            }
        );
    }

    // 7. Active Ability
    const abilityName = state.identity.ability;
    const abilityActive = state.identity.abilityActive ?? true;
    const abilityBoostActive = state.identity.abilityBoostActive ?? false;
    const abilityBoostLevel = state.identity.abilityBoostLevel ?? (abilityBoostActive ? 1 : 0);
    const abilityTags = state.identity.abilityTags || '';
    const rank = state.identity.rank;

    if (abilityName && abilityActive) {
        const hpCurr = Number(state.health.hpCurr) || 0;
        const hpMax = Math.max(1, Number(state.health.hpMax) || 1);
        const isHalfHp = hpCurr <= Math.floor(hpMax / 2);
        const benefit = getAbilityBenefitSummary(
            abilityName,
            abilityTags,
            rank,
            isHalfHp,
            abilityBoostActive,
            abilityBoostLevel
        );
        const abilityLabel = benefit ? `Ability: ${abilityName} (${benefit})` : `Ability: ${abilityName}`;
        conditions.push({
            id: 'active-ability',
            label: abilityLabel,
            bg: '#2563eb',
            text: '#ffffff',
            onClear: () => {
                useCharacterStore.getState().setIdentity('abilityActive', false);
                onRefresh?.();
            }
        });
    }

    // 8. Boost Sources
    boostSources.forEach((source) => {
        if (source.currentLevel > 0) {
            const badgeLabel =
                source.maxBoost > 1 ? `${source.label}: +${source.currentLevel}` : `${source.label}: Active`;
            conditions.push({
                id: `boost-${source.id}`,
                label: badgeLabel,
                bg: '#f59e0b',
                text: '#000000'
            });
        }
    });

    // 9. Passives
    state.passives?.forEach((passive) => {
        if (passive.active && passive.showInConditions) {
            const rawTags = (passive.desc || '').match(/\[.*?\]/g);
            let label = `Passive: ${passive.name || 'Passive'}`;
            if (rawTags && rawTags.length > 0) {
                const cleanedTags = rawTags.map((t) => t.replace(/[\[\]]/g, '').trim()).filter(Boolean);
                if (cleanedTags.length > 0 && !passive.name.toLowerCase().includes(cleanedTags[0].toLowerCase())) {
                    label = `Passive: ${passive.name || 'Passive'} (${cleanedTags.join(', ')})`;
                }
            }
            conditions.push({
                id: `passive-${passive.id}`,
                label,
                bg: '#0d9488',
                text: '#ffffff'
            });
        }
    });

    // 10. Active Combat Boost (Sparkles icon, literal emoji eradicated)
    if (state.trackers.activeCombatBoost) {
        const boost = state.trackers.activeCombatBoost;
        const label =
            boost.stage === 'armed'
                ? `${boost.sourceName}: +${boost.accSucc} Acc, +${boost.dmgSucc} Dmg`
                : `${boost.sourceName}: +${boost.dmgSucc} Dmg Pending`;
        conditions.push({
            id: 'active-combat-boost',
            label,
            bg: '#8b5cf6',
            text: '#ffffff',
            icon: <Sparkles size={11} />,
            onClear: clearActiveCombatBoost
        });
    }

    const targetId = [
        state.identity.entityId,
        state.tokenId,
        state.identity.nickname,
        state.identity.species
    ].filter(Boolean) as string[];
    const characterSide = resolveCharacterSide(state);
    const effectiveSide: 'player' | 'foe' =
        characterSide !== 'none' ? characterSide : state.identity.isNPC ? 'foe' : 'player';

    // 11. Flower Gift Aura
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'flower gift', state.activeBattlefield || null)) {
        conditions.push({
            id: 'flower-gift-aura',
            label: 'Flower Gift (+2 STR, +2 Sp.Def)',
            bg: '#db2777',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('flower gift', state, onRefresh)
        });
    }

    // 12. Neutralizing Gas Suppression
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'neutralizing gas', state.activeBattlefield || null)) {
        conditions.push({
            id: 'neutralizing-gas-suppressed',
            label: 'Neutralizing Gas: Ability Negated',
            bg: '#475569',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('neutralizing gas', state, onRefresh)
        });
    }

    // 13. Intimidate Debuff
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'intimidate', state.activeBattlefield || null)) {
        conditions.push({
            id: 'intimidate-debuff',
            label: 'Intimidate: -1 Strength',
            bg: '#dc2626',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('intimidate', state, onRefresh)
        });
    }

    // 14. Armor Tail: Reaction Immune
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'armor tail', state.activeBattlefield || null)) {
        conditions.push({
            id: 'armor-tail-immunity',
            label: 'Armor Tail: Reaction Immune',
            bg: '#d97706',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('armor tail', state, onRefresh)
        });
    }

    // 15. Sweet Veil: Sleep Immune
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'sweet veil', state.activeBattlefield || null)) {
        conditions.push({
            id: 'sweet-veil-immunity',
            label: 'Sweet Veil: Sleep Immune',
            bg: '#ec4899',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('sweet veil', state, onRefresh)
        });
    }

    // 16. Pastel Veil: Poison Immune
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'pastel veil', state.activeBattlefield || null)) {
        conditions.push({
            id: 'pastel-veil-immunity',
            label: 'Pastel Veil: Poison Immune',
            bg: '#a855f7',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('pastel veil', state, onRefresh)
        });
    }

    // 17. Aroma Veil: Mental Immune
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'aroma veil', state.activeBattlefield || null)) {
        conditions.push({
            id: 'aroma-veil-immunity',
            label: 'Aroma Veil: Mental Immune',
            bg: '#06b6d4',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('aroma veil', state, onRefresh)
        });
    }

    // 18. Flower Veil: Stat Lowering Immune
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'flower veil', state.activeBattlefield || null)) {
        conditions.push({
            id: 'flower-veil-immunity',
            label: 'Flower Veil: Stat Lowering Immune',
            bg: '#16a34a',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('flower veil', state, onRefresh)
        });
    }

    // 19. Supersweet Syrup: Evade Denied
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'supersweet syrup', state.activeBattlefield || null)) {
        conditions.push({
            id: 'supersweet-syrup-evade-denied',
            label: 'Supersweet Syrup: Evade Denied',
            bg: '#f59e0b',
            text: '#000000',
            onClear: () => removeCharacterFromAuraSources('supersweet syrup', state, onRefresh)
        });
    }

    // 20. Battery: +1 Special, +1 Sp.Dmg
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'battery', state.activeBattlefield || null)) {
        conditions.push({
            id: 'battery-boost',
            label: 'Battery (+1 Special, +1 Sp.Dmg)',
            bg: '#eab308',
            text: '#000000',
            onClear: () => removeCharacterFromAuraSources('battery', state, onRefresh)
        });
    }

    // 21. Power Spot: +1 Damage
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'power spot', state.activeBattlefield || null)) {
        conditions.push({
            id: 'power-spot-boost',
            label: 'Power Spot (+1 Damage)',
            bg: '#f59e0b',
            text: '#000000',
            onClear: () => removeCharacterFromAuraSources('power spot', state, onRefresh)
        });
    }

    // 22. Steely Spirit: +1 Steel Dmg
    if (isTargetAffectedByAbility(targetId, effectiveSide, 'steely spirit', state.activeBattlefield || null)) {
        conditions.push({
            id: 'steely-spirit-boost',
            label: 'Steely Spirit (+1 Steel Dmg)',
            bg: '#64748b',
            text: '#ffffff',
            onClear: () => removeCharacterFromAuraSources('steely spirit', state, onRefresh)
        });
    }

    return conditions;
}
