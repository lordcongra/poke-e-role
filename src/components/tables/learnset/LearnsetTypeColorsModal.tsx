import { memo, useEffect } from 'react';
import { Palette, X, RotateCcw, Sparkles } from 'lucide-react';
import { LEARNSET_HIGH_CONTRAST_TYPE_COLORS } from './useLearnsetTypeColors';
import type { CustomType } from '../../../store/storeTypes';
import './LearnsetTypeColorsModal.css';

const STANDARD_TYPES = [
    'Normal',
    'Fire',
    'Water',
    'Grass',
    'Electric',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Steel',
    'Dark',
    'Fairy',
    'Stellar'
];

interface LearnsetTypeColorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customColors: Record<string, string>;
    onSetColor: (type: string, color: string) => void;
    onResetColor: (type: string) => void;
    onResetAll: () => void;
    visibleCustomTypes: CustomType[];
}

export const LearnsetTypeColorsModal = memo(function LearnsetTypeColorsModal({
    isOpen,
    onClose,
    customColors,
    onSetColor,
    onResetColor,
    onResetAll,
    visibleCustomTypes = []
}: LearnsetTypeColorsModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const hasAnyCustomColors = Object.keys(customColors).length > 0;

    const renderTypeCard = (typeName: string, defaultColor: string, isHomebrew = false) => {
        const currentColor = customColors[typeName] || defaultColor;
        const isModified = Boolean(
            customColors[typeName] && customColors[typeName].toLowerCase() !== defaultColor.toLowerCase()
        );

        return (
            <div
                key={typeName}
                className={`learnset-colors-modal__type-card ${
                    isModified ? 'learnset-colors-modal__type-card--modified' : ''
                }`}
            >
                <div className="learnset-colors-modal__card-left">
                    <div
                        className="learnset-colors-modal__preview-pill text-subtext"
                        style={{
                            borderColor: `color-mix(in srgb, ${currentColor} 75%, var(--border, rgba(255, 255, 255, 0.15)))`,
                            backgroundColor: `color-mix(in srgb, ${currentColor} 14%, var(--label-bg))`
                        }}
                    >
                        <span>{typeName}</span>
                    </div>
                    {isHomebrew && <span className="learnset-colors-modal__homebrew-badge">Homebrew</span>}
                </div>

                <div className="learnset-colors-modal__card-right">
                    <label
                        className="learnset-colors-modal__color-input-wrapper"
                        title={`Select color for ${typeName}`}
                    >
                        <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => onSetColor(typeName, e.target.value)}
                            className="learnset-colors-modal__color-input"
                            aria-label={`Color for ${typeName}`}
                        />
                    </label>

                    {isModified && (
                        <button
                            type="button"
                            onClick={() => onResetColor(typeName)}
                            className="learnset-colors-modal__item-reset-btn"
                            title={`Reset ${typeName} to default (${defaultColor})`}
                            aria-label={`Reset ${typeName} color`}
                        >
                            <RotateCcw size={12} className="learnset-colors-modal__spin-icon" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="learnset-colors-modal__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="learnset-colors-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="learnset-colors-modal__header">
                    <div className="learnset-colors-modal__title-area">
                        <h4 className="learnset-colors-modal__title text-title-primary">
                            <Palette size={17} /> Learnset Type Colors
                        </h4>
                        <p className="learnset-colors-modal__subtitle text-subtext">
                            Customize the color for each move type in the Learnset. Preferences save to your device.
                        </p>
                    </div>

                    <div className="learnset-colors-modal__header-actions">
                        <button
                            type="button"
                            onClick={onResetAll}
                            disabled={!hasAnyCustomColors}
                            className="learnset-colors-modal__reset-btn text-subtext"
                            title="Reset all type colors back to defaults"
                        >
                            <RotateCcw size={13} className="learnset-colors-modal__spin-icon" />
                            <span>Reset Defaults</span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="learnset-colors-modal__close-btn"
                            title="Close Settings"
                            aria-label="Close Settings"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="learnset-colors-modal__body">
                    {/* Standard Types */}
                    <div className="learnset-colors-modal__section">
                        <h5 className="learnset-colors-modal__section-heading">Standard Types</h5>
                        <div className="learnset-colors-modal__grid">
                            {STANDARD_TYPES.map((t) =>
                                renderTypeCard(t, LEARNSET_HIGH_CONTRAST_TYPE_COLORS[t] || '#9CA3AF')
                            )}
                        </div>
                    </div>

                    {/* Homebrew Types (Respecting GM Only) */}
                    {visibleCustomTypes.length > 0 && (
                        <div className="learnset-colors-modal__section">
                            <h5 className="learnset-colors-modal__section-heading">
                                <Sparkles size={12} /> Custom Homebrew Types
                            </h5>
                            <div className="learnset-colors-modal__grid">
                                {visibleCustomTypes.map((t) => renderTypeCard(t.name, t.color || '#9CA3AF', true))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
