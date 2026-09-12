import { Plus } from 'lucide-react';
import { CombatantRow } from './CombatantRow';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';

export interface CombatantsTableProps {
    combatants: CombatantRowData[];
    endOfRoundEffects: string;
    onUpdateCombatant: (updated: CombatantRowData) => void;
    onDeleteCombatant: (id: string) => void;
    onRollInitiative: (id: string) => void;
    onOpenSheet: (combatant: CombatantRowData) => void;
    onAdjustHp: (combatantId: string, delta: number) => void;
    onAdjustWill: (combatantId: string, delta: number) => void;
    onAddCombatant: () => void;
    onUpdateEndOfRoundEffects: (text: string) => void;
}

export function CombatantsTable({
    combatants,
    endOfRoundEffects,
    onUpdateCombatant,
    onDeleteCombatant,
    onRollInitiative,
    onOpenSheet,
    onAdjustHp,
    onAdjustWill,
    onAddCombatant,
    onUpdateEndOfRoundEffects
}: CombatantsTableProps) {
    return (
        <>
            {/* Combatants Table */}
            <div className="bo-table-wrapper">
                <table className="bo-table">
                    <thead>
                        <tr className="bo-table-header text-theme-header">
                            <th className="bo-th bo-th--init">Initiative Order</th>
                            <th className="bo-th bo-th--combatant">Combatant</th>
                            <th className="bo-th bo-th--item">Held Item</th>
                            <th className="bo-th bo-th--status">Status</th>
                            <th className="bo-th bo-th--actions">Action Counter (1 - 5)</th>
                            <th className="bo-th bo-th--tools">Tools</th>
                        </tr>
                    </thead>
                    <tbody>
                        {combatants.map((combatant, cIdx) => (
                            <CombatantRow
                                key={combatant.id}
                                combatant={combatant}
                                index={cIdx}
                                onUpdate={onUpdateCombatant}
                                onDelete={onDeleteCombatant}
                                onRollInitiative={onRollInitiative}
                                onOpenSheet={onOpenSheet}
                                onAdjustHp={onAdjustHp}
                                onAdjustWill={onAdjustWill}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Combatant Button */}
            <div className="bo-add-combatant-row">
                <button
                    type="button"
                    className="action-button action-button--secondary bo-add-combatant-btn"
                    onClick={onAddCombatant}
                >
                    <Plus size={16} /> Add Combatant Row
                </button>
            </div>

            {/* End of the Round Effects */}
            <div className="bo-end-effects-row">
                <label className="bo-field-label text-label">End of the Round Effects:</label>
                <input
                    type="text"
                    className="bo-input bo-input--underline text-label"
                    value={endOfRoundEffects}
                    onChange={(e) => onUpdateEndOfRoundEffects(e.target.value)}
                    placeholder="e.g. Sandstorm damage, Leftovers recovery, Burn ticks, Speed Boost activation"
                />
            </div>
        </>
    );
}
