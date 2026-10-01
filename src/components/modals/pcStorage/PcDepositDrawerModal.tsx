import React, { useEffect, useState } from 'react';
import OBR, { type Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { METADATA_ID } from '../../../utils/sync/obr';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { resolveSceneCandidateMatch, scanStandaloneCandidates } from '../../../utils/pc/pcCandidateMatching';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { storageAdapter } from '../../../utils/sync/storageAdapter';
import { PcDepositCandidateCard, type SceneCandidate } from './PcDepositCandidateCard';
import { PcDepositStoredCard } from './PcDepositStoredCard';
import { PcDepositActiveCard } from './PcDepositActiveCard';
import { PlusCircle, MapPin, Wand2, X, FileText, Archive } from 'lucide-react';
import './PcDepositDrawerModal.css';

interface PcDepositDrawerModalProps {
    targetSlot?: { type: 'party' | 'box'; index: number };
    currentActiveSummary?: PcPokemonSummary | null;
    trainerName?: string;
    trainerPokemonSummaries?: PcPokemonSummary[];
    pokemonSummaries?: Record<string, PcPokemonSummary>;
    partySlots?: (string | null)[];
    boxTheme?: string;
    onDepositSummary: (summary: PcPokemonSummary) => void;
    onOpenGenerator?: () => void;
    onClose: () => void;
}

export const PcDepositDrawerModal: React.FC<PcDepositDrawerModalProps> = ({
    targetSlot,
    currentActiveSummary,
    trainerName,
    trainerPokemonSummaries = [],
    pokemonSummaries = {},
    partySlots = [],
    boxTheme,
    onDepositSummary,
    onOpenGenerator,
    onClose
}) => {
    const role = useCharacterStore((state) => state.role);
    const isGm = role === 'GM';
    const partyEntityIds = new Set(partySlots.filter(Boolean) as string[]);

    const [sceneCandidates, setSceneCandidates] = useState<SceneCandidate[]>([]);
    const [isLoadingScene, setIsLoadingScene] = useState(false);

    useEffect(() => {
        if (!OBR.isAvailable) {
            setIsLoadingScene(true);
            scanStandaloneCandidates(pokemonSummaries, partySlots)
                .then((candidates) => setSceneCandidates(candidates as SceneCandidate[]))
                .finally(() => setIsLoadingScene(false));
            return;
        }

        const scanScene = async () => {
            setIsLoadingScene(true);
            try {
                let items: Item[] = [];
                if (isGm) {
                    items = await OBR.scene.items.getItems();
                } else {
                    const selection = await OBR.player.getSelection();
                    if (selection && selection.length > 0) {
                        items = await OBR.scene.items.getItems(selection);
                    }
                }

                const myPlayerId = await OBR.player.getId();
                const found: SceneCandidate[] = [];

                for (const item of items) {
                    if (item.attachedTo) continue;
                    const meta = (item.metadata?.[METADATA_ID] as Record<string, unknown>) || {};
                    const mode = (meta.mode as string) || '';
                    if (mode === 'Trainer' || mode === 'Trainer (Special)') continue;

                    const species = (meta.species as string) || (meta.name as string);
                    if (species) {
                        const imgUrl =
                            (meta['token-image-url'] as string) ||
                            ((item as { image?: { url?: string } }).image?.url ?? getAbsolutePokeballUrl());
                        const hpCurr = Number(meta['hp-curr']) || (typeof meta.hp === 'number' ? meta.hp : 10);
                        const hpMax =
                            Number(meta['hp-max-display']) || (typeof meta.hpMax === 'number' ? meta.hpMax : 10);
                        const willCurr = Number(meta['will-curr']) || (typeof meta.will === 'number' ? meta.will : 5);
                        const willMax =
                            Number(meta['will-max-display']) || (typeof meta.willMax === 'number' ? meta.willMax : 5);

                        const { matchedEntityId, isInParty, claimedBy } = resolveSceneCandidateMatch(
                            item,
                            pokemonSummaries,
                            partySlots,
                            myPlayerId
                        );

                        found.push({
                            id: item.id,
                            name: (meta.name as string) || (meta.nickname as string) || item.name || species,
                            species,
                            imageUrl: imgUrl,
                            hp: hpCurr,
                            maxHp: hpMax,
                            will: willCurr,
                            maxWill: willMax,
                            type1: (meta.type1 as string) || 'Normal',
                            type2: meta.type2 as string | undefined,
                            rank: (meta.rank as string) || 'Starter',
                            item,
                            metadata: meta,
                            claimedBy,
                            isInParty,
                            matchedEntityId
                        });
                    }
                }
                setSceneCandidates(found);
            } catch (e) {
                console.error('[PcDepositDrawer] Error scanning scene:', e);
            } finally {
                setIsLoadingScene(false);
            }
        };

        scanScene();
    }, [isGm, partySlots, pokemonSummaries]);

    const handleSelectCandidate = async (cand: SceneCandidate) => {
        if (cand.claimedBy) return;
        if (targetSlot?.type === 'party' && cand.isInParty) return;

        const entityId = cand.matchedEntityId || (cand.metadata.entityId as string) || cand.id || crypto.randomUUID();
        let myPlayerId = '';
        let myPlayerName = '';

        if (!OBR.isAvailable && cand.id) {
            storageAdapter.saveCharacter(cand.id, { entityId }, 'pokerole-pmd-extension/stats').catch(() => {});
        }

        if (OBR.isAvailable) {
            try {
                myPlayerId = await OBR.player.getId();
                myPlayerName = await OBR.player.getName();
                if (cand.id) {
                    await OBR.scene.items.updateItems([cand.id], (items) => {
                        for (const it of items) {
                            it.metadata['pokerole-pmd-extension/claimed-by'] = {
                                playerId: myPlayerId,
                                playerName: myPlayerName,
                                entityId,
                                trainerName: trainerName
                            };
                        }
                    });
                }
            } catch (e) {
                console.warn('[PcDepositDrawer] Error stamping claimed-by on candidate:', e);
            }
        }

        const isObr = OBR.isAvailable;
        const persistentImageUrl =
            (cand.metadata['token-image-url'] as string) ||
            (cand.metadata['tokenImageUrl'] as string) ||
            cand.imageUrl ||
            undefined;

        const summary: PcPokemonSummary = {
            entityId,
            name: cand.name,
            species: cand.species,
            rank: cand.rank,
            type1: cand.type1,
            type2: cand.type2,
            hp: cand.hp,
            maxHp: cand.maxHp,
            will: cand.will,
            maxWill: cand.maxWill,
            tokenImageUrl: persistentImageUrl,
            isOnMap: isObr,
            mapTokenId: isObr ? cand.id : undefined,
            savedTokenItem: cand.item,
            fullMetadata: {
                ...cand.metadata,
                ...(isObr && myPlayerId
                    ? {
                          'pokerole-pmd-extension/claimed-by': {
                              playerId: myPlayerId,
                              playerName: myPlayerName,
                              entityId,
                              trainerName: trainerName
                          }
                      }
                    : {})
            },
            lastModified: Date.now()
        };
        onDepositSummary(summary);
        onClose();
    };

    const isPmd = !trainerName;
    const partyButtonText = isPmd ? 'Add to Team' : 'Add to Belt';

    const slotTitle = targetSlot
        ? targetSlot.type === 'party'
            ? isPmd
                ? `Deposit to Team Slot ${targetSlot.index + 1}`
                : `Deposit to Party Slot ${targetSlot.index + 1}`
            : `Deposit to Box Slot ${targetSlot.index + 1}`
        : 'Deposit Pokémon to PC';

    const modalThemeStyle = boxTheme
        ? ({
              '--box-theme': boxTheme,
              '--primary': boxTheme,
              '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
              '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
              '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
          } as React.CSSProperties)
        : undefined;

    const availableStored = trainerPokemonSummaries.filter((p) => !partyEntityIds.has(p.entityId));

    return (
        <div className="modal-backdrop pc-deposit-modal-backdrop" style={modalThemeStyle} onClick={onClose}>
            <div
                className="modal-container pc-deposit-modal"
                style={modalThemeStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-header pc-deposit-modal__header">
                    <div className="pc-deposit-modal__title-group">
                        <div className="pc-deposit-modal__title-row">
                            <PlusCircle size={18} className="pc-deposit-modal__icon" />
                            <h3 className="modal-title text-title-primary">{slotTitle}</h3>
                        </div>
                        <p className="text-subtext pc-deposit-modal__subtitle">
                            Choose a Pokémon to store into this slot
                        </p>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--ghost pc-deposit-modal__close-btn"
                        onClick={onClose}
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="pc-deposit-modal__body">
                    {/* Option 1: Currently Selected Character */}
                    {currentActiveSummary && (
                        <div className="pc-deposit-section">
                            <h4 className="text-label pc-deposit-section__title">
                                <FileText size={14} /> Currently Selected Character
                            </h4>
                            <PcDepositActiveCard
                                summary={currentActiveSummary}
                                targetSlotType={targetSlot?.type}
                                isAlreadyOnBelt={partyEntityIds.has(currentActiveSummary.entityId)}
                                partyButtonText={partyButtonText}
                                onSelect={() => {
                                    onDepositSummary(currentActiveSummary);
                                    onClose();
                                }}
                            />
                        </div>
                    )}

                    {/* Option 2: Stored Pokémon for Trainer */}
                    {availableStored.length > 0 && (
                        <div className="pc-deposit-section">
                            <h4 className="text-label pc-deposit-section__title">
                                <Archive size={14} />{' '}
                                {trainerName ? `Stored Pokémon for ${trainerName}` : 'Stored Team Members (Assembly)'} (
                                {availableStored.length})
                            </h4>
                            <div className="pc-deposit-grid">
                                {availableStored.map((p) => (
                                    <PcDepositStoredCard
                                        key={p.entityId}
                                        pokemon={p}
                                        targetSlotType={targetSlot?.type}
                                        partyButtonText={partyButtonText}
                                        onSelect={() => {
                                            onDepositSummary(p);
                                            onClose();
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Option 3: Tokens on Map / Saved Characters in Sidebar */}
                    <div className="pc-deposit-section">
                        <h4 className="text-label pc-deposit-section__title">
                            <MapPin size={14} />{' '}
                            {OBR.isAvailable
                                ? isGm
                                    ? `Pokémon Tokens on Map (${sceneCandidates.length})`
                                    : 'Selected Token on Map'
                                : `Saved Characters in Sidebar (${sceneCandidates.length})`}
                        </h4>

                        {isLoadingScene ? (
                            <p className="text-subtext">
                                {OBR.isAvailable
                                    ? 'Scanning battle map for tokens...'
                                    : 'Loading sidebar characters...'}
                            </p>
                        ) : sceneCandidates.length === 0 ? (
                            <p className="text-subtext" style={{ fontStyle: 'italic' }}>
                                {OBR.isAvailable
                                    ? isGm
                                        ? 'No Pokémon tokens detected on the current map.'
                                        : 'No Pokémon token selected on the map. Select your token on the map to deposit it.'
                                    : 'No saved Pokémon found in the sidebar. Create a Pokémon in the sidebar or generator to deposit it.'}
                            </p>
                        ) : (
                            <div className="pc-deposit-grid">
                                {sceneCandidates.map((c) => (
                                    <PcDepositCandidateCard
                                        key={c.id}
                                        candidate={c}
                                        targetSlotType={targetSlot?.type}
                                        partyButtonText={partyButtonText}
                                        onSelect={() => handleSelectCandidate(c)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Option 4: Generator Quick Link */}
                    {onOpenGenerator && (
                        <div className="pc-deposit-section pc-deposit-section--gen">
                            <button
                                type="button"
                                className="action-button action-button--dark pc-deposit-btn--gen"
                                onClick={() => {
                                    onClose();
                                    onOpenGenerator();
                                }}
                            >
                                <Wand2 size={16} color="var(--primary)" /> Roll New Pokémon with Generator
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
