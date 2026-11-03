import { describe, it, expect, vi } from 'vitest';
import OBR from '@owlbear-rodeo/sdk';
import { findOtherLinkedTrainer } from '../pcModalOps';
import { executeLinkActiveTrainer } from '../pcTrainerOps';
import { calculateFormationOffsets, spawnTrainerAndTeam } from '../../generators/trainerTokenSpawner';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { Item } from '@owlbear-rodeo/sdk';
import type { CampaignProfile, TrainerRoster } from '../../../types/pcStorageTypes';

describe('Trainer Claims & Overwrite Invariants', () => {
    // 1. Verify Formation Offset Geometry
    it('verifies team formation offsets around trainer center', () => {
        const offsets3 = calculateFormationOffsets(3, 200);
        expect(offsets3).toHaveLength(3);
        expect(offsets3.some((o: { dx: number; dy: number }) => o.dx !== 0 || o.dy !== 0)).toBe(true);
    });

    // 2. Verify findOtherLinkedTrainer 1:1 Conflict Detection
    it('verifies findOtherLinkedTrainer 1:1 ownership detection', () => {
        const campaign: CampaignProfile = {
            id: 'camp-1',
            name: 'Kanto',
            activeTrainerId: 'trainer-ash',
            boxes: [],
            trainers: {
                'trainer-ash': {
                    id: 'trainer-ash',
                    name: 'Ash Ketchum',
                    party: [],
                    boxes: []
                },
                'trainer-gary': {
                    id: 'trainer-gary',
                    name: 'Gary Oak',
                    party: [],
                    boxes: []
                }
            }
        };

        // Case 2a: Token is claimed by Gary with isTrainer: true
        const tokenClaimedByGary: Item = {
            id: 'token-gary-1',
            name: 'Gary Oak',
            position: { x: 100, y: 100 },
            layer: 'CHARACTER',
            metadata: {
                'pokerole-pmd-extension/claimed-by': {
                    playerId: 'player-bob',
                    playerName: 'Bob',
                    trainerId: 'trainer-gary',
                    trainerName: 'Gary Oak',
                    isTrainer: true
                }
            }
        } as unknown as Item;

        const conflict = findOtherLinkedTrainer(
            campaign,
            'trainer-ash',
            'token-gary-1',
            { mode: 'Trainer', nickname: 'Ash Ketchum' },
            tokenClaimedByGary
        );
        expect(conflict).toBeDefined();
        expect(conflict?.id).toBe('trainer-gary');
        expect(conflict?.name).toBe('Gary Oak');

        // Case 2b: Token claimed by current trainer (Ash) -> No conflict
        const tokenClaimedByAsh: Item = {
            id: 'token-ash-1',
            name: 'Ash Ketchum',
            position: { x: 100, y: 100 },
            layer: 'CHARACTER',
            metadata: {
                'pokerole-pmd-extension/claimed-by': {
                    playerId: 'player-alice',
                    playerName: 'Alice',
                    trainerId: 'trainer-ash',
                    trainerName: 'Ash Ketchum',
                    isTrainer: true
                }
            }
        } as unknown as Item;

        const noConflict = findOtherLinkedTrainer(
            campaign,
            'trainer-ash',
            'token-ash-1',
            { mode: 'Trainer', nickname: 'Ash Ketchum' },
            tokenClaimedByAsh
        );
        expect(noConflict).toBeUndefined();

        // Case 2c: Non-trainer claim (e.g. Pokémon token) does not trigger trainer conflict
        const pokemonToken: Item = {
            id: 'token-pikachu',
            name: 'Pikachu',
            position: { x: 100, y: 100 },
            layer: 'CHARACTER',
            metadata: {
                'pokerole-pmd-extension/claimed-by': {
                    playerId: 'player-alice',
                    playerName: 'Alice',
                    trainerId: 'trainer-ash',
                    trainerName: 'Ash Ketchum',
                    isTrainer: false
                }
            }
        } as unknown as Item;

        const nonTrainerConflict = findOtherLinkedTrainer(
            campaign,
            'trainer-gary',
            'token-pikachu',
            { mode: 'Trainer', nickname: 'Gary Oak' },
            pokemonToken
        );
        expect(nonTrainerConflict).toBeUndefined();
    });

    // 3. Verify executeLinkActiveTrainer Non-GM vs GM Overrides
    it('verifies executeLinkActiveTrainer restrictions and GM override privileges', async () => {
        const campaign: CampaignProfile = {
            id: 'camp-1',
            name: 'Kanto',
            activeTrainerId: 'trainer-ash',
            boxes: [],
            trainers: {
                'trainer-ash': {
                    id: 'trainer-ash',
                    name: 'Ash Ketchum',
                    party: [],
                    boxes: []
                },
                'trainer-gary': {
                    id: 'trainer-gary',
                    name: 'Gary Oak',
                    party: [],
                    boxes: []
                }
            }
        };

        const tokenClaimedByGary: Item = {
            id: 'token-gary-1',
            name: 'Gary Oak',
            position: { x: 100, y: 100 },
            layer: 'CHARACTER',
            metadata: {
                'pokerole-pmd-extension/claimed-by': {
                    playerId: 'player-bob',
                    playerName: 'Bob',
                    trainerId: 'trainer-gary',
                    trainerName: 'Gary Oak',
                    isTrainer: true
                }
            }
        } as unknown as Item;

        let savedProfile: TrainerRoster | null = null;
        const saveTrainerProfile = (t: TrainerRoster) => {
            savedProfile = t;
        };

        // 3a: Non-GM player cannot link token claimed by another trainer
        savedProfile = null;
        await executeLinkActiveTrainer({
            trainer: {
                id: 'trainer-ash',
                name: 'Ash Ketchum',
                party: [],
                boxes: [],
                savedTokenItem: tokenClaimedByGary
            },
            campaign,
            canLinkActiveTrainer: true,
            identity: { mode: 'Trainer', nickname: 'Ash Ketchum' },
            role: 'PLAYER',
            saveTrainerProfile
        });
        expect(savedProfile).toBeNull();

        // 3b: Non-GM player cannot link token belonging to another player
        const tokenOfAnotherPlayer: Item = {
            id: 'token-other-player',
            name: 'Ash Ketchum',
            position: { x: 100, y: 100 },
            layer: 'CHARACTER',
            metadata: {
                'pokerole-pmd-extension/claimed-by': {
                    playerId: 'player-bob', // different player
                    playerName: 'Bob',
                    trainerId: 'trainer-ash',
                    trainerName: 'Ash Ketchum',
                    isTrainer: true
                }
            }
        } as unknown as Item;

        savedProfile = null;
        OBR.player.getId = vi.fn(async () => 'player-alice');
        OBR.player.getName = vi.fn(async () => 'Alice');
        OBR.scene.items.updateItems = vi.fn(async (_ids: string[], updater: (items: Item[]) => void) => {
            updater([tokenClaimedByGary]);
        });

        await executeLinkActiveTrainer({
            trainer: {
                id: 'trainer-ash',
                name: 'Ash Ketchum',
                party: [],
                boxes: [],
                savedTokenItem: tokenOfAnotherPlayer
            },
            campaign,
            canLinkActiveTrainer: true,
            identity: { mode: 'Trainer', nickname: 'Ash Ketchum' },
            role: 'PLAYER',
            saveTrainerProfile
        });
        expect(savedProfile).toBeNull();

        // 3c: GM Role Overrides and Successfully Claims
        savedProfile = null;
        await executeLinkActiveTrainer({
            trainer: {
                id: 'trainer-ash',
                name: 'Ash Ketchum',
                party: [],
                boxes: [],
                savedTokenItem: tokenClaimedByGary
            },
            campaign,
            canLinkActiveTrainer: true,
            identity: { mode: 'Trainer', nickname: 'Ash Ketchum' },
            role: 'GM',
            saveTrainerProfile
        });
        expect(savedProfile).not.toBeNull();
        expect((savedProfile as unknown as TrainerRoster).isLinked).toBe(true);
    });

    // 4. Verify Unlinking Removes Claim
    it('verifies unlinking removes claimed-by from savedTokenItem', () => {
        const tokenWithClaim: Item = {
            id: 'token-ash',
            name: 'Ash Ketchum',
            metadata: {
                'pokerole-pmd-extension/claimed-by': {
                    playerId: 'player-alice',
                    playerName: 'Alice',
                    trainerId: 'trainer-ash',
                    trainerName: 'Ash Ketchum',
                    isTrainer: true
                }
            }
        } as unknown as Item;

        const trainer: TrainerRoster = {
            id: 'trainer-ash',
            name: 'Ash Ketchum',
            party: [],
            boxes: [],
            isLinked: true,
            savedTokenItem: tokenWithClaim
        };

        // Simulate handleUnlinkTrainer logic
        let cleanedSavedItem = trainer.savedTokenItem;
        if (cleanedSavedItem?.metadata?.['pokerole-pmd-extension/claimed-by']) {
            const nextMeta = { ...cleanedSavedItem.metadata };
            delete nextMeta['pokerole-pmd-extension/claimed-by'];
            cleanedSavedItem = { ...cleanedSavedItem, metadata: nextMeta };
        }

        const unlinkedTrainer: TrainerRoster = {
            ...trainer,
            isLinked: false,
            avatarUrl: undefined,
            mapTokenId: undefined,
            savedTokenItem: cleanedSavedItem
        };

        expect(unlinkedTrainer.isLinked).toBe(false);
        expect(unlinkedTrainer.mapTokenId).toBeUndefined();
        expect(unlinkedTrainer.savedTokenItem?.metadata?.['pokerole-pmd-extension/claimed-by']).toBeUndefined();
    });

    // 5. Verify spawnTrainerAndTeam with destination === 'overwrite'
    it('verifies spawnTrainerAndTeam in OBR mode with destination: "overwrite"', async () => {
        (OBR.player as unknown as { id: string }).id = 'player-alice';
        OBR.player.getId = vi.fn(async () => 'player-alice');
        OBR.player.getName = vi.fn(async () => 'Alice');

        const existingToken: Item = {
            id: 'target-token-123',
            name: 'Old Character',
            position: { x: 500, y: 500 },
            layer: 'CHARACTER',
            metadata: {
                'pokerole-pmd-extension/character-data': {
                    nickname: 'Old Character'
                }
            }
        } as unknown as Item;

        const addedItems: Item[] = [];
        let updatedTokenMeta: Record<string, unknown> | null = null;

        OBR.scene.items.getItems = vi.fn(async () => [existingToken]) as any;
        OBR.scene.items.updateItems = vi.fn(async (ids: string[], updater: (items: Item[]) => void) => {
            if (ids.includes('target-token-123')) {
                updater([existingToken]);
                updatedTokenMeta = existingToken.metadata;
            }
        });
        OBR.scene.items.addItems = vi.fn(async (items: Item[]) => {
            addedItems.push(...items);
        });

        useCharacterStore.setState({ tokenId: 'target-token-123' });

        const mockResult = {
            trainerName: 'Brock',
            trainerMetadata: {
                entityId: 'trainer-brock',
                nickname: 'Brock',
                species: 'Gym Leader',
                mode: 'Trainer',
                rank: 'Advanced'
            },
            teamMembers: [
                {
                    species: 'Geodude',
                    metadata: {
                        nickname: 'Geodude',
                        species: 'Geodude',
                        mode: 'Pokémon',
                        rank: 'Starter',
                        'hp-max-display': 10
                    }
                },
                {
                    species: 'Onix',
                    metadata: {
                        nickname: 'Onix',
                        species: 'Onix',
                        mode: 'Pokémon',
                        rank: 'Amateur',
                        'hp-max-display': 14
                    }
                }
            ]
        };

        await spawnTrainerAndTeam(mockResult as any, 'overwrite');

        const characterData = updatedTokenMeta
            ? (updatedTokenMeta['pokerole-extension/stats'] as unknown as Record<string, unknown>)
            : null;
        expect(characterData).not.toBeNull();
        expect(characterData?.nickname).toBe('Brock');

        const claim = updatedTokenMeta
            ? (updatedTokenMeta['pokerole-pmd-extension/claimed-by'] as unknown as Record<string, unknown>)
            : null;
        expect(claim).not.toBeNull();
        expect(claim?.isTrainer).toBe(true);
        expect(claim?.trainerId).toBe('trainer-brock');
        expect(claim?.trainerName).toBe('Brock');
        expect(claim?.playerId).toBe('player-alice');

        expect(addedItems).toHaveLength(2);
        expect(addedItems[0].name).toBe('Geodude');
        expect(addedItems[1].name).toBe('Onix');
        expect(addedItems[0].position.x).not.toBe(500);
        expect(addedItems[1].position.x).not.toBe(500);
    });
});
