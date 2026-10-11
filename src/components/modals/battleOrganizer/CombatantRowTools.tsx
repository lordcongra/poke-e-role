import React from 'react';
import { Trash2, Shield, Swords, Skull, Lock, FileText } from 'lucide-react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';

export interface CombatantRowToolsProps {
    combatant: CombatantRowData;
    isLocked: boolean;
    hasToken: boolean;
    onToggleFainted: () => void;
    onToggleEvade: () => void;
    onToggleClash: () => void;
    onOpenSheet?: (combatant: CombatantRowData) => void;
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
    onDelete
}) => {
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
        </td>
    );
};
