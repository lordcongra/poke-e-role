import type { CharacterState } from '../../../store/storeTypes';
import { checkCondition } from '../../../utils/tagParser/conditionChecker';
import { getAbilityText } from '../../../utils/combat/combatUtils';
import { getEffectsByCategory, getAllActiveFieldEffects } from '../../../utils/combat/fieldEffectsData';

export interface RoundEndTrigger {
    id: string;
    source: string;
    type: 'healHp' | 'damageHp' | 'restoreWill' | 'reduceWill';
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

    // 4. Inspect Active Grassy Terrains across all terrain slots
    const activeTerrains = getEffectsByCategory(state.activeBattlefield, 'terrain');
    activeTerrains.forEach((t, idx) => {
        if (t.name?.toLowerCase().includes('grassy')) {
            triggers.push({
                id: `grassy-terrain-heal-${idx}`,
                source: t.name || 'Grassy Terrain',
                type: 'healHp',
                amount: 1,
                promptText: `${t.name || 'Grassy Terrain'} (Active): Restore 1 HP?`,
                conditionText: 'Grassy Terrain',
                checked: true
            });
        }
    });

    // 5. Inspect tags on all active custom field effects
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

    return triggers;
}
