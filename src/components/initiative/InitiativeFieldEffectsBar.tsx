import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../store/useCharacterStore';
import {
    getFieldEffectInfo,
    FieldEffectIcon,
    getAllActiveFieldEffects,
    type FieldEffectInfo
} from '../../utils/combat/fieldEffectsData';
import type { BattlefieldData } from '../../types/battleOrganizerTypes';
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
    isGM?: boolean;
    isStandaloneMode?: boolean;
    isGhost?: boolean;
}

export function InitiativeFieldEffectsBar({
    isGM,
    isStandaloneMode: isStandaloneProp,
    isGhost = false
}: InitiativeFieldEffectsBarProps) {
    const activeBattlefield = useCharacterStore((state) => state.activeBattlefield);
    const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

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

    // Hydrate & listen for battlefield updates across windows, tabs, and OBR peers
    useEffect(() => {
        let isMounted = true;

        const hydrate = async () => {
            try {
                if (OBR.isAvailable && !isStandaloneMode) {
                    const sceneMeta = await OBR.scene.getMetadata();
                    const bf = sceneMeta['pokerole-pmd-extension/battlefield'] as BattlefieldData | undefined;
                    if (bf && isMounted) {
                        useCharacterStore.getState().setActiveBattlefield(bf);
                        return;
                    }
                }
                const raw = localStorage.getItem('pokerole-pmd-extension/battlefield');
                if (raw && isMounted) {
                    useCharacterStore.getState().setActiveBattlefield(JSON.parse(raw));
                } else {
                    const rawBo = localStorage.getItem('pkr_battle_organizer_data');
                    if (rawBo && isMounted) {
                        const parsed = JSON.parse(rawBo);
                        if (parsed.battlefield) {
                            useCharacterStore.getState().setActiveBattlefield(parsed.battlefield);
                        }
                    }
                }
            } catch (err) {
                console.warn('[InitiativeFieldEffectsBar] Hydration error:', err);
            }
        };

        hydrate();

        const unsubs: (() => void)[] = [];

        // Standalone storage listener
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pokerole-pmd-extension/battlefield' && e.newValue) {
                try {
                    useCharacterStore.getState().setActiveBattlefield(JSON.parse(e.newValue));
                } catch {}
            } else if (e.key === 'pkr_battle_organizer_data' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed?.battlefield) {
                        useCharacterStore.getState().setActiveBattlefield(parsed.battlefield);
                    }
                } catch {}
            }
        };
        window.addEventListener('storage', handleStorage);
        unsubs.push(() => window.removeEventListener('storage', handleStorage));

        // OBR listeners if in Owlbear Rodeo
        if (OBR.isAvailable && !isStandaloneMode) {
            const unsubMeta = OBR.scene.onMetadataChange((meta) => {
                const bf = meta['pokerole-pmd-extension/battlefield'] as BattlefieldData | undefined;
                if (bf && isMounted) {
                    useCharacterStore.getState().setActiveBattlefield(bf);
                }
            });
            unsubs.push(unsubMeta);

            const unsubBroadcast = OBR.broadcast.onMessage('pokerole-pmd-extension/battle-organizer-sync', (event) => {
                const incoming = event.data as { battlefield?: BattlefieldData };
                if (incoming && incoming.battlefield && isMounted) {
                    useCharacterStore.getState().setActiveBattlefield(incoming.battlefield);
                }
            });
            unsubs.push(unsubBroadcast);
        }

        return () => {
            isMounted = false;
            unsubs.forEach((u) => u());
        };
    }, []);

    if (!activeBattlefield) return null;

    const allActive = getAllActiveFieldEffects(activeBattlefield);
    const items: ActiveConditionItem[] = allActive.map((item) => ({
        id: item.id,
        info: getFieldEffectInfo(item.name, item.category),
        remainingRounds: item.remainingRounds,
        subLabel: item.subLabel
    }));

    if (items.length === 0) return null;

    if (isGhost) {
        return (
            <div className="init-field-bar" aria-hidden="true">
                {items.map((item) => (
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
        const isHorizontal = trackerEl?.classList.contains('init-tracker--horizontal') ?? false;
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
            <div className="init-field-bar" ref={barRef}>
                {items.map((item) => {
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
            </div>

            {/* On-hover Floating Tooltip via Portal */}
            {hoveredItem && tooltipPos && !isModalOpen && createPortal(
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
