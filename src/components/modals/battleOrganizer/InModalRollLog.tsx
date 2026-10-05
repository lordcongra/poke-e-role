import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { CombatantRowData, RollLogLayoutMode } from '../../../types/battleOrganizerTypes';
import { imageManager } from '../../../utils/graphics/imageManager';
import { cropImageTransparencyUrl } from '../../../utils/graphics/imageCropUtils';
import {
    Dices,
    Trash2,
    ChevronDown,
    ChevronUp,
    X,
    Check,
    Swords,
    Move,
    Columns2,
    LayoutGrid,
    Type,
    Info
} from 'lucide-react';
import { parseRollLogEntry } from './battleOrganizerUtils';
import { parseRollLabel } from '../../../utils/combat/rollLogParser';
import { RollFactorsModal } from '../rollFactors';
import './InModalRollLog.css';

export interface RollLogEntry {
    id: string;
    player: string;
    characterName?: string;
    tokenId?: string;
    label: string;
    result: string;
    icon: string;
    rollType?: string;
}

export type RollLogFontSize = 'sm' | 'md' | 'lg' | 'xl';

interface InModalRollLogProps {
    combatants?: CombatantRowData[];
    onMarkAction?: (combatantId: string, moveName: string, status: 'success' | 'failed') => void;
    layoutMode?: RollLogLayoutMode;
    onCycleLayoutMode?: () => void;
}

