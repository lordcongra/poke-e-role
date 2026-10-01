import React, { useEffect, useState } from 'react';
import OBR, { type Item } from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { METADATA_ID } from '../../../utils/sync/obr';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { resolveSceneCandidateMatch } from '../../../utils/pc/pcCandidateMatching';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PlusCircle, MapPin, Wand2, X, FileText, Check, Archive, Lock } from 'lucide-react';
import './PcDepositDrawerModal.css';

interface SceneTokenCandidate {
    id: string;
    name: string;
    species: string;
    imageUrl: string;
    hp: number;
    maxHp: number;
    will: number;
    maxWill: number;
    type1: string;
    type2?: string;
    rank: string;
    item: Item;
    metadata: Record<string, unknown>;
    claimedBy?: string;
    isInParty?: boolean;
    matchedEntityId?: string;
}

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

    const [sceneCandidates, setSceneCandidates] = useState<SceneTokenCandidate[]>([]);
    const [isLoadingScene, setIsLoadingScene] = useState(false);

    useEffect(() => {
        if (!OBR.isAvailable) return;

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
                const found: SceneTokenCandidate[] = [];

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

    const handleSelectCandidate = async (cand: SceneTokenCandidate) => {
        if (cand.claimedBy) return;
        if (targetSlot?.type === 'party' && cand.isInParty) return;

        const entityId = cand.matchedEntityId || (cand.metadata.entityId as string) || crypto.randomUUID();
        let myPlayerId = '';
        let myPlayerName = '';

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
            tokenImageUrl: cand.imageUrl,
            isOnMap: true,
            mapTokenId: cand.id,
            savedTokenItem: cand.item,
            fullMetadata: {
                ...cand.metadata,
                'pokerole-pmd-extension/claimed-by': {
                    playerId: myPlayerId,
                    playerName: myPlayerName,
                    entityId,
                    trainerName: trainerName
                }
            },
            lastModified: Date.now()
        };
        onDepositSummary(summary);
        onClose();
    };

    const slotTitle = targetSlot
        ? targetSlot.type === 'party'
            ? `Deposit to Party Slot ${targetSlot.index + 1}`
            : `Deposit to Box Slot ${targetSlot.index + 1}`
        : 'Deposit Pokémon to PC';

    return (
        <div
            className="modal-backdrop pc-deposit-modal-backdrop"
            style={
                boxTheme
                    ? ({
                          '--box-theme': boxTheme,
                          '--primary': boxTheme,
                          '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
                          '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
                          '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
                      } as React.CSSProperties)
                    : undefined
            }
            onClick={onClose}
        >
            <div
                className="modal-container pc-deposit-modal"
                style={
                    boxTheme
                        ? ({
                              '--box-theme': boxTheme,
                              '--primary': boxTheme,
                              '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
                              '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
                              '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
                          } as React.CSSProperties)
                        : undefined
                }
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-header pc-deposit-modal__header">
                    <div className="pc-deposit-modal__title-group">
                        <PlusCircle size={20} className="pc-deposit-modal__icon" />
                        <div>
                            <h3 className="modal-title text-title-primary">{slotTitle}</h3>
                            <p className="text-subtext">Choose a Pokémon to store into this slot</p>
                        </div>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <div className="pc-deposit-modal__body">
                    {/* Option 1: Currently Selected Character */}
                    {currentActiveSummary && (
                        <div className="pc-deposit-section">
                            <h4 className="text-label pc-deposit-section__title">
                                <FileText size={14} /> Currently Selected Character
                            </h4>
                            <div className="pc-deposit-card pc-deposit-card--active">
                                <img
                                    src={currentActiveSummary.tokenImageUrl || getAbsolutePokeballUrl()}
                                    alt={currentActiveSummary.name}
                                    className="pc-deposit-card__avatar"
                                />
                                <div className="pc-deposit-card__info">
                                    <span className="pc-deposit-card__name text-label">
                                        {currentActiveSummary.name || currentActiveSummary.species}
                                    </span>
                                    <span className="text-subtext">
                                        {currentActiveSummary.species} • HP {currentActiveSummary.hp}/
                                        {currentActiveSummary.maxHp}
                                    </span>
                                </div>
                                {targetSlot?.type === 'party' && partyEntityIds.has(currentActiveSummary.entityId) ? (
                                    <button
                                        type="button"
                                        className="action-button action-button--dark pc-deposit-btn--disabled"
                                        disabled
                                        title="This Pokémon is already on your belt."
                                    >
                                        <Lock size={14} /> Already on Belt
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="action-button action-button--theme"
                                        onClick={() => {
                                            onDepositSummary(currentActiveSummary);
                                            onClose();
                                        }}
                                    >
                                        <Check size={14} /> {targetSlot?.type === 'party' ? 'Add to Belt' : 'Deposit'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Option 2: Pokémon previously added/assigned to this Trainer or stored in PC */}
                    {trainerPokemonSummaries.filter((p) => !partyEntityIds.has(p.entityId)).length > 0 && (
                        <div className="pc-deposit-section">
                            <h4 className="text-label pc-deposit-section__title">
                                <Archive size={14} /> Stored Pokémon for {trainerName || 'Trainer'} (
                                {trainerPokemonSummaries.filter((p) => !partyEntityIds.has(p.entityId)).length})
                            </h4>
                            <div className="pc-deposit-grid">
                                {trainerPokemonSummaries
                                    .filter((p) => !partyEntityIds.has(p.entityId))
                                    .map((p) => (
                                        <div key={p.entityId} className="pc-deposit-card">
                                            <img
                                                src={p.tokenImageUrl || getAbsolutePokeballUrl()}
                                                alt={p.name}
                                                className="pc-deposit-card__avatar"
                                                onError={(e) => {
                                                    e.currentTarget.src = getAbsolutePokeballUrl();
                                                }}
                                            />
                                            <div className="pc-deposit-card__info">
                                                <span className="pc-deposit-card__name text-label" title={p.name}>
                                                    {p.name || p.species}
                                                </span>
                                                <span className="text-subtext">
                                                    {p.species} • {p.hp}/{p.maxHp} HP
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                className="action-button action-button--theme"
                                                onClick={() => {
                                                    onDepositSummary(p);
                                                    onClose();
                                                }}
                                            >
                                                <Check size={14} />{' '}
                                                {targetSlot?.type === 'party' ? 'Add to Belt' : 'Select'}
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Option 3: Tokens on the Active Map (GM scans entire map; Player scans only selected token) */}
                    {OBR.isAvailable && (
                        <div className="pc-deposit-section">
                            <h4 className="text-label pc-deposit-section__title">
                                <MapPin size={14} />{' '}
                                {isGm ? `Pokémon Tokens on Map (${sceneCandidates.length})` : 'Selected Token on Map'}
                            </h4>

                            {isLoadingScene ? (
                                <p className="text-subtext">Scanning battle map for tokens...</p>
                            ) : sceneCandidates.length === 0 ? (
                                <p className="text-subtext" style={{ fontStyle: 'italic' }}>
                                    {isGm
                                        ? 'No Pokémon tokens detected on the current map.'
                                        : 'No Pokémon token selected on the map. Select your token on the map to deposit it.'}
                                </p>
                            ) : (
                                <div className="pc-deposit-grid">
                                    {sceneCandidates.map((c) => (
                                        <div
                                            key={c.id}
                                            className={`pc-deposit-card ${c.claimedBy ? 'pc-deposit-card--claimed' : ''}`}
                                        >
                                            <img
                                                src={c.imageUrl}
                                                alt={c.name}
                                                className="pc-deposit-card__avatar"
                                                onError={(e) => {
                                                    e.currentTarget.src = getAbsolutePokeballUrl();
                                                }}
                                            />
                                            <div className="pc-deposit-card__info">
                                                <span className="pc-deposit-card__name text-label" title={c.name}>
                                                    {c.name}
                                                </span>
                                                <span className="text-subtext">
                                                    {c.species} • {c.hp}/{c.maxHp} HP
                                                </span>
                                                {c.claimedBy ? (
                                                    <span
                                                        className="pc-deposit-card__claimed-tag text-subtext"
                                                        title={`Claimed by ${c.claimedBy}`}
                                                    >
                                                        <Lock size={10} /> Claimed by {c.claimedBy}
                                                    </span>
                                                ) : c.isInParty ? (
                                                    <span
                                                        className="pc-deposit-card__claimed-tag text-subtext"
                                                        title="Already on your belt"
                                                    >
                                                        <Lock size={10} /> In Party
                                                    </span>
                                                ) : null}
                                            </div>
                                            {c.claimedBy ? (
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark pc-deposit-btn--disabled"
                                                    disabled
                                                    title={`This Pokémon is already claimed by ${c.claimedBy}`}
                                                >
                                                    Claimed
                                                </button>
                                            ) : targetSlot?.type === 'party' && c.isInParty ? (
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark pc-deposit-btn--disabled"
                                                    disabled
                                                    title="This Pokémon is already on your party belt."
                                                >
                                                    <Lock size={12} /> In Party
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark"
                                                    onClick={() => handleSelectCandidate(c)}
                                                >
                                                    {targetSlot?.type === 'party' ? 'Add to Belt' : 'Deposit'}
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Option 3: Generator Quick Link */}
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
