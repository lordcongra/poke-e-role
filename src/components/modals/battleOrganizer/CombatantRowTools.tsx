import React, { useState } from 'react';
import { Trash2, Shield, Swords, Skull, Lock, FileText, Zap, RotateCcw, Users, Power } from 'lucide-react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import { PressureDrainModal } from '../combat/PressureDrainModal';
import { CuriousMedicineModal } from '../combat/CuriousMedicineModal';
import { AbilityTargetSelectorModal } from '../combat/AbilityTargetSelectorModal';
import { getAbilityTargetStance } from '../../../utils/combat/abilityTargetingUtils';
import { getMaxTargetsForRank } from '../combat/targetingModalUtils';

export interface CombatantRowToolsProps {
    combatant: CombatantRowData;
    isLocked: boolean;
    hasToken: boolean;
    onToggleFainted: () => void;
    onToggleEvade: () => void;
    onToggleClash: () => void;
    onOpenSheet?: (combatant: CombatantRowData) => void;
    onUpdate?: (updated: CombatantRowData) => void;
    onDelete: (id: string) => void;
}

export const CombatantRowTools: React.FC<CombatantRowToolsProps> = ({
    combatant,
    isLocked,
    hasToken,
    onToggleFainted,
    onToggleEvade,
    onToggleClash,
    onOpenSheet,
    onUpdate,
    onDelete
}) => {
    const [showPressureModal, setShowPressureModal] = useState(false);
    const [showMedicineModal, setShowMedicineModal] = useState(false);
    const [showTargetModal, setShowTargetModal] = useState(false);

    const hasPressure = Boolean(combatant.ability?.toLowerCase().includes('pressure'));
    const hasCuriousMedicine = Boolean(combatant.ability?.toLowerCase().includes('curious medicine'));
    const hasTargetableAbility = Boolean(combatant.ability && getAbilityTargetStance(combatant.ability) !== 'none');
    const targetCount = combatant.abilityTargetIds?.length || 0;
    const maxTargets = getMaxTargetsForRank(combatant.rank);

    return (
        <td className="bo-cell bo-cell--tools">
            <div className="bo-tools-group">
                <button
                    type="button"
                    className={`bo-reaction-toggle bo-reaction-toggle--faint ${combatant.isFainted ? 'bo-reaction-toggle--active-faint' : ''}`}
                    onClick={onToggleFainted}
                    title={
                        isLocked
                            ? 'Fainted Status: Locked by GM'
                            : `Fainted Status: ${combatant.isFainted ? 'Fainted (Click to clear)' : 'Active (Click to mark Fainted)'}`
                    }
                    aria-label="Toggle Fainted"
                    disabled={isLocked}
                >
                    <Skull size={12} />
                </button>
                <button
                    type="button"
                    className={`bo-reaction-toggle ${combatant.evadeUsed ? 'bo-reaction-toggle--active' : ''}`}
                    onClick={onToggleEvade}
                    title={
                        isLocked
                            ? 'Evade Reaction: Locked by GM'
                            : `Evade Reaction: ${combatant.evadeUsed ? 'Used' : 'Available'}`
                    }
                    aria-label="Toggle Evade Used"
                    disabled={isLocked}
                >
                    <Shield size={12} />
                </button>
                <button
                    type="button"
                    className={`bo-reaction-toggle ${combatant.clashUsed ? 'bo-reaction-toggle--active' : ''}`}
                    onClick={onToggleClash}
                    title={
                        isLocked
                            ? 'Clash Reaction: Locked by GM'
                            : `Clash Reaction: ${combatant.clashUsed ? 'Used' : 'Available'}`
                    }
                    aria-label="Toggle Clash Used"
                    disabled={isLocked}
                >
                    <Swords size={12} />
                </button>
                {hasPressure && (
                    <button
                        type="button"
                        className="bo-reaction-toggle bo-reaction-toggle--pressure"
                        onClick={() => setShowPressureModal(true)}
                        title={isLocked ? 'Pressure: Locked by GM' : 'Trigger Pressure: Drain opposing Will'}
                        aria-label="Trigger Pressure"
                        disabled={isLocked}
                    >
                        <Zap size={12} />
                    </button>
                )}
                {hasCuriousMedicine && (
                    <button
                        type="button"
                        className="bo-reaction-toggle bo-reaction-toggle--medicine"
                        onClick={() => setShowMedicineModal(true)}
                        title={isLocked ? 'Curious Medicine: Locked by GM' : "Trigger Curious Medicine: Reset allies' buffs/debuffs"}
                        aria-label="Trigger Curious Medicine"
                        disabled={isLocked}
                    >
                        <RotateCcw size={12} />
                    </button>
                )}
                {hasTargetableAbility && (
                    <button
                        type="button"
                        className={`bo-reaction-toggle bo-reaction-toggle--ability-active ${combatant.abilityActive !== false ? 'bo-reaction-toggle--active' : ''}`}
                        onClick={() => onUpdate?.({ ...combatant, abilityActive: combatant.abilityActive === false })}
                        title={
                            isLocked
                                ? 'Ability Active: Locked by GM'
                                : `${combatant.ability}: ${combatant.abilityActive !== false ? 'Active (Click to disable aura)' : 'Inactive (Click to enable aura)'}`
                        }
                        aria-label="Toggle Ability Active"
                        disabled={isLocked}
                    >
                        <Power size={12} />
                    </button>
                )}
                {hasTargetableAbility && (
                    <button
                        type="button"
                        className="bo-reaction-toggle bo-reaction-toggle--targets"
                        onClick={() => setShowTargetModal(true)}
                        title={
                            isLocked
                                ? 'Ability Targets: Locked by GM'
                                : `Configure ${combatant.ability} Targets (${targetCount}/${maxTargets} selected)`
                        }
                        aria-label="Configure Ability Targets"
                        disabled={isLocked}
                    >
                        <Users size={12} />
                    </button>
                )}
                {isLocked ? (
                    <button
                        type="button"
                        className="bo-reaction-toggle bo-sheet-toggle bo-sheet-toggle--locked"
                        disabled
                        title="This sheet is hidden by the GM"
                        aria-label="Sheet locked by GM"
                    >
                        <Lock size={12} />
                    </button>
                ) : (
                    onOpenSheet && (
                        <button
                            type="button"
                            className={`bo-reaction-toggle bo-sheet-toggle ${!hasToken ? 'bo-sheet-toggle--unlinked' : ''}`}
                            onClick={() => onOpenSheet(combatant)}
                            title={
                                hasToken
                                    ? `Open Character Sheet for ${combatant.name || 'combatant'}`
                                    : `No token linked for ${combatant.name || 'combatant'} - click to view instructions`
                            }
                            aria-label={
                                hasToken
                                    ? `Open Character Sheet for ${combatant.name || 'combatant'}`
                                    : `No token linked for ${combatant.name || 'combatant'}`
                            }
                        >
                            <FileText size={12} />
                        </button>
                    )
                )}
                <button
                    type="button"
                    className="bo-delete-row-btn"
                    onClick={() => onDelete(combatant.id)}
                    title={isLocked ? 'Cannot delete GM NPC' : 'Remove combatant from round'}
                    aria-label="Remove combatant"
                    disabled={isLocked}
                >
                    <Trash2 size={12} />
                </button>
            </div>
            {showPressureModal && (
                <PressureDrainModal
                    isOpen={showPressureModal}
                    onClose={() => setShowPressureModal(false)}
                    sourceCombatant={combatant}
                />
            )}
            {showMedicineModal && (
                <CuriousMedicineModal
                    isOpen={showMedicineModal}
                    onClose={() => setShowMedicineModal(false)}
                    sourceCombatant={combatant}
                />
            )}
            {showTargetModal && (
                <AbilityTargetSelectorModal
                    isOpen={showTargetModal}
                    onClose={() => setShowTargetModal(false)}
                    abilityName={combatant.ability || ''}
                    sourceCombatant={combatant}
                    sourceRank={combatant.rank}
                    onSaveTargets={(targetIds) => {
                        onUpdate?.({ ...combatant, abilityTargetIds: targetIds });
                    }}
                />
            )}
        </td>
    );
};
