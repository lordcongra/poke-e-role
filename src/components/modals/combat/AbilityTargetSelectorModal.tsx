import React, { useState, useMemo, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Users, AlertTriangle, Check, RotateCcw, XCircle, Archive } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { getMaxTargetsForRank } from './targetingModalUtils';
import { getAbilityTargetStance, matchesTarget, isCombatantInPc, isTargetCombatantActiveNeutralizingGas } from '../../../utils/combat/abilityTargetingUtils';
import { resolveCharacterSide } from '../../../utils/combat/combatantSideUtils';
import { STATS_META_ID } from '../../../utils/graphics/graphicsManager';
import type { CombatantRowData, BattleOrganizerState } from '../../../types/battleOrganizerTypes';
import type { CharacterState } from '../../../store/storeTypes';
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
    const pcData = useCharacterStore((s) => s.pcData);
    const charIdentity = useCharacterStore((s) => s.identity);
    const charTokenId = useCharacterStore((s) => s.tokenId);
    const setIdentity = useCharacterStore((s) => s.setIdentity);

    // Identify Source details
    const sourceName = sourceCombatant?.name || charIdentity.nickname || charIdentity.species || 'Combatant';
    const sourceRank = propSourceRank || sourceCombatant?.rank || charIdentity.rank || 'Standard';
    const sourceId = sourceCombatant?.id || charIdentity.entityId || charTokenId || '';
    const sourceTokenId = sourceCombatant?.tokenId || charTokenId || undefined;

    const sourceIsPlayer = useMemo(() => {
        if (sourceCombatant) {
            return typeof sourceCombatant.isPlayerSide === 'boolean'
                ? sourceCombatant.isPlayerSide
                : !sourceCombatant.isNPC;
        }
        const resolved = resolveCharacterSide({ identity: charIdentity, tokenId: charTokenId } as CharacterState);
        if (resolved === 'player') return true;
        if (resolved === 'foe') return false;
        return !charIdentity.isNPC;
    }, [sourceCombatant, charIdentity, charTokenId]);

    const stance = useMemo(() => getAbilityTargetStance(abilityName), [abilityName]);
    const maxTargets = useMemo(() => getMaxTargetsForRank(sourceRank), [sourceRank]);
    const isNeutralizingGas = useMemo(() => {
        return abilityName.replace(/\s*\(HA\)$/i, '').trim().toLowerCase() === 'neutralizing gas';
    }, [abilityName]);

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

    const isCandidateImmune = (candidate: CombatantRowData): boolean => {
        if (!isNeutralizingGas) return false;
        const candId = candidate.tokenId || candidate.entityId || candidate.id || candidate.name;
        return isTargetCombatantActiveNeutralizingGas(candId, candidates);
    };

    const rawTargetIds = sourceCombatant
        ? sourceCombatant.abilityTargetIds
        : charIdentity.abilityTargetIds;

    // Initial targets from source: if unconfigured (undefined), default to eligible aura targets so they can be unchecked
    const initialTargets = useMemo(() => {
        if (rawTargetIds !== undefined) {
            return rawTargetIds.filter((id) => {
                const matched = candidates.find((c) => matchesTarget(c, id));
                return !matched || (!isCombatantInPc(matched, pcData) && !isCandidateImmune(matched));
            });
        }
        return candidates
            .filter((c) => !isCombatantInPc(c, pcData) && !isCandidateImmune(c))
            .slice(0, maxTargets)
            .map((c) => c.tokenId || c.entityId || c.name || c.id);
    }, [rawTargetIds, candidates, maxTargets, pcData, isNeutralizingGas]);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [initialized, setInitialized] = useState(false);

    // Initialize selection when opened, pruning ghost targets that no longer exist or are in PC / immune
    useEffect(() => {
        if (isOpen && !initialized) {
            const validTargets = (initialTargets || []).filter((id) =>
                candidates.some((c) => matchesTarget(c, id) && !isCombatantInPc(c, pcData) && !isCandidateImmune(c))
            );
            setSelectedIds(validTargets);
            setInitialized(true);

            // If rawTargetIds contained targets that are now in the PC, immediately commit validTargets
            if (rawTargetIds !== undefined && validTargets.length !== rawTargetIds.length) {
                onSaveTargets?.(validTargets);
                if (
                    !sourceCombatant ||
                    (sourceCombatant.tokenId && sourceCombatant.tokenId === charTokenId) ||
                    (sourceCombatant.entityId && sourceCombatant.entityId === charIdentity.entityId)
                ) {
                    setIdentity('abilityTargetIds', validTargets);
                }

                const targetTokenId = sourceCombatant?.tokenId || sourceTokenId || charTokenId;
                if (OBR.isAvailable && targetTokenId) {
                    OBR.scene.items
                        .updateItems([targetTokenId], (items) => {
                            for (const item of items) {
                                const statsMeta = (item.metadata[STATS_META_ID] || {}) as Record<string, unknown>;
                                statsMeta['ability-target-ids'] = validTargets.join(',');
                                item.metadata[STATS_META_ID] = statsMeta;
                            }
                        })
                        .catch((e) => {
                            console.warn('[AbilityTargetSelectorModal] Failed to sync auto-cleaned targets to OBR:', e);
                        });
                }

                try {
                    const raw = localStorage.getItem('pkr_battle_organizer_data');
                    if (raw) {
                        const data = JSON.parse(raw) as BattleOrganizerState;
                        const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                        if (activeRound?.combatants) {
                            let boChanged = false;
                            activeRound.combatants.forEach((c) => {
                                const matches = sourceCombatant
                                    ? c.id === sourceCombatant.id ||
                                      (sourceCombatant.tokenId && c.tokenId === sourceCombatant.tokenId) ||
                                      (sourceCombatant.entityId && c.entityId === sourceCombatant.entityId)
                                    : (sourceTokenId && c.tokenId === sourceTokenId) ||
                                      (sourceId && (c.id === sourceId || c.entityId === sourceId)) ||
                                      (sourceName && c.name?.trim().toLowerCase() === sourceName.trim().toLowerCase());

                                if (matches) {
                                    c.abilityTargetIds = validTargets;
                                    boChanged = true;
                                }
                            });
                            if (boChanged) {
                                localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(data));
                                if (OBR.isAvailable) {
                                    OBR.broadcast
                                        .sendMessage('pokerole-pmd-extension/battle-organizer-sync', data, { destination: 'REMOTE' })
                                        .catch(() => {});
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[AbilityTargetSelectorModal] Failed to persist auto-cleaned targets to organizer:', e);
                }
            }
        } else if (!isOpen && initialized) {
            setInitialized(false);
            setSelectedIds([]);
        }
    }, [
        isOpen,
        initialized,
        initialTargets,
        rawTargetIds,
        candidates,
        pcData,
        sourceCombatant,
        sourceTokenId,
        charTokenId,
        charIdentity,
        sourceId,
        sourceName,
        setIdentity,
        onSaveTargets
    ]);

    if (!isOpen || stance === 'none') return null;

    const isTargetSelected = (candidate: CombatantRowData): boolean => {
        return matchesTarget(candidate, selectedIds);
    };

    const handleToggleTarget = (candidate: CombatantRowData) => {
        if (isCombatantInPc(candidate, pcData) || isCandidateImmune(candidate)) return;
        const idToToggle = candidate.tokenId || candidate.entityId || candidate.name || candidate.id;
        const isSelected = isTargetSelected(candidate);

        if (isSelected) {
            setSelectedIds((prev) => prev.filter((id) => !matchesTarget(candidate, id)));
        } else {
            setSelectedIds((prev) => [...prev, idToToggle]);
        }
    };

    const handleAutoSelect = () => {
        const auto = candidates
            .filter((c) => !isCombatantInPc(c, pcData) && !isCandidateImmune(c))
            .slice(0, maxTargets)
            .map((c) => c.tokenId || c.entityId || c.name || c.id);
        setSelectedIds(auto);
    };

    const handleClear = () => {
        setSelectedIds([]);
    };

    const handleSave = async () => {
        // 1. Call parent callback if provided
        onSaveTargets?.(selectedIds);

        // 2. Persist to Battle Organizer local storage regardless of whether sourceCombatant is passed
        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                if (activeRound?.combatants) {
                    let boChanged = false;
                    activeRound.combatants.forEach((c) => {
                        const matches = sourceCombatant
                            ? c.id === sourceCombatant.id ||
                              (sourceCombatant.tokenId && c.tokenId === sourceCombatant.tokenId) ||
                              (sourceCombatant.entityId && c.entityId === sourceCombatant.entityId)
                            : (sourceTokenId && c.tokenId === sourceTokenId) ||
                              (sourceId && (c.id === sourceId || c.entityId === sourceId)) ||
                              (sourceName && c.name?.trim().toLowerCase() === sourceName.trim().toLowerCase());

                        if (matches) {
                            c.abilityTargetIds = selectedIds;
                            boChanged = true;
                        }
                    });

                    if (boChanged) {
                        localStorage.setItem('pkr_battle_organizer_data', JSON.stringify(data));
                        if (OBR.isAvailable) {
                            OBR.broadcast
                                .sendMessage('pokerole-pmd-extension/battle-organizer-sync', data, { destination: 'REMOTE' })
                                .catch(() => {});
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[AbilityTargetSelectorModal] Failed to persist targets to organizer storage:', e);
        }

        // 3. Persist to OBR token metadata regardless of whether sourceCombatant is passed
        const targetTokenId = sourceCombatant?.tokenId || sourceTokenId || charTokenId;
        if (OBR.isAvailable && targetTokenId) {
            try {
                await OBR.scene.items.updateItems([targetTokenId], (items) => {
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

        // 4. Update Zustand identity if active sheet
        if (
            !sourceCombatant ||
            (sourceCombatant.tokenId && sourceCombatant.tokenId === charTokenId) ||
            (sourceCombatant.entityId && sourceCombatant.entityId === charIdentity.entityId)
        ) {
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
                                const isInPc = isCombatantInPc(candidate, pcData);
                                const isImmune = isCandidateImmune(candidate);
                                const isDisabled = isInPc || isImmune;
                                const selected = isTargetSelected(candidate);
                                const isSelf = matchesTarget(candidate, sourceId) || (sourceTokenId && matchesTarget(candidate, sourceTokenId));
                                const candIsPlayer = typeof candidate.isPlayerSide === 'boolean' ? candidate.isPlayerSide : !candidate.isNPC;

                                return (
                                    <label
                                        key={candidate.id}
                                        className={`ability-target-modal__item ${selected && !isDisabled ? 'ability-target-modal__item--selected' : ''} ${
                                            isInPc ? 'ability-target-modal__item--in-pc' : ''
                                        } ${isImmune ? 'ability-target-modal__item--immune' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected && !isDisabled}
                                            disabled={isDisabled}
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
                                            {isInPc ? (
                                                <span className="ability-target-modal__pc-status text-subtext">
                                                    Currently in the PC
                                                </span>
                                            ) : isImmune ? (
                                                <span className="ability-target-modal__immune-status text-subtext">
                                                    Immune (Neutralizing Gas)
                                                </span>
                                            ) : (
                                                candidate.species && (
                                                    <span className="ability-target-modal__species text-subtext">
                                                        {candidate.species}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                        <div className="ability-target-modal__tags">
                                            {isInPc && (
                                                <span className="ability-target-modal__badge ability-target-modal__badge--pc">
                                                    <Archive size={11} /> In PC
                                                </span>
                                            )}
                                            {isImmune && (
                                                <span className="ability-target-modal__badge ability-target-modal__badge--immune">
                                                    (Immune)
                                                </span>
                                            )}
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

