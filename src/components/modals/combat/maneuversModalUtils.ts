import type { CharacterState, MoveData } from '../../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../../types/enums';
import {
    getAbilityText,
    parseCombatTags,
    getRankBonusStats,
    calculateStatTotal,
    calculateSkillTotal,
    calculateCriticalRequirement
} from '../../../utils/combat/combatMath';
import { rollGeneric } from '../../../utils/combat/combatRoller';
import { rollDicePlus, broadcastInfo } from '../../../utils/combat/diceRoller';
import { formatManeuverBroadcast, type ManeuverData } from '../../../data/gm/gmManeuversData';

export interface ManeuverPools {
    dex: number;
    str: number;
    spe: number;
    cle: number;
    will: number;
    rankSkillBonus: number;
    // Computed totals (including rankSkillBonus where skill applies)
    ambushTotal: number;
    clashPhysicalTotal: number;
    clashSpecialTotal: number;
    coverTotal: number;
    evasionTotal: number;
    grappleTotal: number;
    runAwayTotal: number;
    stabilizeTotal: number;
    struggleAccTotal: number;
    struggleDmgPhysTotal: number;
    struggleDmgSpecTotal: number;
}

export function getManeuverPools(state: CharacterState): ManeuverPools {
    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
    const itemBuffs = parseCombatTags(state.inventory, state.extraCategories, undefined, abilityText, state.passives);

    const rankSkillBonus = getRankBonusStats(state.identity.rank).skillDice;

    const dex = calculateStatTotal(CombatStat.DEX, state, itemBuffs);
    const str = calculateStatTotal(CombatStat.STR, state, itemBuffs);
    const spe = calculateStatTotal(CombatStat.SPE, state, itemBuffs);
    const cle = calculateStatTotal(SocialStat.CLE, state, itemBuffs);
    const will = calculateStatTotal('will', state, itemBuffs);

    const stealth = calculateSkillTotal(Skill.STEALTH, state, itemBuffs);
    const evade = calculateSkillTotal(Skill.EVASION, state, itemBuffs);
    const alert = calculateSkillTotal(Skill.ALERT, state, itemBuffs);
    const brawl = calculateSkillTotal(Skill.BRAWL, state, itemBuffs);
    const athletic = calculateSkillTotal(Skill.ATHLETIC, state, itemBuffs);
    const medicine = calculateSkillTotal(Skill.MEDICINE, state, itemBuffs);
    const channel = calculateSkillTotal(Skill.CHANNEL, state, itemBuffs);
    const clash = calculateSkillTotal(Skill.CLASH, state, itemBuffs);

    const bestEvadeSkill = Math.max(evade, alert);
    const bestClashPhysSkill = Math.max(clash, brawl);
    const bestClashSpecSkill = Math.max(clash, channel);
    const bestGrappleSkill = Math.max(brawl, athletic);
    const bestStruggleSkill = Math.max(brawl, channel);

    return {
        dex,
        str,
        spe,
        cle,
        will,
        rankSkillBonus,
        ambushTotal: dex + stealth + rankSkillBonus,
        clashPhysicalTotal: str + bestClashPhysSkill + rankSkillBonus,
        clashSpecialTotal: spe + bestClashSpecSkill + rankSkillBonus,
        coverTotal: will,
        evasionTotal: dex + bestEvadeSkill + rankSkillBonus,
        grappleTotal: str + bestGrappleSkill + rankSkillBonus,
        runAwayTotal: dex + athletic + rankSkillBonus,
        stabilizeTotal: cle + medicine + rankSkillBonus,
        struggleAccTotal: dex + bestStruggleSkill + rankSkillBonus,
        struggleDmgPhysTotal: str,
        struggleDmgSpecTotal: spe
    };
}

