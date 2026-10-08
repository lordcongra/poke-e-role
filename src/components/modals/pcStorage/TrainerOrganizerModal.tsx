import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { TrainerRoster } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
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

interface RoomPlayerItem {
    id: string;
    name: string;
    displayName?: string;
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
    const [roomPlayers, setRoomPlayers] = useState<RoomPlayerItem[]>([]);

    useEffect(() => {
        if (!isOpen || !isGm || !OBR.isAvailable) return;
        let isMounted = true;

        const updateRoomPlayers = async (partyPlayers?: { id: string; name?: string }[]) => {
            try {
                const [myId, myName, party] = await Promise.all([
                    OBR.player.getId(),
                    OBR.player.getName(),
                    partyPlayers ? Promise.resolve(partyPlayers) : OBR.party.getPlayers()
                ]);
                if (!isMounted) return;

                const list: RoomPlayerItem[] = [];
                if (myId) {
                    const cleanName = myName || 'GM';
                    list.push({
                        id: myId,
                        name: cleanName,
                        displayName: `${cleanName} (You)`
                    });
                }
                for (const p of party) {
                    if (p.id !== myId) {
                        list.push({
                            id: p.id,
                            name: p.name || 'Player',
                            displayName: p.name || 'Player'
                        });
                    }
                }
                setRoomPlayers(list);
            } catch (err) {
                console.error('[TrainerOrganizerModal] Failed to fetch room players', err);
            }
        };

        updateRoomPlayers();

        const unsubParty = OBR.party.onChange((players) => {
            if (isMounted) {
                updateRoomPlayers(players);
            }
        });

        const unsubPlayer = OBR.player.onChange(() => {
            if (isMounted) {
                updateRoomPlayers();
            }
        });

        return () => {
            isMounted = false;
            unsubParty();
            unsubPlayer();
        };
    }, [isOpen, isGm]);

    useEffect(() => {
        if (!isOpen) return;
        // INVARIANT: TrainerOrganizerModal is strictly for real Trainer profiles.
        // PMD storage profiles (__pmd_* or profileType === 'storage') are per-player storages and MUST NOT appear here.
        const allIds = Object.keys(trainers).filter(
            (id) => trainers[id] && trainers[id].profileType !== 'storage' && !id.startsWith('__pmd_')
        );
        const existingOrder = (trainerOrder || []).filter((id) => allIds.includes(id));
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
                        if (!t || t.profileType === 'storage' || t.id.startsWith('__pmd_')) return null;
                        const isActive = activeTrainerId === t.id;
                        const partyCount = (t.party || []).filter(Boolean).length;
                        const avatarSrc = t.avatarUrl || getAbsolutePokeballUrl();

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
                                            const img = e.currentTarget as HTMLImageElement;
                                            img.onerror = null;
                                            img.src = getAbsolutePokeballUrl();
                                        }}
                                    />
                                    <div className="trainer-org-info">
                                        <div className="trainer-org-name">
                                            <span className="trainer-org-name-text">{t.name}</span>
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
                                                            {p.displayName || p.name}
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
