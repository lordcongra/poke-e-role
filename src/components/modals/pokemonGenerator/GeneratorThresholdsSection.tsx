import type { GeneratorConfig } from '../../../store/storeTypes';
import { CombatStat, SocialStat } from '../../../types/enums';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { NumberSpinner } from '../../ui/NumberSpinner';

export interface GeneratorThresholdsSectionProps {
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    type1Label?: string;
    type2Label?: string;
    hasType2?: boolean;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function GeneratorThresholdsSection({
    config,
    onUpdateConfig,
    type1Label = 'Primary',
    type2Label = 'Secondary',
    hasType2 = false,
    onOpenTooltip
}: GeneratorThresholdsSectionProps) {
    const setMinStat = (stat: string, val: number) => {
        onUpdateConfig({ minStats: { ...(config.minStats || {}), [stat]: val } });
    };

    const setMinSocial = (stat: string, val: number) => {
        onUpdateConfig({ minSocials: { ...(config.minSocials || {}), [stat]: val } });
    };

    return (
        <div className="generator-modal__side-by-side">
            {/* COLUMN 1: Min Stats */}
            <div className="generator-modal__composition">
                <label className="generator-modal__comp-title text-title-primary">Guaranteed Minimum Ranks</label>
                <p className="generator-modal__comp-desc text-subtext">
                    Force the generator to allocate points here before processing its primary logic.
                </p>

                <div className="generator-modal__min-wrapper">
                    <div className="generator-modal__min-grid">
                        {Object.values(CombatStat).map((stat) => (
                            <div key={stat} className="generator-modal__min-item">
                                <span className="text-label text-subtext">{stat.toUpperCase()}</span>
                                <NumberSpinner
                                    compact
                                    min={0}
                                    max={5}
                                    value={config.minStats?.[stat] || 0}
                                    onChange={(val) => setMinStat(stat, val)}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="generator-modal__min-grid generator-modal__min-grid--spaced">
                        {Object.values(SocialStat).map((stat) => (
                            <div key={stat} className="generator-modal__min-item">
                                <span className="text-label text-subtext">{stat.toUpperCase()}</span>
                                <NumberSpinner
                                    compact
                                    min={0}
                                    max={5}
                                    value={config.minSocials?.[stat] || 0}
                                    onChange={(val) => setMinSocial(stat, val)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* COLUMN 2: Move Composition */}
            <div className="generator-modal__composition">
                <label className="generator-modal__comp-title text-title-primary">Move Composition</label>
                <p className="generator-modal__comp-desc text-subtext">
                    Insight will automatically scale to fit this total.
                </p>
                <div className="generator-modal__comp-row">
                    <div className="generator-modal__comp-item">
                        <span className="text-label">Attacks</span>
                        <NumberSpinner
                            min={0}
                            max={6}
                            value={config.targetAtkCount}
                            onChange={(val) => onUpdateConfig({ targetAtkCount: val })}
                        />
                    </div>
                    <div className="generator-modal__comp-item">
                        <span className="text-label">Support</span>
                        <NumberSpinner
                            min={0}
                            max={6}
                            value={config.targetSupCount}
                            onChange={(val) => onUpdateConfig({ targetSupCount: val })}
                        />
                    </div>
                </div>

                <div className="generator-modal__spillover-section">
                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={config.useSpilloverRatio}
                            onChange={(e) => onUpdateConfig({ useSpilloverRatio: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Use Custom Spillover Ratio?
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Spillover Ratio',
                                    desc: 'If high Insight grants you more Max Moves than your initial targets, this ratio determines how the extra slots are filled. (e.g. 2 Attacks for every 1 Support).'
                                })
                            }
                        />
                    </label>

                    {config.useSpilloverRatio && (
                        <>
                            <div className="generator-modal__spillover-inputs">
                                <div className="generator-modal__comp-item generator-modal__comp-item--row">
                                    <NumberSpinner
                                        value={config.spilloverAtkRatio}
                                        onChange={(val) => onUpdateConfig({ spilloverAtkRatio: val })}
                                        min={0}
                                        max={9}
                                    />
                                    <span className="text-label">Atk</span>
                                </div>
                                <span className="text-subtext">:</span>
                                <div className="generator-modal__comp-item generator-modal__comp-item--row">
                                    <NumberSpinner
                                        value={config.spilloverSupRatio}
                                        onChange={(val) => onUpdateConfig({ spilloverSupRatio: val })}
                                        min={0}
                                        max={9}
                                    />
                                    <span className="text-label">Sup</span>
                                </div>
                            </div>
                            <label className="generator-modal__checkbox-label generator-modal__checkbox-label--center text-subtext">
                                <input
                                    type="checkbox"
                                    checked={config.spilloverJitter}
                                    onChange={(e) => onUpdateConfig({ spilloverJitter: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Add +/- 25% Jitter
                            </label>
                        </>
                    )}
                </div>
            </div>

            {/* COLUMN 3: Attack Type Ratios */}
            {config.buildType !== 'wild' ? (
                <div className="generator-modal__composition">
                    <label className="generator-modal__comp-title text-title-primary">Attack Type Ratios</label>
                    <p className="generator-modal__comp-desc text-subtext">Override STAB counts & Coverage.</p>
                    <div className="generator-modal__coverage-section">
                        <div className="generator-modal__coverage-row">
                            <label className="generator-modal__checkbox-label text-label" title={type1Label}>
                                <input
                                    type="checkbox"
                                    checked={config.overridePrimaryStab}
                                    onChange={(e) => onUpdateConfig({ overridePrimaryStab: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                STAB 1
                            </label>
                            <NumberSpinner
                                min={0}
                                max={6}
                                value={config.primaryStabCount}
                                disabled={!config.overridePrimaryStab}
                                onChange={(val) => onUpdateConfig({ primaryStabCount: val })}
                            />
                        </div>
                        {hasType2 && (
                            <div className="generator-modal__coverage-row">
                                <label className="generator-modal__checkbox-label text-label" title={type2Label}>
                                    <input
                                        type="checkbox"
                                        checked={config.overrideSecondaryStab}
                                        onChange={(e) => onUpdateConfig({ overrideSecondaryStab: e.target.checked })}
                                        className="generator-modal__checkbox"
                                    />
                                    STAB 2
                                </label>
                                <NumberSpinner
                                    min={0}
                                    max={6}
                                    value={config.secondaryStabCount}
                                    disabled={!config.overrideSecondaryStab}
                                    onChange={(val) => onUpdateConfig({ secondaryStabCount: val })}
                                />
                            </div>
                        )}

                        <div className="generator-modal__coverage-select-wrapper">
                            <label className="text-label">Coverage Preference</label>
                            <select
                                value={config.coveragePreference}
                                onChange={(e) =>
                                    onUpdateConfig({
                                        coveragePreference: e.target.value as GeneratorConfig['coveragePreference']
                                    })
                                }
                                className="generator-modal__select generator-modal__coverage-select text-subtext"
                            >
                                <option value="balanced">Balanced (Auto)</option>
                                <option value="heavy">Prioritize Coverage</option>
                                <option value="none">STAB Only (No Coverage)</option>
                                <option value="fixed">Fixed Amount</option>
                            </select>
                            {config.coveragePreference === 'fixed' && (
                                <div className="generator-modal__coverage-fixed-row">
                                    <span className="text-subtext">Coverage Count</span>
                                    <NumberSpinner
                                        min={0}
                                        max={6}
                                        value={config.coverageCount}
                                        onChange={(val) => onUpdateConfig({ coverageCount: val })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="generator-modal__composition generator-modal__composition--disabled">
                    <label className="generator-modal__comp-title generator-modal__comp-title--disabled text-title-primary">
                        Attack Type Ratios
                    </label>
                    <p className="generator-modal__comp-desc text-subtext">Disabled during Wild (Random) Generation.</p>
                </div>
            )}
        </div>
    );
}
