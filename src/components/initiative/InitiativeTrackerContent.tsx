import { ChevronLeft, ChevronRight, Dices, Plus } from 'lucide-react';
import { CombatantCard } from './CombatantCard';
import { AddCombatantModal } from './AddCombatantModal';
import type { Item } from '@owlbear-rodeo/sdk';
import type { Combatant } from '../../utils/combat/initiativeHelpers';
import type { StandaloneCharOption, ObrCharOption } from './AddCombatantModal';

export interface InitiativeTrackerContentProps {
    isGhost: boolean;
    layout: 'vertical' | 'horizontal';
    shape: 'circle' | 'square' | 'none';
    activeTurnId?: string | null;
    combatants: Combatant[];
    isGM: boolean;
    isStandaloneMode: boolean;
    showAddMenu: boolean;
    availableChars: StandaloneCharOption[];
    availableObrChars: ObrCharOption[];
    prevTurn: () => void;
    nextTurn: () => void;
    handleRollAll: () => void;
    setShowAddMenu: (show: boolean) => void;
    updateInit: (id: string, d6Value: number, baseInitiative: number, forceTiebreaker?: number) => void | Promise<void>;
    removeInit: (id: string) => void;
    handleAddStandaloneCombatant: (char: StandaloneCharOption) => void;
    handleAddObrCombatant: (item: Item) => void;
}

export function InitiativeTrackerContent({
    isGhost,
    layout,
    shape,
    activeTurnId,
    combatants,
    isGM,
    isStandaloneMode,
    showAddMenu,
    availableChars,
    availableObrChars,
    prevTurn,
    nextTurn,
    handleRollAll,
    setShowAddMenu,
    updateInit,
    removeInit,
    handleAddStandaloneCombatant,
    handleAddObrCombatant
}: InitiativeTrackerContentProps) {
    return (
        <>
            <div className={`init-tracker__header init-tracker__header--${layout}`}>
                <div className="init-tracker__turn-controls">
                    <div className="init-tracker__btn-group">
                        <button
                            type="button"
                            className="action-button action-button--dark init-tracker__turn-btn"
                            onClick={prevTurn}
                            title="Previous Turn"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark init-tracker__turn-btn"
                            onClick={nextTurn}
                            title="Next Turn"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {(isStandaloneMode || isGM) && (
                        <div className="init-tracker__btn-group">
                            <button
                                type="button"
                                className="action-button action-button--dark init-tracker__turn-btn"
                                onClick={handleRollAll}
                                title="Roll Initiative for All Combatants"
                            >
                                <Dices size={16} />
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark init-tracker__turn-btn"
                                onClick={() => setShowAddMenu(true)}
                                title="Add Combatant"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {combatants.length === 0 ? (
                <div className="init-tracker__empty text-subtext">
                    Waiting for rolls... {isStandaloneMode && '(Drag characters here)'}
                </div>
            ) : (
                <div className={`init-tracker__list init-tracker__list--${layout}`}>
                    {combatants.map((c, index) => (
                        <div
                            id={isGhost ? undefined : `combatant-${c.id}`}
                            className="init-tracker__list-item"
                            key={c.id}
                        >
                            <CombatantCard
                                c={c}
                                shape={shape}
                                isActive={c.id === activeTurnId}
                                updateInit={updateInit}
                                removeInit={removeInit}
                            />
                            {index < combatants.length - 1 && layout === 'horizontal' && (
                                <span className="init-tracker__flow-arrow">
                                    <ChevronRight size={16} />
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showAddMenu && (
                <AddCombatantModal
                    isStandaloneMode={isStandaloneMode}
                    availableStandaloneChars={availableChars}
                    availableObrChars={availableObrChars}
                    onClose={() => setShowAddMenu(false)}
                    onAddStandalone={(char) => {
                        handleAddStandaloneCombatant(char);
                        setShowAddMenu(false);
                    }}
                    onAddObr={(item) => {
                        handleAddObrCombatant(item);
                        setShowAddMenu(false);
                    }}
                />
            )}

            {isGhost && showAddMenu && <div className="init-tracker__ghost-spacer" />}
        </>
    );
}
