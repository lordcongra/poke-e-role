import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { generateBuild } from '../../utils/generatorUtils';
import type { TempBuild } from '../../store/storeTypes';
import { CombatStat, SocialStat } from '../../types/enums';
import { GeneratorPreviewModal } from './GeneratorPreviewModal';
import { TooltipIcon } from '../ui/TooltipIcon';
import { NumberSpinner } from '../ui/NumberSpinner';
import './GeneratorModal.css';

export function GeneratorModal({ onClose }: { onClose: () => void }) {
    const state = useCharacterStore();
    const config = useCharacterStore((s) => s.generatorConfig);
    const setConfig = useCharacterStore((s) => s.setGeneratorConfig);
    const speciesName = state.identity.species;

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewBuild, setPreviewBuild] = useState<TempBuild | null>(null);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    const hasType2 = state.identity.type2 && state.identity.type2 !== 'None';
    const type1Label = state.identity.type1 || 'Primary';
    const type2Label = hasType2 ? state.identity.type2 : 'Secondary';

    const setMinStat = (stat: string, val: number) => {
        setConfig({ minStats: { ...(config.minStats || {}), [stat]: val } });
    };

    const setMinSocial = (stat: string, val: number) => {
        setConfig({ minSocials: { ...(config.minSocials || {}), [stat]: val } });
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const result = await generateBuild(config, state);
            if (result) {
                setPreviewBuild(result);
            } else {
                alert(`Failed to generate build. Check console for details.`);
            }
        } catch (error) {
            console.error('Auto-Build Error:', error);
            alert(
                `An error occurred while generating the build: ${error instanceof Error ? error.message : 'Unknown Error'}`
            );
        } finally {
            setIsGenerating(false);
        }
    };

    if (previewBuild) {
        return (
            <GeneratorPreviewModal
                build={previewBuild}
                onClose={() => {
                    setPreviewBuild(null);
                    onClose();
                }}
                onReroll={handleGenerate}
            />
        );
    }

    return (
        <div className="generator-modal__overlay">
            <div className="generator-modal__content">
                <h3 className="generator-modal__title">🎲 Auto-Build Pokémon</h3>
                <p className="generator-modal__desc">Generate stats, skills, and moves based on current Rank.</p>

                <div className="generator-modal__form-group">
                    <div className="generator-modal__row">
                        <div className="generator-modal__col">
                            <label className="generator-modal__label">Build Tier:</label>
                            <select
                                value={config.buildType}
                                onChange={(e) => setConfig({ buildType: e.target.value })}
                                className="generator-modal__select"
                            >
                                <option value="wild">Wild (Random)</option>
                                <option value="average">Average</option>
                                <option value="minmax">Min-Max</option>
                            </select>
                        </div>
                        <div className="generator-modal__col">
                            <label className="generator-modal__label">Combat Bias:</label>
                            <select
                                value={config.combatBias}
                                onChange={(e) => setConfig({ combatBias: e.target.value })}
                                className="generator-modal__select"
                                disabled={config.randomizeSpecies && config.autoSelectBias}
                            >
                                <option value="balanced">Balanced</option>
                                <option value="physical">Physical Attacker</option>
                                <option value="special">Special Attacker</option>
                                <option value="tank">Tank / Defender</option>
                                <option value="support">Status / Support</option>
                            </select>
                        </div>
                    </div>

                    <div className="generator-modal__side-by-side">
                        {/* COLUMN 1: Min Stats */}
                        <div className="generator-modal__composition">
                            <label className="generator-modal__comp-title">Guaranteed Minimum Ranks</label>
                            <p className="generator-modal__comp-desc">
                                Force the generator to allocate points here before processing its primary logic.
                            </p>

                            <div className="generator-modal__min-wrapper">
                                <div className="generator-modal__min-grid">
                                    {Object.values(CombatStat).map((stat) => (
                                        <div key={stat} className="generator-modal__min-item">
                                            <span className="generator-modal__min-label">{stat.toUpperCase()}</span>
                                            <input
                                                type="number"
                                                value={config.minStats?.[stat] || 0}
                                                onChange={(e) => setMinStat(stat, Number(e.target.value))}
                                                min="0"
                                                max="5"
                                                className="generator-modal__comp-input"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="generator-modal__min-grid generator-modal__min-grid--spaced">
                                    {Object.values(SocialStat).map((stat) => (
                                        <div key={stat} className="generator-modal__min-item">
                                            <span className="generator-modal__min-label">{stat.toUpperCase()}</span>
                                            <input
                                                type="number"
                                                value={config.minSocials?.[stat] || 0}
                                                onChange={(e) => setMinSocial(stat, Number(e.target.value))}
                                                min="0"
                                                max="5"
                                                className="generator-modal__comp-input"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: Move Composition */}
                        <div className="generator-modal__composition">
                            <label className="generator-modal__comp-title">Move Composition</label>
                            <p className="generator-modal__comp-desc">
                                Insight will automatically scale to fit this total.
                            </p>
                            <div className="generator-modal__comp-row">
                                <div className="generator-modal__comp-item">
                                    <span className="generator-modal__comp-label">Attacks</span>
                                    <input
                                        type="number"
                                        value={config.targetAtkCount}
                                        onChange={(e) => setConfig({ targetAtkCount: Number(e.target.value) })}
                                        min="0"
                                        max="6"
                                        className="generator-modal__comp-input"
                                    />
                                </div>
                                <div className="generator-modal__comp-item">
                                    <span className="generator-modal__comp-label">Support</span>
                                    <input
                                        type="number"
                                        value={config.targetSupCount}
                                        onChange={(e) => setConfig({ targetSupCount: Number(e.target.value) })}
                                        min="0"
                                        max="6"
                                        className="generator-modal__comp-input"
                                    />
                                </div>
                            </div>

                            <div className="generator-modal__spillover-section">
                                <label className="generator-modal__checkbox-label generator-modal__checkbox-label--bold">
                                    <input
                                        type="checkbox"
                                        checked={config.useSpilloverRatio}
                                        onChange={(e) => setConfig({ useSpilloverRatio: e.target.checked })}
                                        className="generator-modal__checkbox"
                                    />
                                    Use Custom Spillover Ratio?
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
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
                                                    onChange={(val) => setConfig({ spilloverAtkRatio: val })}
                                                    min={0}
                                                    max={9}
                                                />
                                                <span className="generator-modal__spillover-text">Atk</span>
                                            </div>
                                            <span className="generator-modal__spillover-colon">:</span>
                                            <div className="generator-modal__comp-item generator-modal__comp-item--row">
                                                <NumberSpinner
                                                    value={config.spilloverSupRatio}
                                                    onChange={(val) => setConfig({ spilloverSupRatio: val })}
                                                    min={0}
                                                    max={9}
                                                />
                                                <span className="generator-modal__spillover-text">Sup</span>
                                            </div>
                                        </div>
                                        <label className="generator-modal__checkbox-label generator-modal__checkbox-label--center">
                                            <input
                                                type="checkbox"
                                                checked={config.spilloverJitter}
                                                onChange={(e) => setConfig({ spilloverJitter: e.target.checked })}
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
                                <label className="generator-modal__comp-title">Attack Type Ratios</label>
                                <p className="generator-modal__comp-desc">Override STAB counts & Coverage.</p>
                                <div className="generator-modal__coverage-section">
                                    <div className="generator-modal__coverage-row">
                                        <label className="generator-modal__checkbox-label" title={type1Label}>
                                            <input
                                                type="checkbox"
                                                checked={config.overridePrimaryStab}
                                                onChange={(e) => setConfig({ overridePrimaryStab: e.target.checked })}
                                                className="generator-modal__checkbox"
                                            />
                                            STAB 1
                                        </label>
                                        <input
                                            type="number"
                                            value={config.primaryStabCount}
                                            onChange={(e) => setConfig({ primaryStabCount: Number(e.target.value) })}
                                            min="0"
                                            max="6"
                                            className="generator-modal__comp-input"
                                            disabled={!config.overridePrimaryStab}
                                        />
                                    </div>
                                    {hasType2 && (
                                        <div className="generator-modal__coverage-row">
                                            <label className="generator-modal__checkbox-label" title={type2Label}>
                                                <input
                                                    type="checkbox"
                                                    checked={config.overrideSecondaryStab}
                                                    onChange={(e) =>
                                                        setConfig({ overrideSecondaryStab: e.target.checked })
                                                    }
                                                    className="generator-modal__checkbox"
                                                />
                                                STAB 2
                                            </label>
                                            <input
                                                type="number"
                                                value={config.secondaryStabCount}
                                                onChange={(e) =>
                                                    setConfig({ secondaryStabCount: Number(e.target.value) })
                                                }
                                                min="0"
                                                max="6"
                                                className="generator-modal__comp-input"
                                                disabled={!config.overrideSecondaryStab}
                                            />
                                        </div>
                                    )}

                                    <div className="generator-modal__coverage-select-wrapper">
                                        <label className="generator-modal__coverage-select-label">
                                            Coverage Preference
                                        </label>
                                        <select
                                            value={config.coveragePreference}
                                            onChange={(e) => setConfig({ coveragePreference: e.target.value })}
                                            className="generator-modal__select generator-modal__coverage-select"
                                        >
                                            <option value="balanced">Balanced (Auto)</option>
                                            <option value="heavy">Prioritize Coverage</option>
                                            <option value="none">STAB Only (No Coverage)</option>
                                            <option value="fixed">Fixed Amount</option>
                                        </select>
                                        {config.coveragePreference === 'fixed' && (
                                            <div className="generator-modal__coverage-fixed-row">
                                                <span className="generator-modal__coverage-fixed-label">
                                                    Coverage Count
                                                </span>
                                                <input
                                                    type="number"
                                                    value={config.coverageCount}
                                                    onChange={(e) =>
                                                        setConfig({ coverageCount: Number(e.target.value) })
                                                    }
                                                    min="0"
                                                    max="6"
                                                    className="generator-modal__comp-input"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="generator-modal__composition generator-modal__composition--disabled">
                                <label className="generator-modal__comp-title generator-modal__comp-title--disabled">
                                    Attack Type Ratios
                                </label>
                                <p className="generator-modal__comp-desc">Disabled during Wild (Random) Generation.</p>
                            </div>
                        )}
                    </div>

                    {/* 2-Column Checkbox Grid */}
                    <div className="generator-modal__checkbox-group">
                        {/* LEFT COLUMN: Basic Settings */}
                        <div className="generator-modal__checkbox-col">
                            <label className="generator-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={config.ensureDefenses}
                                    onChange={(e) => setConfig({ ensureDefenses: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                <strong>Ensure Minimum Defenses (Scales with Rank)</strong>
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Ensure Minimum Defenses',
                                            desc: 'Calculates a defense quota by dividing total attribute points by 4. It guarantees Vitality and Insight reach this minimum quota before allocating points to offensive stats. Turn off for glass-cannon builds.'
                                        })
                                    }
                                />
                            </label>

                            <label className="generator-modal__checkbox-label" style={{ marginTop: '4px' }}>
                                <input
                                    type="checkbox"
                                    checked={config.includePmd}
                                    onChange={(e) => setConfig({ includePmd: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Include Knowledge Skills (Lore, Medicine, etc.)
                            </label>
                            <label className="generator-modal__checkbox-label" style={{ marginTop: '4px' }}>
                                <input
                                    type="checkbox"
                                    checked={config.includeCustom}
                                    onChange={(e) => setConfig({ includeCustom: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Include Custom Homebrew Skills
                            </label>

                            <label className="generator-modal__checkbox-label" style={{ marginTop: '4px' }}>
                                <input
                                    type="checkbox"
                                    checked={config.randomizeSpecies}
                                    onChange={(e) => setConfig({ randomizeSpecies: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                <strong>Randomize Species (Overwrites Identity)</strong>
                            </label>
                            {config.randomizeSpecies && (
                                <label className="generator-modal__checkbox-label generator-modal__checkbox-label--indented">
                                    <input
                                        type="checkbox"
                                        checked={config.autoSelectBias}
                                        onChange={(e) => setConfig({ autoSelectBias: e.target.checked })}
                                        className="generator-modal__checkbox"
                                    />
                                    Auto-Detect Attack Bias (Phys vs Spec)
                                </label>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Advanced Engine Settings */}
                        <div className="generator-modal__checkbox-col">
                            <label className="generator-modal__checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={config.includePreEvolutions}
                                    onChange={(e) => setConfig({ includePreEvolutions: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                <strong>Include Pre-Evolution Moves</strong>
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Pre-Evolution Fetching',
                                            desc: "Automatically traces your Pokémon's evolution line backwards to generate a broader move pool! Use the rank offset spinners below to simulate how many ranks ago this Pokémon evolved. Mega evolutions are automatically recognized and will share the base form's rank."
                                        })
                                    }
                                />
                            </label>
                            {config.includePreEvolutions && (
                                <div className="generator-modal__evo-group">
                                    <div className="generator-modal__evo-box">
                                        <strong className="generator-modal__evo-title">
                                            2-Stage Lines (e.g. Vulpix → Ninetales)
                                        </strong>
                                        <div className="generator-modal__evo-row">
                                            <span className="generator-modal__evo-label">
                                                Base Form (Offset Down)
                                            </span>
                                            <NumberSpinner
                                                value={config.evo2Stage1Offset}
                                                onChange={(val) => setConfig({ evo2Stage1Offset: val })}
                                                min={0}
                                                max={7}
                                            />
                                        </div>
                                    </div>
                                    <div className="generator-modal__evo-box">
                                        <strong className="generator-modal__evo-title">
                                            3-Stage Lines (e.g. Charmander → Charizard)
                                        </strong>
                                        <div className="generator-modal__evo-row generator-modal__evo-row--spaced">
                                            <span className="generator-modal__evo-label">
                                                Middle Form (Offset Down)
                                            </span>
                                            <NumberSpinner
                                                value={config.evo3Stage2Offset}
                                                onChange={(val) => setConfig({ evo3Stage2Offset: val })}
                                                min={0}
                                                max={7}
                                            />
                                        </div>
                                        <div className="generator-modal__evo-row">
                                            <span className="generator-modal__evo-label">
                                                Base Form (Offset Down)
                                            </span>
                                            <NumberSpinner
                                                value={config.evo3Stage1Offset}
                                                onChange={(val) => setConfig({ evo3Stage1Offset: val })}
                                                min={0}
                                                max={7}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <label className="generator-modal__checkbox-label" style={{ marginTop: '4px' }}>
                                <input
                                    type="checkbox"
                                    checked={config.allowOverrank}
                                    onChange={(e) => setConfig({ allowOverrank: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                <strong>Allow Overrank (Draft 1 Higher Rank Move)</strong>
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
                                            title: 'Overrank Generation',
                                            desc: 'Forces the generator to select exactly one move that normally belongs to a higher rank tier, expanding your tactical options.'
                                        })
                                    }
                                />
                            </label>
                            {config.allowOverrank && (
                                <div className="generator-modal__evo-group">
                                    <div className="generator-modal__evo-box generator-modal__evo-row">
                                        <span className="generator-modal__evo-label" style={{ fontWeight: 'bold' }}>
                                            Max Ranks Above
                                        </span>
                                        <NumberSpinner
                                            value={config.overrankAmount}
                                            onChange={(val) => setConfig({ overrankAmount: val })}
                                            min={1}
                                            max={7}
                                        />
                                    </div>
                                    <label className="generator-modal__checkbox-label" style={{ fontSize: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={config.allowPreEvoOverrank}
                                            onChange={(e) => setConfig({ allowPreEvoOverrank: e.target.checked })}
                                            className="generator-modal__checkbox"
                                            disabled={!config.includePreEvolutions}
                                        />
                                        Include Pre-Evolutions in Pool
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="generator-modal__warning">
                    ⚠️ WARNING: This will completely overwrite this token's current stats, skills, and moves!
                </div>

                <div className="generator-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark generator-modal__btn"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating || (!config.randomizeSpecies && !speciesName)}
                        className="action-button action-button--red generator-modal__btn"
                    >
                        {isGenerating ? '⏳' : '🎲 Generate'}
                    </button>
                </div>
            </div>

            {tooltipInfo && (
                <div className="generator-modal__tooltip-overlay">
                    <div className="generator-modal__tooltip-content">
                        <h3 className="generator-modal__tooltip-title">{tooltipInfo.title}</h3>
                        <p className="generator-modal__tooltip-desc">{tooltipInfo.desc}</p>
                        <div className="generator-modal__tooltip-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark generator-modal__tooltip-btn"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}