export async function executeManeuverRoll(
    maneuverId: string,
    state: CharacterState,
    option?: string,
    extraDice?: number,
    consumeActionCounter = true
): Promise<void> {
    const pools = getManeuverPools(state);
    const nickname = state.identity.nickname || state.identity.species || 'Someone';
    const requiredSuccesses = state.trackers.actions + 1;
    const combatOptions = consumeActionCounter ? { requiredSuccesses } : { isOutOfCombat: true };

    switch (maneuverId) {
        case 'maneuver-ambush':
            await rollGeneric(
                'Ambush',
                pools.ambushTotal - pools.rankSkillBonus,
                'dex',
                false,
                false,
                consumeActionCounter,
                true,
                combatOptions
            );
            break;

        case 'maneuver-clash':
            if (option === 'special') {
                await rollGeneric(
                    'Special Clash',
                    pools.clashSpecialTotal - pools.rankSkillBonus,
                    'spe',
                    false,
                    true,
                    consumeActionCounter,
                    true,
                    consumeActionCounter ? undefined : { isOutOfCombat: true }
                );
            } else {
                await rollGeneric(
                    'Physical Clash',
                    pools.clashPhysicalTotal - pools.rankSkillBonus,
                    'str',
                    false,
                    true,
                    consumeActionCounter,
                    true,
                    consumeActionCounter ? undefined : { isOutOfCombat: true }
                );
            }
            break;

        case 'maneuver-cover-an-ally':
            await rollGeneric(
                'Cover an Ally',
                pools.coverTotal,
                'will',
                false,
                false,
                consumeActionCounter,
                false,
                combatOptions
            );
            break;

        case 'maneuver-evasion':
            await rollGeneric(
                'Evasion',
                pools.evasionTotal - pools.rankSkillBonus,
                'dex',
                true,
                false,
                consumeActionCounter,
                true,
                consumeActionCounter ? undefined : { isOutOfCombat: true }
            );
            break;

        case 'maneuver-grapple':
            await rollGeneric(
                'Grapple',
                pools.grappleTotal - pools.rankSkillBonus,
                'str',
                false,
                false,
                consumeActionCounter,
                true,
                combatOptions
            );
            break;

        case 'maneuver-help-another': {
            const count = Math.max(1, Math.min(6, extraDice ?? 3));
            if (consumeActionCounter) {
                state.incrementAction();
            }
            const outOfCombatTag = !consumeActionCounter ? ' [ Out of Combat ]' : '';
            await rollDicePlus(
                `${count}d6>5`,
                `[Help Another] ${nickname} rolled Help Another (Chance dice)!${outOfCombatTag}`,
                'chance'
            );
            break;
        }

        case 'maneuver-run-away':
            await rollGeneric(
                'Run Away',
                pools.runAwayTotal - pools.rankSkillBonus,
                'dex',
                false,
                false,
                consumeActionCounter,
                true,
                combatOptions
            );
            break;

        case 'maneuver-stabilize-an-ally':
            await rollGeneric(
                'Stabilize Ally',
                pools.stabilizeTotal - pools.rankSkillBonus,
                'cle',
                false,
                false,
                consumeActionCounter,
                true,
                combatOptions
            );
            break;

        case 'maneuver-struggle':
            if (option === 'damage-phys') {
                const globalSucc = state.trackers.globalSucc || 0;
                const mathMod = globalSucc !== 0 ? (globalSucc > 0 ? `+${globalSucc}` : `${globalSucc}`) : '';
                await rollDicePlus(
                    `${Math.max(1, pools.struggleDmgPhysTotal)}d6>3${mathMod}`,
                    `${nickname} rolled Physical Struggle Damage!`,
                    'damage'
                );
            } else if (option === 'damage-spec') {
                const globalSucc = state.trackers.globalSucc || 0;
                const mathMod = globalSucc !== 0 ? (globalSucc > 0 ? `+${globalSucc}` : `${globalSucc}`) : '';
                await rollDicePlus(
                    `${Math.max(1, pools.struggleDmgSpecTotal)}d6>3${mathMod}`,
                    `${nickname} rolled Special Struggle Damage!`,
                    'damage'
                );
            } else {
                let struggleOptions: {
                    requiredSuccesses?: number;
                    criticalRequirement?: number;
                    critExplanationTags?: string[];
                    isOutOfCombat?: boolean;
                };

                if (consumeActionCounter) {
                    const abilityText = getAbilityText(state.identity.ability, state.roomCustomAbilities);
                    const itemBuffs = parseCombatTags(
                        state.inventory,
                        state.extraCategories,
                        undefined,
                        abilityText,
                        state.passives
                    );
                    const struggleMove: MoveData = {
                        id: 'struggle',
                        active: true,
                        name: 'Struggle',
                        type: 'Normal',
                        category: 'Physical',
                        power: 1,
                        acc1: 'dex',
                        acc2: 'brawl',
                        dmg1: 'str',
                        desc: 'Struggle accuracy attack'
                    };
                    const critResult = calculateCriticalRequirement(struggleMove, requiredSuccesses, state, itemBuffs);
                    struggleOptions = {
                        requiredSuccesses,
                        criticalRequirement: critResult.criticalRequirement,
                        critExplanationTags: critResult.critExplanationTags
                    };
                } else {
                    struggleOptions = { isOutOfCombat: true };
                }

                await rollGeneric(
                    'Struggle (Accuracy)',
                    pools.struggleAccTotal - pools.rankSkillBonus,
                    'dex',
                    false,
                    false,
                    consumeActionCounter,
                    true,
                    struggleOptions
                );
            }
            break;

        default:
            console.warn('[ManeuversModal] Unknown maneuverId:', maneuverId);
            break;
    }
}

export function broadcastManeuver(m: ManeuverData): void {
    broadcastInfo(`Maneuver: ${m.name}`, formatManeuverBroadcast(m));
}
