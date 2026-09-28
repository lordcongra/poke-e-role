import { useEffect, useState } from 'react';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { useOwlbearPopoverResize } from '../../hooks/useOwlbearPopoverResize';
import { useInitiativeEngine } from './useInitiativeEngine';
import { Swords } from 'lucide-react';
import { InitiativeTrackerContent } from './InitiativeTrackerContent';
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

    // Handle auto-scrolling to the active combatant within the list container only
    useEffect(() => {
        if (activeTurnId && isReady) {
            // Using requestAnimationFrame instead of a timer so we don't accidentally
            // "debounce" and drop intermediate visual scrolls when you click rapidly!
            requestAnimationFrame(() => {
                const activeCards = document.querySelectorAll<HTMLElement>(`#combatant-${activeTurnId}`);
                activeCards.forEach((card) => {
                    const listEl = card.closest<HTMLElement>('.init-tracker__list');
                    if (listEl) {
                        if (layout === 'horizontal') {
                            const cardRect = card.getBoundingClientRect();
                            const listRect = listEl.getBoundingClientRect();
                            const relativeLeft = cardRect.left - listRect.left + listEl.scrollLeft;
                            const targetLeft = relativeLeft - listEl.clientWidth / 2 + card.offsetWidth / 2;
                            listEl.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
                        } else {
                            const cardRect = card.getBoundingClientRect();
                            const listRect = listEl.getBoundingClientRect();
                            const relativeTop = cardRect.top - listRect.top + listEl.scrollTop;
                            const targetTop = relativeTop - listEl.clientHeight / 2 + card.offsetHeight / 2;
                            listEl.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
                        }
                    }
                });

                // Guarantee the popover iframe window never scrolls out of position
                if (window.scrollY !== 0 || window.scrollX !== 0) {
                    window.scrollTo(0, 0);
                }
            });
        }
    }, [activeTurnId, isReady, layout]);

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
                    <div className="init-tracker__empty text-subtext">Connecting...</div>
                </div>
            </div>
        );
    }

    const trackerContentProps = {
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
    };

    if (isStandaloneWidget) {
        return (
            <>
                {/* NEW: Mobile toggle bubble */}
                <button
                    className={`action-button init-tracker__mobile-toggle ${isMobileExpanded ? 'action-button--theme is-active' : 'action-button--dark'}`}
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
                        <InitiativeTrackerContent isGhost={false} {...trackerContentProps} />
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
                <InitiativeTrackerContent isGhost={true} {...trackerContentProps} />
            </div>

            <div className="init-tracker-wrapper">
                <div className={`init-tracker init-tracker--${layout}`}>
                    <InitiativeTrackerContent isGhost={false} {...trackerContentProps} />
                </div>
            </div>
        </>
    );
}
