import type React from 'react';
import type { GeneratorConfig } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { POKEMON_TYPES, TYPE_COLORS } from '../../../data/constants';

export interface GeneratorTypeSectionProps {
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

const TYPE_MODES: { mode: 'any' | 'monotype' | 'dual' | 'manual'; label: string }[] = [
    { mode: 'any', label: 'Any Type' },
    { mode: 'monotype', label: 'Monotype' },
    { mode: 'dual', label: 'Dual-Type' },
    { mode: 'manual', label: 'Manual Types' }
];

const VALID_POKEMON_TYPES = POKEMON_TYPES.filter(Boolean);

export function GeneratorTypeSection({ config, onUpdateConfig, onOpenTooltip }: GeneratorTypeSectionProps) {
    const currentMode = config.typeSpecialtyMode || 'any';
    const manualTypes = config.manualTypes || [];

    const handleToggleManualType = (t: string) => {
        let next: string[];
        if (manualTypes.includes(t)) {
            next = manualTypes.filter((x) => x !== t);
        } else if (manualTypes.length >= 2) {
            next = [manualTypes[1], t];
        } else {
            next = [...manualTypes, t];
        }
        onUpdateConfig({ manualTypes: next });
    };

    const getHintText = () => {
        if (currentMode === 'any') return 'Drafts species freely without typing restrictions.';
        if (currentMode === 'monotype') return 'Drafts a Pokémon focused on 1 random type specialty.';
        if (currentMode === 'dual') return 'Drafts a Pokémon sharing 2 random type specialties.';
        if (manualTypes.length === 0) return 'Pick 1 or 2 specific types below to filter candidate species.';
        if (manualTypes.length === 1) return `Candidate species must have ${manualTypes[0]} typing.`;
        return `Candidate species must have ${manualTypes[0]} or ${manualTypes[1]} typing.`;
    };

    return (
        <div className="generator-modal__type-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Type Drafting:
                    <TooltipIcon
                        onClick={() =>
                            onOpenTooltip({
                                title: 'Type Drafting',
                                desc: 'Choose how Pokémon types are selected when generating:\n\n• Any Type: Fully random types across all species.\n• Monotype: Generates a Pokémon focusing on one random type.\n• Dual-Type: Focuses on two shared types.\n• Manual Types: Hand-pick 1 or 2 specific types to filter candidate species.'
                            })
                        }
                    />
                </label>
            </div>

            <div className="generator-modal__type-presets">
                {TYPE_MODES.map((opt) => (
                    <button
                        key={opt.mode}
                        type="button"
                        className={`generator-modal__type-btn ${currentMode === opt.mode ? 'generator-modal__type-btn--active' : ''}`}
                        onClick={() => onUpdateConfig({ typeSpecialtyMode: opt.mode })}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            <span className="text-subtext generator-modal__type-hint">{getHintText()}</span>

            {currentMode === 'manual' && (
                <div className="generator-modal__type-pills">
                    {VALID_POKEMON_TYPES.map((t) => {
                        const isSel = manualTypes.includes(t);
                        const color = TYPE_COLORS[t] || 'var(--primary)';
                        return (
                            <button
                                key={t}
                                type="button"
                                className={`generator-modal__type-pill ${isSel ? 'generator-modal__type-pill--active' : ''}`}
                                style={{ '--type-color': color } as React.CSSProperties}
                                onClick={() => handleToggleManualType(t)}
                            >
                                {t}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
