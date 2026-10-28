import { useState } from 'react';
import type { InventoryItem } from '../../../store/storeTypes';
import { useItemArt } from '../../../utils/graphics/itemArtCatalog';
import { Sparkles, AlertTriangle, Check, XCircle } from 'lucide-react';
import { ATTRIBUTE_COLORS } from '../../../data/constants';
import './ItemTargetPromptModal.css';
import './ItemStatChoiceModal.css';

interface ItemStatChoiceModalProps {
    item: InventoryItem;
    onSelectStat: (stat: string) => void;
    onClose: () => void;
}

interface StatOption {
    key: string;
    label: string;
    color: string;
    isRawRestricted?: boolean;
}

const CATEGORY_DEFINITIONS: Record<string, { label: string; options: StatOption[] }> = {
    core: {
        label: 'Core',
        options: [
            { key: 'Strength', label: 'Strength', color: ATTRIBUTE_COLORS.Strength },
            { key: 'Dexterity', label: 'Dexterity', color: ATTRIBUTE_COLORS.Dexterity },
            { key: 'Vitality', label: 'Vitality', color: ATTRIBUTE_COLORS.Vitality, isRawRestricted: true },
            { key: 'Special', label: 'Special', color: ATTRIBUTE_COLORS.Special },
            { key: 'Insight', label: 'Insight', color: ATTRIBUTE_COLORS.Insight, isRawRestricted: true }
        ]
    },
    social: {
        label: 'Social',
        options: [
            { key: 'Tough', label: 'Tough', color: ATTRIBUTE_COLORS.Tough },
            { key: 'Cool', label: 'Cool', color: ATTRIBUTE_COLORS.Cool },
            { key: 'Beauty', label: 'Beauty', color: ATTRIBUTE_COLORS.Beauty },
            { key: 'Cute', label: 'Cute', color: ATTRIBUTE_COLORS.Cute },
            { key: 'Clever', label: 'Clever', color: ATTRIBUTE_COLORS.Clever }
        ]
    },
    traits: {
        label: 'Traits & Pools',
        options: [
            { key: 'Defense', label: 'Defense', color: ATTRIBUTE_COLORS.Defense },
            { key: 'Special Defense', label: 'Special Defense', color: ATTRIBUTE_COLORS['Special Defense'] },
            { key: 'Max HP', label: 'Max HP', color: ATTRIBUTE_COLORS['Max HP'] },
            { key: 'Max Will', label: 'Max Will', color: ATTRIBUTE_COLORS['Max Will'] }
        ]
    }
};

export function getStatChoiceScope(item: InventoryItem): string {
    const rawStat =
        item.permanentStatBoosts?.find((b) => b.stat?.startsWith('PlayerChoice'))?.stat ||
        (item.permanentStatBoost?.stat?.startsWith('PlayerChoice') ? item.permanentStatBoost.stat : undefined) ||
        'PlayerChoice:core';

    if (rawStat.includes(':')) {
        return rawStat.split(':')[1]?.toLowerCase() || 'core';
    }
    return 'core';
}

function getAllowedCategories(scope: string): string[] {
    switch (scope) {
        case 'social':
            return ['social'];
        case 'traits':
            return ['traits'];
        case 'core_social':
            return ['core', 'social'];
        case 'any':
            return ['core', 'social', 'traits'];
        case 'core':
        default:
            return ['core'];
    }
}

