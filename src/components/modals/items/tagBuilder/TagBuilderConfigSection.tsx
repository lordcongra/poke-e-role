import { NumberSpinner } from '../../../ui/NumberSpinner';
import type { TagBuilderConfig, RequirementGroup } from './tagBuilderTypes';
import { CATEGORIES, MISC, MODIFIERS } from './tagBuilderConstants';

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
