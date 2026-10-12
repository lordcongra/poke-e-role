import { useMemo } from 'react';
import { NumberSpinner } from '../../../ui/NumberSpinner';
import type { TagBuilderConfig, RequirementGroup } from './tagBuilderTypes';
import { CATEGORIES, MISC, MODIFIERS } from './tagBuilderConstants';
import { useCharacterStore } from '../../../../store/useCharacterStore';

const CANONICAL_BATTLEFIELD_CONDITIONS = [
    { value: 'rain', label: 'While in Rain' },
    { value: 'sun', label: 'While in Harsh Sunlight' },
    { value: 'sandstorm', label: 'While in Sandstorm' },
    { value: 'snow', label: 'While in Snow / Hail' },
    { value: 'electric terrain', label: 'While on Electric Terrain' },
    { value: 'grassy terrain', label: 'While on Grassy Terrain' },
    { value: 'misty terrain', label: 'While on Misty Terrain' },
    { value: 'psychic terrain', label: 'While on Psychic Terrain' },
    { value: 'trick room', label: 'While in Trick Room' },
    { value: 'gravity', label: 'While in Gravity' }
];

interface TagBuilderConfigSectionProps {
    config: TagBuilderConfig;
    onChangeConfig: <K extends keyof TagBuilderConfig>(key: K, value: TagBuilderConfig[K]) => void;
    types: string[];
    showTypeSelect: boolean;
    showValueInput: boolean;
}

