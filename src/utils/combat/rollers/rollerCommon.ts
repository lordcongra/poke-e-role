import OBR from '@owlbear-rodeo/sdk';
import type { CharacterState } from '@/store/storeTypes';
import { CombatStat, SocialStat, Skill } from '@/types/enums';
import { ATTRIBUTE_MAPPING, getStatusPenalties, calculateBaseInitiative } from '@/utils/combat/combatMath';
import { isAbilitySuppressedByField, matchesTarget } from '@/utils/combat/abilityTargetingUtils';
import { STATS_META_ID } from '@/utils/graphics/graphicsManager';

export function getCharacterNickname(state: CharacterState): string {
    return state.identity.nickname || state.identity.species || 'Someone';
}

export function formatMathModifier(modifier: number): string {
    if (modifier === 0) return '';
    return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

export function formatTagString(tags: string[]): string {
    return tags.length > 0 ? ` [ ${tags.join(' | ')} ]` : '';
}

export function checkAsleepGuard(state: CharacterState, isSleepMove = false): boolean {
    const statuses = getStatusPenalties(state);
    const abilityString = state.identity.ability || '';
    const hasComatose = abilityString.toLowerCase().includes('comatose');

    if (statuses.isAsleep && !isSleepMove && !hasComatose) {
        if (OBR.isAvailable) {
            OBR.notification.show('[WARNING] You are Asleep and cannot perform actions!', 'WARNING');
        }
        return true;
    }
    return false;
}

export function hasTailwindActive(state: CharacterState): boolean {
    const side = state.identity.isNPC ? state.activeBattlefield?.foeSide : state.activeBattlefield?.playerSide;
    return Boolean(
        side?.forceFields?.some(
            (ff) =>
                ff?.name?.toLowerCase().includes('tailwind') && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
        ) ||
        side?.extraForceFields?.some(
            (ff) =>
                ff?.name?.toLowerCase().includes('tailwind') && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
        )
    );
}

export function getStatStageModifier(statKey: string, state: CharacterState): { name: string; stage: number } | null {
    if (!statKey) return null;
    const normalized = (ATTRIBUTE_MAPPING[statKey] || statKey).toLowerCase().trim();
    if (Object.values(CombatStat).includes(normalized as CombatStat)) {
        const statObj = state.stats[normalized as CombatStat];
        if (!statObj) return null;
        const stage = (statObj.buff || 0) - (statObj.debuff || 0);
        const nameMap: Record<string, string> = {
            str: 'Strength',
            dex: 'Dexterity',
            vit: 'Vitality',
            spe: 'Special',
            ins: 'Insight'
        };
        return { name: nameMap[normalized] || normalized, stage };
    }
    if (Object.values(SocialStat).includes(normalized as SocialStat)) {
        const statObj = state.socials[normalized as SocialStat];
        if (!statObj) return null;
        const stage = (statObj.buff || 0) - (statObj.debuff || 0);
        const nameMap: Record<string, string> = {
            tou: 'Tough',
            coo: 'Cool',
            bea: 'Beauty',
            cut: 'Cute',
            cle: 'Clever'
        };
        return { name: nameMap[normalized] || normalized, stage };
    }
    return null;
}

export function getSkillBuffModifier(skillKey: string, state: CharacterState): { name: string; buff: number } | null {
    if (!skillKey || skillKey.toLowerCase() === 'none') return null;
    const cleanKey = skillKey.toLowerCase().trim();
    if (Object.values(Skill).includes(cleanKey as Skill)) {
        const skillObj = state.skills[cleanKey as Skill];
        if (!skillObj || !skillObj.buff) return null;
        const formattedName = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
        return { name: formattedName, buff: skillObj.buff };
    }
    for (const cat of state.extraCategories || []) {
        const custom = cat.skills?.find((s) => s.id === skillKey || (s.name || '').toLowerCase() === cleanKey);
        if (custom && custom.buff) {
            return { name: custom.name, buff: custom.buff };
        }
    }
    return null;
}

export async function resolveAnalyticBonus(
    state: CharacterState,
    rollerId: string[],
    rollerSide: 'player' | 'foe'
): Promise<boolean> {
    const isSuppressed = isAbilitySuppressedByField(rollerSide, state.activeBattlefield || null, rollerId);
    if (isSuppressed) return false;

    let attackerInit: number | null = null;
    let targetInit: number | null = null;
    const targetFoeId = state.identity.abilityTargetIds?.[0];

    try {
        const rawBo = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('pkr_battle_organizer_data') : null;
        if (rawBo) {
            const bo = JSON.parse(rawBo);
            const activeRound = bo.rounds?.[bo.activeRoundIndex ?? 0] || bo.rounds?.[0];
            if (activeRound?.combatants) {
                const allC = activeRound.combatants;
                const attackerC = allC.find((c: any) => matchesTarget(c, rollerId));
                if (attackerC) {
                    attackerInit = Number(attackerC.initiative) || attackerC.baseInit || 0;
                }
                if (targetFoeId) {
                    const targetC = allC.find((c: any) => matchesTarget(c, targetFoeId));
                    if (targetC) {
                        targetInit = Number(targetC.initiative) || targetC.baseInit || 0;
                    }
                }
            }
        }
    } catch {
        // Ignore storage errors
    }

    if (targetInit === null && targetFoeId && OBR.isAvailable) {
        try {
            const items = await OBR.scene.items.getItems([targetFoeId]);
            if (items.length > 0) {
                const stats = items[0].metadata[STATS_META_ID] as Record<string, unknown> | undefined;
                if (stats && stats['initiative'] !== undefined) {
                    targetInit = Number(stats['initiative']) || 0;
                }
            }
        } catch {
            // ignore
        }
    }

    if (attackerInit === null) {
        attackerInit = calculateBaseInitiative(state);
    }

    return targetInit !== null && attackerInit < targetInit;
}
