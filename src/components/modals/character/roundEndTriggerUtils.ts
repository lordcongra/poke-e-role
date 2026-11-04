import type { CharacterState } from '../../../store/storeTypes';
import { checkCondition } from '../../../utils/tagParser/conditionChecker';
import { getAbilityText } from '../../../utils/combat/combatUtils';
import { getAllActiveFieldEffects, getEffectsByCategory } from '../../../utils/combat/fieldEffectsData';
import { getKnownAbility } from '../../../data/abilities/knownAbilities';

export interface RoundEndTrigger {
    id: string;
    source: string;
    type: 'healHp' | 'damageHp' | 'restoreWill' | 'reduceWill' | 'resetIgnoredPain';
    amount: number;
    promptText: string;
    conditionText?: string;
    checked: boolean;
}

export function findRoundEndTriggers(state: CharacterState): RoundEndTrigger[] {
    const triggers: RoundEndTrigger[] = [];

    const isHalfHp = state.health.hpCurr <= Math.floor(state.health.hpMax / 2);
    const abilityName = state.identity.ability || '';
    const abilityActive = state.identity.abilityActive ?? true;
    const abilityBoostActive = state.identity.abilityBoostActive ?? false;

    // Helper to test and extract tags from a text source
    const inspectText = (sourceName: string, text: string, sourceActive: boolean = true) => {
        if (!text || !sourceActive) return;

        // 1. Heal HP: [Heal X Round End @ Condition] or [Heal X HP Round End @ Condition]
        const healMatches = text.matchAll(
            /\[\s*heal\s*(\d+)(?:\s*hp)?\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
        );
        for (const m of healMatches) {
            const amount = parseInt(m[1], 10);
            const condition = m[2] ? m[2].trim() : undefined;
            if (condition && !checkCondition(condition, isHalfHp, abilityBoostActive)) {
                continue;
            }
            const condStr = condition ? ` (${condition} Active)` : '';
            triggers.push({
                id: `${sourceName}-heal-${triggers.length}`,
                source: sourceName,
                type: 'healHp',
                amount,
                promptText: `${sourceName}${condStr}: Restore ${amount} HP?`,
                conditionText: condition,
                checked: true
            });
        }

        // 2. Deal Damage: [Deal X Damage at End of Round @ Condition] or [End of Round Damage: X @ Condition]
        const dmgMatches = text.matchAll(
            /\[\s*(?:(?:deal\s*)?(\d+)\s*(?:damage|dmg)\s*(?:at end of round|at round end|round end)|(?:end of round damage|end of round dmg)\s*:\s*(\d+))(?:\s*@\s*([^\]]+))?\s*\]/gi
        );
        for (const m of dmgMatches) {
            const amount = parseInt(m[1] || m[2], 10);
            const condition = m[3] ? m[3].trim() : undefined;
            if (condition && !checkCondition(condition, isHalfHp, abilityBoostActive)) {
                continue;
            }
            const condStr = condition ? ` (${condition} Active)` : '';
            triggers.push({
                id: `${sourceName}-dmg-${triggers.length}`,
                source: sourceName,
                type: 'damageHp',
                amount,
                promptText: `${sourceName}${condStr}: Suffer ${amount} Damage?`,
                conditionText: condition,
                checked: true
            });
        }

        // 3. Restore Will: [Restore X Will Round End @ Condition]
        const willHealMatches = text.matchAll(
            /\[\s*restore\s*(\d+)\s*will\s*(?:round end|at end of round|at round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
        );
        for (const m of willHealMatches) {
            const amount = parseInt(m[1], 10);
            const condition = m[2] ? m[2].trim() : undefined;
            if (condition && !checkCondition(condition, isHalfHp, abilityBoostActive)) {
                continue;
            }
            const condStr = condition ? ` (${condition} Active)` : '';
            triggers.push({
                id: `${sourceName}-willheal-${triggers.length}`,
                source: sourceName,
                type: 'restoreWill',
                amount,
                promptText: `${sourceName}${condStr}: Restore ${amount} Will?`,
                conditionText: condition,
                checked: true
            });
        }

        // 4. Reduce Will: [Reduce Will by X Round End @ Condition]
        const willDmgMatches = text.matchAll(
            /\[\s*reduce\s*will\s*(?:by\s*)?(\d+)\s*(?:at end of round|at round end|round end)(?:\s*@\s*([^\]]+))?\s*\]/gi
        );
        for (const m of willDmgMatches) {
            const amount = parseInt(m[1], 10);
            const condition = m[2] ? m[2].trim() : undefined;
            if (condition && !checkCondition(condition, isHalfHp, abilityBoostActive)) {
                continue;
            }
            const condStr = condition ? ` (${condition} Active)` : '';
            triggers.push({
                id: `${sourceName}-willdmg-${triggers.length}`,
                source: sourceName,
                type: 'reduceWill',
                amount,
                promptText: `${sourceName}${condStr}: Lose ${amount} Will?`,
                conditionText: condition,
                checked: true
            });
        }
    };

    // 1. Inspect Ability
    if (abilityName && abilityActive) {
        const fullAbilityText = `${state.identity.abilityTags || ''} ${getAbilityText(abilityName, state.roomCustomAbilities)}`;
        inspectText(abilityName, fullAbilityText, true);
    }

    // 2. Inspect Passives
    state.passives?.forEach((p) => {
        if (p.active) {
            inspectText(p.name || 'Passive', p.desc || '', true);
        }
    });

    // 3. Inspect Inventory Items
    state.inventory?.forEach((item) => {
        if (item.active || (item.qty && item.qty > 0)) {
            const fullItemText = `${item.tags || ''} ${item.desc || ''}`;
            inspectText(item.name || 'Item', fullItemText, true);
        }
    });

    // 4. Inspect Statuses: Burn, Poison, Badly Poisoned
    state.statuses?.forEach((status, idx) => {
        const sName = (
            status.name === 'Custom...' ? status.customName : status.name || status.customName || ''
        )
            .toLowerCase()
            .trim();
        if (!sName) return;

        if (sName.includes('badly poisoned') || sName.includes('toxic')) {
            const dmg = Math.max(1, Number(status.rounds) || 1);
            triggers.push({
                id: `status-badly-poisoned-${status.id || idx}`,
                source: 'Badly Poisoned',
                type: 'damageHp',
                amount: dmg,
                promptText: 'Badly Poisoned: Suffer ' + dmg + ' Damage?',
                checked: true
            });
        } else if (sName.includes('poison')) {
            triggers.push({
                id: `status-poison-${status.id || idx}`,
                source: 'Poison',
                type: 'damageHp',
                amount: 1,
                promptText: 'Poison: Suffer 1 Damage?',
                checked: true
            });
        } else if (sName.includes('burn')) {
            triggers.push({
                id: `status-burn-${status.id || idx}`,
                source: 'Burn',
                type: 'damageHp',
                amount: 1,
                promptText: 'Burn: Suffer 1 Damage?',
                checked: true
            });
        }
    });

    // 5. Inspect Active Grassy Terrain for character's side: In Pokerole, Grassy Terrain healing (+1 HP) ONLY applies to the side it is on
    if (state.activeBattlefield) {
        const side = state.identity.isNPC ? state.activeBattlefield.foeSide : state.activeBattlefield.playerSide;
        const sideHasGrassy = Boolean(
            side?.forceFields?.some(
                (ff) =>
                    (ff?.name || '').toLowerCase().includes('grassy') &&
                    (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            ) ||
            side?.extraForceFields?.some(
                (ff) =>
                    (ff?.name || '').toLowerCase().includes('grassy') &&
                    (ff.remainingRounds > 0 || ff.remainingRounds === -1)
            ) ||
            (side?.other || '').toLowerCase().includes('grassy') ||
            side?.extraOther?.some((o) => o.toLowerCase().includes('grassy')) ||
            (side?.entryHazard || '').toLowerCase().includes('grassy') ||
            side?.extraHazards?.some((h) => h.toLowerCase().includes('grassy'))
        );

        if (sideHasGrassy) {
            triggers.push({
                id: 'grassy-terrain-heal-side',
                source: 'Grassy Terrain',
                type: 'healHp',
                amount: 1,
                promptText: 'Grassy Terrain (Active): Restore 1 HP?',
                conditionText: 'Grassy Terrain',
                checked: true
            });
        }

        // Active Weather Damage (Sandstorm, Hail)
        const activeWeathers = getEffectsByCategory(state.activeBattlefield, 'weather');
        const hasSandstorm = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('sand'));
        const hasHail = activeWeathers.some((w) => (w.name || '').toLowerCase().includes('hail'));

        if (hasSandstorm || hasHail) {
            const types = [state.identity.type1, state.identity.type2].filter(Boolean);
            const cleanTypes = types.map((t) => t.toLowerCase());
            const abilityLower = (state.identity.ability || '').trim().toLowerCase();
            const abilityActive = state.identity.abilityActive ?? true;

            let fullAbilityTags = `${state.identity.abilityTags || ''} ${getAbilityText(state.identity.ability || '', state.roomCustomAbilities)}`.trim();
            const known = getKnownAbility(state.identity.ability || '');
            if (known) {
                fullAbilityTags = `${fullAbilityTags} ${known.tags}`.trim();
            }

            if (hasSandstorm) {
                const isImmuneType = cleanTypes.some((t) => ['rock', 'ground', 'steel'].includes(t));
                const isImmuneAbility =
                    abilityActive &&
                    (['sand rush', 'sand force', 'overcoat', 'magic guard'].includes(abilityLower) ||
                        /immune:\s*(?:weather\s*dmg|sandstorm)/i.test(fullAbilityTags));

                if (!isImmuneType && !isImmuneAbility) {
                    triggers.push({
                        id: 'weather-sandstorm-dmg',
                        source: 'Sandstorm',
                        type: 'damageHp',
                        amount: 1,
                        promptText: 'Sandstorm: Suffer 1 Damage?',
                        conditionText: 'Sandstorm',
                        checked: true
                    });
                }
            }

            if (hasHail) {
                const isImmuneType = cleanTypes.includes('ice');
                const isImmuneAbility =
                    abilityActive &&
                    (['overcoat', 'magic guard', 'ice body'].includes(abilityLower) ||
                        /immune:\s*(?:weather\s*dmg|hail)/i.test(fullAbilityTags));

                if (!isImmuneType && !isImmuneAbility) {
                    triggers.push({
                        id: 'weather-hail-dmg',
                        source: 'Hail',
                        type: 'damageHp',
                        amount: 1,
                        promptText: 'Hail: Suffer 1 Damage?',
                        conditionText: 'Hail',
                        checked: true
                    });
                }
            }
        }
    }

    // 6. Inspect tags on all active custom field effects
    if (state.activeBattlefield && state.roomCustomFieldEffects) {
        const allActive = getAllActiveFieldEffects(state.activeBattlefield);
        allActive.forEach((activeItem) => {
            const cleanName = activeItem.name.trim().toLowerCase();
            const customDef = state.roomCustomFieldEffects.find((c) => c.name.trim().toLowerCase() === cleanName);
            if (customDef && customDef.tags) {
                inspectText(customDef.name, customDef.tags, true);
            }
        });
    }

    // 7. Inspect Ignored Pain (Scene-End Reset Option)
    if ((state.trackers?.ignoredPain || 0) > 0) {
        const stacks = state.trackers.ignoredPain;
        triggers.push({
            id: 'scene-end-ignored-pain',
            source: 'Scene',
            type: 'resetIgnoredPain',
            amount: stacks,
            promptText: `Scene Concluded: Clear Ignored Pain Penalties (${stacks} stack${stacks > 1 ? 's' : ''})? (Note: Normally lasts for the entire scene)`,
            checked: false
        });
    }

    return triggers;
}
