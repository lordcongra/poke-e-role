import { useState } from 'react';
import type { ItemAttackAction } from '../../store/entityTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Swords, ChevronDown, ChevronUp } from 'lucide-react';
import { NumberSpinner } from '../ui/NumberSpinner';
import './ItemAttackActionConfig.css';

const DEFAULT_TYPES = [
    'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Steel', 'Dark', 'Fairy'
];

interface ItemAttackActionConfigProps {
    attackAction?: ItemAttackAction;
    onChange: (action: ItemAttackAction | undefined) => void;
    canEdit?: boolean;
}

export function ItemAttackActionConfig({
    attackAction,
    onChange,
    canEdit = true
}: ItemAttackActionConfigProps) {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const [isExpanded, setIsExpanded] = useState(() => Boolean(attackAction));

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

    return (
        <div className="item-attack-action-config">
            <div
                className="item-attack-action-config__header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
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
                                onChange={(e) => updateField('category', e.target.value as 'Physical' | 'Special' | 'Status')}
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
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="item-attack-action-config__field" style={{ maxWidth: '95px' }}>
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
                            <select
                                className="item-attack-action-config__select"
                                value={attackAction.acc1}
                                disabled={!canEdit}
                                onChange={(e) => updateField('acc1', e.target.value)}
                            >
                                {Object.values(CombatStat).map((s) => (
                                    <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                                {Object.values(SocialStat).map((s) => (
                                    <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                                <option value="will">WILL</option>
                            </select>
                        </div>

                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Acc 2 (Skill)</span>
                            <select
                                className="item-attack-action-config__select"
                                value={attackAction.acc2 || 'none'}
                                disabled={!canEdit}
                                onChange={(e) => updateField('acc2', e.target.value === 'none' ? undefined : e.target.value)}
                            >
                                <option value="none">-- None --</option>
                                {Object.values(Skill).map((s) => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div className="item-attack-action-config__field">
                            <span className="item-attack-action-config__label">Damage 1</span>
                            <select
                                className="item-attack-action-config__select"
                                value={attackAction.dmg1 || ''}
                                disabled={!canEdit}
                                onChange={(e) => updateField('dmg1', e.target.value || undefined)}
                            >
                                <option value="">-- None --</option>
                                {Object.values(CombatStat).map((s) => (
                                    <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                                {Object.values(SocialStat).map((s) => (
                                    <option key={s} value={s}>{s.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="item-attack-action-config__row">
                        <div className="item-attack-action-config__field" style={{ flex: 2 }}>
                            <span className="item-attack-action-config__label">Tags</span>
                            <input
                                type="text"
                                className="item-attack-action-config__input"
                                placeholder="e.g. [High Critical], [Low Acc 1]"
                                value={attackAction.tags || ''}
                                disabled={!canEdit}
                                onChange={(e) => updateField('tags', e.target.value || undefined)}
                            />
                        </div>

                        <div className="item-attack-action-config__field" style={{ maxWidth: '95px' }}>
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
        </div>
    );
}