export function InModalRollLog({
    combatants = [],
    onMarkAction,
    layoutMode = 'floating',
    onCycleLayoutMode
}: InModalRollLogProps) {
    const [rolls, setRolls] = useState<RollLogEntry[]>(() => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    });

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({});
    const [markedStatus, setMarkedStatus] = useState<Record<string, 'success' | 'failed'>>({});
    const [actionRollDecisions, setActionRollDecisions] = useState<Record<string, 'pending' | 'add' | 'skip'>>({});
    const [factorsModalData, setFactorsModalData] = useState<{
        title: string;
        characterName?: string;
        coreTags: string[];
        factors: string[];
        result?: string;
    } | null>(null);

    const [fontSize, setFontSize] = useState<RollLogFontSize>(() => {
        try {
            const saved = localStorage.getItem('pkr_roll_log_font_size');
            if (saved === 'sm' || saved === 'md' || saved === 'lg' || saved === 'xl') return saved;
        } catch {
            // ignore
        }
        return 'sm';
    });

    const handleCycleFontSize = () => {
        setFontSize((prev) => {
            let next: RollLogFontSize = 'sm';
            if (prev === 'sm') next = 'md';
            else if (prev === 'md') next = 'lg';
            else if (prev === 'lg') next = 'xl';
            else next = 'sm';
            try {
                localStorage.setItem('pkr_roll_log_font_size', next);
            } catch {
                // ignore
            }
            return next;
        });
    };

    const getFontSizeLabel = (size: RollLogFontSize): string => {
        switch (size) {
            case 'sm':
                return 'Normal';
            case 'md':
                return 'Medium';
            case 'lg':
                return 'Large';
            case 'xl':
                return 'Extra Large';
        }
    };

    useEffect(() => {
        let isMounted = true;

        const resolveIcons = async () => {
            const newIcons: Record<string, string> = {};
            for (const r of rolls) {
                let resolved = r.icon;
                if (resolved && resolved.startsWith('local-img:')) {
                    try {
                        const url = await imageManager.getImageUrl(resolved);
                        if (url) resolved = url;
                    } catch {
                        // ignore icon error
                    }
                }
                if (resolved && !resolved.includes('pokeball.svg')) {
                    try {
                        const cropped = await cropImageTransparencyUrl(resolved, true);
                        if (cropped && isMounted) newIcons[r.id] = cropped;
                    } catch {
                        if (resolved && isMounted) newIcons[r.id] = resolved;
                    }
                } else if (resolved && isMounted) {
                    newIcons[r.id] = resolved;
                }
            }
            for (const c of combatants) {
                let resolved = c.image;
                if (resolved && resolved.startsWith('local-img:') && !newIcons[c.id]) {
                    try {
                        const url = await imageManager.getImageUrl(resolved);
                        if (url) resolved = url;
                    } catch {
                        // ignore
                    }
                }
                if (resolved && !resolved.includes('pokeball.svg') && !newIcons[c.id]) {
                    try {
                        const cropped = await cropImageTransparencyUrl(resolved, true);
                        if (cropped && isMounted) newIcons[c.id] = cropped;
                    } catch {
                        if (resolved && isMounted) newIcons[c.id] = resolved;
                    }
                } else if (resolved && isMounted && !newIcons[c.id]) {
                    newIcons[c.id] = resolved;
                }
            }
            if (isMounted) {
                setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
            }
        };

        resolveIcons();

        return () => {
            isMounted = false;
        };
    }, [rolls, combatants]);

    // Permanent listener subscriptions across InModalRollLog lifetime
    useEffect(() => {
        let isMounted = true;

        const handleReload = () => {
            try {
                const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                const rawRolls: RollLogEntry[] = Array.isArray(data) ? data : [];
                if (isMounted) setRolls(rawRolls);
            } catch {
                if (isMounted) setRolls([]);
            }
        };

        const handleNewRoll = () => {
            handleReload();
            // Automatically expand when a new roll arrives so the user sees results
            if (isMounted) setIsCollapsed(false);
        };

        window.addEventListener('pkr-roll-log-event', handleNewRoll);
        window.addEventListener('pkr-roll-log-update', handleReload);
        window.addEventListener('storage', handleReload);

        const unsubs: Array<() => void> = [];
        if (OBR.isAvailable) {
            unsubs.push(
                OBR.broadcast.onMessage('pokerole-pmd-extension/roll-log-sync', () => {
                    handleNewRoll();
                })
            );
            unsubs.push(
                OBR.broadcast.onMessage('pokerole-pmd-extension/roll-log-update', () => {
                    handleReload();
                })
            );
        }

        return () => {
            isMounted = false;
            window.removeEventListener('pkr-roll-log-event', handleNewRoll);
            window.removeEventListener('pkr-roll-log-update', handleReload);
            window.removeEventListener('storage', handleReload);
            unsubs.forEach((unsub) => unsub());
        };
    }, []);

    const handleDismiss = (id: string) => {
        try {
            const newRolls = rolls.filter((r) => r.id !== id);
            setRolls(newRolls);
            localStorage.setItem('pkr_roll_log', JSON.stringify(newRolls));
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        } catch (error) {
            console.error('[InModalRollLog] Failed to dismiss roll:', error);
        }
    };

    const handleClearAll = () => {
        try {
            setRolls([]);
            localStorage.removeItem('pkr_roll_log');
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        } catch (error) {
            console.error('[InModalRollLog] Failed to clear rolls:', error);
        }
    };

    const handleMark = (rollId: string, combatantId: string, moveName: string, status: 'success' | 'failed') => {
        setMarkedStatus((prev) => ({ ...prev, [rollId]: status }));
        if (onMarkAction) {
            onMarkAction(combatantId, moveName, status);
        }
    };

    const getLayoutToggleTitle = (mode: RollLogLayoutMode) => {
        switch (mode) {
            case 'floating':
                return 'Roll Log Layout: Floating Overlay (Click to switch to Side-by-Side Full Length)';
            case 'full-sidebar':
                return 'Roll Log Layout: Side-by-Side Full Length (Click to switch to Side-by-Side Battlefield Only)';
            case 'battlefield-nested':
                return 'Roll Log Layout: Side-by-Side Battlefield Only (Click to switch to Side-by-Side Round Tracker Only)';
            case 'rounds-nested':
                return 'Roll Log Layout: Side-by-Side Round Tracker Only (Click to switch to Floating Overlay)';
        }
    };

    if (rolls.length === 0 && layoutMode === 'floating') {
        return null;
    }

    const maxRolls = layoutMode === 'full-sidebar' ? 50 : layoutMode === 'floating' ? 12 : 25;

    return (
        <div
            className={`in-modal-roll-log in-modal-roll-log--${layoutMode} in-modal-roll-log--font-${fontSize} ${isCollapsed ? 'in-modal-roll-log--collapsed' : ''}`}
        >
            {/* Header */}
            <div className="in-modal-roll-log__header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="in-modal-roll-log__header-left">
                    <Dices size={15} color="var(--primary)" />
                    <span className="in-modal-roll-log__title">Roll Log ({rolls.length})</span>
                </div>

                <div className="in-modal-roll-log__header-right" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className="in-modal-roll-log__btn-icon"
                        onClick={handleCycleFontSize}
                        title={`Font Size: ${getFontSizeLabel(fontSize)} (Click to enlarge)`}
                        aria-label="Change Roll Log Font Size"
                    >
                        <Type size={13} />
                    </button>
                    {onCycleLayoutMode && (
                        <button
                            type="button"
                            className="in-modal-roll-log__btn-icon"
                            onClick={onCycleLayoutMode}
                            title={getLayoutToggleTitle(layoutMode)}
                            aria-label={getLayoutToggleTitle(layoutMode)}
                        >
                            {layoutMode === 'floating' && <Move size={13} />}
                            {layoutMode === 'full-sidebar' && <Columns2 size={13} />}
                            {layoutMode === 'battlefield-nested' && <LayoutGrid size={13} />}
                            {layoutMode === 'rounds-nested' && <Swords size={13} />}
                        </button>
                    )}
                    <button
                        type="button"
                        className="in-modal-roll-log__btn-icon"
                        onClick={handleClearAll}
                        title="Clear all logged rolls"
                        aria-label="Clear all rolls"
                    >
                        <Trash2 size={13} />
                    </button>
                    <button
                        type="button"
                        className="in-modal-roll-log__btn-icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        title={isCollapsed ? 'Expand Roll Log' : 'Collapse Roll Log'}
                        aria-label={isCollapsed ? 'Expand Roll Log' : 'Collapse Roll Log'}
                    >
                        {isCollapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                </div>
            </div>

            {/* Content List */}
            {!isCollapsed && (
                <div className="in-modal-roll-log__list">
                    {rolls.length === 0 ? (
                        <div className="in-modal-roll-log__empty">
                            <Dices size={28} color="var(--primary)" style={{ opacity: 0.4 }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>No rolls recorded yet</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Rolls from sheets & tokens will appear here
                            </span>
                        </div>
                    ) : (
                        rolls.slice(0, maxRolls).map((r) => {
                            const parsed = parseRollLogEntry(r as unknown as Record<string, unknown>);
                            const moveName = parsed?.moveName || '';
                            const charName = parsed?.charName || r.characterName || r.player;

                            const matchedCombatant = combatants.find(
                                (c) =>
                                    (r.tokenId && c.tokenId && r.tokenId === c.tokenId) ||
                                    (charName && c.name.toLowerCase().trim() === charName.toLowerCase().trim()) ||
                                    (c.name.trim() && r.label.toLowerCase().includes(c.name.toLowerCase().trim()))
                            );

                            const currentStatus = markedStatus[r.id];
                            let effectiveIcon = resolvedIcons[r.id] || r.icon;
                            if ((!effectiveIcon || effectiveIcon.includes('pokeball.svg')) && matchedCombatant?.image) {
                                effectiveIcon = resolvedIcons[matchedCombatant.id] || matchedCombatant.image;
                            }
                            const iconSrc = effectiveIcon || `${import.meta.env.BASE_URL || '/'}pokeball.svg`;
                            const displayChar = matchedCombatant?.name || charName || r.characterName || r.player;

                            const isActionRoll = parsed?.isActionRoll;
                            const actionRollDecision = actionRollDecisions[r.id] || 'pending';

                            const { cleanLabel, coreTags, factorTags } = parseRollLabel(r.label);

                            return (
                                <div key={r.id} className="in-modal-roll-log__entry">
                                    <div className="in-modal-roll-log__entry-top">
                                        <div className="in-modal-roll-log__avatar">
                                            <img src={iconSrc} alt={displayChar} />
                                        </div>
                                        <div className="in-modal-roll-log__meta">
                                            <span className="in-modal-roll-log__char">{displayChar}</span>
                                            <span className="in-modal-roll-log__label" title={r.label}>
                                                <span>{cleanLabel}</span>
                                                {coreTags.length > 0 && (
                                                    <span className="roll-log__core-tags">
                                                        [ {coreTags.join(' | ')} ]
                                                    </span>
                                                )}
                                                {factorTags.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="roll-log__factors-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFactorsModalData({
                                                                title: cleanLabel,
                                                                characterName: displayChar,
                                                                coreTags,
                                                                factors: factorTags,
                                                                result: r.result
                                                            });
                                                        }}
                                                        title="View contributing factors, items, passives, and abilities"
                                                    >
                                                        <Info size={11} />
                                                        <span>
                                                            {factorTags.length}{' '}
                                                            {factorTags.length === 1 ? 'Factor' : 'Factors'}
                                                        </span>
                                                    </button>
                                                )}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="in-modal-roll-log__btn-dismiss"
                                            onClick={() => handleDismiss(r.id)}
                                            title="Dismiss roll"
                                            aria-label="Dismiss roll"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>

                                    <div className="in-modal-roll-log__result">{r.result}</div>

                                    {/* Action Rolls from Action Rolls menu: Confirm if user wants to add to round tracker / action counter */}
                                    {matchedCombatant && isActionRoll && onMarkAction && (
                                        <>
                                            {actionRollDecision === 'pending' && (
                                                <div className="in-modal-roll-log__actions-bar">
                                                    <span className="in-modal-roll-log__action-label">
                                                        Add to action counter?
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="in-modal-roll-log__choice-btn in-modal-roll-log__choice-btn--yes"
                                                        onClick={() =>
                                                            setActionRollDecisions((prev) => ({
                                                                ...prev,
                                                                [r.id]: 'add'
                                                            }))
                                                        }
                                                        title="Add this Action Roll to the Round Tracker action counter"
                                                    >
                                                        <Check size={11} /> Yes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="in-modal-roll-log__choice-btn in-modal-roll-log__choice-btn--no"
                                                        onClick={() =>
                                                            setActionRollDecisions((prev) => ({
                                                                ...prev,
                                                                [r.id]: 'skip'
                                                            }))
                                                        }
                                                        title="Free action - do not add to action counter"
                                                    >
                                                        <X size={11} /> No (Free)
                                                    </button>
                                                </div>
                                            )}

                                            {actionRollDecision === 'skip' && (
                                                <div className="in-modal-roll-log__actions-bar">
                                                    <span
                                                        className="in-modal-roll-log__action-label"
                                                        style={{ fontStyle: 'italic', opacity: 0.8 }}
                                                    >
                                                        Free Action (Not added to round tracker)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="in-modal-roll-log__link-btn"
                                                        onClick={() =>
                                                            setActionRollDecisions((prev) => ({
                                                                ...prev,
                                                                [r.id]: 'pending'
                                                            }))
                                                        }
                                                        title="Change decision"
                                                    >
                                                        Change
                                                    </button>
                                                </div>
                                            )}

                                            {actionRollDecision === 'add' && (
                                                <div className="in-modal-roll-log__actions-bar">
                                                    <span className="in-modal-roll-log__action-label">
                                                        <Swords size={11} /> Mark {moveName}:
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className={`in-modal-roll-log__mark-btn in-modal-roll-log__mark-btn--hit ${currentStatus === 'success' ? 'in-modal-roll-log__mark-btn--active-hit' : ''}`}
                                                        onClick={() =>
                                                            handleMark(r.id, matchedCombatant.id, moveName, 'success')
                                                        }
                                                        title="Mark as Hit / Success (✓) and add to action counter"
                                                    >
                                                        <Check size={11} /> Hit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`in-modal-roll-log__mark-btn in-modal-roll-log__mark-btn--miss ${currentStatus === 'failed' ? 'in-modal-roll-log__mark-btn--active-miss' : ''}`}
                                                        onClick={() =>
                                                            handleMark(r.id, matchedCombatant.id, moveName, 'failed')
                                                        }
                                                        title="Mark as Miss / Fail (✗) and add to action counter"
                                                    >
                                                        <X size={11} /> Miss
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Quick Mark Action Buttons for Move Accuracy, Evade, Clash & Action-Consuming Status Recovery */}
                                    {matchedCombatant &&
                                        !isActionRoll &&
                                        parsed?.canMarkInRollLog &&
                                        moveName &&
                                        onMarkAction && (
                                            <div className="in-modal-roll-log__actions-bar">
                                                <span className="in-modal-roll-log__action-label">
                                                    <Swords size={11} /> Mark {moveName}:
                                                </span>
                                                <button
                                                    type="button"
                                                    className={`in-modal-roll-log__mark-btn in-modal-roll-log__mark-btn--hit ${currentStatus === 'success' ? 'in-modal-roll-log__mark-btn--active-hit' : ''}`}
                                                    onClick={() =>
                                                        handleMark(r.id, matchedCombatant.id, moveName, 'success')
                                                    }
                                                    title="Mark as Hit / Success (✓)"
                                                >
                                                    <Check size={11} /> Hit
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`in-modal-roll-log__mark-btn in-modal-roll-log__mark-btn--miss ${currentStatus === 'failed' ? 'in-modal-roll-log__mark-btn--active-miss' : ''}`}
                                                    onClick={() =>
                                                        handleMark(r.id, matchedCombatant.id, moveName, 'failed')
                                                    }
                                                    title="Mark as Miss / Fail / Cancel (✗)"
                                                >
                                                    <X size={11} /> Miss
                                                </button>
                                            </div>
                                        )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {factorsModalData && (
                <RollFactorsModal
                    title={factorsModalData.title}
                    characterName={factorsModalData.characterName}
                    coreTags={factorsModalData.coreTags}
                    factors={factorsModalData.factors}
                    result={factorsModalData.result}
                    onClose={() => setFactorsModalData(null)}
                />
            )}
        </div>
    );
}
