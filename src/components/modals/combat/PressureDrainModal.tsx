import React, { useState, useMemo } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Zap, AlertTriangle, XCircle, Check } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { getMaxTargetsForRank } from './targetingModalUtils';
import { adjustCombatantWill } from '../battleOrganizer/battleOrganizerUtils';
import { addRollLogEntry } from '../../../utils/combat/diceRoller';
import { resolveCharacterSide } from '../../../utils/combat/combatantSideUtils';
import type { CombatantRowData, BattleOrganizerState } from '../../../types/battleOrganizerTypes';
import './EntryAbilityModals.css';

export interface PressureDrainModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceCombatant?: CombatantRowData;
    onCombatantUpdated?: (updated: CombatantRowData) => void;
}

interface FoeTargetRow {
    id: string;
    name: string;
    tokenId?: string;
    willCurr: number;
    tempWill: number;
    drain: number;
    newWill: number;
    combatant: CombatantRowData;
}

export const PressureDrainModal: React.FC<PressureDrainModalProps> = ({
    isOpen,
    onClose,
    sourceCombatant,
    onCombatantUpdated
}) => {
    const [isConfirming, setIsConfirming] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [initialized, setInitialized] = useState(false);

    // 1. Identify Source
    const charState = useCharacterStore();
    const sourceName = sourceCombatant?.name || charState.identity.nickname || charState.identity.species || 'Combatant';
    const sourceIcon = sourceCombatant?.image || charState.identity.tokenImageUrl || '';
    const sourceTokenId = sourceCombatant?.tokenId || charState.tokenId || undefined;
    const sourceRank = (sourceCombatant as { rank?: string })?.rank || charState.identity.rank || 'Standard';

    const userIsPlayer = useMemo(() => {
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

    const maxTargets = getMaxTargetsForRank(sourceRank);

    // 2. Load opposing foes from Battle Organizer
    const foes: FoeTargetRow[] = useMemo(() => {
        if (!isOpen || typeof window === 'undefined' || !window.localStorage) return [];

        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (!raw) return [];
            const data = JSON.parse(raw) as BattleOrganizerState;
            const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
            if (!activeRound?.combatants) return [];

            return activeRound.combatants
                .filter((c) => {
                    if (c.isFainted) return false;
                    const onPlayerSide = typeof c.isPlayerSide === 'boolean' ? c.isPlayerSide : !c.isNPC;
                    return onPlayerSide !== userIsPlayer;
                })
                .map((c) => {
                    const willCurr = c.willCurr ?? 0;
                    const tempWill = c.tempWill ?? 0;
                    const drain = Math.ceil(willCurr / 2);
                    const willUpdates = adjustCombatantWill(c, -drain);
                    const newWill = willUpdates.willCurr ?? Math.max(0, willCurr - drain);

                    return {
                        id: c.id,
                        name: c.name || 'Foe',
                        tokenId: c.tokenId,
                        willCurr,
                        tempWill,
                        drain,
                        newWill,
                        combatant: c
                    };
                });
        } catch (e) {
            console.warn('[PressureDrainModal] Failed to read combatants:', e);
            return [];
        }
    }, [isOpen, userIsPlayer]);

    // Pre-select targets up to rank limit on first load
    if (isOpen && !initialized && foes.length > 0) {
        const initialSelected = foes.slice(0, maxTargets).map((f) => f.id);
        setSelectedIds(initialSelected);
        setInitialized(true);
    }

    if (!isOpen) {
        if (initialized) {
            setInitialized(false);
            setIsConfirming(false);
            setSelectedIds([]);
        }
        return null;
    }

    const handleToggle = (foeId: string) => {
        if (isConfirming) setIsConfirming(false);
        if (selectedIds.includes(foeId)) {
            setSelectedIds(selectedIds.filter((id) => id !== foeId));
        } else {
            if (selectedIds.length >= maxTargets) return;
            setSelectedIds([...selectedIds, foeId]);
        }
    };

    const handleConfirmDrain = async () => {
        const targetsToDrain = foes.filter((f) => selectedIds.includes(f.id));
        if (targetsToDrain.length === 0) {
            onClose();
            return;
        }

        try {
            const raw = localStorage.getItem('pkr_battle_organizer_data');
            if (raw) {
                const data = JSON.parse(raw) as BattleOrganizerState;
                const roundIndex = data.activeRoundIndex ?? 0;
                const activeRound = data.rounds?.[roundIndex] || data.rounds?.[0];

                if (activeRound?.combatants) {
                    for (const target of targetsToDrain) {
                        const willUpdates = adjustCombatantWill(target.combatant, -target.drain);
                        const cIdx = activeRound.combatants.findIndex((c) => c.id === target.id);
                        if (cIdx !== -1) {
                            activeRound.combatants[cIdx] = {
                                ...activeRound.combatants[cIdx],
                                ...willUpdates
                            };
                            if (onCombatantUpdated) {
                                onCombatantUpdated(activeRound.combatants[cIdx]);
                            }
                        }

                        // Sync to OBR token if present
                        if (target.tokenId && OBR.isAvailable) {
                            try {
                                await OBR.scene.items.updateItems([target.tokenId], (items) => {
                                    for (const item of items) {
                                        item.metadata['current-will'] = willUpdates.willCurr;
                                        if (willUpdates.tempWill !== undefined) {
                                            item.metadata['temp-will'] = willUpdates.tempWill;
                                        }
                                    }
                                });
                            } catch (obrErr) {
                                console.warn('[PressureDrainModal] Failed to update token metadata:', obrErr);
                            }
                        }
                    }

                    const serialized = JSON.stringify(data);
                    localStorage.setItem('pkr_battle_organizer_data', serialized);
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key: 'pkr_battle_organizer_data',
                            newValue: serialized
                        })
                    );
                    window.dispatchEvent(new CustomEvent('pkr-battle-organizer-update', { detail: data }));
                }
            }

            // Universal Roll Log Notice
            const summaryLines = targetsToDrain
                .map((t) => `• ${t.name}: -${t.drain} Will (${t.willCurr} → ${t.newWill})`)
                .join('\n');

            addRollLogEntry(
                'Pressure (Will Drain)',
                `${sourceName} entered battle and exerted Pressure!\n${summaryLines}`,
                sourceIcon,
                sourceName,
                sourceName,
                sourceTokenId,
                'ability'
            );
        } catch (err) {
            console.error('[PressureDrainModal] Failed to apply will drain:', err);
        }

        onClose();
    };

    return (
        <div className="ability-entry-modal__overlay">
            <div className="ability-entry-modal__content">
                <div className="ability-entry-modal__header">
                    <div className="ability-entry-modal__title-row">
                        <Zap size={18} color="var(--primary)" />
                        <h3 className="text-title-primary" style={{ margin: 0, fontSize: '1.1rem' }}>
                            Pressure — Will Drain
                        </h3>
                    </div>
                    <span className="ability-entry-modal__badge">
                        {sourceRank} Rank: Max {maxTargets} Foe{maxTargets > 1 ? 's' : ''}
                    </span>
                </div>

                <p className="ability-entry-modal__desc">
                    When this Pokémon enters battle, all foes in range spend half (rounded up) of their remaining Will
                    Points.
                </p>

                {foes.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No active opposing foes found in the Battle Organizer.
                    </div>
                ) : (
                    <div className="ability-entry-modal__list">
                        {foes.map((foe) => {
                            const isSelected = selectedIds.includes(foe.id);
                            const isDisabled = !isSelected && selectedIds.length >= maxTargets;

                            return (
                                <div
                                    key={foe.id}
                                    className={`ability-entry-modal__row ${
                                        isSelected ? 'ability-entry-modal__row--selected' : ''
                                    } ${isDisabled ? 'ability-entry-modal__row--disabled' : ''}`}
                                    onClick={() => handleToggle(foe.id)}
                                >
                                    <div className="ability-entry-modal__row-left">
                                        <input
                                            type="checkbox"
                                            className="ability-entry-modal__checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggle(foe.id)}
                                            disabled={isDisabled}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="ability-entry-modal__name">{foe.name}</span>
                                    </div>
                                    <div className="ability-entry-modal__row-right">
                                        <span className="ability-entry-modal__stat-curr">
                                            {foe.willCurr} Will{foe.tempWill > 0 ? ` (+${foe.tempWill} Temp)` : ''}
                                        </span>
                                        <span className="ability-entry-modal__stat-drain">-{foe.drain}</span>
                                        <span>→</span>
                                        <span className="ability-entry-modal__stat-next">{foe.newWill} Will</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Double Confirm Prompt */}
                {isConfirming && (
                    <div className="ability-entry-modal__confirm-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} color="var(--semantic-danger, #ef4444)" />
                            <strong style={{ color: 'var(--semantic-danger, #ef4444)', fontSize: '0.88rem' }}>
                                Confirm Will Drain
                            </strong>
                        </div>
                        <p className="ability-entry-modal__confirm-text">
                            Are you sure you want to drain Will from {selectedIds.length} target(s)? This directly modifies
                            their Will in the combat tracker and broadcasts the event to the roll log.
                        </p>
                    </div>
                )}

                <div className="ability-entry-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onClose}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <XCircle size={14} /> Cancel
                    </button>

                    {isConfirming ? (
                        <button
                            type="button"
                            className="action-button action-button--red"
                            onClick={handleConfirmDrain}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Check size={14} /> Confirm & Drain Will
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            disabled={selectedIds.length === 0}
                            onClick={() => setIsConfirming(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Zap size={14} /> Drain Selected ({selectedIds.length}/{maxTargets})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

