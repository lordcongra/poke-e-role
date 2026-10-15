import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    getFieldEffectInfo,
    FieldEffectIcon,
    getAllActiveFieldEffects,
    type FieldEffectInfo
} from '../../utils/combat/fieldEffectsData';
import { InitiativeFieldEffectsModal } from './InitiativeFieldEffectsModal';
import './InitiativeFieldEffectsBar.css';

interface ActiveConditionItem {
    id: string;
    info: FieldEffectInfo;
    remainingRounds: number;
    subLabel?: string;
}

interface TooltipPosition {
    id: string;
    x: number;
    y: number;
    width: number;
}

export interface InitiativeFieldEffectsBarProps {
    layout?: 'vertical' | 'horizontal';
    isGM?: boolean;
    isStandaloneMode?: boolean;
    isGhost?: boolean;
}

// Module-level synchronized expand state across visible and ghost tracker instances
let sharedIsExpanded = false;
const listeners = new Set<() => void>();

function getSharedExpanded() {
    return sharedIsExpanded;
}

function setSharedExpanded(expanded: boolean) {
    if (sharedIsExpanded !== expanded) {
        sharedIsExpanded = expanded;
        listeners.forEach((listener) => listener());
    }
}

function subscribeExpanded(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function InitiativeFieldEffectsBar({
    layout = 'vertical',
    isGM,
    isStandaloneMode: isStandaloneProp,
    isGhost = false
}: InitiativeFieldEffectsBarProps) {
    const activeBattlefield = useCharacterStore((state) => state.activeBattlefield);
    const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    const isExpanded = useSyncExternalStore(subscribeExpanded, getSharedExpanded);

    // Dismiss tooltip on outside click
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            const targetNode = e.target as Node;
            const isInsideBar = barRef.current && barRef.current.contains(targetNode);
            const isInsideTooltip = document.querySelector('.init-field-tooltip')?.contains(targetNode);
            if (!isInsideBar && !isInsideTooltip) {
                setTooltipPos(null);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
        };
    }, []);

    const allActive = getAllActiveFieldEffects(activeBattlefield);
    const items: ActiveConditionItem[] = allActive.map((item) => ({
        id: item.id,
        info: getFieldEffectInfo(item.name, item.category),
        remainingRounds: item.remainingRounds,
        subLabel: item.subLabel
    }));

    const threshold = layout === 'vertical' ? 3 : 2;
    const hasToggle = items.length > threshold;
    const maxCollapsedChips = layout === 'vertical' ? 2 : 1;
    const visibleItems = hasToggle && !isExpanded ? items.slice(0, maxCollapsedChips) : items;
    const hiddenCount = items.length - maxCollapsedChips;

    // Reset expand state if conditions drop below threshold or layout changes
    useEffect(() => {
        if (!isGhost && !hasToggle && sharedIsExpanded) {
            setSharedExpanded(false);
        }
    }, [hasToggle, isGhost]);

    useEffect(() => {
        if (!isGhost) {
            setSharedExpanded(false);
        }
    }, [layout, isGhost]);

    if (!activeBattlefield || items.length === 0) return null;

    if (isGhost) {
        return (
            <div className={`init-field-bar init-field-bar--${layout}`} aria-hidden="true">
                {visibleItems.map((item) => (
                    <div key={item.id} className="init-field-chip-wrap">
                        <div
                            className="init-field-chip"
                            style={{
                                borderColor: item.info.color,
                                background: `color-mix(in srgb, ${item.info.color} 18%, var(--panel-bg))`
                            }}
                        >
                            <span className="init-field-chip__icon" style={{ color: item.info.color }}>
                                <FieldEffectIcon icon={item.info.icon} size={11} />
                            </span>
                            <span className="init-field-chip__initials">{item.info.initials}</span>
                            <span className="init-field-chip__rounds">{item.remainingRounds}</span>
                        </div>
                    </div>
                ))}
                {hasToggle && (
                    <div className="init-field-chip-wrap">
                        <div className="init-field-chip init-field-chip--toggle">
                            {!isExpanded ? (
                                <>
                                    <span>+{hiddenCount}</span>
                                    <ChevronDown size={11} />
                                </>
                            ) : (
                                <ChevronUp size={11} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const hoveredItem = tooltipPos && !isModalOpen ? items.find((it) => it.id === tooltipPos.id) : null;

    const handleMouseEnter = (itemId: string, e: React.MouseEvent<HTMLButtonElement>) => {
        const chipEl = e.currentTarget;
        const chipRect = chipEl.getBoundingClientRect();
        const barEl = barRef.current;
        const barRect = barEl?.getBoundingClientRect() ?? chipRect;
        const trackerEl = chipEl.closest('.init-tracker');
        const isHorizontal =
            layout === 'horizontal' || (trackerEl?.classList.contains('init-tracker--horizontal') ?? false);
        const trackerRect = trackerEl?.getBoundingClientRect() ?? {
            left: 0,
            right: window.innerWidth,
            top: 0,
            bottom: window.innerHeight,
            width: window.innerWidth,
            height: window.innerHeight
        };

        if (isHorizontal) {
            const width = Math.min(230, Math.max(160, trackerRect.right - barRect.right - 12));
            const left = barRect.right + 6;
            const top = Math.max(6, Math.min(window.innerHeight - 130, chipRect.top));
            setTooltipPos({ id: itemId, x: left, y: top, width });
        } else {
            const availableW = Math.max(150, trackerRect.width - 12);
            const width = Math.min(230, availableW);
            const chipCenter = chipRect.left + chipRect.width / 2;
            let left = chipCenter - width / 2;
            const minLeft = trackerRect.left + 6;
            const maxLeft = trackerRect.right - 6 - width;
            if (left < minLeft) left = minLeft;
            if (left > maxLeft) left = Math.max(minLeft, maxLeft);

            let top = barRect.bottom + 5;
            if (top + 130 > window.innerHeight && barRect.top > 130) {
                top = barRect.top - 5 - 130;
            }

            setTooltipPos({ id: itemId, x: left, y: top, width });
        }
    };

    return (
        <>
            <div className={`init-field-bar init-field-bar--${layout}`} ref={barRef}>
                {visibleItems.map((item) => {
                    const isHovered = tooltipPos?.id === item.id;
                    const badgeColor = item.info.color;

                    return (
                        <div key={item.id} className="init-field-chip-wrap">
                            <button
                                type="button"
                                className={`init-field-chip ${isHovered ? 'is-hovered' : ''}`}
                                style={{
                                    borderColor: badgeColor,
                                    background: `color-mix(in srgb, ${badgeColor} 18%, var(--panel-bg))`
                                }}
                                onMouseEnter={(e) => handleMouseEnter(item.id, e)}
                                onMouseLeave={() => setTooltipPos((curr) => (curr?.id === item.id ? null : curr))}
                                onClick={() => {
                                    setTooltipPos(null);
                                    setSelectedEffectId(item.id);
                                    setIsModalOpen(true);
                                }}
                                aria-label={`${item.info.name} - ${item.remainingRounds} Rounds remaining`}
                            >
                                <span className="init-field-chip__icon" style={{ color: badgeColor }}>
                                    <FieldEffectIcon icon={item.info.icon} size={11} />
                                </span>
                                <span className="init-field-chip__initials">{item.info.initials}</span>
                                <span className="init-field-chip__rounds">{item.remainingRounds}</span>
                            </button>
                        </div>
                    );
                })}

                {hasToggle && (
                    <div className="init-field-chip-wrap">
                        <button
                            type="button"
                            className="init-field-chip init-field-chip--toggle"
                            onClick={() => {
                                setTooltipPos(null);
                                setSharedExpanded(!isExpanded);
                            }}
                            title={
                                !isExpanded
                                    ? `Show ${hiddenCount} more field effect${hiddenCount > 1 ? 's' : ''}`
                                    : 'Collapse field effects'
                            }
                            aria-label={
                                !isExpanded ? `Show ${hiddenCount} more field effects` : 'Collapse field effects'
                            }
                        >
                            {!isExpanded ? (
                                <>
                                    <span>+{hiddenCount}</span>
                                    <ChevronDown size={11} />
                                </>
                            ) : (
                                <ChevronUp size={11} />
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* On-hover Floating Tooltip via Portal */}
            {hoveredItem &&
                tooltipPos &&
                !isModalOpen &&
                createPortal(
                    <div
                        className="init-field-tooltip"
                        style={{
                            borderColor: hoveredItem.info.color,
                            left: `${tooltipPos.x}px`,
                            top: `${tooltipPos.y}px`,
                            width: `${tooltipPos.width}px`
                        }}
                        role="tooltip"
                    >
                        <div className="init-field-tooltip__header">
                            <span className="init-field-tooltip__title">
                                <FieldEffectIcon icon={hoveredItem.info.icon} size={13} />
                                {hoveredItem.subLabel ? `${hoveredItem.subLabel} ` : ''}
                                {hoveredItem.info.name}
                            </span>
                            <span
                                className="init-field-tooltip__badge"
                                style={{
                                    backgroundColor: hoveredItem.info.color,
                                    color: '#ffffff'
                                }}
                            >
                                {hoveredItem.remainingRounds} {hoveredItem.remainingRounds === 1 ? 'Rnd' : 'Rnds'}
                            </span>
                        </div>
                        <ul className="init-field-tooltip__list">
                            {hoveredItem.info.effects.map((eff, effIdx) => (
                                <li key={effIdx} className="init-field-tooltip__item">
                                    {eff}
                                </li>
                            ))}
                        </ul>
                        <div className="init-field-tooltip__hint text-subtext">Click to adjust rounds</div>
                    </div>,
                    document.body
                )}

            {/* Inspector Modal */}
            <InitiativeFieldEffectsModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedEffectId(null);
                }}
                isGM={isGM}
                isStandaloneMode={isStandaloneProp ?? isStandaloneMode}
                highlightedId={selectedEffectId}
            />
        </>
    );
}
