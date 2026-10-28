import { useState } from 'react';
import { SlidersHorizontal, Check, XCircle } from 'lucide-react';
import { ATTRIBUTE_COLORS } from '../../../data/constants';
import './ItemTargetPromptModal.css';
import './CustomStatScopeModal.css';

interface CustomStatScopeModalProps {
    initialSelectedStats: string[];
    onSave: (selectedStats: string[]) => void;
    onClose: () => void;
}

const STAT_GROUPS = [
    {
        title: 'Core Attributes',
        stats: ['Strength', 'Dexterity', 'Vitality', 'Special', 'Insight']
    },
    {
        title: 'Social Attributes',
        stats: ['Tough', 'Cool', 'Beauty', 'Cute', 'Clever']
    },
    {
        title: 'Traits & Pools',
        stats: ['Defense', 'Special Defense', 'Max HP', 'Max Will']
    }
];

const ALL_STATS = STAT_GROUPS.flatMap((g) => g.stats);
const CORE_STATS = STAT_GROUPS[0].stats;
const SOCIAL_STATS = STAT_GROUPS[1].stats;

export function CustomStatScopeModal({ initialSelectedStats, onSave, onClose }: CustomStatScopeModalProps) {
    const [selected, setSelected] = useState<string[]>(() =>
        initialSelectedStats.length > 0 ? initialSelectedStats : [...CORE_STATS]
    );

    const toggleStat = (stat: string) => {
        setSelected((prev) => (prev.includes(stat) ? prev.filter((s) => s !== stat) : [...prev, stat]));
    };

    const handleSave = () => {
        if (selected.length === 0) return;
        onSave(selected);
        onClose();
    };

    return (
        <div className="item-target-modal__overlay" onClick={onClose}>
            <div
                className="item-target-modal__content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '460px' }}
            >
                <div className="item-target-modal__header">
                    <div className="item-target-modal__item-info">
                        <div className="item-target-modal__item-icon-wrap">
                            <SlidersHorizontal size={22} className="item-target-modal__item-fallback-icon" />
                        </div>
                        <div>
                            <h3 className="item-target-modal__title text-title-primary">Custom Stat Whitelist</h3>
                            <div className="item-target-modal__item-effect text-subtext">
                                Choose which stats players are allowed to pick from
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="item-target-modal__close-icon-btn"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                <div className="custom-stat-scope-modal__body">
                    {/* Presets Toolbar */}
                    <div className="custom-stat-scope-modal__presets">
                        <button
                            type="button"
                            className="action-button action-button--dark custom-stat-scope-modal__preset-btn text-subtext"
                            onClick={() => setSelected([...ALL_STATS])}
                        >
                            Select All
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark custom-stat-scope-modal__preset-btn text-subtext"
                            onClick={() => setSelected([])}
                        >
                            Clear All
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark custom-stat-scope-modal__preset-btn text-subtext"
                            onClick={() => setSelected([...CORE_STATS])}
                        >
                            Only Core
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark custom-stat-scope-modal__preset-btn text-subtext"
                            onClick={() => setSelected([...SOCIAL_STATS])}
                        >
                            Only Social
                        </button>
                    </div>

                    {/* Stat Groups */}
                    {STAT_GROUPS.map((group) => (
                        <div key={group.title} className="custom-stat-scope-modal__group">
                            <span className="custom-stat-scope-modal__group-title">{group.title}</span>
                            <div className="custom-stat-scope-modal__pills">
                                {group.stats.map((stat) => {
                                    const isChecked = selected.includes(stat);
                                    const color = ATTRIBUTE_COLORS[stat] || 'var(--primary)';
                                    return (
                                        <label
                                            key={stat}
                                            className={`custom-stat-scope-pill ${
                                                isChecked ? 'custom-stat-scope-pill--selected' : ''
                                            }`}
                                            style={{ '--pill-color': color } as React.CSSProperties}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleStat(stat)}
                                            />
                                            <span className="custom-stat-scope-pill__indicator" />
                                            <span>{stat}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="item-target-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={15} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--theme text-theme-header"
                        disabled={selected.length === 0}
                        onClick={handleSave}
                    >
                        <Check size={15} /> Save Whitelist ({selected.length})
                    </button>
                </div>
            </div>
        </div>
    );
}

