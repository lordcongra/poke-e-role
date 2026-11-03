import { describe, it, expect, beforeEach } from 'vitest';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { parseCombatTags } from '../../tagParser/parseCombatTags';
import {
    getStatusPenalties,
    getPainPenalty,
    calculateBaseAccuracy,
    calculateCriticalRequirement,
    calculateBaseDamage,
    getWeatherDamageBonus,
    calculateTotalDamage
} from '../combatMath';
import { checkCondition } from '../../tagParser/conditionChecker';
import { flattenStateToMetadata, hydrateStateFromMetadata } from '../../sync/stateMapper';
import { parseRollLogEntry } from '../../../components/modals/battleOrganizer/battleOrganizerRollParser';
import {
    createDefaultCombatant,
    markCombatantActionStatus,
    parseStatusesFromMetadata,
    parseHealthAndWillFromMetadata
} from '../../../components/modals/battleOrganizer/battleOrganizerUtils';
import type { MoveData, InventoryItem } from '../../../store/storeTypes';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';

describe('Combat Engine, Roller & Battle Organizer', () => {
    beforeEach(() => {
        useCharacterStore.getState().loadFromOwlbear({});
    });

    describe('Tag Parser & Buff Extraction', () => {
        const mockItems: InventoryItem[] = [
            {
                id: 'item-1',
                name: 'Custom Scope Lens',
                desc: '[Crit on 4+] [Acc +1]',
                qty: 1,
                active: true
            },
            {
                id: 'item-2',
                name: 'Custom Muscle Band',
                desc: '[Dmg +2] [First Hit Dmg +3]',
                qty: 1,
                active: true
            },
            {
                id: 'item-3',
                name: 'Damp Rock',
                desc: 'Unrelated item without combat tags',
                qty: 1,
                active: true
            },
            {
                id: 'item-4',
                name: 'Inactive Item',
                desc: '[Dmg +5]',
                qty: 1,
                active: false
            }
        ];

        const mockMove: MoveData = {
            id: 'move-slash',
            active: true,
            name: 'Slash',
            type: 'Normal',
            category: 'Physical',
            power: 2,
            acc1: 'str',
            acc2: 'brawl',
            dmg1: 'str',
            desc: '[High Critical]'
        };

        it('extracts combat buffs and ignores inactive items', () => {
            const parsedBuffs = parseCombatTags(mockItems, [], mockMove);
            expect(parsedBuffs.acc).toBe(1);
            expect(parsedBuffs.dmg).toBe(2);
            expect(parsedBuffs.firstHitDmg).toBe(3);
            expect(parsedBuffs.highCritStacks).toBeGreaterThanOrEqual(1);
        });

        it('extracts flat success tags matching move type', () => {
            const gemItems: InventoryItem[] = [
                {
                    id: 'item-gem',
                    name: 'Normal Gem',
                    desc: '[Acc Succ +1: Normal] [Dmg Succ +2: Normal]',
                    qty: 1,
                    active: true
                },
                {
                    id: 'item-rock-gem',
                    name: 'Rock Gem',
                    desc: '[Acc Succ +1: Rock] [Dmg Succ +2: Rock]',
                    qty: 1,
                    active: true
                }
            ];
            const gemBuffs = parseCombatTags(gemItems, [], mockMove);
            expect(gemBuffs.accSucc).toBe(1);
            expect(gemBuffs.dmgSucc).toBe(2);
            expect(gemBuffs.accSuccItemNames.some((n) => n.includes('Normal Gem'))).toBe(true);
            expect(gemBuffs.dmgSuccItemNames.some((n) => n.includes('Normal Gem'))).toBe(true);
        });

        it('calculates accuracy with stats, skills, and tag buffs', () => {
            const store = useCharacterStore.getState();
            store.setStat('str' as any, 'base', 3);
            store.setSkill('brawl' as any, 'base', 2);
            const parsedBuffs = parseCombatTags(mockItems, [], mockMove);
            const baseAcc = calculateBaseAccuracy(mockMove, useCharacterStore.getState(), parsedBuffs);
            expect(baseAcc).toBe(6);
        });

        it('reduces critical threshold with High Critical and Scope Lens', () => {
            const parsedBuffs = parseCombatTags(mockItems, [], mockMove);
            const critReq = calculateCriticalRequirement(mockMove, 1, useCharacterStore.getState(), parsedBuffs);
            expect(critReq.criticalRequirement).toBeLessThanOrEqual(4);
        });
    });

    describe('Status Penalties & Pain Engine', () => {
        it('calculates status penalties correctly across ranks and sleep', () => {
            const store = useCharacterStore.getState();
            store.updateHealth('hpMax', 10);
            store.updateHealth('hpCurr', 10);

            const healthyPenalties = getStatusPenalties(useCharacterStore.getState());
            expect(healthyPenalties.paralysisDexterityPenalty).toBe(0);
            expect(healthyPenalties.confusionPenalty).toBe(0);
            expect(healthyPenalties.isAsleep).toBe(false);

            store.addStatus();
            const paralysisId = useCharacterStore.getState().statuses[useCharacterStore.getState().statuses.length - 1].id;
            store.updateStatus(paralysisId, 'name', 'Paralysis');

            store.addStatus();
            const confusionId = useCharacterStore.getState().statuses[useCharacterStore.getState().statuses.length - 1].id;
            store.updateStatus(confusionId, 'name', 'Confusion');

            const starterPenalties = getStatusPenalties(useCharacterStore.getState());
            expect(starterPenalties.paralysisDexterityPenalty).toBe(-2);
            expect(starterPenalties.confusionPenalty).toBe(-1);

            store.setIdentity('rank', 'Expert');
            const expertPenalties = getStatusPenalties(useCharacterStore.getState());
            expect(expertPenalties.confusionPenalty).toBe(-2);

            store.addStatus();
            const sleepId = useCharacterStore.getState().statuses[useCharacterStore.getState().statuses.length - 1].id;
            store.updateStatus(sleepId, 'name', 'Sleep');
            const sleepPenalties = getStatusPenalties(useCharacterStore.getState());
            expect(sleepPenalties.isAsleep).toBe(true);
        });

        it('calculates pain penalties and honors exemptions and ignore tags', () => {
            const store = useCharacterStore.getState();
            store.updateHealth('hpMax', 10);
            store.updateHealth('hpCurr', 10);
            expect(getPainPenalty('str', useCharacterStore.getState())).toBe(0);

            store.updateHealth('hpCurr', 1);
            expect(getPainPenalty('str', useCharacterStore.getState())).toBe(-3);

            const ignorePainBuffs = { ignorePain: true } as any;
            expect(getPainPenalty('str', useCharacterStore.getState(), ignorePainBuffs)).toBe(0);

            expect(getPainPenalty('vit', useCharacterStore.getState())).toBe(0);
            expect(getPainPenalty('Vitality', useCharacterStore.getState())).toBe(0);
            expect(getPainPenalty('vitality', useCharacterStore.getState())).toBe(0);
            expect(getPainPenalty('will', useCharacterStore.getState())).toBe(0);
            expect(getPainPenalty('Will', useCharacterStore.getState())).toBe(0);
        });
    });

    describe('Action Counters & Reactions', () => {
        it('tracks action count and scales required successes', () => {
            const store = useCharacterStore.getState();
            store.updateTracker('actions', 0);
            store.updateTracker('firstHitAcc', true);
            store.updateTracker('firstHitDmg', true);

            expect(useCharacterStore.getState().trackers.actions).toBe(0);
            store.incrementAction();
            expect(useCharacterStore.getState().trackers.actions).toBe(1);
            store.incrementAction();
            expect(useCharacterStore.getState().trackers.actions).toBe(2);

            const requiredSuccessesForNext = useCharacterStore.getState().trackers.actions + 1;
            expect(requiredSuccessesForNext).toBe(3);
        });

        it('tracks evade and clash and resets on round reset', () => {
            const store = useCharacterStore.getState();
            store.updateTracker('evade', false);
            store.updateTracker('clash', false);
            expect(useCharacterStore.getState().trackers.evade).toBe(false);
            expect(useCharacterStore.getState().trackers.clash).toBe(false);

            store.updateTracker('evade', true);
            expect(useCharacterStore.getState().trackers.evade).toBe(true);

            store.updateTracker('clash', true);
            expect(useCharacterStore.getState().trackers.clash).toBe(true);

            store.resetRound();
            expect(useCharacterStore.getState().trackers.evade).toBe(false);
            expect(useCharacterStore.getState().trackers.clash).toBe(false);
            expect(useCharacterStore.getState().trackers.actions).toBe(0);
        });
    });

    describe('Battle Organizer Roll Parser & Combatant Sync', () => {
        it('classifies accuracy, damage, evasion, clash, and status recovery rolls', () => {
            const parsedAccRoll = parseRollLogEntry({
                id: 'roll-acc-1',
                label: 'Pikachu rolled Thunderbolt (Acc)! [ Need 1 Succ | Crit on 5+ ]',
                rollType: 'roll',
                tokenId: 'token-pika'
            });
            expect(parsedAccRoll?.isAccuracyRoll).toBe(true);
            expect(parsedAccRoll?.moveName).toBe('Thunderbolt');
            expect(parsedAccRoll?.shouldAddToRoundTracker).toBe(true);

            const parsedDmgRoll = parseRollLogEntry({
                id: 'roll-dmg-1',
                label: 'Pikachu rolled Thunderbolt (Dmg)! [ STAB (+1 Die) ]',
                rollType: 'damage',
                tokenId: 'token-pika'
            });
            expect(parsedDmgRoll?.isDamageRoll).toBe(true);
            expect(parsedDmgRoll?.shouldAddToRoundTracker).toBe(false);

            const parsedEvadeRoll = parseRollLogEntry({
                id: 'roll-eva-1',
                label: 'Pikachu rolled Evasion! [ Need 1 Succ ]',
                rollType: 'roll',
                tokenId: 'token-pika'
            });
            expect(parsedEvadeRoll?.isEvade).toBe(true);
            expect(parsedEvadeRoll?.shouldAddToRoundTracker).toBe(true);

            const parsedClashRoll = parseRollLogEntry({
                id: 'roll-cla-1',
                label: 'Charizard rolled Physical Clash!',
                rollType: 'roll',
                tokenId: 'token-chari'
            });
            expect(parsedClashRoll?.isClash).toBe(true);

            const parsedBurnRecovery = parseRollLogEntry({
                id: 'roll-burn-rec',
                label: 'Pikachu rolled 1st Degree Burn Recovery!',
                rollType: 'status',
                tokenId: 'token-pika'
            });
            expect(parsedBurnRecovery?.isActionConsumingRecovery).toBe(true);
        });

        it('populates combatant action status', () => {
            let mockCombatant: CombatantRowData = createDefaultCombatant('Pikachu', 'http://example.com/pika.png', true);
            mockCombatant.tokenId = 'token-pika';
            expect(mockCombatant.actions.every((a) => a.text === '')).toBe(true);

            mockCombatant = markCombatantActionStatus(mockCombatant, 'Thunderbolt', 'success');
            expect(mockCombatant.actions[0].text).toBe('Thunderbolt');
            expect(mockCombatant.actions[0].status).toBe('success');
        });
    });

    describe('OBR Token Metadata Serialization & Hydration', () => {
        it('serializes and hydrides combatant trackers and status correctly', () => {
            const store = useCharacterStore.getState();
            store.updateTracker('actions', 3);
            store.updateTracker('evade', true);
            store.updateTracker('clash', false);
            store.updateHealth('hpCurr', 8);
            store.updateHealth('hpMax', 12);
            store.updateWill('willCurr', 4);
            store.updateWill('willMax', 6);

            const flatMeta = flattenStateToMetadata(useCharacterStore.getState());
            expect(flatMeta['actions-used']).toBe(3);
            expect(flatMeta['evasions-used']).toBe(true);
            expect(flatMeta['clashes-used']).toBe(false);
            expect(flatMeta['hp-curr']).toBe(8);
            expect(flatMeta['hp-max-display'] === 12 || flatMeta['hp-max'] === 12).toBe(true);

            const incomingOrganizerMeta: Record<string, unknown> = {
                'vit-base': 4,
                'actions-used': 1,
                'evasions-used': false,
                'clashes-used': true,
                'hp-curr': 7,
                'hp-max': 12,
                'will-curr': 3,
                'status-list': JSON.stringify([{ id: 'status-1', name: 'Paralysis', rounds: 2 }])
            };
            const hydrated = hydrateStateFromMetadata(incomingOrganizerMeta, useCharacterStore.getState());
            expect(hydrated.trackers?.actions).toBe(1);
            expect(hydrated.trackers?.evade).toBe(false);
            expect(hydrated.trackers?.clash).toBe(true);
            expect(hydrated.health?.hpCurr).toBe(7);

            const parsedMetaStatuses = parseStatusesFromMetadata(incomingOrganizerMeta);
            expect(parsedMetaStatuses.statusText).toContain('Paralysis (2)');

            const parsedHw = parseHealthAndWillFromMetadata(incomingOrganizerMeta);
            expect(parsedHw.hpCurr).toBe(7);
            expect(parsedHw.willCurr).toBe(3);
        });
    });

    describe('Weather Modifiers & Condition Checking', () => {
        it('calculates weather dice bonuses, flat penalties, and tags', () => {
            // Sun
            const sunBattlefield = {
                weather: { name: 'Sun', remainingRounds: 3 },
                terrain: null,
                other: null
            };
            const sunFire = getWeatherDamageBonus('Fire', sunBattlefield as any);
            expect(sunFire.diceBonus).toBe(1);
            expect(sunFire.flatPenalty).toBe(0);
            expect(sunFire.tag).toContain('Sunny (+1 Dice to Fire Damage Pool)');

            const sunWater = getWeatherDamageBonus('Water', sunBattlefield as any);
            expect(sunWater.diceBonus).toBe(0);
            expect(sunWater.flatPenalty).toBe(1);
            expect(sunWater.tag).toContain('Sunny (-1 Flat Damage from Water Moves)');

            // Rain
            const rainBattlefield = {
                weather: { name: 'Rain', remainingRounds: 3 },
                terrain: null,
                other: null
            };
            const rainWater = getWeatherDamageBonus('Water', rainBattlefield as any);
            expect(rainWater.diceBonus).toBe(1);
            expect(rainWater.flatPenalty).toBe(0);
            expect(rainWater.tag).toContain('Rain (+1 Dice to Water Damage Pool)');

            const rainFire = getWeatherDamageBonus('Fire', rainBattlefield as any);
            expect(rainFire.diceBonus).toBe(0);
            expect(rainFire.flatPenalty).toBe(1);
            expect(rainFire.tag).toContain('Rain (-1 Flat Damage from Fire Moves)');

            // Snow
            const snowBattlefield = {
                weather: { name: 'Snow', remainingRounds: 2 },
                terrain: null,
                other: null
            };
            const snowIce = getWeatherDamageBonus('Ice', snowBattlefield as any);
            expect(snowIce.diceBonus).toBe(1);
            expect(snowIce.flatPenalty).toBe(0);
            expect(snowIce.tag).toContain('Snowy (+1 Dice to Ice Damage Pool)');

            // Desolate Land
            const desolateBattlefield = {
                weather: { name: 'Desolate Land', remainingRounds: 5 },
                terrain: null,
                other: null
            };
            const desFire = getWeatherDamageBonus('Fire', desolateBattlefield as any);
            expect(desFire.diceBonus).toBe(2);
            expect(desFire.flatPenalty).toBe(0);

            const desWater = getWeatherDamageBonus('Water', desolateBattlefield as any);
            expect(desWater.diceBonus).toBe(0);
            expect(desWater.flatPenalty).toBe(2);
        });

        it('calculates total damage dice pool correctly with weather bonuses', () => {
            const store = useCharacterStore.getState();
            store.setActiveBattlefield({
                weather: { name: 'Sun', remainingRounds: 3 },
                terrain: null,
                other: null
            } as any);

            const fireMove: MoveData = {
                id: 'fire-fang',
                active: true,
                name: 'Fire Fang',
                type: 'Fire',
                category: 'Physical',
                power: 2,
                acc1: 'str',
                acc2: 'brawl',
                dmg1: 'str',
                desc: ''
            };
            const waterMove: MoveData = {
                id: 'water-gun',
                active: true,
                name: 'Water Gun',
                type: 'Water',
                category: 'Special',
                power: 2,
                acc1: 'spe',
                acc2: 'channel',
                dmg1: 'spe',
                desc: ''
            };

            const totalFireDamage = calculateTotalDamage(fireMove, useCharacterStore.getState());
            const baseFireDamage = calculateBaseDamage(fireMove, useCharacterStore.getState());
            expect(totalFireDamage).toBe(baseFireDamage + 1);

            const totalWaterDamage = calculateTotalDamage(waterMove, useCharacterStore.getState());
            const baseWaterDamage = calculateBaseDamage(waterMove, useCharacterStore.getState());
            // In Sun, Water has 0 diceBonus (flatPenalty applies on roll result, not dice pool)
            expect(totalWaterDamage).toBe(baseWaterDamage);
        });

        it('evaluates conditions and avoids false positives', () => {
            const store = useCharacterStore.getState();
            store.setActiveBattlefield({
                weather: { name: '', remainingRounds: 0 },
                terrain: null,
                other: null
            } as any);
            expect(checkCondition('rain', false)).toBe(false);

            store.setActiveBattlefield({
                weather: null,
                terrain: null,
                other: { name: 'Rainbow Field', remainingRounds: 3 }
            } as any);
            expect(checkCondition('rain', false)).toBe(false);

            store.setActiveBattlefield({
                weather: { name: 'Rain', remainingRounds: 3 },
                terrain: null,
                other: null
            } as any);
            expect(checkCondition('rain', false)).toBe(true);

            store.setActiveBattlefield({
                weather: { name: 'Rain', remainingRounds: 0 },
                terrain: null,
                other: null
            } as any);
            expect(checkCondition('rain', false)).toBe(false);
        });
    });
});

