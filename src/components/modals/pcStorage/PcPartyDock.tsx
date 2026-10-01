import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { PcSlotCard } from './PcSlotCard';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { Shield, UserCheck, Plus, Unlink, FileText, MapPin, FolderPlus, Users } from 'lucide-react';
import './PcPartyDock.css';

interface PcPartyDockProps {
    partySlots: (string | null)[];
    pokemonSummaries: Record<string, PcPokemonSummary>;
    selectedSlot: { type: 'party' | 'box'; index: number } | null;
    trainerName?: string;
    isPmdMode?: boolean;
    trainerAvatarUrl?: string;
    isTrainerLinked?: boolean;
    isTrainerOnMap?: boolean;
    activeCharacterName?: string;
    activeCharacterAvatarUrl?: string;
    canLinkActiveTrainer?: boolean;
    otherLinkedTrainerName?: string;
    onSelectSlot: (index: number) => void;
    onEmptySlotClick?: (index: number) => void;
    onContextMenu: (e: React.MouseEvent, index: number, entityId: string) => void;
    onOpenSheet?: (entityId: string) => void;
    onOpenTrainerSheet?: () => void;
    onDropTrainerToken?: () => void;
    onRelease?: (entityId: string) => void;
    onSendOut: (entityId: string) => void;
    onRecall: (entityId: string) => void;
    onDropOnSlot: (targetIndex: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onLinkActiveTrainer?: () => void;
    onUnlinkTrainer?: () => void;
    onOrganizeFolders?: () => void;
}

export const PcPartyDock: React.FC<PcPartyDockProps> = ({
    partySlots,
    pokemonSummaries,
    selectedSlot,
    trainerName,
    isPmdMode = false,
    trainerAvatarUrl,
    isTrainerLinked = false,
    isTrainerOnMap = false,
    activeCharacterName,
    activeCharacterAvatarUrl,
    canLinkActiveTrainer = true,
    otherLinkedTrainerName,
    onSelectSlot,
    onEmptySlotClick,
    onContextMenu,
    onOpenSheet,
    onOpenTrainerSheet,
    onDropTrainerToken,
    onRelease: _onRelease,
    onSendOut,
    onRecall,
    onDropOnSlot,
    onDragStart,
    onLinkActiveTrainer,
    onUnlinkTrainer,
    onOrganizeFolders
}) => {
    const isPmd = isPmdMode || !trainerName;
    const displayTitle = isPmd ? 'Active Team' : `${trainerName}'s Belt`;
    const occupiedCount = partySlots.filter(Boolean).length;
    const resolvedTrainerAvatar = useResolvedImageUrl(trainerAvatarUrl);
    const resolvedActiveAvatar = useResolvedImageUrl(activeCharacterAvatarUrl);

    return (
        <aside className="pc-party-dock">
            <div className="pc-party-dock__header">
                <div className="pc-party-dock__title-group">
                    {isPmd ? (
                        <Users size={16} className="pc-party-dock__icon" />
                    ) : resolvedTrainerAvatar ? (
                        <img
                            src={resolvedTrainerAvatar}
                            alt={trainerName || 'Trainer'}
                            className="pc-party-dock__trainer-avatar"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <Shield size={16} className="pc-party-dock__icon" />
                    )}
                    <h3 className="pc-party-dock__title text-title-primary" title={displayTitle}>
                        {displayTitle}
                    </h3>
                </div>
                <div className="pc-party-dock__header-actions">
                    <span className="pc-party-dock__badge text-subtext">{occupiedCount} / 6</span>
                    {!OBR.isAvailable && onOrganizeFolders && (
                        <button
                            type="button"
                            className="pc-party-dock__link-trainer-btn action-button action-button--dark"
                            onClick={onOrganizeFolders}
                            title={
                                isPmd
                                    ? 'Auto-organize Active Team and Box folders in the Directory'
                                    : "Auto-organize this Trainer's Belt and Box folders in the Directory"
                            }
                            aria-label="Organize Folders in Directory"
                        >
                            <FolderPlus size={12} />
                            <span>Folders</span>
                        </button>
                    )}
                    {!isPmd &&
                        (isTrainerLinked ? (
                            <>
                                {onOpenTrainerSheet && (
                                    <button
                                        type="button"
                                        className="pc-party-dock__link-trainer-btn action-button action-button--dark"
                                        onClick={onOpenTrainerSheet}
                                        title={`Open ${trainerName}'s Trainer Sheet`}
                                        aria-label={`Open ${trainerName}'s Trainer Sheet`}
                                    >
                                        <FileText size={12} />
                                        <span>Sheet</span>
                                    </button>
                                )}
                                {onDropTrainerToken && OBR.isAvailable && (
                                    <button
                                        type="button"
                                        className={`pc-party-dock__link-trainer-btn action-button action-button--dark ${
                                            isTrainerOnMap ? 'pc-party-dock__link-trainer-btn--disabled' : ''
                                        }`}
                                        onClick={() => {
                                            if (!isTrainerOnMap) {
                                                onDropTrainerToken();
                                            }
                                        }}
                                        disabled={isTrainerOnMap}
                                        title={
                                            isTrainerOnMap
                                                ? `${trainerName} is already on the board`
                                                : `Drop ${trainerName}'s token onto current scene`
                                        }
                                        aria-label={
                                            isTrainerOnMap
                                                ? `${trainerName} is already on the board`
                                                : `Drop ${trainerName}'s token onto current scene`
                                        }
                                    >
                                        <MapPin size={12} />
                                        <span>{isTrainerOnMap ? 'On Map' : 'Drop'}</span>
                                    </button>
                                )}
                                {onUnlinkTrainer && (
                                    <button
                                        type="button"
                                        className="pc-party-dock__link-trainer-btn pc-party-dock__unlink-trainer-btn action-button action-button--dark"
                                        onClick={onUnlinkTrainer}
                                        title={`Unlink "${trainerName}" from this Belt`}
                                        aria-label={`Unlink "${trainerName}" from this Belt`}
                                    >
                                        <Unlink size={12} />
                                        <span>Unlink</span>
                                    </button>
                                )}
                            </>
                        ) : (
                            onLinkActiveTrainer && (
                                <button
                                    type="button"
                                    className={`pc-party-dock__link-trainer-btn action-button action-button--dark ${
                                        !canLinkActiveTrainer ? 'pc-party-dock__link-trainer-btn--disabled' : ''
                                    }`}
                                    onClick={() => {
                                        if (canLinkActiveTrainer) {
                                            onLinkActiveTrainer();
                                        }
                                    }}
                                    disabled={!canLinkActiveTrainer}
                                    title={
                                        otherLinkedTrainerName
                                            ? `Cannot link: This token is already linked to Trainer "${otherLinkedTrainerName}".`
                                            : !canLinkActiveTrainer
                                              ? 'Cannot link: Current token is in Pokémon mode. Only tokens set to Trainer or Trainer (Special) mode can be linked.'
                                              : activeCharacterName
                                                ? `Link "${activeCharacterName}" as Party Trainer`
                                                : "Link active character/token as this Belt's Trainer"
                                    }
                                >
                                    {resolvedActiveAvatar ? (
                                        <img
                                            src={resolvedActiveAvatar}
                                            alt="Active Trainer"
                                            className="pc-party-dock__link-avatar"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <UserCheck size={12} />
                                    )}
                                    <span>Link</span>
                                </button>
                            )
                        ))}
                </div>
            </div>

            <p className="pc-party-dock__hint text-subtext">
                {isPmd
                    ? OBR.isAvailable
                        ? 'Active Pokémon on your expedition team. Click "Send Out" to place them on the map.'
                        : 'Active Pokémon on your expedition team.'
                    : OBR.isAvailable
                      ? 'Active Pokémon on your trainer belt. Click "Send Out" to place them on the map.'
                      : 'Active Pokémon carried on your trainer belt.'}
            </p>

            <div className="pc-party-dock__slots">
                {partySlots.map((entityId, index) => {
                    const summary = entityId ? pokemonSummaries[entityId] : null;
                    const isSelected = selectedSlot?.type === 'party' && selectedSlot?.index === index;

                    if (summary && entityId) {
                        return (
                            <div
                                key={`party-${index}-${entityId}`}
                                className="pc-party-dock__slot-wrapper"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => onDropOnSlot(index)}
                            >
                                <PcSlotCard
                                    summary={summary}
                                    isSelected={isSelected}
                                    isPartySlot={true}
                                    onClick={() => onSelectSlot(index)}
                                    onContextMenu={(e) => onContextMenu(e, index, entityId)}
                                    onOpenSheet={() => onOpenSheet?.(entityId)}
                                    onSendOut={() => onSendOut(entityId)}
                                    onRecall={() => onRecall(entityId)}
                                    onDragStart={(e) => onDragStart(e, index)}
                                />
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`party-empty-${index}`}
                            className={`pc-party-dock__empty-slot ${isSelected ? 'pc-party-dock__empty-slot--selected' : ''}`}
                            onClick={() => {
                                onSelectSlot(index);
                                onEmptySlotClick?.(index);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropOnSlot(index)}
                            title={
                                isPmd
                                    ? `Empty Team Slot ${index + 1} - Click to deposit a Pokémon here`
                                    : `Empty Party Slot ${index + 1} - Click to deposit a Pokémon here`
                            }
                        >
                            {isPmd ? (
                                <div className="pc-party-dock__pmd-empty-icon">
                                    <Users size={20} />
                                </div>
                            ) : (
                                <img
                                    src={getAbsolutePokeballUrl()}
                                    alt="Empty Slot"
                                    className="pc-party-dock__empty-icon"
                                />
                            )}
                            <div className="pc-party-dock__empty-text">
                                <span className="pc-party-dock__empty-label text-subtext">
                                    {isPmd ? `Team Member ${index + 1}` : `Slot ${index + 1}`}
                                </span>
                                <span className="pc-party-dock__empty-subtext text-subtext">
                                    <Plus size={10} style={{ display: 'inline', marginRight: 2 }} />
                                    Click to Deposit
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};
