import React, { useState, useMemo, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Users, AlertTriangle, Check, RotateCcw, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { getMaxTargetsForRank } from './targetingModalUtils';
import { getAbilityTargetStance, matchesTarget } from '../../../utils/combat/abilityTargetingUtils';
import { resolveCharacterSide } from '../../../utils/combat/combatantSideUtils';
import { STATS_META_ID } from '../../../utils/graphics/graphicsManager';
import type { CombatantRowData, BattleOrganizerState } from '../../../types/battleOrganizerTypes';
import './AbilityTargetSelectorModal.css';

export interface AbilityTargetSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    abilityName: string;
    sourceCombatant?: CombatantRowData;
    sourceRank?: string;
    onSaveTargets?: (targetIds: string[]) => void;
}

export const AbilityTargetSelectorModal: React.FC<AbilityTargetSelectorModalProps> = ({
    isOpen,
    onClose,
    abilityName,
    sourceCombatant,
    sourceRank: propSourceRank,
    onSaveTargets
}) => {
    const charState = useCharacterStore();
    const setIdentity = useCharacterStore((s) => s.setIdentity);

    // Identify Source details
    const sourceName = sourceCombatant?.name || charState.identity.nickname || charState.identity.species || 'Combatant';
    const sourceRank = propSourceRank || sourceCombatant?.rank || charState.identity.rank || 'Standard';
    const sourceId = sourceCombatant?.id || charState.identity.entityId || charState.tokenId || '';
    const sourceTokenId = sourceCombatant?.tokenId || charState.tokenId || undefined;

    const sourceIsPlayer = useMemo(() => {
        if (sourceCombatant) {
            return typeof sourceCombatant.isPlayerSide === 'boolean'
                ? sourceCombatant.isPlayerSide
                : !sourceCombatant.isNPC;
        }
        const resolved = resolveCharacterSide(charState);
        if (resolved === 'player') return true;
        if (resolved === 'foe') return false;
        return !charState.identity.isNPC;
    }, [sourceCombatant, charState]);

    const stance = useMemo(() => getAbilityTargetStance(abilityName), [abilityName]);
    const maxTargets = useMemo(() => getMaxTargetsForRank(sourceRank), [sourceRank]);

    // Initial targets from source
    const initialTargets = useMemo(() => {
        if (sourceCombatant?.abilityTargetIds) {
            return sourceCombatant.abilityTargetIds;
        }
        if (!sourceCombatant && charState.identity.abilityTargetIds) {
            return charState.identity.abilityTargetIds;
        }
        return [];
    }, [sourceCombatant, charState.identity.abilityTargetIds]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [initialized, setInitialized] = useState(false);

    // Load matching round combatants from Battle Organizer storage
    const candidates: CombatantRowData[] = useMemo(() => {
        if (!isOpen || typeof window === 'undefined' || !window.localStorage) return [];

        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (!raw) return [];
            const data = JSON.parse(raw) as BattleOrganizerState;
            const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
            if (!activeRound?.combatants) return [];

            return activeRound.combatants.filter((c) => {
                if (c.isFainted) return false;
                const candidateIsPlayer = typeof c.isPlayerSide === 'boolean' ? c.isPlayerSide : !c.isNPC;

                if (stance === 'foes') {
                    return candidateIsPlayer !== sourceIsPlayer;
                }
                if (stance === 'allies-only') {
                    if (candidateIsPlayer !== sourceIsPlayer) return false;
                    const isSelf = matchesTarget(c, sourceId) || (sourceTokenId && matchesTarget(c, sourceTokenId));
                    return !isSelf;
                }
                if (stance === 'allies-and-self') {
                    return candidateIsPlayer === sourceIsPlayer;
                }
                return false;
            });
        } catch (e) {
            console.warn('[AbilityTargetSelectorModal] Failed to read combatants from storage:', e);
            return [];
        }
    }, [isOpen, sourceIsPlayer, stance, sourceId, sourceTokenId]);

    // Initialize selection when opened
    useEffect(() => {
        if (isOpen && !initialized) {
            setSelectedIds(initialTargets);
            setInitialized(true);
        } else if (!isOpen && initialized) {
            setInitialized(false);
            setSelectedIds([]);
        }
    }, [isOpen, initialized, initialTargets]);

    if (!isOpen || stance === 'none') return null;

    const isTargetSelected = (candidate: CombatantRowData): boolean => {
        return (
            selectedIds.includes(candidate.id) ||
            Boolean(candidate.tokenId && selectedIds.includes(candidate.tokenId)) ||
            Boolean(candidate.entityId && selectedIds.includes(candidate.entityId)) ||
            selectedIds.map((s) => s.toLowerCase()).includes((candidate.name || '').toLowerCase())
        );
    };

    const handleToggleTarget = (candidate: CombatantRowData) => {
        const idToToggle = candidate.id;
        const isSelected = isTargetSelected(candidate);

        if (isSelected) {
            setSelectedIds((prev) =>
                prev.filter(
                    (id) =>
                        id !== candidate.id &&
                        (!candidate.tokenId || id !== candidate.tokenId) &&
                        (!candidate.entityId || id !== candidate.entityId) &&
                        id.toLowerCase() !== (candidate.name || '').toLowerCase()
                )
            );
        } else {
            setSelectedIds((prev) => [...prev, idToToggle]);
        }
    };

    const handleAutoSelect = () => {
        const auto = candidates.slice(0, maxTargets).map((c) => c.id);
        setSelectedIds(auto);
    };

    const handleClear = () => {
        setSelectedIds([]);
    };

    const handleSave = async () => {
        // 1. Call parent callback if provided
        onSaveTargets?.(selectedIds);

        // 2. If configuring for a Battle Organizer combatant, persist to local storage
        if (sourceCombatant) {
            try {
                const raw = localStorage.getItem('pkr_battle_organizer_data');
                if (raw) {
                    const data = JSON.parse(raw) as BattleOrganizerState;
                    const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                    if (activeRound?.combatants) {
                        const targetIndex = activeRound.combatants.findIndex(
                            (c) => c.id === sourceCombatant.id || (sourceCombatant.tokenId && c.tokenId === sourceCombatant.tokenId)
                        );
                        if (targetIndex >= 0) {
                            activeRound.combatants[targetIndex].abilityTargetIds = selectedIds;
                            localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(data));
                        }
                    }
                }
            } catch (e) {
                console.warn('[AbilityTargetSelectorModal] Failed to persist targets to organizer storage:', e);
            }

            // Sync to OBR token metadata if linked
            if (OBR.isAvailable && sourceCombatant.tokenId) {
                try {
                    await OBR.scene.items.updateItems([sourceCombatant.tokenId], (items) => {
                        for (const item of items) {
                            const statsMeta = (item.metadata[STATS_META_ID] || {}) as Record<string, unknown>;
                            statsMeta['ability-target-ids'] = selectedIds.join(',');
                            item.metadata[STATS_META_ID] = statsMeta;
                        }
                    });
                } catch (e) {
                    console.warn('[AbilityTargetSelectorModal] Failed to sync target IDs to OBR item metadata:', e);
                }
            }
        } else {
            // Sheet mode: persist to Zustand identity
            setIdentity('abilityTargetIds', selectedIds);
        }

        onClose();
    };

    const isExceedingLimit = selectedIds.length > maxTargets;

    return (
        <div className="ability-target-modal__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="ability-target-modal__dialog" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="ability-target-modal__header">
                    <div className="ability-target-modal__title-wrap">
                        <Users size={18} className="ability-target-modal__icon" />
                        <div>
                            <h3 className="ability-target-modal__title">{abilityName}: Target Selection</h3>
                            <span className="ability-target-modal__subtitle text-subtext">
                                {sourceName} ({sourceRank} Rank) &bull; Limit: {maxTargets} Targets
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="ability-target-modal__close-btn"
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                {/* Stance Helper Text */}
                <div className="ability-target-modal__description text-subtext">
                    {stance === 'foes' && 'Select opposing foes to affect with this ability in combat.'}
                    {stance === 'allies-and-self' && 'Select allies (and/or self) in range to receive this aura/buff.'}
                    {stance === 'allies-only' && 'Select allies in range to receive this benefit (User excluded).'}
                </div>

                {/* Counter & Warning */}
                <div className="ability-target-modal__counter-bar">
                    <span className={`ability-target-modal__counter ${isExceedingLimit ? 'ability-target-modal__counter--danger' : ''}`}>
                        Selected: <strong>{selectedIds.length}</strong> / {maxTargets} Targets
                    </span>
                    {isExceedingLimit && (
                        <div className="ability-target-modal__warning">
                            <AlertTriangle size={13} />
                            <span>Selection exceeds your rank limit of {maxTargets}!</span>
                        </div>
                    )}
                </div>

                {/* Candidate List */}
                <div className="ability-target-modal__list-container">
                    {candidates.length === 0 ? (
                        <div className="ability-target-modal__empty text-subtext">
                            No eligible active round combatants found for this stance ({stance}).
                        </div>
                    ) : (
                        <div className="ability-target-modal__list">
                            {candidates.map((candidate) => {
                                const selected = isTargetSelected(candidate);
                                const isSelf = matchesTarget(candidate, sourceId) || (sourceTokenId && matchesTarget(candidate, sourceTokenId));
                                const candIsPlayer = typeof candidate.isPlayerSide === 'boolean' ? candidate.isPlayerSide : !candidate.isNPC;

                                return (
                                    <label
                                        key={candidate.id}
                                        className={`ability-target-modal__item ${selected ? 'ability-target-modal__item--selected' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => handleToggleTarget(candidate)}
                                            className="ability-target-modal__checkbox"
                                        />
                                        {candidate.image ? (
                                            <img
                                                src={candidate.image}
                                                alt={candidate.name}
                                                className="ability-target-modal__avatar"
                                            />
                                        ) : (
                                            <div className="ability-target-modal__avatar-placeholder">
                                                {candidate.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="ability-target-modal__info">
                                            <span className="ability-target-modal__name">{candidate.name}</span>
                                            {candidate.species && (
                                                <span className="ability-target-modal__species text-subtext">
                                                    {candidate.species}
                                                </span>
                                            )}
                                        </div>
                                        <div className="ability-target-modal__tags">
                                            {isSelf && (
                                                <span className="ability-target-modal__badge ability-target-modal__badge--self">
                                                    Self
                                                </span>
                                            )}
                                            <span
                                                className={`ability-target-modal__badge ${
                                                    candIsPlayer
                                                        ? 'ability-target-modal__badge--ally'
                                                        : 'ability-target-modal__badge--foe'
                                                }`}
                                            >
                                                {candIsPlayer ? 'Ally' : 'Foe'}
                                            </span>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="ability-target-modal__footer">
                    <div className="ability-target-modal__actions-left">
                        <button
                            type="button"
                            onClick={handleAutoSelect}
                            className="action-button action-button--dark"
                            title={`Auto-select up to ${maxTargets} candidates`}
                            disabled={candidates.length === 0}
                        >
                            Auto-Select ({maxTargets})
                        </button>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="action-button action-button--dark"
                            title="Clear all selections"
                            disabled={selectedIds.length === 0}
                        >
                            <RotateCcw size={12} /> Clear
                        </button>
                    </div>
                    <div className="ability-target-modal__actions-right">
                        <button
                            type="button"
                            onClick={onClose}
                            className="action-button action-button--dark"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="action-button action-button--theme"
                        >
                            <Check size={13} /> Save Targets
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

