import { useState } from 'react';
import type { InventoryItem } from '../../../store/storeTypes';
import { useItemArt } from '../../../utils/graphics/itemArtCatalog';
import { Sparkles, AlertTriangle, Check, XCircle } from 'lucide-react';
import './ItemTargetPromptModal.css';

interface ItemStatChoiceModalProps {
    item: InventoryItem;
    onSelectStat: (stat: 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight') => void;
    onClose: () => void;
}

interface StatOption {
    key: 'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight';
    label: string;
    color: string;
    isRawRestricted?: boolean;
}

const STAT_CHOICES: StatOption[] = [
    { key: 'Strength', label: 'Strength', color: '#E65100' },
    { key: 'Dexterity', label: 'Dexterity', color: '#1565C0' },
    { key: 'Vitality', label: 'Vitality', color: '#2E7D32', isRawRestricted: true },
    { key: 'Special', label: 'Special', color: '#6A1B9A' },
    { key: 'Insight', label: 'Insight', color: '#D84315', isRawRestricted: true }
];

export function ItemStatChoiceModal({ item, onSelectStat, onClose }: ItemStatChoiceModalProps) {
    const knownArt = useItemArt(item.name);
    const [selectedStat, setSelectedStat] = useState<'Strength' | 'Dexterity' | 'Vitality' | 'Special' | 'Insight'>('Strength');

    const boostValue = item.permanentStatBoost?.value ?? 1;
    const isRestricted = selectedStat === 'Vitality' || selectedStat === 'Insight';

    return (
        <div className="item-target-modal__overlay" onClick={onClose}>
            <div className="item-target-modal__content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
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

                <div className="item-target-modal__instructions text-label">
                    Select which attribute will be permanently boosted by {item.name}:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
                    {STAT_CHOICES.map((choice) => {
                        const isSelected = selectedStat === choice.key;
                        return (
                            <button
                                key={choice.key}
                                type="button"
                                onClick={() => setSelectedStat(choice.key)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: isSelected
                                        ? `2px solid var(--primary)`
                                        : '1px solid var(--border)',
                                    background: isSelected
                                        ? 'color-mix(in srgb, var(--primary) 15%, var(--panel-alt))'
                                        : 'var(--panel-alt)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: choice.color }}>
                                    {choice.label} (+{boostValue})
                                </span>
                                {choice.isRawRestricted && (
                                    <span
                                        style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 600,
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: 'color-mix(in srgb, var(--semantic-danger) 20%, transparent)',
                                            color: 'var(--semantic-danger)',
                                            border: '1px solid var(--semantic-danger)'
                                        }}
                                    >
                                        Homebrew
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {isRestricted && (
                    <div
                        style={{
                            margin: '6px 0',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: 'color-mix(in srgb, var(--semantic-danger) 15%, var(--panel-alt))',
                            border: '1px solid var(--semantic-danger)',
                            color: 'var(--text-main)',
                            fontSize: '0.74rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '6px',
                            lineHeight: 1.35
                        }}
                    >
                        <AlertTriangle size={14} style={{ color: 'var(--semantic-danger)', flexShrink: 0, marginTop: '2px' }} />
                        <span>
                            <strong>RAW Rulebook Note:</strong> Vitality and Insight are not normally eligible for item
                            boosts in official Pokérole rules, but are allowed here for homebrew flexibility.
                        </span>
                    </div>
                )}

                <div className="item-target-modal__actions" style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
