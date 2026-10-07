import React, { useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary, TrainerRoster, CampaignProfile } from '../../../types/pcStorageTypes';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import { useSceneCandidates } from './useSceneCandidates';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { storageAdapter } from '../../../utils/sync/storageAdapter';
import { resolvePokemonOwnership } from '../../../utils/pc/pcDepositOps';
import { findMatchingSceneCandidate } from '../../../utils/pc/pcItemMatching';
import { PcDepositCandidateCard, type SceneCandidate } from './PcDepositCandidateCard';
import { PcDepositStoredCard } from './PcDepositStoredCard';
import { PcDepositActiveCard } from './PcDepositActiveCard';
import { PlusCircle, MapPin, Wand2, X, FileText, Archive } from 'lucide-react';
import './PcDepositDrawerModal.css';

interface PcDepositDrawerModalProps {
    targetSlot?: { type: 'party' | 'box'; index: number };
    currentActiveSummary?: PcPokemonSummary | null;
    trainerName?: string;
    activeTrainerId?: string;
    trainers?: TrainerRoster[];
    campaign?: CampaignProfile;
    allCampaigns?: Record<string, CampaignProfile>;
    trainerPokemonSummaries?: PcPokemonSummary[];
    pokemonSummaries?: Record<string, PcPokemonSummary>;
    partySlots?: (string | null)[];
    boxTheme?: string;
    onDepositSummary: (
        summary: PcPokemonSummary,
        targetSlotOverride?: { type: 'party' | 'box'; index: number }
    ) => void;
    onOpenGenerator?: () => void;
    onClose: () => void;
}

