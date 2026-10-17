import OBR from '@owlbear-rodeo/sdk';
import type { CharacterState, InventoryItem, StatusItem, CharacterHealth, CharacterWill } from '../../store/storeTypes';
import type { PcPokemonSummary, TrainerRoster } from '../../types/pcStorageTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { hasItemUsageEffect, applyItemUsageEffects } from './itemUsageEffects';
import { getItemEffectiveCharges, consumeChargeFromInventory } from './itemCharges';
import { saveToOwlbear } from '../sync/obr';
import { resolveEffectiveActiveTrainer } from '../pc/pcActiveTrainerOps';
import { renderTokenGraphicsForMeta } from '../../hooks/owlbearSync/setupOwlbearTokenSync';
import { METADATA_ID } from '../../hooks/owlbearSync/owlbearSyncConstants';
import { broadcastInfo } from '../combat/diceRoller';

export interface ItemTargetCandidate {
    id: string;
    name: string;
    species?: string;
    hp: number;
    maxHp: number;
    will: number;
    maxWill: number;
    statuses: StatusItem[];
    avatarUrl?: string;
    isTrainer: boolean;
    mapTokenId?: string;
}

/**
 * Evaluates whether an item used by a Trainer has target options among their belt slot Pokémon.
 * Returns empty array if active character is not a Trainer or item is not restorative.
 * Returns [trainerCandidate, ...pokemonCandidates] if belt slot Pokémon exist in the party.
 * Returns empty array if the party has no candidate Pokémon (allowing direct self-use without prompting).
 */
export function getTrainerItemTargets(store: CharacterState, item: InventoryItem): ItemTargetCandidate[] {
    const mode = store.identity?.mode;
    const rank = store.identity?.rank;
    const isTrainer = mode === 'Trainer' || mode === 'Trainer (Special)' || (rank as string) === 'Trainer';

    if (!isTrainer || !hasItemUsageEffect(item)) {
        return [];
    }

    const campaign = store.pcData?.campaigns?.[store.pcData.activeCampaignId];
    let trainer: TrainerRoster | undefined;

    if (campaign) {
        const trainers = Object.values(campaign.trainers || {});
        // 1. Match by entityId
        const activeEntityId = store.identity?.entityId;
        if (activeEntityId) {
            trainer = trainers.find((t) => t.id === activeEntityId);
        }
        // 2. Match by tokenId
        if (!trainer && store.tokenId) {
            trainer = trainers.find((t) => t.mapTokenId === store.tokenId);
        }
        // 3. Match by nickname or species
        if (!trainer) {
            const nameToMatch = (store.identity?.nickname || store.identity?.species || '').trim().toLowerCase();
            if (nameToMatch) {
                trainer = trainers.find((t) => t.name?.trim().toLowerCase() === nameToMatch);
            }
        }
        // 4. Fallback to resolveEffectiveActiveTrainer
        if (!trainer) {
            trainer = resolveEffectiveActiveTrainer(campaign);
        }
    }

    if (!trainer) {
        return [];
    }

    const allSummaries = store.pcData?.pokemonSummaries || {};
    const pokemonCandidates: ItemTargetCandidate[] = [];
    const seenEntityIds = new Set<string>();

    const parseStatuses = (sum: PcPokemonSummary): StatusItem[] => {
        if (sum.fullMetadata?.['status-list']) {
            try {
                const raw = sum.fullMetadata['status-list'];
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (Array.isArray(parsed)) return parsed as StatusItem[];
            } catch {}
        }
        return [];
    };

    // Belt slot Pokémon in the Trainer's party
    if (Array.isArray(trainer.party)) {
        for (const slotId of trainer.party) {
            if (!slotId || seenEntityIds.has(slotId)) continue;
            const sum = allSummaries[slotId];
            if (sum && !seenEntityIds.has(sum.entityId)) {
                seenEntityIds.add(slotId);
                seenEntityIds.add(sum.entityId);
                pokemonCandidates.push({
                    id: sum.entityId,
                    name: sum.name || sum.species || 'Pokémon',
                    species: sum.species,
                    hp: sum.hp ?? 0,
                    maxHp: sum.maxHp ?? 1,
                    will: sum.will ?? 0,
                    maxWill: sum.maxWill ?? 1,
                    statuses: parseStatuses(sum),
                    avatarUrl: sum.tokenImageUrl,
                    isTrainer: false,
                    mapTokenId: sum.mapTokenId
                });
            }
        }
    }

    // If no candidate Pokémon exist in the party, return empty array to allow direct self-use
    if (pokemonCandidates.length === 0) {
        return [];
    }

    const trainerCandidate: ItemTargetCandidate = {
        id: trainer.id || store.identity?.entityId || 'trainer',
        name: store.identity?.nickname || store.identity?.species || trainer.name || 'Trainer',
        species: undefined,
        hp: store.health?.hpCurr ?? 0,
        maxHp: store.health?.hpMax ?? 1,
        will: store.will?.willCurr ?? 0,
        maxWill: store.will?.willMax ?? 1,
        statuses: store.statuses ?? [],
        avatarUrl: (trainer.avatarUrl || store.identity?.tokenImageUrl) ?? undefined,
        isTrainer: true,
        mapTokenId: store.tokenId || trainer.mapTokenId
    };

    return [trainerCandidate, ...pokemonCandidates];
}

/**
 * Applies a restorative item to a targeted Pokémon (belt slot or sent-out), updates Pokémon summary & token,
 * consumes item charge/qty from Trainer's inventory, and broadcasts usage to the room.
 */