export function ItemStatChoiceModal({ item, onSelectStat, onClose }: ItemStatChoiceModalProps) {
    const knownArt = useItemArt(item.name);
    const scope = getStatChoiceScope(item);
    const allowedCategories = getAllowedCategories(scope);

    const [activeTab, setActiveTab] = useState<string>(allowedCategories[0] || 'core');
    const activeOptions = CATEGORY_DEFINITIONS[activeTab]?.options || CATEGORY_DEFINITIONS.core.options;
    const [selectedStat, setSelectedStat] = useState<string>(activeOptions[0]?.key || 'Strength');

    const boostEntry =
        item.permanentStatBoosts?.find((b) => b.stat?.startsWith('PlayerChoice')) || item.permanentStatBoost;
    const boostValue = boostEntry?.value ?? 1;

    const handleTabChange = (catId: string) => {
        setActiveTab(catId);
        const newOptions = CATEGORY_DEFINITIONS[catId]?.options || [];
        if (!newOptions.some((opt) => opt.key === selectedStat)) {
            setSelectedStat(newOptions[0]?.key || 'Strength');
        }
    };

    const isRestricted = selectedStat === 'Vitality' || selectedStat === 'Insight';

    return (
        <div className="item-target-modal__overlay" onClick={onClose}>
            <div
                className="item-target-modal__content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '440px' }}
            >
                <div className="item-target-modal__header">
                    <div className="item-target-modal__item-info">
                        <div className="item-target-modal__item-icon-wrap">
                            {item.imageUrl || knownArt ? (
                                <img
                                    src={item.imageUrl || knownArt}
                                    alt={item.name || 'Item'}
                                    className="item-target-modal__item-img"
                                />
                            ) : (
                                <Sparkles size={24} className="item-target-modal__item-fallback-icon" />
                            )}
                        </div>
                        <div>
                            <h3 className="item-target-modal__title text-title-primary">Choose Stat to Boost</h3>
                            <div className="item-target-modal__item-effect text-subtext">
                                Permanent stat increase: +{boostValue}
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

                <div className="item-stat-choice-modal__body">
                    <div className="item-stat-choice-modal__instructions text-label">
                        Select which attribute will be permanently boosted by {item.name}:
                    </div>

                    {allowedCategories.length > 1 && (
                        <div className="item-stat-choice-modal__tabs">
                            {allowedCategories.map((catId) => {
                                const cat = CATEGORY_DEFINITIONS[catId];
                                if (!cat) return null;
                                const isTabActive = activeTab === catId;
                                return (
                                    <button
                                        key={catId}
                                        type="button"
                                        className={`action-button item-stat-choice-modal__tab-btn ${isTabActive ? 'action-button--theme' : 'action-button--dark'}`}
                                        onClick={() => handleTabChange(catId)}
                                    >
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="item-stat-choice-modal__options">
                        {activeOptions.map((choice) => {
                            const isSelected = selectedStat === choice.key;
                            return (
                                <button
                                    key={choice.key}
                                    type="button"
                                    className={`item-stat-choice-modal__card ${isSelected ? 'item-stat-choice-modal__card--selected' : ''}`}
                                    style={{ '--card-stat-color': choice.color } as React.CSSProperties}
                                    onClick={() => setSelectedStat(choice.key)}
                                >
                                    <div className="item-stat-choice-modal__card-left">
                                        <span
                                            className="item-stat-choice-modal__stat-pill text-theme-header"
                                            style={{ backgroundColor: choice.color }}
                                        >
                                            {choice.label}
                                        </span>
                                        <span className="text-value-highlight">+{boostValue}</span>
                                    </div>
                                    <div className="item-stat-choice-modal__card-right">
                                        {choice.isRawRestricted && (
                                            <span className="item-stat-choice-modal__homebrew-pill">Homebrew</span>
                                        )}
                                        {isSelected && (
                                            <Check size={16} className="item-stat-choice-modal__check-icon" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {isRestricted && (
                        <div className="item-stat-choice-modal__raw-note">
                            <AlertTriangle size={14} className="item-stat-choice-modal__raw-note-icon" />
                            <span>
                                <strong>RAW Rulebook Note:</strong> Vitality and Insight are not normally eligible for
                                item boosts in official Pokérole rules, but are allowed here for homebrew flexibility.
                            </span>
                        </div>
                    )}
                </div>

                <div className="item-stat-choice-modal__actions">
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
                        onClick={() => onSelectStat(selectedStat)}
                    >
                        <Check size={15} /> Confirm +{boostValue} {selectedStat}
                    </button>
                </div>
            </div>
        </div>
    );
}