export function TagBuilderConfigSection({
    config,
    onChangeConfig,
    types,
    showTypeSelect,
    showValueInput
}: TagBuilderConfigSectionProps) {
    const { category, target, value, value2, reqGroup, typeOption, condition, customMaxStacks } = config;
    const roomCustomFieldEffects = useCharacterStore((state) => state.roomCustomFieldEffects);

    const customBattlefieldOptions = useMemo(() => {
        const canonicalValues = new Set(CANONICAL_BATTLEFIELD_CONDITIONS.map((c) => c.value.toLowerCase()));
        const seen = new Set<string>();
        const options: { value: string; label: string }[] = [];

        (roomCustomFieldEffects || []).forEach((eff) => {
            const rawTag = eff.conditionTag?.trim() || eff.name.trim();
            const tagKey = rawTag.toLowerCase();
            if (!tagKey || canonicalValues.has(tagKey) || seen.has(tagKey)) return;
            seen.add(tagKey);

            options.push({
                value: tagKey,
                label: `While in ${eff.name} (@ ${rawTag})`
            });
        });

        return options;
    }, [roomCustomFieldEffects]);

    return (
        <div className="tag-builder__config-section">
            {/* Requirement Filter (Type, Keyword, etc.) */}
            {showTypeSelect && (
                <div className="tag-builder__row">
                    <span className="tag-builder__row-label">Move Filter:</span>
                    <select
                        className="identity-grid__select tag-builder__select text-label"
                        style={{ color: 'var(--text-main)', flex: 1 }}
                        value={reqGroup}
                        onChange={(e) => {
                            const grp = e.target.value as RequirementGroup;
                            onChangeConfig('reqGroup', grp);
                            if (grp === 'type') onChangeConfig('typeOption', 'Fire');
                            else if (grp === 'category') onChangeConfig('typeOption', 'Physical');
                            else if (grp === 'modifier') onChangeConfig('typeOption', 'Bite Move');
                            else if (grp === 'misc') onChangeConfig('typeOption', 'Super Effective');
                            else onChangeConfig('typeOption', '');
                        }}
                    >
                        {category !== 'matchup' && <option value="none">-- All Moves (No Requirement) --</option>}
                        <option value="type">By Pokémon Type</option>
                        <option value="modifier">By Move Keyword</option>
                        <option value="category">By Damage Category</option>
                        <option value="misc">Miscellaneous</option>
                    </select>

                    {reqGroup !== 'none' && (
                        <select
                            className="identity-grid__select tag-builder__select text-label"
                            style={{ color: 'var(--text-main)', flex: 1 }}
                            value={typeOption}
                            onChange={(e) => onChangeConfig('typeOption', e.target.value)}
                        >
                            {reqGroup === 'type' &&
                                types.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            {reqGroup === 'modifier' &&
                                MODIFIERS.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            {reqGroup === 'category' &&
                                CATEGORIES.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                            {reqGroup === 'misc' &&
                                MISC.map((t) => (
                                    <option key={t} value={t}>
                                        {t}
                                    </option>
                                ))}
                        </select>
                    )}
                </div>
            )}

            {/* Value Input with Stepper buttons */}
            {showValueInput && (
                <div className="tag-builder__row">
                    <span className="tag-builder__row-label">Value:</span>
                    <NumberSpinner value={value} onChange={(val) => onChangeConfig('value', val)} min={-99} max={99} />

                    {target === 'Acc [X]s Add Dmg Limit [Y]' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
                            <span className="text-label" style={{ fontSize: '0.75rem' }}>
                                Limit:
                            </span>
                            <NumberSpinner
                                value={value2}
                                onChange={(val) => onChangeConfig('value2', val)}
                                min={1}
                                max={99}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Condition Selector */}
            <div className="tag-builder__row">
                <span className="tag-builder__row-label">Condition:</span>
                <select
                    className="identity-grid__select tag-builder__select text-label"
                    style={{ color: 'var(--text-main)', flex: 1 }}
                    value={condition}
                    onChange={(e) => onChangeConfig('condition', e.target.value)}
                >
                    <optgroup label="General Conditions">
                        <option value="none">Always Active</option>
                        <option value="half hp">At Half HP or Less (Pinch)</option>
                    </optgroup>
                    <optgroup label="Boost Triggers">
                        <option value="boost">Static Boost (Toggle ON/OFF)</option>
                        <option value="stacking_boost">Stacking Boost (Stepper 1-3)</option>
                        <option value="custom_stacking_boost">Stacking Boost (Custom Max Stacks)</option>
                    </optgroup>
                    <optgroup label="Battlefield & Weather Conditions">
                        <option value="rain">While in Rain</option>
                        <option value="sun">While in Harsh Sunlight</option>
                        <option value="sandstorm">While in Sandstorm</option>
                        <option value="snow">While in Snow / Hail</option>
                        <option value="electric terrain">While on Electric Terrain</option>
                        <option value="grassy terrain">While on Grassy Terrain</option>
                        <option value="misty terrain">While on Misty Terrain</option>
                        <option value="psychic terrain">While on Psychic Terrain</option>
                        <option value="trick room">While in Trick Room</option>
                        <option value="gravity">While in Gravity</option>
                        {customBattlefieldOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </optgroup>
                    <optgroup label="Status Conditions">
                        <option value="status">While Afflicted by Any Status</option>
                        <option value="burn">While Afflicted by Burn</option>
                        <option value="1st degree burn">While Afflicted by 1st Degree Burn</option>
                        <option value="2nd degree burn">While Afflicted by 2nd Degree Burn</option>
                        <option value="3rd degree burn">While Afflicted by 3rd Degree Burn</option>
                        <option value="poison">While Afflicted by Poison</option>
                        <option value="badly poisoned">While Afflicted by Badly Poisoned</option>
                        <option value="paralysis">While Afflicted by Paralysis</option>
                        <option value="frozen solid">While Afflicted by Frozen Solid</option>
                        <option value="sleep">While Afflicted by Sleep</option>
                        <option value="confusion">While Afflicted by Confusion</option>
                        <option value="in love">While Afflicted by In Love</option>
                        <option value="disable">While Afflicted by Disable</option>
                        <option value="flinch">While Afflicted by Flinch</option>
                    </optgroup>
                </select>
            </div>

            {/* Custom Stacks Configuration */}
            {condition === 'custom_stacking_boost' && (
                <div className="tag-builder__row">
                    <span className="tag-builder__row-label">Max Stacks:</span>
                    <NumberSpinner
                        value={customMaxStacks}
                        onChange={(val) => onChangeConfig('customMaxStacks', Math.max(2, val))}
                        min={2}
                        max={99}
                    />
                    <span className="text-subtext" style={{ fontSize: '0.74rem' }}>
                        (Stepper will scale 0 up to {customMaxStacks})
                    </span>
                </div>
            )}
        </div>
    );
}
