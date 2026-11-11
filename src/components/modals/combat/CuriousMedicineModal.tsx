import React, { useState, useMemo } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { RotateCcw, AlertTriangle, XCircle, Check } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { CombatStat } from '../../../types/enums';
import { getMaxTargetsForRank } from './targetingModalUtils';
import { addRollLogEntry } from '../../../utils/combat/diceRoller';
import { resolveCharacterSide } from '../../../utils/combat/combatantSideUtils';
import { readBattleOrganizerStateRaw } from '@/utils/sync/roomScopedStorage';
import type { CombatantRowData, BattleOrganizerState } from '../../../types/battleOrganizerTypes';
import './EntryAbilityModals.css';

export interface CuriousMedicineModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceCombatant?: CombatantRowData;
}

interface AllyTargetRow {
    id: string;
    name: string;
    tokenId?: string;
    isCurrentCharacter: boolean;
    combatant?: CombatantRowData;
}

export const CuriousMedicineModal: React.FC<CuriousMedicineModalProps> = ({
    isOpen,
    onClose,
    sourceCombatant
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

    // 2. Load allies from Battle Organizer & Active Sheet
    const allies: AllyTargetRow[] = useMemo(() => {
        if (!isOpen) return [];

        const list: AllyTargetRow[] = [];
        const currentId = charState.identity.entityId || charState.tokenId || 'current-char';
        const currentName = charState.identity.nickname || charState.identity.species || 'Active Sheet';

        // Check Battle Organizer active round combatants
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const raw = readBattleOrganizerStateRaw();
                if (raw) {
                    const data = JSON.parse(raw) as BattleOrganizerState;
                    const activeRound = data.rounds?.[data.activeRoundIndex ?? 0] || data.rounds?.[0];
                    if (activeRound?.combatants) {
                        activeRound.combatants.forEach((c) => {
                            if (c.isFainted) return;
                            const onPlayerSide = typeof c.isPlayerSide === 'boolean' ? c.isPlayerSide : !c.isNPC;
                            if (onPlayerSide === userIsPlayer) {
                                const isSelf =
                                    c.id === currentId ||
                                    c.tokenId === charState.tokenId ||
                                    c.name.toLowerCase() === currentName.toLowerCase();
                                list.push({
                                    id: c.id,
                                    name: c.name || 'Ally',
                                    tokenId: c.tokenId,
                                    isCurrentCharacter: isSelf,
                                    combatant: c
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('[CuriousMedicineModal] Failed to read combatants:', e);
            }
        }

        // If current active sheet was not matched in the organizer list, add it
        if (!list.some((a) => a.isCurrentCharacter)) {
            list.unshift({
                id: currentId,
                name: `${currentName} (Active Sheet)`,
                tokenId: charState.tokenId || undefined,
                isCurrentCharacter: true
            });
        }

        return list;
    }, [isOpen, userIsPlayer, charState.identity.entityId, charState.identity.nickname, charState.identity.species, charState.tokenId]);

    // Pre-select allies up to rank limit on open
    if (isOpen && !initialized && allies.length > 0) {
        const initialSelected = allies.slice(0, maxTargets).map((a) => a.id);
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

    const handleToggle = (allyId: string) => {
        if (isConfirming) setIsConfirming(false);
        if (selectedIds.includes(allyId)) {
            setSelectedIds(selectedIds.filter((id) => id !== allyId));
        } else {
            if (selectedIds.length >= maxTargets) return;
            setSelectedIds([...selectedIds, allyId]);
        }
    };

    const handleConfirmReset = async () => {
        const targetsToReset = allies.filter((a) => selectedIds.includes(a.id));
        if (targetsToReset.length === 0) {
            onClose();
            return;
        }

        try {
            for (const target of targetsToReset) {
                // 1. If matches current active character store, reset Zustand state
                if (target.isCurrentCharacter) {
                    const store = useCharacterStore.getState();
                    const stats = [CombatStat.STR, CombatStat.DEX, CombatStat.VIT, CombatStat.SPE, CombatStat.INS];
                    stats.forEach((stat) => {
                        store.setStat(stat, 'buff', 0);
                        store.setStat(stat, 'debuff', 0);
                    });
                    store.setDerived('defBuff', 0);
                    store.setDerived('defDebuff', 0);
                    store.setDerived('sdefBuff', 0);
                    store.setDerived('sdefDebuff', 0);
                }

                // 2. If token linked on OBR scene, zero out all stat and defense metadata
                if (target.tokenId && OBR.isAvailable) {
                    try {
                        await OBR.scene.items.updateItems([target.tokenId], (items) => {
                            for (const item of items) {
                                item.metadata['str-buff'] = 0;
                                item.metadata['str-debuff'] = 0;
                                item.metadata['dex-buff'] = 0;
                                item.metadata['dex-debuff'] = 0;
                                item.metadata['vit-buff'] = 0;
                                item.metadata['vit-debuff'] = 0;
                                item.metadata['spe-buff'] = 0;
                                item.metadata['spe-debuff'] = 0;
                                item.metadata['ins-buff'] = 0;
                                item.metadata['ins-debuff'] = 0;
                                item.metadata['def-buff'] = 0;
                                item.metadata['def-debuff'] = 0;
                                item.metadata['spd-buff'] = 0;
                                item.metadata['spd-debuff'] = 0;
                            }
                        });
                    } catch (obrErr) {
                        console.warn('[CuriousMedicineModal] Failed to reset token metadata:', obrErr);
                    }
                }
            }

            // Universal Roll Log Notice
            const summaryLines = targetsToReset
                .map((t) => `• ${t.name}: All Attribute & Defense Buffs/Debuffs reset to 0`)
                .join('\n');

            addRollLogEntry(
                'Curious Medicine (Buff/Debuff Reset)',
                `${sourceName} entered battle and administered Curious Medicine!\n${summaryLines}`,
                sourceIcon,
                sourceName,
                sourceName,
                sourceTokenId,
                'ability'
            );
        } catch (err) {
            console.error('[CuriousMedicineModal] Failed to reset stat modifiers:', err);
        }

        onClose();
    };

    return (
        <div className="ability-entry-modal__overlay">
            <div className="ability-entry-modal__content">
                <div className="ability-entry-modal__header">
                    <div className="ability-entry-modal__title-row">
                        <RotateCcw size={18} color="var(--primary)" />
                        <h3 className="text-title-primary" style={{ margin: 0, fontSize: '1.1rem' }}>
                            Curious Medicine — Reset Stat Modifiers
                        </h3>
                    </div>
                    <span className="ability-entry-modal__badge">
                        {sourceRank} Rank: Max {maxTargets} All{maxTargets > 1 ? 'ies' : 'y'}
                    </span>
                </div>

                <p className="ability-entry-modal__desc">
                    When this Pokémon enters battle, remove all attribute increases and reductions on all ally Pokémon
                    in range.
                </p>

                {allies.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No allies found in range.
                    </div>
                ) : (
                    <div className="ability-entry-modal__list">
                        {allies.map((ally) => {
                            const isSelected = selectedIds.includes(ally.id);
                            const isDisabled = !isSelected && selectedIds.length >= maxTargets;

                            return (
                                <div
                                    key={ally.id}
                                    className={`ability-entry-modal__row ${
                                        isSelected ? 'ability-entry-modal__row--selected' : ''
                                    } ${isDisabled ? 'ability-entry-modal__row--disabled' : ''}`}
                                    onClick={() => handleToggle(ally.id)}
                                >
                                    <div className="ability-entry-modal__row-left">
                                        <input
                                            type="checkbox"
                                            className="ability-entry-modal__checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggle(ally.id)}
                                            disabled={isDisabled}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="ability-entry-modal__name">{ally.name}</span>
                                    </div>
                                    <div className="ability-entry-modal__row-right">
                                        <span className="ability-entry-modal__stat-next">Reset Modifiers to 0</span>
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
                                Confirm Modifier Reset
                            </strong>
                        </div>
                        <p className="ability-entry-modal__confirm-text">
                            Are you sure you want to reset all stat and defense buffs and debuffs to 0 for {selectedIds.length} ally/allies? This action is destructive and cannot be undone.
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
                            onClick={handleConfirmReset}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Check size={14} /> Confirm & Reset Modifiers
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            disabled={selectedIds.length === 0}
                            onClick={() => setIsConfirming(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <RotateCcw size={14} /> Reset Selected ({selectedIds.length}/{maxTargets})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
