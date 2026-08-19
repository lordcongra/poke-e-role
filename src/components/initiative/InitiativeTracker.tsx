import { useEffect, useState } from 'react';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { CombatantCard } from './CombatantCard';
import { AddCombatantModal } from './AddCombatantModal';
import { useOwlbearPopoverResize } from '../../hooks/useOwlbearPopoverResize';
import { useInitiativeEngine } from './useInitiativeEngine';
import { ChevronLeft, ChevronRight, Dices, Plus, Swords } from 'lucide-react';
import './InitiativeTracker.css';

interface InitiativeTrackerProps {
    isStandaloneWidget?: boolean;
}

export function InitiativeTracker({ isStandaloneWidget = false }: InitiativeTrackerProps) {
    const {
        combatants,
        activeTurnId,
        isReady,
        isGM,
        layout,
        shape,
        maxTrackerWidth,
        maxTrackerHeight,
        viewportMaxWidth,
        availableChars,
        availableObrChars,
        fetchAvailableCharacters,
        updateInit,
        removeInit,
        nextTurn,
        prevTurn,
        handleRollAll,
        handleAddStandaloneCombatant,
        handleAddObrCombatant,
        handleDrop
    } = useInitiativeEngine();

    const [showAddMenu, setShowAddMenu] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false); // NEW: Mobile drawer state

    // Fetch characters when the user explicitly opens the add menu
    useEffect(() => {
        if (showAddMenu) {
            fetchAvailableCharacters();
        }
    }, [showAddMenu, fetchAvailableCharacters]);

    // Handle auto-scrolling to the active combatant
    useEffect(() => {
        if (activeTurnId && isReady) {
            // Using requestAnimationFrame instead of a timer so we don't accidentally
            // "debounce" and drop intermediate visual scrolls when you click rapidly!
            requestAnimationFrame(() => {
                const activeCards = document.querySelectorAll(`#combatant-${activeTurnId}`);
                activeCards.forEach((card) => {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
            });
        }
    }, [activeTurnId, isReady]);

    // Bind our custom Resize hook to the DOM
    const ghostRef = useOwlbearPopoverResize({
        isReady,
        isStandaloneMode,
        layout,
        maxTrackerWidth,
        maxTrackerHeight,
        viewportMaxWidth,
        dependencies: [combatants, showAddMenu, shape] // Re-measure if any of these change
    });

    if (!isReady) {
        return (
            <div className="init-tracker-wrapper">
                <div className={`init-tracker init-tracker--${layout}`}>
                    <div className="init-tracker__empty">Connecting...</div>
                </div>
            </div>
        );
    }

    const renderTrackerContent = (isGhost: boolean) => (
        <>
            <div className={`init-tracker__header init-tracker__header--${layout}`}>
                <div className="init-tracker__turn-controls">
                    <div className="init-tracker__btn-group">
                        <button
                            type="button"
                            className="init-tracker__turn-btn"
                            onClick={prevTurn}
                            title="Previous Turn"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button type="button" className="init-tracker__turn-btn" onClick={nextTurn} title="Next Turn">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {(isStandaloneMode || (isGM && !isStandaloneMode)) && (
                        <div className="init-tracker__btn-group">
                            {isStandaloneMode && (
                                <button
                                    type="button"
                                    className="init-tracker__turn-btn"
                                    onClick={handleRollAll}
                                    title="Roll Initiative for All Combatants"
                                >
                                    <Dices size={16} />
                                </button>
                            )}
                            <button
                                type="button"
                                className="init-tracker__turn-btn"
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
                <div className="init-tracker__empty">
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
                                    <ChevronRight size={14} />
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

    if (isStandaloneWidget) {
        return (
            <>
                {/* NEW: Mobile toggle bubble */}
                <button
                    className={`init-tracker__mobile-toggle ${isMobileExpanded ? 'is-active' : ''}`}
                    onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                    title="Toggle Initiative Tracker"
                >
                    <Swords size={20} />
                </button>

                <div
                    className={`init-tracker__standalone-wrapper ${isMobileExpanded ? 'is-mobile-expanded' : ''}`}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                >
                    <div
                        className={`init-tracker init-tracker--${layout} init-tracker__standalone-panel`}
                        style={{ flexDirection: layout === 'horizontal' ? 'row' : 'column' }}
                    >
                        {renderTrackerContent(false)}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div
                ref={ghostRef}
                className={`init-tracker init-tracker--${layout} init-tracker--ghost`}
                aria-hidden="true"
            >
                {renderTrackerContent(true)}
            </div>

            <div className="init-tracker-wrapper">
                <div className={`init-tracker init-tracker--${layout}`}>{renderTrackerContent(false)}</div>
            </div>
        </>
    );
}
