import { useState } from 'react';
import { X, Sparkles, Tag, Check, Plus, FlameKindling } from 'lucide-react';
import type { CustomFieldEffect, FieldEffectCategory } from '../../store/storeTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { POKEMON_TYPES } from '../../data/constants';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import {
    AVAILABLE_FIELD_ICONS,
    PRESET_FIELD_COLORS,
    parseTagPills
} from './homebrewFieldEffectUtils';
import './HomebrewFieldEffect.css';

interface HomebrewFieldEffectModalProps {
    effect: CustomFieldEffect;
    isOpen: boolean;
    onClose: () => void;
}

export function renderCustomFieldIcon(iconKey: string, size = 16, className?: string) {
    const found = AVAILABLE_FIELD_ICONS.find((item) => item.key === iconKey);
    const Component = found ? found.Icon : Sparkles;
    return <Component size={size} className={className} />;
}

export function HomebrewFieldEffectModal({ effect, isOpen, onClose }: HomebrewFieldEffectModalProps) {
    const updateCustomFieldEffect = useCharacterStore((state) => state.updateCustomFieldEffect);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [selectedTypeForBoost, setSelectedTypeForBoost] = useState<string>('Fire');
    const [selectedStatForBuff, setSelectedStatForBuff] = useState<string>('Spe');
    const [selectedStatusForImmunity, setSelectedStatusForImmunity] = useState<string>('Burn');
    const [newTagInput, setNewTagInput] = useState<string>('');

    if (!isOpen) return null;

    const allTypes = [
        ...POKEMON_TYPES.filter((t) => t !== ''),
        ...roomCustomTypes.filter((t) => role === 'GM' || !t.gmOnly).map((t) => t.name)
    ];

    const tagList = parseTagPills(effect.tags || '');

    const handleAddTag = (rawTag: string) => {
        const trimmed = rawTag.trim();
        if (!trimmed) return;
        const formatted = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed : `[${trimmed}]`;
        const current = (effect.tags || '').trim();
        if (current.includes(formatted)) return;
        const updated = current ? `${current} ${formatted}` : formatted;
        updateCustomFieldEffect(effect.id, 'tags', updated);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        let updated = (effect.tags || '').replace(tagToRemove, '');
        updated = updated.replace(/\s+/g, ' ').trim();
        updateCustomFieldEffect(effect.id, 'tags', updated);
    };

    return (
        <div className="hb-fe-modal__overlay" onClick={onClose}>
            <div className="hb-fe-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="hb-fe-modal__header">
                    <h3
                        className="text-theme-header"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}
                    >
                        {renderCustomFieldIcon(effect.icon, 18)} Field Effect Smart Builder
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        style={{ padding: '4px' }}
                        aria-label="Close Modal"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="hb-fe-modal__body">
                    {/* Basic Info: Name & Category */}
                    <div className="hb-fe-modal__grid-2">
                        <div className="hb-fe-modal__section">
                            <label className="text-label">Effect Name</label>
                            <input
                                type="text"
                                className="bo-input bo-input--underline text-label"
                                value={effect.name}
                                onChange={(e) => updateCustomFieldEffect(effect.id, 'name', e.target.value)}
                                placeholder="e.g. Acid Rain, Misty Mire"
                            />
                        </div>

                        <div className="hb-fe-modal__section">
                            <label className="text-label">Category</label>
                            <select
                                className="bo-input bo-input--underline text-label"
                                value={effect.category}
                                onChange={(e) =>
                                    updateCustomFieldEffect(
                                        effect.id,
                                        'category',
                                        e.target.value as FieldEffectCategory
                                    )
                                }
                            >
                                <option value="weather">Weather (Active Weather)</option>
                                <option value="terrain">Terrain (Active Terrain)</option>
                                <option value="field">Field Effect (Other / Global)</option>
                            </select>
                        </div>
                    </div>

                    {/* Default Duration & GM Only */}
                    <div className="hb-fe-modal__grid-2">
                        <div className="hb-fe-modal__section">
                            <label className="text-label">Default Duration (Rounds)</label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                className="bo-input bo-input--underline text-label"
                                value={effect.defaultRounds ?? 4}
                                onChange={(e) =>
                                    updateCustomFieldEffect(
                                        effect.id,
                                        'defaultRounds',
                                        Math.max(1, parseInt(e.target.value, 10) || 1)
                                    )
                                }
                            />
                        </div>

                        {role === 'GM' && (
                            <div className="hb-fe-modal__section" style={{ justifyContent: 'center' }}>
                                <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(effect.gmOnly)}
                                        onChange={(e) => updateCustomFieldEffect(effect.id, 'gmOnly', e.target.checked)}
                                    />
                                    GM Only (Hidden from players)
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Visual Icon Selection */}
                    <div className="hb-fe-modal__section">
                        <label className="text-label">Lucide Icon</label>
                        <div className="hb-fe-icon-picker">
                            {AVAILABLE_FIELD_ICONS.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`hb-fe-icon-btn ${effect.icon === item.key ? 'hb-fe-icon-btn--active' : ''}`}
                                    onClick={() => updateCustomFieldEffect(effect.id, 'icon', item.key)}
                                    title={item.label}
                                >
                                    <item.Icon size={16} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Theme Color Selection */}
                    <div className="hb-fe-modal__section">
                        <label className="text-label">Badge & Aura Color</label>
                        <div className="hb-fe-color-picker">
                            {PRESET_FIELD_COLORS.map((col) => (
                                <button
                                    key={col}
                                    type="button"
                                    className={`hb-fe-color-swatch ${effect.color === col ? 'hb-fe-color-swatch--active' : ''}`}
                                    style={{ backgroundColor: col }}
                                    onClick={() => updateCustomFieldEffect(effect.id, 'color', col)}
                                    title={col}
                                />
                            ))}
                            <input
                                type="color"
                                value={effect.color || '#3B82F6'}
                                onChange={(e) => updateCustomFieldEffect(effect.id, 'color', e.target.value)}
                                title="Custom Hex Color"
                                style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    {/* Smart Archetype Preset Chips */}
                    <div className="hb-fe-modal__section">
                        <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FlameKindling size={14} /> Quick Archetype Templates
                        </label>
                        <div className="hb-fe-preset-chips">
                            {/* Type Damage Boost */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                    type="button"
                                    className="hb-fe-preset-chip"
                                    onClick={() => handleAddTag(`[Dmg Pool +1: ${selectedTypeForBoost}]`)}
                                    title="Add Type Damage Boost Tag"
                                >
                                    <Plus size={12} /> Dmg Pool +1:
                                </button>
                                <select
                                    className="bo-input text-subtext"
                                    value={selectedTypeForBoost}
                                    onChange={(e) => setSelectedTypeForBoost(e.target.value)}
                                    style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                                >
                                    {allTypes.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* End of Round Damage */}
                            <button
                                type="button"
                                className="hb-fe-preset-chip"
                                onClick={() => handleAddTag('[End of Round Damage: 1]')}
                                title="Add 1 Damage at End of Round"
                            >
                                <Plus size={12} /> [End of Round Damage: 1]
                            </button>

                            {/* End of Round Healing */}
                            <button
                                type="button"
                                className="hb-fe-preset-chip"
                                onClick={() => handleAddTag('[Heal 1 Round End]')}
                                title="Add 1 HP Healing at End of Round"
                            >
                                <Plus size={12} /> [Heal 1 Round End]
                            </button>

                            {/* Stat Stage Buff */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                    type="button"
                                    className="hb-fe-preset-chip"
                                    onClick={() => handleAddTag(`[${selectedStatForBuff} +1]`)}
                                    title="Add Stat Stage Buff"
                                >
                                    <Plus size={12} /> Stat Buff:
                                </button>
                                <select
                                    className="bo-input text-subtext"
                                    value={selectedStatForBuff}
                                    onChange={(e) => setSelectedStatForBuff(e.target.value)}
                                    style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                                >
                                    <option value="Spe">Spe +1</option>
                                    <option value="Def">Def +1</option>
                                    <option value="Sp.Def">Sp.Def +1</option>
                                    <option value="Atk">Atk +1</option>
                                    <option value="Sp.Atk">Sp.Atk +1</option>
                                    <option value="Acc">Acc +1</option>
                                    <option value="Eva">Eva +1</option>
                                </select>
                            </div>

                            {/* Status Immunity */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                    type="button"
                                    className="hb-fe-preset-chip"
                                    onClick={() => handleAddTag(`[Immune: ${selectedStatusForImmunity}]`)}
                                    title="Add Status Immunity"
                                >
                                    <Plus size={12} /> Status Immunity:
                                </button>
                                <select
                                    className="bo-input text-subtext"
                                    value={selectedStatusForImmunity}
                                    onChange={(e) => setSelectedStatusForImmunity(e.target.value)}
                                    style={{ padding: '2px 4px', fontSize: '0.75rem' }}
                                >
                                    <option value="Burn">Burn</option>
                                    <option value="Freeze">Freeze</option>
                                    <option value="Paralysis">Paralysis</option>
                                    <option value="Sleep">Sleep</option>
                                    <option value="Poison">Poison</option>
                                    <option value="Confusion">Confusion</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tags List & Advanced Tag Builder */}
                    <div className="hb-fe-modal__section">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={14} /> Active Combat Tags
                            </label>
                            <button
                                type="button"
                                className="action-button action-button--secondary"
                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                onClick={() => setShowTagBuilder(true)}
                            >
                                <Sparkles size={12} /> Advanced Tag Builder
                            </button>
                        </div>

                        <div className="hb-fe-card__tags-row" style={{ minHeight: '32px' }}>
                            {tagList.length === 0 ? (
                                <span className="text-subtext" style={{ fontStyle: 'italic' }}>
                                    No combat tags added yet. Pick templates above or use the Advanced Tag Builder.
                                </span>
                            ) : (
                                tagList.map((tagStr) => (
                                    <span key={tagStr} className="hb-fe-tag-pill">
                                        {tagStr}
                                        <button
                                            type="button"
                                            className="hb-fe-tag-pill__remove"
                                            onClick={() => handleRemoveTag(tagStr)}
                                            title="Remove tag"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>

                        {/* Direct tag input */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <input
                                type="text"
                                className="bo-input bo-input--underline text-label"
                                placeholder="Type custom tag e.g. [No Reactions]"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag(newTagInput);
                                        setNewTagInput('');
                                    }
                                }}
                            />
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => {
                                    handleAddTag(newTagInput);
                                    setNewTagInput('');
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    {/* Description Text */}
                    <div className="hb-fe-modal__section">
                        <label className="text-label">Description & Rules Text</label>
                        <textarea
                            className="bo-input text-subtext"
                            rows={3}
                            value={effect.description}
                            onChange={(e) => updateCustomFieldEffect(effect.id, 'description', e.target.value)}
                            placeholder="Describe how this weather or battlefield effect alters the environment..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="hb-fe-modal__footer">
                    <span className="text-subtext">All changes save instantly to your table.</span>
                    <button type="button" onClick={onClose} className="action-button action-button--secondary">
                        <Check size={14} /> Done
                    </button>
                </div>
            </div>

            {/* Embedded Tag Builder Modal */}
            {showTagBuilder && (
                <div onClick={(e) => e.stopPropagation()}>
                    <TagBuilderModal targetId={effect.id} targetType="homebrew_field_effect" onClose={() => setShowTagBuilder(false)} />
                </div>
            )}
        </div>
    );
}
