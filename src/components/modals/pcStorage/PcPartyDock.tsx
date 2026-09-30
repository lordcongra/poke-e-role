import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { PcSlotCard } from './PcSlotCard';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Shield, UserCheck, Plus } from 'lucide-react';
import './PcPartyDock.css';

interface PcPartyDockProps {
    partySlots: (string | null)[];
    pokemonSummaries: Record<string, PcPokemonSummary>;
    selectedSlot: { type: 'party' | 'box'; index: number } | null;
    trainerName: string;
    trainerAvatarUrl?: string;
    activeCharacterName?: string;
    activeCharacterAvatarUrl?: string;
    canLinkActiveTrainer?: boolean;
    onSelectSlot: (index: number) => void;
    onEmptySlotClick?: (index: number) => void;
    onContextMenu: (e: React.MouseEvent, index: number, entityId: string) => void;
    onOpenSheet?: (entityId: string) => void;
    onRelease?: (entityId: string) => void;
    onSendOut: (entityId: string) => void;
    onRecall: (entityId: string) => void;
    onDropOnSlot: (targetIndex: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onLinkActiveTrainer?: () => void;
}

export const PcPartyDock: React.FC<PcPartyDockProps> = ({
    partySlots,
    pokemonSummaries,
    selectedSlot,
    trainerName,
    trainerAvatarUrl,
    activeCharacterName,
    activeCharacterAvatarUrl,
    canLinkActiveTrainer = true,
    onSelectSlot,
    onEmptySlotClick,
    onContextMenu,
    onOpenSheet,
    onRelease: _onRelease,
    onSendOut,
    onRecall,
    onDropOnSlot,
    onDragStart,
    onLinkActiveTrainer
}) => {
    const occupiedCount = partySlots.filter(Boolean).length;

    return (
        <aside className="pc-party-dock">
            <div className="pc-party-dock__header">
                <div className="pc-party-dock__title-group">
                    {trainerAvatarUrl ? (
                        <img
                            src={trainerAvatarUrl}
                            alt={trainerName}
                            className="pc-party-dock__trainer-avatar"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : (
                        <Shield size={16} className="pc-party-dock__icon" />
                    )}
                    <h3 className="pc-party-dock__title text-title-primary" title={trainerName}>
                        {trainerName}&apos;s Belt
                    </h3>
                </div>
                <div className="pc-party-dock__header-actions">
                    <span className="pc-party-dock__badge text-subtext">{occupiedCount} / 6</span>
                    {onLinkActiveTrainer && (
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
                            title={
                                !canLinkActiveTrainer
                                    ? 'Cannot link: Current token is in Pokémon mode. Only tokens set to Trainer or Trainer (Special) mode can be linked.'
                                    : activeCharacterName
                                      ? `Link "${activeCharacterName}" as Party Trainer`
                                      : "Link active character/token as this Belt's Trainer"
                            }
                        >
                            {activeCharacterAvatarUrl ? (
                                <img
                                    src={activeCharacterAvatarUrl}
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
                    )}
                </div>
            </div>

            <p className="pc-party-dock__hint text-subtext">
                Active Pokémon on your trainer belt. Click &quot;Send Out&quot; to place them on the map.
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
                            title={`Empty Party Slot ${index + 1} - Click to deposit a Pokémon here`}
                        >
                            <img
                                src={getAbsolutePokeballUrl()}
                                alt="Empty Slot"
                                className="pc-party-dock__empty-icon"
                            />
                            <div className="pc-party-dock__empty-text">
                                <span className="pc-party-dock__empty-label text-subtext">Slot {index + 1}</span>
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
