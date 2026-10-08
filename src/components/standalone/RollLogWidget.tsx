import { useState, useEffect } from 'react';
import { imageManager } from '../../utils/graphics/imageManager';
import { cropImageTransparencyUrl } from '../../utils/graphics/imageCropUtils';
import { Dices, Trash2, ChevronDown, ChevronUp, X, Info } from 'lucide-react';
import { parseRollLabel } from '../../utils/combat/rollLogParser';
import { RollFactorsModal } from '../modals/rollFactors';
import './RollLogWidget.css';

interface RollData {
    id: string;
    player: string;
    characterName?: string;
    label: string;
    result: string;
    icon: string;
    isCrit?: boolean;
}

interface RollLogWidgetProps {
    isDocked?: boolean;
}

export function RollLogWidget({ isDocked = false }: RollLogWidgetProps) {
    const [rolls, setRolls] = useState<RollData[]>(() => {
        try {
            const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('[RollLogWidget] Failed to parse roll log from local storage.', error);
            return [];
        }
    });
    const [resolvedIcons, setResolvedIcons] = useState<Record<string, string>>({});
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [factorsModalData, setFactorsModalData] = useState<{
        title: string;
        characterName?: string;
        coreTags: string[];
        factors: string[];
        result?: string;
    } | null>(null);

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
                    } catch (e) {
                        console.warn('[RollLogWidget] Failed to resolve local image for roll log.', e);
                    }
                }
                if (resolved && !resolved.includes('pokeball-token.svg') && !resolved.includes('pokeball.svg')) {
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
            if (isMounted) {
                setResolvedIcons((prev) => ({ ...prev, ...newIcons }));
            }
        };

        resolveIcons();

        return () => {
            isMounted = false;
        };
    }, [rolls]);

    // Permanent listener subscriptions across widget lifetime
    useEffect(() => {
        let isMounted = true;

        const handleUpdate = () => {
            try {
                const data = JSON.parse(localStorage.getItem('pkr_roll_log') || '[]');
                const rawRolls: RollData[] = Array.isArray(data) ? data : [];
                if (isMounted) setRolls(rawRolls);
            } catch (error) {
                console.error('[RollLogWidget] Failed to parse roll log from local storage.', error);
                if (isMounted) setRolls([]);
            }
        };

        window.addEventListener('pkr-roll-log-update', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            isMounted = false;
            window.removeEventListener('pkr-roll-log-update', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const dismiss = (id: string) => {
        try {
            const newRolls = rolls.filter((r) => r.id !== id);
            setRolls(newRolls);
            localStorage.setItem('pkr_roll_log', JSON.stringify(newRolls));
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        } catch (error) {
            console.error('[RollLogWidget] Failed to update roll log in local storage.', error);
        }
    };

    const clearAll = () => {
        try {
            setRolls([]);
            localStorage.removeItem('pkr_roll_log');
            window.dispatchEvent(new Event('pkr-roll-log-update'));
        } catch (error) {
            console.error('[RollLogWidget] Failed to clear roll log in local storage.', error);
        }
    };

    if (rolls.length === 0) return null;

    return (
        <div
            className={`roll-log-widget ${isCollapsed ? 'roll-log-widget--collapsed' : ''} ${isDocked ? 'roll-log-widget--docked' : 'roll-log-widget--floating'}`}
        >
            <div className="roll-log-widget__header">
                <span
                    className="roll-log-widget__title text-title-primary"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    <Dices size={16} /> Roll History ({rolls.length})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={clearAll} className="roll-log-widget__btn-clear text-theme-header">
                        Clear All <Trash2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="roll-log-widget__btn-toggle text-subtext"
                        aria-label={isCollapsed ? 'Expand roll history' : 'Collapse roll history'}
                    >
                        {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="roll-log-widget__list">
                    {rolls.map((r) => {
                        const iconUrl = resolvedIcons[r.id] || r.icon;
                        const isCrit = Boolean(
                            r.isCrit ||
                            /critical hit/i.test(r.result) ||
                            /CRITICAL HIT/i.test(r.label) ||
                            /It's a critical hit/i.test(r.result)
                        );
                        const { cleanLabel, coreTags, factorTags } = parseRollLabel(r.label);

                        return (
                            <div
                                key={r.id}
                                className={`roll-log-widget__entry ${isCrit ? 'roll-log-widget__entry--crit' : ''}`}
                            >
                                <div className="roll-log-widget__entry-header">
                                    <img
                                        src={iconUrl}
                                        alt={r.player}
                                        className="roll-log-widget__icon"
                                        onError={(e) => {
                                            e.currentTarget.src = `${import.meta.env.BASE_URL || '/'}pokeball-token.svg`;
                                        }}
                                    />
                                    <strong className="text-title-primary" style={{ fontSize: '0.85rem' }}>
                                        {r.player}
                                    </strong>
                                    {isCrit && <span className="roll-log-widget__crit-badge">Critical Hit!</span>}
                                    <button
                                        type="button"
                                        onClick={() => dismiss(r.id)}
                                        className="roll-log-widget__dismiss text-subtext"
                                        title="Dismiss Roll"
                                        aria-label="Dismiss Roll"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="text-label roll-log-widget__label">
                                    <span>{cleanLabel}</span>
                                    {coreTags.length > 0 && (
                                        <span className="roll-log__core-tags">[ {coreTags.join(' | ')} ]</span>
                                    )}
                                    {factorTags.length > 0 && (
                                        <button
                                            type="button"
                                            className="roll-log__factors-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFactorsModalData({
                                                    title: cleanLabel,
                                                    characterName: r.characterName || r.player,
                                                    coreTags,
                                                    factors: factorTags,
                                                    result: r.result
                                                });
                                            }}
                                            title="View contributing factors, items, passives, and abilities"
                                        >
                                            <Info size={11} />
                                            <span>
                                                {factorTags.length} {factorTags.length === 1 ? 'Factor' : 'Factors'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                                <div
                                    className="roll-log-widget__result text-subtext"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    {r.result}
                                </div>
                            </div>
                        );
                    })}
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
