import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { TrainerRoster } from '../../../types/pcStorageTypes';
import { Users, X, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Link, Check } from 'lucide-react';
import './TrainerOrganizerModal.css';

interface TrainerOrganizerModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainers: Record<string, TrainerRoster>;
    trainerOrder?: string[];
    activeTrainerId?: string;
    onReorder: (newOrder: string[]) => void;
    onSelectTrainer: (id: string) => void;
    isGm?: boolean;
    onAssignTrainer?: (trainerId: string, playerId?: string, playerName?: string) => void;
}

export const TrainerOrganizerModal: React.FC<TrainerOrganizerModalProps> = ({
    isOpen,
    onClose,
    trainers,
    trainerOrder,
    activeTrainerId,
    onReorder,
    onSelectTrainer,
    isGm,
    onAssignTrainer
}) => {
    const [order, setOrder] = useState<string[]>([]);
    const [roomPlayers, setRoomPlayers] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        if (!isOpen || !isGm || !OBR.isAvailable) return;
        let isMounted = true;
        OBR.party
            .getPlayers()
            .then((players) => {
                if (isMounted) {
                    setRoomPlayers(players.map((p) => ({ id: p.id, name: p.name || 'Player' })));
                }
            })
            .catch(() => {});

        const unsub = OBR.party.onChange((players) => {
            if (isMounted) {
                setRoomPlayers(players.map((p) => ({ id: p.id, name: p.name || 'Player' })));
            }
        });

        return () => {
            isMounted = false;
            unsub();
        };
    }, [isOpen, isGm]);

    useEffect(() => {
        if (!isOpen) return;
        const allIds = Object.keys(trainers);
        const existingOrder = (trainerOrder || []).filter((id) => trainers[id]);
        const remaining = allIds.filter((id) => !existingOrder.includes(id));
        setOrder([...existingOrder, ...remaining]);
    }, [isOpen, trainers, trainerOrder]);

    if (!isOpen) return null;

    const moveTrainer = (index: number, direction: 'up' | 'down' | 'top' | 'bottom') => {
        const newOrder = [...order];
        if (direction === 'up' && index > 0) {
            const targetIndex = index - 1;
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            const targetIndex = index + 1;
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        } else if (direction === 'top' && index > 0) {
            const [removed] = newOrder.splice(index, 1);
            newOrder.unshift(removed);
        } else if (direction === 'bottom' && index < newOrder.length - 1) {
            const [removed] = newOrder.splice(index, 1);
            newOrder.push(removed);
        } else {
            return;
        }
        setOrder(newOrder);
        onReorder(newOrder);
    };

    const handleSelectAndClose = (id: string) => {
        onSelectTrainer(id);
        onClose();
    };

    return (
        <div className="trainer-org-backdrop" onClick={onClose}>
            <div className="trainer-org-modal" onClick={(e) => e.stopPropagation()}>
                <div className="trainer-org-header">
                    <h3 className="trainer-org-title">
                        <Users size={18} color="var(--primary)" /> Organize Trainer Profiles
                    </h3>
                    <button
                        type="button"
                        className="trainer-org-close-btn"
                        onClick={onClose}
                        title="Close Organizer"
                        aria-label="Close Organizer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="trainer-org-description">
                    Reorder trainers in your campaign. The order set here will be reflected across your trainer
                    dropdowns and organizer lists.
                </p>

                <div className="trainer-org-list">
                    {order.map((trainerId, idx) => {
                        const t = trainers[trainerId];
                        if (!t) return null;
                        const isActive = activeTrainerId === t.id;
                        const partyCount = (t.party || []).filter(Boolean).length;
                        const avatarSrc = t.avatarUrl || `${import.meta.env.BASE_URL || '/'}trainer.svg`;

                        return (
                            <div
                                key={t.id}
                                className={`trainer-org-item ${isActive ? 'trainer-org-item--active' : ''}`}
                            >
                                <div className="trainer-org-item-left">
                                    <span className="trainer-org-index">#{idx + 1}</span>
                                    <img
                                        src={avatarSrc}
                                        alt={t.name}
                                        className="trainer-org-avatar"
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src =
                                                `${import.meta.env.BASE_URL || '/'}trainer.svg`;
                                        }}
                                    />
                                    <div className="trainer-org-info">
                                        <div className="trainer-org-name">
                                            {t.name}
                                            {t.profileType === 'storage' && (
                                                <span
                                                    className="trainer-org-badge trainer-org-badge--storage"
                                                    style={{ marginLeft: 6 }}
                                                >
                                                    Storage
                                                </span>
                                            )}
                                        </div>
                                        <div className="trainer-org-subinfo">
                                            <span>{partyCount}/6 Pokémon</span>
                                            {isActive && (
                                                <span className="trainer-org-badge trainer-org-badge--active">
                                                    Active
                                                </span>
                                            )}
                                            {t.isLinked && (
                                                <span
                                                    className="trainer-org-badge trainer-org-badge--linked"
                                                    title="Linked to map token"
                                                >
                                                    <Link size={10} style={{ display: 'inline', marginRight: 2 }} />
                                                    Linked
                                                </span>
                                            )}
                                        </div>
                                        {isGm && onAssignTrainer && (
                                            <div className="trainer-org-assign">
                                                <label className="trainer-org-assign-label" htmlFor={`assign-${t.id}`}>
                                                    Player:
                                                </label>
                                                <select
                                                    id={`assign-${t.id}`}
                                                    className="trainer-org-assign-select"
                                                    value={t.playerId || ''}
                                                    onChange={(e) => {
                                                        const selectedId = e.target.value;
                                                        if (!selectedId) {
                                                            onAssignTrainer(t.id, undefined, undefined);
                                                        } else {
                                                            const p = roomPlayers.find((x) => x.id === selectedId);
                                                            onAssignTrainer(
                                                                t.id,
                                                                selectedId,
                                                                p?.name || t.playerName || 'Player'
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <option value="">Unassigned / Anyone</option>
                                                    {roomPlayers.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                    {t.playerId && !roomPlayers.some((p) => p.id === t.playerId) && (
                                                        <option value={t.playerId}>
                                                            {t.playerName || 'Offline Player'} (Offline)
                                                        </option>
                                                    )}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="trainer-org-actions">
                                    {!isActive && (
                                        <button
                                            type="button"
                                            className="trainer-org-btn"
                                            onClick={() => handleSelectAndClose(t.id)}
                                            title="Switch active trainer to this profile"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="trainer-org-btn"
                                        disabled={idx === 0}
                                        onClick={() => moveTrainer(idx, 'top')}
                                        title="Move to top"
                                    >
                                        <ChevronsUp size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="trainer-org-btn"
                                        disabled={idx === 0}
                                        onClick={() => moveTrainer(idx, 'up')}
                                        title="Move up"
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="trainer-org-btn"
                                        disabled={idx === order.length - 1}
                                        onClick={() => moveTrainer(idx, 'down')}
                                        title="Move down"
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="trainer-org-btn"
                                        disabled={idx === order.length - 1}
                                        onClick={() => moveTrainer(idx, 'bottom')}
                                        title="Move to bottom"
                                    >
                                        <ChevronsDown size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="trainer-org-footer">
                    <button type="button" className="action-button action-button--theme" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
