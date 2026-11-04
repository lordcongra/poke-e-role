import { Plus, Zap } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { CombatantRow } from './CombatantRow';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';

export interface CombatantsTableProps {
    combatants: CombatantRowData[];
    endOfRoundEffects: string;
    showCriticalMarks?: boolean;
    showCombatantChips?: boolean;
    onToggleCombatantChips?: () => void;
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
    showCriticalMarks = true,
    showCombatantChips = true,
    onToggleCombatantChips,
    onUpdateCombatant,
    onDeleteCombatant,
    onRollInitiative,
    onOpenSheet,
    onAdjustHp,
    onAdjustWill,
    onAddCombatant,
    onUpdateEndOfRoundEffects
}: CombatantsTableProps) {
    const role = useCharacterStore((state) => state.role);
    const gmOnlyPullEnemies = useCharacterStore((state) => state.identity.gmOnlyPullEnemies);
    const shouldFilterEnemies = role !== 'GM' && gmOnlyPullEnemies !== false;

    const visibleCombatants = shouldFilterEnemies ? combatants.filter((c) => !c.isNPC && !c.hidden) : combatants;

    return (
        <>
            {/* Combatants Table */}
            <div className="bo-table-wrapper">
                <table className="bo-table">
                    <thead>
                        <tr className="bo-table-header text-theme-header">
                            <th className="bo-th bo-th--init">Initiative Order</th>
                            <th className="bo-th bo-th--combatant">
                                <div className="bo-th-combatant-title">
                                    <span>Combatant</span>
                                    {onToggleCombatantChips && (
                                        <button
                                            type="button"
                                            className={`bo-th-chip-toggle ${showCombatantChips ? 'bo-th-chip-toggle--active' : ''}`}
                                            onClick={onToggleCombatantChips}
                                            title={showCombatantChips ? 'Hide Ability & Held Item Badges' : 'Show Ability & Held Item Badges'}
                                            aria-label="Toggle Ability & Held Item Badges"
                                        >
                                            <Zap size={11} />
                                        </button>
                                    )}
                                </div>
                            </th>
                            <th className="bo-th bo-th--item">Held Item</th>
                            <th className="bo-th bo-th--status">Status</th>
                            <th className="bo-th bo-th--actions">Action Counter (1 - 5)</th>
                            <th className="bo-th bo-th--tools">Tools</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleCombatants.map((combatant, cIdx) => (
                            <CombatantRow
                                key={combatant.id}
                                combatant={combatant}
                                index={cIdx}
                                showCriticalMarks={showCriticalMarks}
                                showCombatantChips={showCombatantChips}
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
