import { useState, useEffect, useMemo } from 'react';
import {
    Tag,
    X,
    Zap,
    Swords,
    Shield,
    Wrench,
    Clock,
    Sparkles,
    Flame,
    Plus,
    Award,
    TrendingUp,
    Check,
    Trash2,
    AlertTriangle,
    Search
} from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { POKEMON_TYPES } from '../../../data/constants';
import type { TagBuilderModalProps, TagBuilderConfig } from './tagBuilder/tagBuilderTypes';
import { useTagBuilderTarget } from './tagBuilder/useTagBuilderTarget';
import {
    getTargetOptions,
    showTypeSelect,
    showValueInput,
    PRESETS,
    getDefaultTargetForCategory
} from './tagBuilder/tagBuilderConstants';
import { buildTagString, generateExplanation, parseTagStringToConfig } from './tagBuilder/tagBuilderLogic';
import { searchEffects, type SearchResultItem } from './tagBuilder/tagBuilderSearch';
import { TagBuilderConfigSection } from './tagBuilder/TagBuilderConfigSection';
import { TagBuilderPreview } from './tagBuilder/TagBuilderPreview';
import './TagBuilderModal.css';

export function TagBuilderModal({ targetId, targetType, initialTag, onClose }: TagBuilderModalProps) {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const { targetName, existingTags, handleDeleteTag, handleReplaceTag, handleAppendTag } = useTagBuilderTarget(
        targetId,
        targetType
    );

    // Search Query State
    const [searchQuery, setSearchQuery] = useState('');

    // Tag Builder Configuration State
    const [config, setConfig] = useState<TagBuilderConfig>(() => {
        const defaults: TagBuilderConfig = {
            category: targetType === 'move' ? 'move_mechanics' : 'stat',
            target: targetType === 'move' ? 'High Critical' : 'Str',
            value: 1,
            value2: 6,
            reqGroup: 'none',
            typeOption: '',
            condition: 'none',
            customMaxStacks: 5
        };
        if (initialTag) {
            const parsed = parseTagStringToConfig(initialTag, targetType === 'move');
            if (parsed) {
                return {
                    ...defaults,
                    ...parsed,
                    value2: parsed.value2 ?? defaults.value2,
                    customMaxStacks: parsed.customMaxStacks ?? defaults.customMaxStacks
                };
            }
        }
        return defaults;
    });

    const updateConfig = <K extends keyof TagBuilderConfig>(key: K, val: TagBuilderConfig[K]) => {
        setConfig((prev) => ({ ...prev, [key]: val }));
    };

    // Double-confirmation safeguards for deletions
    const [confirmingChip, setConfirmingChip] = useState<string | null>(null);
    const [confirmDeleteInitial, setConfirmDeleteInitial] = useState(false);

    useEffect(() => {
        if (!confirmingChip) return;
        const timer = setTimeout(() => setConfirmingChip(null), 4000);
        return () => clearTimeout(timer);
    }, [confirmingChip]);

    useEffect(() => {
        if (!confirmDeleteInitial) return;
        const timer = setTimeout(() => setConfirmDeleteInitial(false), 4000);
        return () => clearTimeout(timer);
    }, [confirmDeleteInitial]);

    const types = [...POKEMON_TYPES.filter((t) => t !== ''), ...roomCustomTypes.map((t) => t.name)];

    const categories = [
        { id: 'stat', label: 'Attributes', icon: <Zap size={14} /> },
        { id: 'skill', label: 'Skills', icon: <Award size={14} /> },
        { id: 'combat', label: 'Combat', icon: <Swords size={14} /> },
        { id: 'matchup', label: 'Matchups', icon: <Shield size={14} /> },
        { id: 'mechanic', label: 'Mechanics', icon: <Wrench size={14} /> },
        { id: 'turn_based', label: 'Turn-Based', icon: <Clock size={14} /> },
        { id: 'status', label: 'Status', icon: <Sparkles size={14} /> },
        ...(targetType === 'move' ? [{ id: 'move_mechanics', label: 'Move Modifiers', icon: <Flame size={14} /> }] : [])
    ];

    const applyPreset = (presetKey: string) => {
        const preset = PRESETS[presetKey];
        if (preset) {
            setConfig((prev) => ({
                ...prev,
                ...preset,
                value2: preset.value2 ?? prev.value2,
                customMaxStacks: preset.customMaxStacks ?? prev.customMaxStacks
            }));
        }
    };

    const handleSelectCategory = (catId: string) => {
        const defaults = getDefaultTargetForCategory(catId);
        setConfig((prev) => ({
            ...prev,
            category: catId,
            target: defaults.target,
            reqGroup: defaults.reqGroup,
            typeOption: defaults.typeOption
        }));
    };

    const currentBuiltTag = buildTagString(config);
    const explanation = generateExplanation(config, currentBuiltTag);

    const handleConfirm = () => {
        if (currentBuiltTag) {
            if (initialTag) {
                handleReplaceTag(initialTag, currentBuiltTag);
            } else {
                handleAppendTag(currentBuiltTag);
            }
        }
        onClose();
    };

    const isMove = targetType === 'move';
    const searchResults = useMemo(() => {
        return searchEffects(searchQuery, isMove, extraCategories);
    }, [searchQuery, isMove, extraCategories]);

    const handleSelectSearchResult = (result: SearchResultItem) => {
        const defaults = getDefaultTargetForCategory(result.category);
        setConfig((prev) => ({
            ...prev,
            category: result.category,
            target: result.target,
            reqGroup: result.category === 'matchup' ? 'type' : defaults.reqGroup,
            typeOption: result.category === 'matchup' && !prev.typeOption ? 'Fire' : prev.typeOption
        }));
    };

    const targetOptions = getTargetOptions(config.category, extraCategories);
    const isTypeSelectVisible = showTypeSelect(config.category, config.target);
    const isValueInputVisible = showValueInput(config.category, config.target);

    return (
        <div className="tag-builder__overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="tag-builder__content">
                {/* Modal Header */}
                <div className="tag-builder__header">
                    <div className="tag-builder__title-group">
                        <Tag size={18} style={{ color: 'var(--primary, #3b82f6)' }} />
                        <h3 className="tag-builder__title text-theme-header">
                            {initialTag ? 'Edit Tag' : 'Tag Builder'}
                        </h3>
                        <span className="tag-builder__target-badge" title={targetName}>
                            {targetName}
                        </span>
                        {initialTag && (
                            <span
                                className="tag-builder__target-badge"
                                style={{ background: 'var(--primary)', color: '#fff' }}
                                title={initialTag}
                            >
                                {initialTag}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="tag-builder__close-btn"
                        title="Close Tag Builder"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Existing Tags Chip Bar */}
                <div className="tag-builder__existing-tags">
                    <span className="tag-builder__section-label">Current Tags on {targetName}:</span>
                    {existingTags.length > 0 ? (
                        <div className="tag-builder__chip-list">
                            {existingTags.map((et: string, i: number) => {
                                const isConfirming = confirmingChip === et;
                                return (
                                    <span
                                        key={i}
                                        className={`tag-builder__existing-chip ${
                                            isConfirming ? 'tag-builder__existing-chip--confirming' : ''
                                        }`}
                                    >
                                        {isConfirming ? 'Delete?' : et}
                                        {isConfirming ? (
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    marginLeft: '4px'
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDeleteTag(et);
                                                        setConfirmingChip(null);
                                                    }}
                                                    className="tag-builder__chip-del"
                                                    style={{ color: '#ef4444' }}
                                                    title={`Confirm delete ${et}`}
                                                >
                                                    <Check size={11} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingChip(null)}
                                                    className="tag-builder__chip-del"
                                                    title="Cancel"
                                                >
                                                    <X size={11} />
                                                </button>
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingChip(et)}
                                                className="tag-builder__chip-del"
                                                title={`Delete ${et} (requires confirmation)`}
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <span className="text-subtext" style={{ fontSize: '0.74rem', fontStyle: 'italic' }}>
                            No tags applied yet. Use the builder below to add one.
                        </span>
                    )}
                </div>

                {/* Quick Presets Bar */}
                <div>
                    <span className="tag-builder__section-label">Quick Presets:</span>
                    <div className="tag-builder__presets-bar">
                        <button type="button" onClick={() => applyPreset('stat')} className="tag-builder__preset-btn">
                            <Zap size={12} /> +1 Stat
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('stacking_boost')}
                            className="tag-builder__preset-btn"
                        >
                            <TrendingUp size={12} /> Stacking Boost
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('type_dmg')}
                            className="tag-builder__preset-btn"
                        >
                            <Flame size={12} /> Type Dmg
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('immunity')}
                            className="tag-builder__preset-btn"
                        >
                            <Shield size={12} /> Immunity
                        </button>
                        <button type="button" onClick={() => applyPreset('pinch')} className="tag-builder__preset-btn">
                            <Zap size={12} /> Half-HP Boost
                        </button>
                        <button
                            type="button"
                            onClick={() => applyPreset('high_crit')}
                            className="tag-builder__preset-btn"
                        >
                            <Swords size={12} /> High Crit
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="tag-builder__search-bar">
                    <Search size={14} className="tag-builder__search-icon" />
                    <input
                        type="text"
                        className="tag-builder__search-input"
                        placeholder="Search effects, stats, mechanics... (e.g. 'crit', 'poison', 'speed', 'heal')"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setSearchQuery('');
                            if (e.key === 'Enter' && searchResults.length > 0) {
                                handleSelectSearchResult(searchResults[0]);
                            }
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            className="tag-builder__search-clear"
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {searchQuery.trim() ? (
                    <div className="tag-builder__search-results">
                        <div className="tag-builder__search-header">
                            <span className="tag-builder__section-label">
                                Matching Effects ({searchResults.length}):
                            </span>
                            <button
                                type="button"
                                className="tag-builder__search-clear-link"
                                onClick={() => setSearchQuery('')}
                            >
                                Browse all categories
                            </button>
                        </div>
                        {searchResults.length > 0 ? (
                            <div className="tag-builder__search-grid">
                                {searchResults.map((item) => {
                                    const isSelected =
                                        config.category === item.category && config.target === item.target;
                                    const catObj = categories.find((c) => c.id === item.category);
                                    return (
                                        <button
                                            key={`${item.category}-${item.target}`}
                                            type="button"
                                            onClick={() => handleSelectSearchResult(item)}
                                            className={`tag-builder__search-item ${
                                                isSelected ? 'tag-builder__search-item--active' : ''
                                            }`}
                                        >
                                            <div className="tag-builder__search-item-top">
                                                {catObj?.icon}
                                                <span className="tag-builder__search-item-title">{item.target}</span>
                                            </div>
                                            <span className="tag-builder__search-item-cat">{item.categoryLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="tag-builder__search-empty">
                                No effects found matching &ldquo;{searchQuery}&rdquo;. Try another term or browse
                                categories below.
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Category Navigation Tabs */}
                        <div>
                            <span className="tag-builder__section-label">Category:</span>
                            <div className="tag-builder__categories">
                                {categories.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleSelectCategory(c.id)}
                                        className={`tag-builder__cat-tab ${config.category === c.id ? 'tag-builder__cat-tab--active' : ''}`}
                                    >
                                        {c.icon} {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Chip Selector */}
                        <div>
                            <span className="tag-builder__section-label">Select Target / Effect:</span>
                            <div className="tag-builder__targets-grid">
                                {targetOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => updateConfig('target', opt)}
                                        className={`tag-builder__target-chip ${config.target === opt ? 'tag-builder__target-chip--active' : ''}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Configuration: Requirement, Value & Condition */}
                <TagBuilderConfigSection
                    config={config}
                    onChangeConfig={updateConfig}
                    types={types}
                    showTypeSelect={isTypeSelectVisible}
                    showValueInput={isValueInputVisible}
                />

                {/* Live Tag Preview Card */}
                <TagBuilderPreview builtTag={currentBuiltTag} explanation={explanation} />

                {/* Modal Footer Actions */}
                <div className="tag-builder__actions">
                    {initialTag && (
                        <button
                            type="button"
                            className={`action-button action-button--red tag-builder__btn-del text-theme-header ${
                                confirmDeleteInitial ? 'tag-builder__btn-del--confirming' : ''
                            }`}
                            style={{ marginRight: 'auto' }}
                            onClick={() => {
                                if (!confirmDeleteInitial) {
                                    setConfirmDeleteInitial(true);
                                    return;
                                }
                                handleDeleteTag(initialTag);
                                onClose();
                            }}
                            title={confirmDeleteInitial ? `Confirm deletion of ${initialTag}` : `Delete ${initialTag}`}
                        >
                            {confirmDeleteInitial ? <AlertTriangle size={15} /> : <Trash2 size={15} />}
                            {confirmDeleteInitial ? 'Confirm Delete?' : 'Delete Tag'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="action-button action-button--dark tag-builder__btn-cancel text-theme-header"
                        onClick={onClose}
                    >
                        <X size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!currentBuiltTag}
                        className="action-button action-button--theme tag-builder__btn-confirm text-theme-header"
                        onClick={handleConfirm}
                    >
                        {initialTag ? <Check size={16} /> : <Plus size={16} />}
                        {initialTag ? 'Save Changes' : 'Append Tag'}
                    </button>
                </div>
            </div>
        </div>
    );
}
