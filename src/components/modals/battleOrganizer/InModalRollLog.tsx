import { useState, useEffect } from 'react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import { imageManager } from '../../../utils/imageManager';
import { Dices, Trash2, ChevronDown, ChevronUp, X, Check, Swords } from 'lucide-react';
import './InModalRollLog.css';

export interface RollLogEntry {
    id: string;
    player: string;
    characterName?: string;
    tokenId?: string;
    label: string;
    result: string;
    icon: string;
}

interface InModalRollLogProps {
    combatants?: CombatantRowData[];
    onMarkAction?: (combatantId: string, moveName: string, status: 'success' | 'failed') => void;
}

export function InModalRollLog({ combatants = [], onMarkAction }: InModalRollLogProps) {
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

    useEffect(() => {
        let isMounted = true;

        const resolveIcons = async () => {
            const newIcons: Record<string, string> = {};
            for (const r of rolls) {
                if (r.icon && r.icon.startsWith('local-img:')) {
                    try {
                        const url = await imageManager.getImageUrl(r.icon);
                        if (url && isMounted) newIcons[r.id] = url;
                    } catch {
                        // ignore icon error
                    }
                }
            }
            for (const c of combatants) {
                if (c.image && c.image.startsWith('local-img:') && !newIcons[c.id]) {
                    try {
                        const url = await imageManager.getImageUrl(c.image);
                        if (url && isMounted) newIcons[c.id] = url;
                    } catch {
                        // ignore
                    }
                }
            }
            if (isMounted) {
                setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
            }
        };

        resolveIcons();

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

        return () => {
            isMounted = false;
            window.removeEventListener('pkr-roll-log-event', handleNewRoll);
            window.removeEventListener('pkr-roll-log-update', handleReload);
            window.removeEventListener('storage', handleReload);
        };
    }, [rolls]);

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

    // Extract character and move names from label
    const parseRollMeta = (label: string, fallbackChar?: string) => {
        const clean = label.replace(/^\[PRIVATE\]\s*/i, '').replace(/^[📢🎲💥🩹🍀🎯🛡️❄️]\s*/u, '').trim();

        let charName = fallbackChar || '';
        let moveName = '';

        const matchAccDmg = clean.match(/^(.+?)\s+rolled\s+(.+?)\s*\((?:Acc|Damage|Attack)\)/i);
        if (matchAccDmg) {
            charName = matchAccDmg[1].trim();
            moveName = matchAccDmg[2].trim();
        } else {
            const matchRolled = clean.match(/^(.+?)\s+(?:rolled|used)\s+(.+?)(?:!|\s*\[|$)/i);
            if (matchRolled) {
                charName = matchRolled[1].trim();
                moveName = matchRolled[2].trim();
            } else {
                const matchSimple = clean.match(/^(.+?)\s*(?:\(Acc\)|\(Damage\)|\(Attack\))/i);
                if (matchSimple) {
                    moveName = matchSimple[1].trim();
                } else if (clean && !clean.includes('!')) {
                    moveName = clean.split('[')[0].trim();
                }
            }
        }

        if (moveName.match(/^(?:custom dice|a General|Recovery|Check)/i)) {
            moveName = '';
        }

        return { charName, moveName };
    };

    const handleMark = (rollId: string, combatantId: string, moveName: string, status: 'success' | 'failed') => {
        setMarkedStatus((prev) => ({ ...prev, [rollId]: status }));
        if (onMarkAction) {
            onMarkAction(combatantId, moveName, status);
        }
    };

    if (rolls.length === 0) {
        return null;
    }

    return (
        <div className={`in-modal-roll-log ${isCollapsed ? 'in-modal-roll-log--collapsed' : ''}`}>
            {/* Header */}
            <div className="in-modal-roll-log__header" onClick={() => setIsCollapsed(!isCollapsed)}>
                <div className="in-modal-roll-log__header-left">
                    <Dices size={15} color="var(--primary)" />
                    <span className="in-modal-roll-log__title text-label">
                        Roll Log ({rolls.length})
                    </span>
                </div>

                <div className="in-modal-roll-log__header-right" onClick={(e) => e.stopPropagation()}>
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
                    {rolls.slice(0, 10).map((r) => {
                        const { charName, moveName } = parseRollMeta(r.label, r.characterName || r.player);
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

                        return (
                            <div key={r.id} className="in-modal-roll-log__entry">
                                <div className="in-modal-roll-log__entry-top">
                                    <div className="in-modal-roll-log__avatar">
                                        <img src={iconSrc} alt={displayChar} />
                                    </div>
                                    <div className="in-modal-roll-log__meta">
                                        <span className="in-modal-roll-log__char text-label">
                                            {displayChar}
                                        </span>
                                        <span className="in-modal-roll-log__label text-subtext">
                                            {r.label}
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

                                <div className="in-modal-roll-log__result text-label">
                                    {r.result}
                                </div>

                                {/* Quick Mark Action Buttons */}
                                {matchedCombatant && moveName && onMarkAction && (
                                    <div className="in-modal-roll-log__actions-bar">
                                        <span className="in-modal-roll-log__action-label text-subtext">
                                            <Swords size={11} /> Mark {moveName}:
                                        </span>
                                        <button
                                            type="button"
                                            className={`in-modal-roll-log__mark-btn in-modal-roll-log__mark-btn--hit ${currentStatus === 'success' ? 'in-modal-roll-log__mark-btn--active-hit' : ''}`}
                                            onClick={() => handleMark(r.id, matchedCombatant.id, moveName, 'success')}
                                            title="Mark as Hit / Success (✓)"
                                        >
                                            <Check size={11} /> Hit
                                        </button>
                                        <button
                                            type="button"
                                            className={`in-modal-roll-log__mark-btn in-modal-roll-log__mark-btn--miss ${currentStatus === 'failed' ? 'in-modal-roll-log__mark-btn--active-miss' : ''}`}
                                            onClick={() => handleMark(r.id, matchedCombatant.id, moveName, 'failed')}
                                            title="Mark as Miss / Fail / Cancel (✗)"
                                        >
                                            <X size={11} /> Miss
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
