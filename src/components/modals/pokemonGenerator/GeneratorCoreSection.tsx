import type { Rank, GeneratorConfig } from '../../../store/storeTypes';
import { Sparkles } from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { RANKS } from '../../../data/constants';
import { BIOMES, BIOME_TOOLTIP_NOTE } from '../../../data/biomeData';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';

export interface GeneratorCoreSectionProps {
    currentSpecies: string;
    onUpdateSpecies: (val: string) => void;
    currentRank: Rank;
    onUpdateRank: (val: Rank) => void;
    sheetName: string;
    onUpdateSheetName: (val: string) => void;
    destination: 'new' | 'overwrite';
    displayedSpecies: string[];
    activeConfig: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    activeTargetRecRank: string;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
    showPrivacySection?: boolean;
}

const PRIVACY_ITEMS = [
    { key: 'privateNpcLock', label: 'NPC-locked' },
    { key: 'privateRolls', label: 'Private Rolls' },
    { key: 'privateGmTrackers', label: 'GM-Only UI Trackers' }
] as const;

export function GeneratorCoreSection({
    currentSpecies,
    onUpdateSpecies,
    currentRank,
    onUpdateRank,
    sheetName,
    onUpdateSheetName,
    destination,
    displayedSpecies,
    activeConfig,
    onUpdateConfig,
    activeTargetRecRank,
    onOpenTooltip,
    showPrivacySection = false
}: GeneratorCoreSectionProps) {
    const speciesPlaceholder = activeConfig.randomizeSpecies
        ? 'Random Species (Active)'
        : activeConfig.filterRecommendedRank
          ? `e.g. Lucario (${activeTargetRecRank})`
          : 'e.g. Lucario';

    const handleTogglePrivacyDefaults = (checked: boolean) => {
        onUpdateConfig({
            privacyDefaults: checked,
            privateNpcLock: checked ? (activeConfig.privateNpcLock ?? true) : false,
            privateRolls: checked ? (activeConfig.privateRolls ?? true) : false,
            privateGmTrackers: checked ? (activeConfig.privateGmTrackers ?? true) : false
        });
    };

    return (
        <div className="generator-modal__core-card">
            {/* Row 1: Species, Rank & Nickname */}
            <div className="generator-modal__row">
                <div className="generator-modal__col generator-modal__col--species">
                    <div className="generator-modal__species-label-row">
                        <label className="text-label" htmlFor="generator-species-input">
                            Species:
                        </label>
                        <label className="generator-modal__checkbox-label text-label">
                            <input
                                type="checkbox"
                                checked={Boolean(activeConfig.randomizeSpecies)}
                                onChange={(e) => onUpdateConfig({ randomizeSpecies: e.target.checked })}
                                className="generator-modal__checkbox"
                            />
                            Randomize
                        </label>
                    </div>
                    <input
                        id="generator-species-input"
                        type="text"
                        list="generator-species-datalist"
                        className="generator-modal__input text-label"
                        placeholder={speciesPlaceholder}
                        value={activeConfig.randomizeSpecies ? '' : currentSpecies}
                        onChange={(e) => onUpdateSpecies(e.target.value)}
                        disabled={activeConfig.randomizeSpecies}
                    />
                    <datalist id="generator-species-datalist">
                        {displayedSpecies.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>

                <div className="generator-modal__col generator-modal__col--rank">
                    <label className="text-label" htmlFor="generator-rank-select">
                        Rank:
                    </label>
                    <select
                        id="generator-rank-select"
                        value={currentRank}
                        onChange={(e) => onUpdateRank(e.target.value as Rank)}
                        className="generator-modal__select text-label"
                    >
                        {RANKS.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="generator-modal__col generator-modal__col--nickname">
                    <label className="text-label" htmlFor="generator-nickname-input">
                        {destination === 'new'
                            ? isStandaloneMode
                                ? 'Sheet Nickname (Optional):'
                                : 'Token Name (Optional):'
                            : 'Nickname (Optional):'}
                    </label>
                    <input
                        id="generator-nickname-input"
                        type="text"
                        className="generator-modal__input text-label"
                        placeholder="e.g. Sparky"
                        value={sheetName}
                        onChange={(e) => onUpdateSheetName(e.target.value)}
                    />
                </div>
            </div>

            {/* Row 2: Location/Biome, Build Tier, Combat Bias, Defense Style */}
            <div className="generator-modal__row">
                <div className="generator-modal__col">
                    <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Biome / Location:
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({ title: 'Location / Biome Filter', desc: BIOME_TOOLTIP_NOTE })
                            }
                        />
                    </label>
                    <select
                        value={activeConfig.selectedBiome || ''}
                        onChange={(e) => onUpdateConfig({ selectedBiome: e.target.value })}
                        className="generator-modal__select text-label"
                    >
                        <option value="">Any Biome / Location</option>
                        {BIOMES.map((b) => (
                            <option key={b.id} value={b.id}>
                                [{b.tag}] {b.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="generator-modal__col">
                    <label className="text-label">Build Tier:</label>
                    <select
                        value={activeConfig.buildType}
                        onChange={(e) => onUpdateConfig({ buildType: e.target.value as GeneratorConfig['buildType'] })}
                        className="generator-modal__select text-label"
                    >
                        <option value="wild">Wild (Random)</option>
                        <option value="average">Average</option>
                        <option value="minmax">Min-Max</option>
                    </select>
                </div>

                <div className="generator-modal__col">
                    <label className="text-label">Combat Bias:</label>
                    <select
                        value={
                            activeConfig.autoSelectBias || activeConfig.combatBias === 'auto'
                                ? 'auto'
                                : activeConfig.combatBias
                        }
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'auto') {
                                onUpdateConfig({ combatBias: 'auto', autoSelectBias: true });
                            } else {
                                onUpdateConfig({ combatBias: val, autoSelectBias: false });
                            }
                        }}
                        className="generator-modal__select text-label"
                    >
                        <option value="auto">Auto-Detect (Phys vs Spec)</option>
                        <option value="physical">Physical Attacker</option>
                        <option value="special">Special Attacker</option>
                        <option value="tank">Tank / Defender</option>
                        <option value="support">Status / Support</option>
                        <option value="balanced">Balanced</option>
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
                        value={activeConfig.defensePreference || 'auto'}
                        onChange={(e) =>
                            onUpdateConfig({
                                defensePreference: e.target.value as GeneratorConfig['defensePreference']
                            })
                        }
                        className="generator-modal__select text-label"
                        disabled={activeConfig.buildType === 'wild'}
                    >
                        <option value="auto">Auto (Smart Choice)</option>
                        <option value="evasion">Evasion Focus (Dodge)</option>
                        <option value="clash">Clash Focus (Counter/Block)</option>
                        <option value="balanced">Balanced (Split 50/50)</option>
                    </select>
                </div>
            </div>

            {/* Row 3: Identity & Flavor Sub-row */}
            <div className="generator-modal__identity-row">
                <span className="generator-modal__subrow-label text-label">Identity &amp; Flavor:</span>
                <div className="generator-modal__identity-options">
                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={Boolean(activeConfig.randomizeGender)}
                            onChange={(e) => onUpdateConfig({ randomizeGender: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        <span>Random Gender (50/50)</span>
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Randomize Gender',
                                    desc: 'Randomly assigns the Pokémon a 50/50 chance of being Male or Female upon generation.'
                                })
                            }
                        />
                    </label>

                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={Boolean(activeConfig.randomizeNature)}
                            onChange={(e) => onUpdateConfig({ randomizeNature: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        <span>Random Nature</span>
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Randomize Nature',
                                    desc: 'Randomly assigns a nature from the standard list of 25 Pokémon natures upon generation.'
                                })
                            }
                        />
                    </label>

                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={activeConfig.scaleLoyaltyHappiness !== false}
                            onChange={(e) => onUpdateConfig({ scaleLoyaltyHappiness: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        <span>
                            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Scale Loyalty &amp; Happiness
                        </span>
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Scalar Loyalty & Happiness',
                                    desc: 'Scales bond according to corebook rank achievements: Starter/Rookie Pokémon start at 1–2; Standard rank has 1 maxed partner (5) with others at 2–3; Expert and Ace+ rosters feature loyal 5/5 partners.'
                                })
                            }
                        />
                    </label>
                </div>
            </div>

            {/* Row 4: GM Privacy Sub-box (GM Only / Standalone) */}
            {showPrivacySection && (
                <div className="generator-modal__privacy-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label
                            className="generator-modal__checkbox-label text-label"
                            style={{ margin: 0, fontWeight: 600 }}
                        >
                            <input
                                type="checkbox"
                                checked={Boolean(activeConfig.privacyDefaults)}
                                onChange={(e) => handleTogglePrivacyDefaults(e.target.checked)}
                                className="generator-modal__checkbox"
                            />
                            <span>Private Token Defaults (GM Only)</span>
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip({
                                        title: 'Private Token Defaults',
                                        desc: 'Automatically configures generated Pokémon with GM-exclusive privacy settings so players cannot view rolls, stat modifications, or map token HUD trackers.'
                                    })
                                }
                            />
                        </label>
                    </div>

                    {activeConfig.privacyDefaults && (
                        <div className="generator-modal__privacy-suboptions">
                            {PRIVACY_ITEMS.map(({ key, label }) => (
                                <label
                                    key={key}
                                    className="generator-modal__checkbox-label text-label"
                                    style={{ margin: 0, fontSize: '0.82rem' }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={Boolean(activeConfig[key])}
                                        onChange={(e) => onUpdateConfig({ [key]: e.target.checked })}
                                        className="generator-modal__checkbox"
                                    />
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
