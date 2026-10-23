import type { InventoryItem, MoveData, ItemAttackAction } from '../../store/entityTypes';
import type { CharacterState } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { rollAccuracy } from '../combat/combatRoller';
import { getItemEffectiveCharges } from './itemCharges';
import { calculateStatTotal, calculateSkillTotal, ATTRIBUTE_MAPPING, getAbilityText } from '../combat/combatMath';
import { parseCombatTags, type CombatBonuses } from '../tagParser/index';
import { CombatStat, SocialStat } from '../../types/enums';

const ATTRIBUTE_LABELS: Record<string, { short: string; full: string }> = {
    str: { short: 'STR', full: 'Strength' },
    dex: { short: 'DEX', full: 'Dexterity' },
    vit: { short: 'VIT', full: 'Vitality' },
    spe: { short: 'SPE', full: 'Special' },
    ins: { short: 'INS', full: 'Insight' },
    tou: { short: 'TOU', full: 'Tough' },
    coo: { short: 'COO', full: 'Cool' },
    bea: { short: 'BEA', full: 'Beauty' },
    cut: { short: 'CUT', full: 'Cute' },
    cle: { short: 'CLE', full: 'Clever' },
    will: { short: 'WILL', full: 'Will' }
};

export function formatStatShort(key: string): string {
    if (!key || key.toLowerCase() === 'none') return 'None';
    const clean = (ATTRIBUTE_MAPPING[key] || key).toLowerCase().trim();
    if (ATTRIBUTE_LABELS[clean]) return ATTRIBUTE_LABELS[clean].short;
    return key.length <= 4 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatStatFull(key: string): string {
    if (!key || key.toLowerCase() === 'none') return 'None';
    const clean = (ATTRIBUTE_MAPPING[key] || key).toLowerCase().trim();
    if (ATTRIBUTE_LABELS[clean]) return ATTRIBUTE_LABELS[clean].full;
    return key.charAt(0).toUpperCase() + key.slice(1);
}

export function isSameStatOrSkill(a?: string, b?: string): boolean {
    if (!a || !b) return false;
    const normA = (ATTRIBUTE_MAPPING[a] || a).toLowerCase().trim();
    const normB = (ATTRIBUTE_MAPPING[b] || b).toLowerCase().trim();
    return normA === normB;
}

export function getStatOrSkillTotal(key: string | undefined, state: CharacterState, itemBuffs?: CombatBonuses): number {
    if (!key || key.toLowerCase() === 'none') return 0;
    const clean = key.trim().toLowerCase();
    const buffs = itemBuffs || parseCombatTags([], []);

    const normalizedStat = ATTRIBUTE_MAPPING[key] || clean;
    const isStat =
        Object.values(CombatStat).includes(normalizedStat as CombatStat) ||
        Object.values(SocialStat).includes(normalizedStat as SocialStat) ||
        normalizedStat === 'will';

    if (isStat) {
        return calculateStatTotal(key, state, buffs);
    }
    return calculateSkillTotal(key, state, buffs);
}

export interface ResolvedSlot {
    active: string;
    alt?: string;
    isDual: boolean;
    activeTotal: number;
    altTotal: number;
    isSelected: boolean;
}

export function resolveDualScaleSlot(
    primary: string | undefined,
    alt: string | undefined,
    selected: string | undefined,
    state: CharacterState,
    itemBuffs?: CombatBonuses
): ResolvedSlot {
    const cleanPrimary = primary?.trim() || '';
    const cleanAlt = alt?.trim() || '';

    if (!cleanAlt) {
        const total = cleanPrimary ? getStatOrSkillTotal(cleanPrimary, state, itemBuffs) : 0;
        return {
            active: cleanPrimary,
            alt: undefined,
            isDual: false,
            activeTotal: total,
            altTotal: 0,
            isSelected: false
        };
    }

    const primaryTotal = getStatOrSkillTotal(cleanPrimary, state, itemBuffs);
    const altTotal = getStatOrSkillTotal(cleanAlt, state, itemBuffs);

    // 1. Respect explicit player preference if provided
    if (selected) {
        if (isSameStatOrSkill(selected, cleanAlt)) {
            return {
                active: cleanAlt,
                alt: cleanPrimary,
                isDual: true,
                activeTotal: altTotal,
                altTotal: primaryTotal,
                isSelected: true
            };
        }
        if (isSameStatOrSkill(selected, cleanPrimary)) {
            return {
                active: cleanPrimary,
                alt: cleanAlt,
                isDual: true,
                activeTotal: primaryTotal,
                altTotal: altTotal,
                isSelected: true
            };
        }
    }

    // 2. Default to higher total stat/skill from the active character
    if (altTotal > primaryTotal) {
        return {
            active: cleanAlt,
            alt: cleanPrimary,
            isDual: true,
            activeTotal: altTotal,
            altTotal: primaryTotal,
            isSelected: false
        };
    }

    return {
        active: cleanPrimary,
        alt: cleanAlt,
        isDual: true,
        activeTotal: primaryTotal,
        altTotal: altTotal,
        isSelected: false
    };
}

export interface ResolvedItemStats {
    acc1: ResolvedSlot;
    acc2: ResolvedSlot;
    dmg1: ResolvedSlot;
    dualNotes: string[];
}

export function resolveItemMoveStats(
    action: ItemAttackAction,
    item: InventoryItem,
    state?: CharacterState
): ResolvedItemStats {
    const characterState = state || useCharacterStore.getState();
    const abilityText = getAbilityText(
        characterState.identity?.ability || '',
        characterState.roomCustomAbilities || []
    );
    const itemBuffs = parseCombatTags(
        characterState.inventory || [],
        characterState.extraCategories || [],
        undefined,
        abilityText,
        characterState.passives || []
    );

    const selectedAcc1 = action.selectedAcc1 ?? item.attackAction?.selectedAcc1;
    const selectedAcc2 = action.selectedAcc2 ?? item.attackAction?.selectedAcc2;
    const selectedDmg1 = action.selectedDmg1 ?? item.attackAction?.selectedDmg1;

    const acc1 = resolveDualScaleSlot(action.acc1, action.acc1Alt, selectedAcc1, characterState, itemBuffs);
    const acc2 = resolveDualScaleSlot(action.acc2, action.acc2Alt, selectedAcc2, characterState, itemBuffs);
    const dmg1 = resolveDualScaleSlot(action.dmg1, action.dmg1Alt, selectedDmg1, characterState, itemBuffs);

    const dualNotes: string[] = [];
    if (acc1.isDual && acc1.alt) {
        dualNotes.push(`${formatStatShort(acc1.active)} (${formatStatFull(acc1.alt)} Alt)`);
    }
    if (acc2.isDual && acc2.alt) {
        dualNotes.push(`${formatStatShort(acc2.active)} (${formatStatFull(acc2.alt)} Alt)`);
    }
    if (dmg1.isDual && dmg1.alt && action.category !== 'Status') {
        dualNotes.push(`${formatStatShort(dmg1.active)} (${formatStatFull(dmg1.alt)} Alt)`);
    }

    return { acc1, acc2, dmg1, dualNotes };
}

/**
 * Resolves the configured attackAction for an inventory item,
 * checking the item itself or room custom items.
 */
export function resolveItemAttackAction(
    item: InventoryItem,
    roomCustomItems?: Array<{ name: string; attackAction?: ItemAttackAction }>
): ItemAttackAction | undefined {
    if (item.attackAction) return item.attackAction;
    if (roomCustomItems && item.name) {
        const match = roomCustomItems.find((c) => c.name.toLowerCase() === item.name.trim().toLowerCase());
        if (match?.attackAction) return match.attackAction;
    }
    return undefined;
}

/**
 * Converts an InventoryItem and its ItemAttackAction into an ephemeral MoveData object
 * suitable for the standard Pokérole combat accuracy & damage engines.
 */
export function buildEphemeralMoveFromItem(
    item: InventoryItem,
    action: ItemAttackAction,
    state?: CharacterState
): MoveData {
    const { acc1, acc2, dmg1, dualNotes } = resolveItemMoveStats(action, item, state);

    const dualScaleTag = dualNotes.length > 0 ? `[Dual Scale: ${dualNotes.join(', ')}]` : '';

    const descParts = [
        action.tags || '',
        dualScaleTag,
        action.chanceDice ? `Roll ${action.chanceDice} Chance Die to inflict ${action.chanceEffect || 'Effect'}.` : ''
    ].filter(Boolean);

    return {
        id: `item-${item.id}`,
        active: true,
        name: item.name || 'Thrown Item',
        type: action.type || 'Normal',
        category: action.category || 'Physical',
        acc1: acc1.active,
        acc2: acc2.active || 'none',
        dmg1: dmg1.active,
        power: action.power ?? 0,
        desc: descParts.join(' '),
        attackAction: {
            ...action,
            selectedAcc1: acc1.isSelected || acc1.isDual ? acc1.active : action.selectedAcc1,
            selectedAcc2: acc2.isSelected || acc2.isDual ? acc2.active : action.selectedAcc2,
            selectedDmg1: dmg1.isSelected || dmg1.isDual ? dmg1.active : action.selectedDmg1
        }
    };
}

/**
 * Executes an attack roll for a consumable/held item:
 * 1. Verifies charges/quantity availability
 * 2. Triggers rollAccuracy() with ephemeral MoveData
 * 3. Consumes 1 charge (or decrements qty)
 */
export async function executeItemAttackRoll(item: InventoryItem, action: ItemAttackAction): Promise<void> {
    const store = useCharacterStore.getState();
    const effective = getItemEffectiveCharges(item);
    const isDepleted = (effective.hasCharges && effective.charges <= 0) || (item.qty ?? 1) <= 0;
    if (isDepleted) return;

    const ephemeralMove = buildEphemeralMoveFromItem(item, action, store);

    // Roll accuracy through combatRoller (applies stat/skill buffs, held item bonuses, passives)
    await rollAccuracy(ephemeralMove, store);

    // Drain charge / decrement qty
    store.consumeItemCharge(item.id);
}
