import { useState } from 'react';
import type { ItemAttackAction } from '../../store/entityTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Swords, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { NumberSpinner } from '../ui/NumberSpinner';
import { TagPillList } from '../ui/TagPillList';
import { extractMoveTags } from '../modals/items/tagBuilder/tagBuilderLogic';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import './ItemAttackActionConfig.css';

const DEFAULT_TYPES = [
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
    'Fairy'
];

interface ItemAttackActionConfigProps {
    attackAction?: ItemAttackAction;
    onChange: (action: ItemAttackAction | undefined) => void;
    canEdit?: boolean;
}

export function ItemAttackActionConfig({ attackAction, onChange, canEdit = true }: ItemAttackActionConfigProps) {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const [isExpanded, setIsExpanded] = useState(() => Boolean(attackAction));
    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [tagBuilderInitialTag, setTagBuilderInitialTag] = useState<string | undefined>(undefined);

    const isEnabled = Boolean(attackAction);

    const allTypes = [
        ...DEFAULT_TYPES,
        ...(roomCustomTypes || []).map((t) => t.name).filter((n) => !DEFAULT_TYPES.includes(n))
    ];

    const handleToggleEnable = (enabled: boolean) => {
        if (!canEdit) return;
        if (enabled) {
            onChange({
                category: 'Physical',
                type: 'Normal',
                power: 1,
                acc1: 'dex',
                acc2: 'brawl',
                dmg1: 'str'
            });
            setIsExpanded(true);
        } else {
            onChange(undefined);
        }
    };

    const updateField = <K extends keyof ItemAttackAction>(key: K, value: ItemAttackAction[K]) => {
        if (!canEdit || !attackAction) return;
        onChange({
            ...attackAction,
            [key]: value
        });
    };

    const moveTags = extractMoveTags(attackAction?.tags || '');

    return (
        <div className="item-attack-action-config">
            <div className="item-attack-action-config__header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="item-attack-action-config__header-left">
                    <Swords size={15} style={{ color: isEnabled ? 'var(--primary, #3b82f6)' : 'var(--text-muted)' }} />
                    <span className="text-label" style={{ color: 'var(--text-main)' }}>
                        Attack / Move Action
                    </span>
                    {isEnabled && attackAction && (
                        <span className="item-attack-action-config__badge">
                            {attackAction.category} • {attackAction.type} • Pwr {attackAction.power}
                        </span>
                    )}
                </div>
                <div className="item-attack-action-config__header-right" onClick={(e) => e.stopPropagation()}>
                    <label className="item-attack-action-config__enable-toggle text-subtext">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            disabled={!canEdit}
                            onChange={(e) => handleToggleEnable(e.target.checked)}
                        />
                        <span>Enable</span>
                    </label>
                    <button
                        type="button"
                        className="action-button action-button--ghost"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {isExpanded && isEnabled && attackAction && (
                <div className="item-attack-action-config__body">
                    <div className="item-attack-action-config__row">
                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Category</span>
                            <select
                                className="item-attack-action-config__select"
                                value={attackAction.category}
                                disabled={!canEdit}
                                onChange={(e) =>
                                    updateField('category', e.target.value as 'Physical' | 'Special' | 'Status')
                                }
                            >
                                <option value="Physical">Physical</option>
                                <option value="Special">Special</option>
                                <option value="Status">Status</option>
                            </select>
                        </div>

                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Type</span>
                            <select
                                className="item-attack-action-config__select"
                                value={attackAction.type}
                                disabled={!canEdit}
                                onChange={(e) => updateField('type', e.target.value)}
                            >
                                {allTypes.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="item-attack-action-config__field item-attack-action-config__field--inline">
                            <span className="item-attack-action-config__label">Power</span>
                            <NumberSpinner
                                value={attackAction.power}
                                min={0}
                                max={99}
                                compact
                                disabled={!canEdit}
                                onChange={(val) => updateField('power', Math.max(0, val))}
                            />
                        </div>
                    </div>

                    <div className="item-attack-action-config__row">
                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Acc 1 (Stat)</span>
                            <div className="item-attack-action-config__dual-col">
                                <select
                                    className="item-attack-action-config__select"
                                    value={attackAction.acc1}
                                    disabled={!canEdit}
                                    onChange={(e) => updateField('acc1', e.target.value)}
                                >
                                    {Object.values(CombatStat).map((s) => (
                                        <option key={s} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                    {Object.values(SocialStat).map((s) => (
                                        <option key={s} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                    <option value="will">WILL</option>
                                </select>
                                <span className="item-attack-action-config__or-label text-subtext">or</span>
                                <select
                                    className="item-attack-action-config__select"
                                    value={attackAction.acc1Alt || ''}
                                    disabled={!canEdit}
                                    onChange={(e) => updateField('acc1Alt', e.target.value || undefined)}
                                >
                                    <option value="">-- None --</option>
                                    {Object.values(CombatStat).map((s) => (
                                        <option key={`alt1-${s}`} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                    {Object.values(SocialStat).map((s) => (
                                        <option key={`alt1-${s}`} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                    <option value="will">WILL</option>
                                </select>
                            </div>
                        </div>

                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Acc 2 (Skill)</span>
                            <div className="item-attack-action-config__dual-col">
                                <select
                                    className="item-attack-action-config__select"
                                    value={attackAction.acc2 || 'none'}
                                    disabled={!canEdit}
                                    onChange={(e) =>
                                        updateField('acc2', e.target.value === 'none' ? undefined : e.target.value)
                                    }
                                >
                                    <option value="none">-- None --</option>
                                    {Object.values(Skill).map((s) => (
                                        <option key={s} value={s}>
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                <span className="item-attack-action-config__or-label text-subtext">or</span>
                                <select
                                    className="item-attack-action-config__select"
                                    value={attackAction.acc2Alt || ''}
                                    disabled={!canEdit}
                                    onChange={(e) =>
                                        updateField(
                                            'acc2Alt',
                                            e.target.value && e.target.value !== 'none' ? e.target.value : undefined
                                        )
                                    }
                                >
                                    <option value="">-- None --</option>
                                    {Object.values(Skill).map((s) => (
                                        <option key={`alt2-${s}`} value={s}>
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Damage 1</span>
                            <div className="item-attack-action-config__dual-col">
                                <select
                                    className="item-attack-action-config__select"
                                    value={attackAction.dmg1 || ''}
                                    disabled={!canEdit}
                                    onChange={(e) => updateField('dmg1', e.target.value || undefined)}
                                >
                                    <option value="">-- None --</option>
                                    {Object.values(CombatStat).map((s) => (
                                        <option key={s} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                    {Object.values(SocialStat).map((s) => (
                                        <option key={s} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                                <span className="item-attack-action-config__or-label text-subtext">or</span>
                                <select
                                    className="item-attack-action-config__select"
                                    value={attackAction.dmg1Alt || ''}
                                    disabled={!canEdit}
                                    onChange={(e) => updateField('dmg1Alt', e.target.value || undefined)}
                                >
                                    <option value="">-- None --</option>
                                    {Object.values(CombatStat).map((s) => (
                                        <option key={`altdmg1-${s}`} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                    {Object.values(SocialStat).map((s) => (
                                        <option key={`altdmg1-${s}`} value={s}>
                                            {s.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="item-attack-action-config__tags-section">
                        <div className="item-attack-action-config__tags-header">
                            <span className="item-attack-action-config__label">Move Tags</span>
                            {canEdit && (
                                <button
                                    type="button"
                                    className="action-button action-button--dark text-subtext"
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    onClick={() => {
                                        setTagBuilderInitialTag(undefined);
                                        setShowTagBuilder(true);
                                    }}
                                >
                                    <Tag size={12} /> Add Tags
                                </button>
                            )}
                        </div>
                        <TagPillList
                            tags={moveTags}
                            onEditTag={(tagStr) => {
                                setTagBuilderInitialTag(tagStr);
                                setShowTagBuilder(true);
                            }}
                            onDeleteTag={(rawTag) => {
                                const currentTags = attackAction.tags || '';
                                const updated = currentTags
                                    .replace(rawTag, '')
                                    .replace(/\s+/g, ' ')
                                    .replace(/\s*\.\s*\./g, '.')
                                    .trim();
                                updateField('tags', updated || undefined);
                            }}
                            onAddTag={() => {
                                setTagBuilderInitialTag(undefined);
                                setShowTagBuilder(true);
                            }}
                            emptyText="No tags configured"
                            addLabel="Add Tags"
                            showAddButton={false}
                        />
                    </div>

                    <div className="item-attack-action-config__row">
                        <div className="item-attack-action-config__field item-attack-action-config__field--inline">
                            <span className="item-attack-action-config__label">Chance Dice</span>
                            <NumberSpinner
                                value={attackAction.chanceDice ?? 0}
                                min={0}
                                max={6}
                                compact
                                disabled={!canEdit}
                                onChange={(val) => updateField('chanceDice', val <= 0 ? undefined : val)}
                            />
                        </div>

                        <div className="item-attack-action-config__field" style={{ flex: 1.5 }}>
                            <span className="item-attack-action-config__label">Chance Effect</span>
                            <input
                                type="text"
                                className="item-attack-action-config__input"
                                placeholder="e.g. 1st Degree Burn"
                                value={attackAction.chanceEffect || ''}
                                disabled={!canEdit}
                                onChange={(e) => updateField('chanceEffect', e.target.value || undefined)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showTagBuilder && attackAction && (
                <TagBuilderModal
                    targetType="move"
                    targetName="Item Move Action"
                    initialTag={tagBuilderInitialTag}
                    initialTagsText={attackAction.tags || ''}
                    onSaveTagsText={(newTags) => {
                        updateField('tags', newTags || undefined);
                    }}
                    onClose={() => {
                        setShowTagBuilder(false);
                        setTagBuilderInitialTag(undefined);
                    }}
                />
            )}
        </div>
    );
}
