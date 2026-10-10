import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { PcSlotCard } from './PcSlotCard';
import { PcTrainerCard } from './PcTrainerCard';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import {
    Shield,
    Link,
    Plus,
    Unlink,
    FileText,
    MapPin,
    FolderPlus,
    Users,
    Archive,
    HelpCircle,
    Columns,
    Rows
} from 'lucide-react';
import './PcPartyDock.css';

interface PcPartyDockProps {
    partySlots: (string | null)[];
    pokemonSummaries: Record<string, PcPokemonSummary>;
    selectedSlot: { type: 'party' | 'box'; index: number } | null;
    trainerName?: string;
    trainerSummary?: PcPokemonSummary | null;
    isPmdMode?: boolean;
    isStorageProfile?: boolean;
    activeStorageName?: string;
    trainerAvatarUrl?: string;
    isTrainerLinked?: boolean;
    isTrainerOnMap?: boolean;
    activeCharacterName?: string;
    activeCharacterAvatarUrl?: string;
    canLinkActiveTrainer?: boolean;
    otherLinkedTrainerName?: string;
    partyLayout?: 'vertical' | 'horizontal';
    onTogglePartyLayout?: () => void;
    onSelectSlot: (index: number) => void;
    onEmptySlotClick?: (index: number) => void;
    onContextMenu: (e: React.MouseEvent, index: number, entityId: string) => void;
    onOpenSheet?: (entityId: string) => void;
    onOpenTrainerSheet?: () => void;
    onDropTrainerToken?: () => void;
    onRelease?: (entityId: string) => void;
    onSendOut: (entityId: string) => void;
    onRecall: (entityId: string) => void;
    onDropOnSlot: (e: React.DragEvent, targetIndex: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onLinkActiveTrainer?: () => void;
    onUnlinkTrainer?: () => void;
    onOrganizeFolders?: () => void;
}

export const PcPartyDock: React.FC<PcPartyDockProps> = ({
    partySlots,
    pokemonSummaries,
    selectedSlot,
    trainerName,
    trainerSummary,
    isPmdMode = false,
    isStorageProfile = false,
    activeStorageName,
    trainerAvatarUrl,
    isTrainerLinked = false,
    isTrainerOnMap = false,
    activeCharacterName,
    activeCharacterAvatarUrl: _activeCharacterAvatarUrl,
    canLinkActiveTrainer = true,
    otherLinkedTrainerName,
    partyLayout = 'vertical',
    onTogglePartyLayout,
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
    onDragEnd,
    onLinkActiveTrainer,
    onUnlinkTrainer,
    onOrganizeFolders
}) => {
    const isPmd = isPmdMode || isStorageProfile || activeStorageName !== undefined || !trainerName;
    const displayTitle = isPmd ? activeStorageName || 'Active Team' : `${trainerName}'s Belt`;
    const occupiedCount = partySlots.filter(Boolean).length;
    const resolvedTrainerAvatar = useResolvedImageUrl(trainerAvatarUrl);

    const beltHint = isPmd
        ? OBR.isAvailable
            ? 'Active Pokémon on your expedition team. Click "Send Out" to place them on the map.'
            : 'Active Pokémon on your expedition team.'
        : OBR.isAvailable
          ? 'Active Pokémon on your trainer belt. Click "Send Out" to place them on the map.'
          : 'Active Pokémon carried on your trainer belt.';

    return (
        <aside className={`pc-party-dock pc-party-dock--${partyLayout}`}>
            <div className="pc-party-dock__header">
                <div className="pc-party-dock__title-group" title={beltHint}>
                    {isPmd ? (
                        activeStorageName ? (
                            <Archive size={16} className="pc-party-dock__icon" />
                        ) : (
                            <Users size={16} className="pc-party-dock__icon" />
                        )
                    ) : resolvedTrainerAvatar ? (
                        <img
                            src={resolvedTrainerAvatar}
                            alt={trainerName || 'Trainer'}
                            className="pc-party-dock__trainer-avatar"
                            draggable={false}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <Shield size={16} className="pc-party-dock__icon" />
                    )}
                    <h3 className="pc-party-dock__title text-title-primary">{displayTitle}</h3>
                    <span className="pc-party-dock__badge text-subtext">{occupiedCount} / 6</span>
                    <span className="pc-party-dock__hint-icon" aria-label={beltHint}>
                        <HelpCircle size={13} />
                    </span>
                </div>
                <div className="pc-party-dock__header-actions">
                    {onTogglePartyLayout && (
                        <button
                            type="button"
                            className="pc-party-dock__layout-toggle-btn action-button action-button--dark"
                            onClick={onTogglePartyLayout}
                            title={
                                partyLayout === 'horizontal'
                                    ? 'Switch to Vertical Sidebar View (1x6 List)'
                                    : 'Switch to Horizontal Belt View (Top 2x3 Grid)'
                            }
                            aria-label={
                                partyLayout === 'horizontal'
                                    ? 'Switch to Vertical Sidebar View (1x6 List)'
                                    : 'Switch to Horizontal Belt View (Top 2x3 Grid)'
                            }
                        >
                            {partyLayout === 'horizontal' ? <Columns size={12} /> : <Rows size={12} />}
                        </button>
                    )}
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
                            <span>Organize</span>
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
                            <>
                                {onOpenTrainerSheet && (
                                    <button
                                        type="button"
                                        className="pc-party-dock__link-trainer-btn action-button action-button--dark"
                                        onClick={onOpenTrainerSheet}
                                        title={`Open ${trainerName}'s Trainer Sheet (Link or spawn token)`}
                                        aria-label={`Open ${trainerName}'s Trainer Sheet`}
                                    >
                                        <FileText size={12} />
                                        <span>Sheet</span>
                                    </button>
                                )}
                                {onLinkActiveTrainer && (
                                    <button
                                        type="button"
                                        className={`pc-party-dock__link-trainer-btn pc-party-dock__link-active-trainer-btn action-button action-button--dark ${
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
                                                  ? 'Cannot link: No trainer token selected. Select a token on the map set to Trainer or Trainer (Special) mode to link.'
                                                  : activeCharacterName
                                                    ? `Link "${activeCharacterName}" as Party Trainer`
                                                    : "Link active character/token as this Belt's Trainer"
                                        }
                                    >
                                        <Link size={12} />
                                        <span>Link</span>
                                    </button>
                                )}
                            </>
                        ))}
                </div>
            </div>

            {trainerSummary && !isPmd && (
                <PcTrainerCard
                    summary={trainerSummary}
                    isTrainerOnMap={isTrainerOnMap}
                    isTrainerLinked={isTrainerLinked}
                    onOpenSheet={onOpenTrainerSheet}
                    onDropTrainerToken={onDropTrainerToken}
                />
            )}

            <div className="pc-party-dock__slots">
                {partySlots.map((entityId, index) => {
                    const summary = entityId ? pokemonSummaries[entityId] : null;
                    const isSelected = selectedSlot?.type === 'party' && selectedSlot?.index === index;

                    if (summary && entityId) {
                        return (
                            <div
                                key={`party-${index}-${entityId}`}
                                className="pc-party-dock__slot-wrapper"
                                data-slot-type="party"
                                data-slot-index={index}
                                onDragEnter={(e) => e.preventDefault()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => onDropOnSlot(e, index)}
                            >
                                <PcSlotCard
                                    summary={summary}
                                    isSelected={isSelected}
                                    isPartySlot={true}
                                    slotIndex={index}
                                    onClick={() => onSelectSlot(index)}
                                    onContextMenu={(e) => onContextMenu(e, index, entityId)}
                                    onOpenSheet={() => onOpenSheet?.(entityId)}
                                    onSendOut={() => onSendOut(entityId)}
                                    onRecall={() => onRecall(entityId)}
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragEnd={onDragEnd}
                                />
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`party-empty-${index}`}
                            className={`pc-party-dock__empty-slot ${isSelected ? 'pc-party-dock__empty-slot--selected' : ''}`}
                            data-slot-type="party"
                            data-slot-index={index}
                            onClick={() => {
                                if (onEmptySlotClick) {
                                    onEmptySlotClick(index);
                                } else {
                                    onSelectSlot(index);
                                }
                            }}
                            onDragEnter={(e) => e.preventDefault()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => onDropOnSlot(e, index)}
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
                                    draggable={false}
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