export async function applyItemToPokemonTarget(
    store: CharacterState,
    item: InventoryItem,
    target: ItemTargetCandidate
): Promise<void> {
    const summary = store.pcData?.pokemonSummaries?.[target.id];
    if (!summary) return;

    // 1. Consume 1 charge or 1 qty from Trainer's inventory and persist via saveToOwlbear
    const effective = getItemEffectiveCharges(item);
    let nextInventory: InventoryItem[];

    if (effective.hasCharges) {
        const result = consumeChargeFromInventory(store.inventory, item.id);
        nextInventory = result.newInventory;
    } else {
        const currentQty = item.qty ?? 1;
        if (currentQty <= 1) {
            nextInventory = store.inventory.filter((i) => i.id !== item.id);
        } else {
            nextInventory = store.inventory.map((i) => (i.id === item.id ? { ...i, qty: currentQty - 1 } : i));
        }
    }

    useCharacterStore.setState({ inventory: nextInventory });
    try {
        saveToOwlbear({ 'inv-data': JSON.stringify(nextInventory) });
    } catch (e) {
        console.error('[itemTargeting] Failed to save updated inventory to Owlbear:', e);
    }

    // 2. Calculate restorative result with applyItemUsageEffects
    const currentHealth: CharacterHealth = {
        hpCurr: summary.hp,
        hpMax: summary.maxHp,
        hpBase: summary.maxHp,
        temporaryHitPoints: 0,
        temporaryHitPointsMax: 0,
        currentHitPoints: summary.hp,
        maxHitPoints: summary.maxHp
    };
    const currentWill: CharacterWill = {
        willCurr: summary.will,
        willMax: summary.maxWill,
        willBase: summary.maxWill,
        temporaryWill: 0,
        temporaryWillMax: 0
    };

    let currentStatuses: StatusItem[] = [];
    if (summary.fullMetadata?.['status-list']) {
        try {
            const raw = summary.fullMetadata['status-list'];
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) currentStatuses = parsed as StatusItem[];
        } catch {}
    }
    if (currentStatuses.length === 0) {
        currentStatuses = [{ id: crypto.randomUUID(), name: 'Healthy', customName: '', rounds: 0 }];
    }

    const { nextHealth, nextWill, nextStatuses, summaryText } = applyItemUsageEffects(
        item,
        currentHealth,
        currentWill,
        currentStatuses,
        store.roomCustomStatuses
    );

    // 3. Update Pokémon summary via store.updatePokemonSummary(...)
    let updatedSavedTokenItem = summary.savedTokenItem;
    if (updatedSavedTokenItem) {
        updatedSavedTokenItem = {
            ...updatedSavedTokenItem,
            metadata: {
                ...(updatedSavedTokenItem.metadata || {}),
                [METADATA_ID]: {
                    ...((updatedSavedTokenItem.metadata?.[METADATA_ID] as Record<string, unknown>) || {}),
                    'hp-curr': nextHealth.hpCurr,
                    'current-hp': nextHealth.hpCurr,
                    'will-curr': nextWill.willCurr,
                    'status-list': JSON.stringify(nextStatuses)
                }
            }
        };
    }

    const updatedSummary: PcPokemonSummary = {
        ...summary,
        hp: nextHealth.hpCurr ?? summary.hp,
        will: nextWill.willCurr ?? summary.will,
        lastModified: Date.now(),
        fullMetadata: {
            ...(summary.fullMetadata || {}),
            'hp-curr': nextHealth.hpCurr,
            'current-hp': nextHealth.hpCurr,
            'will-curr': nextWill.willCurr,
            'status-list': JSON.stringify(nextStatuses)
        },
        savedTokenItem: updatedSavedTokenItem
    };
    store.updatePokemonSummary(updatedSummary);

    // 4. If OBR.isAvailable && summary.mapTokenId, update token metadata and invoke renderTokenGraphicsForMeta
    if (OBR.isAvailable && summary.mapTokenId) {
        try {
            await OBR.scene.items.updateItems([summary.mapTokenId], (items) => {
                for (const it of items) {
                    const metaUpdates: Record<string, unknown> = {
                        'hp-curr': nextHealth.hpCurr,
                        'current-hp': nextHealth.hpCurr,
                        'will-curr': nextWill.willCurr,
                        'status-list': JSON.stringify(nextStatuses),
                        lastModified: updatedSummary.lastModified
                    };
                    if (!it.metadata[METADATA_ID]) it.metadata[METADATA_ID] = {};
                    Object.assign(it.metadata[METADATA_ID] as Record<string, unknown>, metaUpdates);
                    if (it.metadata['pokerole-pmd-extension/stats']) {
                        Object.assign(
                            it.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>,
                            metaUpdates
                        );
                    }
                }
            });
            const [updatedToken] = await OBR.scene.items.getItems([summary.mapTokenId]);
            if (updatedToken) {
                const role = store.role || 'PLAYER';
                const tokenMeta = (updatedToken.metadata[METADATA_ID] ||
                    updatedToken.metadata['pokerole-pmd-extension/stats'] ||
                    updatedSummary.fullMetadata) as Record<string, unknown>;
                await renderTokenGraphicsForMeta(updatedToken, tokenMeta, role, false);
            }
        } catch (e) {
            console.warn('[itemTargeting] Failed to update token scene metadata or graphics:', e);
        }
    }

    // 5. Broadcast room notification: "${trainerName} used ${item.name} on ${pokemonName}. ${summaryText}"
    const trainerName = store.identity?.nickname || store.identity?.species || 'Trainer';
    const pokemonName = summary.name || summary.species || 'Pokémon';
    const message = `${trainerName} used ${item.name || 'Item'} on ${pokemonName}. ${summaryText}`;

    if (OBR.isAvailable) {
        OBR.notification.show(message, 'INFO');
    }
    broadcastInfo(trainerName, message).catch((e) => {
        console.error('[itemTargeting] Failed to broadcast item usage:', e);
    });
}