export const PcDepositDrawerModal: React.FC<PcDepositDrawerModalProps> = ({
    targetSlot,
    currentActiveSummary,
    trainerName,
    activeTrainerId,
    trainers,
    campaign,
    allCampaigns,
    trainerPokemonSummaries = [],
    pokemonSummaries = {},
    partySlots = [],
    boxTheme,
    onDepositSummary,
    onOpenGenerator,
    onClose
}) => {
    const storeRole = useCharacterStore((state) => state.role);
    const [currentRole, setCurrentRole] = useState<'PLAYER' | 'GM'>(storeRole || 'PLAYER');
    const [currentMyPlayerId, setCurrentMyPlayerId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (OBR.isAvailable) {
            OBR.player
                .getId()
                .then(setCurrentMyPlayerId)
                .catch(() => {});
            OBR.player
                .getRole()
                .then((r) => setCurrentRole(r || 'PLAYER'))
                .catch(() => {});
        }
    }, []);

    const isGm = currentRole === 'GM';
    const partyEntityIds = new Set(partySlots.filter(Boolean) as string[]);

    const { sceneCandidates, isLoadingScene } = useSceneCandidates({
        isGm,
        currentRole,
        currentMyPlayerId,
        partySlots,
        pokemonSummaries,
        trainerName,
        activeTrainerId,
        trainers,
        campaign,
        allCampaigns
    });

    const handleSelectCandidate = (cand: SceneCandidate) => {
        if (!isGm && isEntityLockedByGm(cand.item, cand.metadata)) {
            if (OBR.isAvailable) {
                OBR.notification.show(
                    'This character is locked by the GM. Ask your GM to unlock it to add it to your party.',
                    'WARNING'
                );
            }
            return;
        }
        if (!isGm && cand.claimedBy) return;
        if (targetSlot?.type === 'party' && cand.isInParty) return;
        if (targetSlot?.type === 'box' && cand.isInBoxes) return;

        const entityId = cand.matchedEntityId || (cand.metadata.entityId as string) || cand.id || crypto.randomUUID();

        if (!OBR.isAvailable && cand.id) {
            storageAdapter.saveCharacter(cand.id, { entityId }, 'pokerole-pmd-extension/stats').catch(() => {});
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
                entityId
            },
            lastModified: Date.now()
        };
        onDepositSummary(summary, targetSlot);
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

    const [liveActiveClaim, setLiveActiveClaim] = useState<string | undefined>(undefined);
    const [liveActiveTokenLocked, setLiveActiveTokenLocked] = useState(false);

    useEffect(() => {
        let isCancelled = false;
        if (OBR.isAvailable && currentActiveSummary?.mapTokenId) {
            OBR.scene.items
                .getItems([currentActiveSummary.mapTokenId])
                .then((items) => {
                    if (isCancelled) return;
                    const item = items[0];
                    if (!item) {
                        setLiveActiveTokenLocked(false);
                        setLiveActiveClaim(undefined);
                        return;
                    }
                    const isLocked = !isGm && (Boolean(item.locked) || isEntityLockedByGm(item));
                    setLiveActiveTokenLocked(isLocked);

                    const claimMeta = item.metadata?.['pokerole-pmd-extension/claimed-by'] as
                        | { playerId?: string; playerName?: string; trainerName?: string; entityId?: string }
                        | undefined;
                    if (claimMeta?.playerId && currentMyPlayerId && claimMeta.playerId !== currentMyPlayerId) {
                        setLiveActiveClaim(
                            claimMeta.trainerName
                                ? `${claimMeta.trainerName}${claimMeta.playerName ? ` (${claimMeta.playerName})` : ''}`
                                : claimMeta.playerName || 'Another Player'
                        );
                    } else {
                        setLiveActiveClaim(undefined);
                    }
                })
                .catch(() => {
                    if (!isCancelled) {
                        setLiveActiveTokenLocked(false);
                        setLiveActiveClaim(undefined);
                    }
                });
        } else {
            setLiveActiveTokenLocked(false);
            setLiveActiveClaim(undefined);
        }

        return () => {
            isCancelled = true;
        };
    }, [isGm, currentActiveSummary?.mapTokenId, currentActiveSummary?.entityId, currentMyPlayerId]);

    const matchingActiveCandidate = findMatchingSceneCandidate(sceneCandidates, currentActiveSummary);
    const activeSceneItemLocked = !isGm && Boolean(matchingActiveCandidate?.item?.locked);
    const isCurrentActiveLocked =
        !isGm && Boolean(activeSceneItemLocked || liveActiveTokenLocked || isEntityLockedByGm(currentActiveSummary));

    const activeOwnership = currentActiveSummary
        ? resolvePokemonOwnership(
              currentActiveSummary.entityId,
              activeTrainerId,
              campaign,
              allCampaigns,
              (currentActiveSummary.fullMetadata?.['pokerole-pmd-extension/claimed-by'] ||
                  matchingActiveCandidate?.metadata?.['pokerole-pmd-extension/claimed-by']) as
                  | { trainerName?: string; playerName?: string; playerId?: string; entityId?: string }
                  | undefined,
              currentActiveSummary,
              currentMyPlayerId,
              currentRole
          )
        : null;

    const effectiveActiveClaimedBy = isCurrentActiveLocked
        ? 'Locked by GM (Ask GM to unlock)'
        : matchingActiveCandidate?.claimedBy || liveActiveClaim || activeOwnership?.claimedBy;

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
                                isAlreadyOnBelt={
                                    activeOwnership?.isInParty ?? partyEntityIds.has(currentActiveSummary.entityId)
                                }
                                isInParty={activeOwnership?.isInParty}
                                isInBoxes={activeOwnership?.isInBoxes}
                                claimedBy={effectiveActiveClaimedBy}
                                partyButtonText={partyButtonText}
                                isGm={isGm}
                                onSelect={() => {
                                    if (!isGm && effectiveActiveClaimedBy) return;
                                    onDepositSummary(currentActiveSummary, targetSlot);
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
                                {availableStored.map((p) => {
                                    const pMatch = findMatchingSceneCandidate(sceneCandidates, p);
                                    const pOwnership = resolvePokemonOwnership(
                                        p.entityId,
                                        activeTrainerId,
                                        campaign,
                                        allCampaigns,
                                        (p.fullMetadata?.['pokerole-pmd-extension/claimed-by'] ||
                                            pMatch?.metadata?.['pokerole-pmd-extension/claimed-by']) as
                                            | {
                                                  trainerName?: string;
                                                  playerName?: string;
                                                  playerId?: string;
                                                  entityId?: string;
                                              }
                                            | undefined,
                                        p,
                                        currentMyPlayerId,
                                        currentRole
                                    );
                                    const pClaimedBy =
                                        !isGm && isEntityLockedByGm(p)
                                            ? 'Locked by GM (Ask GM to unlock)'
                                            : pMatch?.claimedBy || pOwnership?.claimedBy;

                                    return (
                                        <PcDepositStoredCard
                                            key={p.entityId}
                                            pokemon={p}
                                            targetSlotType={targetSlot?.type}
                                            partyButtonText={partyButtonText}
                                            isGm={isGm}
                                            claimedBy={pClaimedBy}
                                            onSelect={() => {
                                                if (!isGm && pClaimedBy) return;
                                                onDepositSummary(p, targetSlot);
                                                onClose();
                                            }}
                                        />
                                    );
                                })}
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
                                        isGm={isGm}
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
