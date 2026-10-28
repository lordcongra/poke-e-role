import { useState } from 'react';
import type { InventoryItem } from '../../../store/storeTypes';
import { useItemArt } from '../../../utils/graphics/itemArtCatalog';
import { Sparkles, AlertTriangle, Check, XCircle } from 'lucide-react';
import {
    CATEGORY_DEFINITIONS,
    getCustomStatWhitelist,
    getStatChoiceScope,
    getAllowedCategories
} from '../../../utils/items/itemStatChoice';
import './ItemTargetPromptModal.css';
import './ItemStatChoiceModal.css';

export { getCustomStatWhitelist, getStatChoiceScope };

interface ItemStatChoiceModalProps {
    item: InventoryItem;
    onSelectStat: (stat: string) => void;
    onClose: () => void;
}

export function ItemStatChoiceModal({ item, onSelectStat, onClose }: ItemStatChoiceModalProps) {
    const knownArt = useItemArt(item.name);
    const scope = getStatChoiceScope(item);
    const customWhitelist = getCustomStatWhitelist(item);
    const isCustom = customWhitelist !== null;

    const effectiveDefinitions = isCustom
        ? {
              core: {
                  ...CATEGORY_DEFINITIONS.core,
                  options: CATEGORY_DEFINITIONS.core.options.filter((opt) => customWhitelist.includes(opt.key))
              },
              social: {
                  ...CATEGORY_DEFINITIONS.social,
                  options: CATEGORY_DEFINITIONS.social.options.filter((opt) => customWhitelist.includes(opt.key))
              },
              traits: {
                  ...CATEGORY_DEFINITIONS.traits,
                  options: CATEGORY_DEFINITIONS.traits.options.filter((opt) => customWhitelist.includes(opt.key))
              }
          }
        : CATEGORY_DEFINITIONS;

    const allowedCategories = isCustom
        ? ['core', 'social', 'traits'].filter((catId) => effectiveDefinitions[catId].options.length > 0)
        : getAllowedCategories(scope);

    const fallbackCategory = allowedCategories[0] || 'core';
    const [activeTab, setActiveTab] = useState<string>(fallbackCategory);

    const effectiveTab = allowedCategories.includes(activeTab) ? activeTab : fallbackCategory;
    const activeOptions = effectiveDefinitions[effectiveTab]?.options || effectiveDefinitions.core.options;
    const [selectedStat, setSelectedStat] = useState<string>(activeOptions[0]?.key || 'Strength');

    const boostEntry =
        item.permanentStatBoosts?.find((b) => b.stat?.startsWith('PlayerChoice')) || item.permanentStatBoost;
    const boostValue = boostEntry?.value ?? 1;

    const handleTabChange = (catId: string) => {
        setActiveTab(catId);
        const newOptions = effectiveDefinitions[catId]?.options || [];
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
                                const cat = effectiveDefinitions[catId];
                                if (!cat) return null;
                                const isTabActive = effectiveTab === catId;
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
