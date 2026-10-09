import type { GeneratorConfig } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { NumberSpinner } from '../../ui/NumberSpinner';

export interface GeneratorBuildSettingsSectionProps {
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function GeneratorBuildSettingsSection({
    config,
    onUpdateConfig,
    onOpenTooltip
}: GeneratorBuildSettingsSectionProps) {
    return (
        <>
            {/* Build Tier, Combat Bias & Defensive Preference */}
            <div className="generator-modal__row">
                <div className="generator-modal__col">
                    <label className="text-label">Build Tier:</label>
                    <select
                        value={config.buildType}
                        onChange={(e) => onUpdateConfig({ buildType: e.target.value as GeneratorConfig['buildType'] })}
                        className="generator-modal__select text-label"
                    >
                        <option value="wild">Wild (Random)</option>
                        <option value="average">Average</option>
                        <option value="minmax">Min-Max</option>
                    </select>
                </div>
                <div className="generator-modal__col">
                    <label className="text-label">
                        Combat Bias:
                        {config.autoSelectBias && (
                            <span
                                className="text-subtext"
                                style={{ color: 'var(--primary)', marginLeft: '6px', fontWeight: 'bold' }}
                            >
                                (Auto-Detected)
                            </span>
                        )}
                    </label>
                    <select
                        value={config.autoSelectBias ? 'auto' : config.combatBias}
                        onChange={(e) =>
                            onUpdateConfig({ combatBias: e.target.value as GeneratorConfig['combatBias'] })
                        }
                        className="generator-modal__select text-label"
                        disabled={config.autoSelectBias}
                    >
                        {config.autoSelectBias && <option value="auto">Auto-Detect (Phys vs Spec)</option>}
                        <option value="balanced">Balanced</option>
                        <option value="physical">Physical Attacker</option>
                        <option value="special">Special Attacker</option>
                        <option value="tank">Tank / Defender</option>
                        <option value="support">Status / Support</option>
                    </select>
                </div>
                <div className="generator-modal__col">
                    <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Defense Style:
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Defensive Style',
                                    desc: 'Determines how defensive skill points (Evasion vs Clash) are prioritized. "Auto" evaluates potential dice pools with an inherent preference for Evasion (dodging).'
                                })
                            }
                        />
                    </label>
                    <select
                        value={config.defensePreference || 'auto'}
                        onChange={(e) =>
                            onUpdateConfig({
                                defensePreference: e.target.value as GeneratorConfig['defensePreference']
                            })
                        }
                        className="generator-modal__select text-label"
                        disabled={config.buildType === 'wild'}
                    >
                        <option value="auto">Auto (Smart Choice)</option>
                        <option value="evasion">Evasion Focus (Dodge)</option>
                        <option value="clash">Clash Focus (Counter/Block)</option>
                        <option value="balanced">Balanced (Split 50/50)</option>
                    </select>
                </div>
            </div>

            {/* 2-Column Checkbox Grid */}
            <div className="generator-modal__checkbox-group">
                {/* LEFT COLUMN: Basic Settings */}
                <div className="generator-modal__checkbox-col">
                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={config.ensureDefenses}
                            onChange={(e) => onUpdateConfig({ ensureDefenses: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Ensure Minimum Defenses (Scales with Rank)
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Ensure Minimum Defenses',
                                    desc: 'Calculates a defense quota by dividing total attribute points by 4. It guarantees Vitality and Insight reach this minimum quota before allocating points to offensive stats. Turn off for glass-cannon builds.'
                                })
                            }
                        />
                    </label>

                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                        <input
                            type="checkbox"
                            checked={config.includePmd}
                            onChange={(e) => onUpdateConfig({ includePmd: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Include Knowledge Skills (Lore, Medicine, etc.)
                    </label>
                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                        <input
                            type="checkbox"
                            checked={config.includeCustom}
                            onChange={(e) => onUpdateConfig({ includeCustom: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Include Custom Homebrew Skills
                    </label>
                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                        <input
                            type="checkbox"
                            checked={config.randomizeSpecies}
                            onChange={(e) => onUpdateConfig({ randomizeSpecies: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Randomize Species
                    </label>
                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--indented text-label">
                        <input
                            type="checkbox"
                            checked={config.autoSelectBias}
                            onChange={(e) => onUpdateConfig({ autoSelectBias: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        <span style={{ fontWeight: 'normal' }}>Auto-Detect Attack Bias (Phys vs Spec)</span>
                    </label>
                </div>

                {/* RIGHT COLUMN: Identity & Move Settings */}
                <div className="generator-modal__checkbox-col">
                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={config.randomizeGender}
                            onChange={(e) => onUpdateConfig({ randomizeGender: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Randomize Gender (50/50 M/F)
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Randomize Gender',
                                    desc: 'Randomly assigns the Pokémon a 50/50 chance of being Male or Female upon generation.'
                                })
                            }
                        />
                    </label>

                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                        <input
                            type="checkbox"
                            checked={config.randomizeNature}
                            onChange={(e) => onUpdateConfig({ randomizeNature: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Randomize Nature
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Randomize Nature',
                                    desc: 'Randomly assigns a nature from the standard list of 25 Pokémon natures upon generation.'
                                })
                            }
                        />
                    </label>

                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                        <input
                            type="checkbox"
                            checked={config.includePreEvolutions}
                            onChange={(e) => onUpdateConfig({ includePreEvolutions: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Include Pre-Evolution Moves
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Pre-Evolution Fetching',
                                    desc: "Automatically traces your Pokémon's evolution line backwards to generate a broader move pool! Use the rank offset spinners below to simulate how many ranks ago this Pokémon evolved. Mega evolutions are automatically recognized and will share the base form's rank."
                                })
                            }
                        />
                    </label>
                    {config.includePreEvolutions && (
                        <div className="generator-modal__evo-group">
                            <div className="generator-modal__evo-box">
                                <strong className="generator-modal__evo-title text-title-primary">
                                    2-Stage Lines (e.g. Vulpix → Ninetales)
                                </strong>
                                <div className="generator-modal__evo-row">
                                    <span className="text-subtext">Base Form (Offset Down)</span>
                                    <NumberSpinner
                                        value={config.evo2Stage1Offset}
                                        onChange={(val) => onUpdateConfig({ evo2Stage1Offset: val })}
                                        min={0}
                                        max={7}
                                    />
                                </div>
                            </div>
                            <div className="generator-modal__evo-box">
                                <strong className="generator-modal__evo-title text-title-primary">
                                    3-Stage Lines (e.g. Charmander → Charizard)
                                </strong>
                                <div className="generator-modal__evo-row generator-modal__evo-row--spaced">
                                    <span className="text-subtext">Middle Form (Offset Down)</span>
                                    <NumberSpinner
                                        value={config.evo3Stage2Offset}
                                        onChange={(val) => onUpdateConfig({ evo3Stage2Offset: val })}
                                        min={0}
                                        max={7}
                                    />
                                </div>
                                <div className="generator-modal__evo-row">
                                    <span className="text-subtext">Base Form (Offset Down)</span>
                                    <NumberSpinner
                                        value={config.evo3Stage1Offset}
                                        onChange={(val) => onUpdateConfig({ evo3Stage1Offset: val })}
                                        min={0}
                                        max={7}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                        <input
                            type="checkbox"
                            checked={config.allowOverrank}
                            onChange={(e) => onUpdateConfig({ allowOverrank: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Allow Overrank (Draft 1 Higher Rank Move)
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Overrank Generation',
                                    desc: 'Forces the generator to select exactly one move that normally belongs to a higher rank tier, expanding your tactical options.'
                                })
                            }
                        />
                    </label>
                    {config.allowOverrank && (
                        <div className="generator-modal__evo-group">
                            <div className="generator-modal__evo-box generator-modal__evo-row">
                                <span className="text-label">Max Ranks Above</span>
                                <NumberSpinner
                                    value={config.overrankAmount}
                                    onChange={(val) => onUpdateConfig({ overrankAmount: val })}
                                    min={1}
                                    max={7}
                                />
                            </div>
                            <label className="generator-modal__checkbox-label text-subtext">
                                <input
                                    type="checkbox"
                                    checked={config.allowPreEvoOverrank}
                                    onChange={(e) => onUpdateConfig({ allowPreEvoOverrank: e.target.checked })}
                                    className="generator-modal__checkbox"
                                    disabled={!config.includePreEvolutions}
                                />
                                <span style={{ fontWeight: 'normal' }}>Include Pre-Evolutions in Pool</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
