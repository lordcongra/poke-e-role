import type { GeneratorConfig } from '../../../store/storeTypes';
import { Filter, Sparkles } from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';

export interface GeneratorSpeciesFilterSectionProps {
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    batchCount: number;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

const LINE_LENGTH_ITEMS = [
    { len: 1, label: 'Single-Stage' },
    { len: 2, label: '2-Stage Line' },
    { len: 3, label: '3-Stage Line' }
] as const;

const STAGE_LEVEL_ITEMS = [
    { stage: 1, label: '1st Evo / Basic' },
    { stage: 2, label: '2nd Evo / Middle' },
    { stage: 3, label: '3rd Evo / Final' }
] as const;

const SPECIAL_SPECIES_ITEMS = [
    { key: 'includeLegendaries', label: 'Legendaries' },
    { key: 'includeMythicals', label: 'Mythicals' },
    { key: 'includeUltraBeasts', label: 'Ultra Beasts' },
    { key: 'includeParadox', label: 'Paradox' },
    { key: 'includeMegas', label: 'Megas / Special Forms' }
] as const;

const GENERATION_ITEMS = [
    { gen: 1, label: 'Gen 1', region: 'Kanto' },
    { gen: 2, label: 'Gen 2', region: 'Johto' },
    { gen: 3, label: 'Gen 3', region: 'Hoenn' },
    { gen: 4, label: 'Gen 4', region: 'Sinnoh' },
    { gen: 5, label: 'Gen 5', region: 'Unova' },
    { gen: 6, label: 'Gen 6', region: 'Kalos' },
    { gen: 7, label: 'Gen 7', region: 'Alola' },
    { gen: 8, label: 'Gen 8', region: 'Galar / Hisui' },
    { gen: 9, label: 'Gen 9', region: 'Paldea' }
] as const;

export function GeneratorSpeciesFilterSection({
    config,
    onUpdateConfig,
    batchCount,
    onOpenTooltip
}: GeneratorSpeciesFilterSectionProps) {
    const handleToggleLineLength = (len: number) => {
        const current = config.allowedLineLengths ?? [1, 2, 3];
        const next = current.includes(len)
            ? current.length > 1
                ? current.filter((x) => x !== len)
                : current
            : [...current, len].sort();
        onUpdateConfig({ allowedLineLengths: next });
    };

    const handleToggleStageIndex = (stage: number) => {
        const current = config.allowedStageIndices ?? [1, 2, 3];
        const next = current.includes(stage)
            ? current.length > 1
                ? current.filter((x) => x !== stage)
                : current
            : [...current, stage].sort();
        onUpdateConfig({ allowedStageIndices: next });
    };

    const handleToggleGeneration = (gen: number) => {
        const current = config.allowedGenerations ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const next = current.includes(gen) ? current.filter((x) => x !== gen) : [...current, gen].sort((a, b) => a - b);
        onUpdateConfig({ allowedGenerations: next });
    };

    const handleSelectAllGens = () => {
        onUpdateConfig({ allowedGenerations: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    };

    const handleClearGens = () => {
        onUpdateConfig({ allowedGenerations: [] });
    };

    return (
        <div className="generator-modal__filter-panel">
            <h4 className="generator-modal__filter-panel-title text-title-primary">
                <Filter size={15} /> Species, Evolution & Special Filters
            </h4>

            {/* Evolutionary Filters */}
            <div className="generator-modal__filter-grid">
                <div className="generator-modal__filter-item">
                    <label className="generator-modal__filter-label text-label">
                        Evolution Line Length:
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Evolution Line Length',
                                    desc: 'Filter Pokémon based on how many stages exist in their evolutionary family (e.g. Kangaskhan is Single-Stage; Lucario is 2-Stage; Charizard is 3-Stage).'
                                })
                            }
                        />
                    </label>
                    <div className="generator-modal__checkbox-subgroup">
                        {LINE_LENGTH_ITEMS.map(({ len, label }) => (
                            <label key={len} className="generator-modal__checkbox-label text-label">
                                <input
                                    type="checkbox"
                                    checked={(config.allowedLineLengths ?? [1, 2, 3]).includes(len)}
                                    onChange={() => handleToggleLineLength(len)}
                                    className="generator-modal__checkbox"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="generator-modal__filter-item">
                    <label className="generator-modal__filter-label text-label">
                        Evolution Stage Level:
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Stage Level',
                                    desc: 'Filter species based on their current stage position. 1st Evo = Basic/Baby Pokémon; 2nd Evo = Middle Stage; 3rd Evo = Final Evolution.'
                                })
                            }
                        />
                    </label>
                    <div className="generator-modal__checkbox-subgroup">
                        {STAGE_LEVEL_ITEMS.map(({ stage, label }) => (
                            <label key={stage} className="generator-modal__checkbox-label text-label">
                                <input
                                    type="checkbox"
                                    checked={(config.allowedStageIndices ?? [1, 2, 3]).includes(stage)}
                                    onChange={() => handleToggleStageIndex(stage)}
                                    className="generator-modal__checkbox"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Generation Filter */}
            <div className="generator-modal__filter-item" style={{ marginTop: '4px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                    }}
                >
                    <label className="generator-modal__filter-label text-label">
                        Generation Filter:
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Generation Filter',
                                    desc: "Filter Pokémon by Generation (Gen 1 to Gen 9) based on their National Pokédex number. Special forms, Megas, and regional variants inherit their base Pokémon's generation (e.g. Alolan Vulpix is Gen 1; Mega Lucario is Gen 4)."
                                })
                            }
                        />
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            type="button"
                            className="action-button action-button--dark action-button--small"
                            onClick={handleSelectAllGens}
                            style={{ fontSize: '0.7rem', padding: '1px 6px', height: 'auto' }}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark action-button--small"
                            onClick={handleClearGens}
                            style={{ fontSize: '0.7rem', padding: '1px 6px', height: 'auto' }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
                <div className="generator-modal__checkbox-subgroup" style={{ gap: '10px' }}>
                    {GENERATION_ITEMS.map(({ gen, label, region }) => {
                        const isChecked = (config.allowedGenerations ?? [1, 2, 3, 4, 5, 6, 7, 8, 9]).includes(gen);
                        return (
                            <label
                                key={gen}
                                className="generator-modal__checkbox-label text-label"
                                title={`${label} (${region})`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleGeneration(gen)}
                                    className="generator-modal__checkbox"
                                />
                                <span>{label}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Special Forms & Scalar Loyalty */}
            <div className="generator-modal__filter-grid">
                <div className="generator-modal__filter-item">
                    <label className="generator-modal__filter-label text-label">Special Forms & Species:</label>
                    <div className="generator-modal__checkbox-subgroup">
                        {SPECIAL_SPECIES_ITEMS.map(({ key, label }) => (
                            <label key={key} className="generator-modal__checkbox-label text-label">
                                <input
                                    type="checkbox"
                                    checked={Boolean(config[key])}
                                    onChange={(e) => onUpdateConfig({ [key]: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="generator-modal__filter-item">
                    <label className="generator-modal__checkbox-label text-label">
                        <input
                            type="checkbox"
                            checked={config.scaleLoyaltyHappiness !== false}
                            onChange={(e) => onUpdateConfig({ scaleLoyaltyHappiness: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        <span>
                            <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Scale Pokémon Loyalty & Happiness with Rank
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

                    {batchCount > 1 && (
                        <label className="generator-modal__checkbox-label text-label" style={{ marginTop: '4px' }}>
                            <input
                                type="checkbox"
                                checked={Boolean(config.allowDuplicates)}
                                onChange={(e) => onUpdateConfig({ allowDuplicates: e.target.checked })}
                                className="generator-modal__checkbox"
                            />
                            <span>Allow Duplicate Pokémon</span>
                            <TooltipIcon
                                onClick={() =>
                                    onOpenTooltip({
                                        title: 'Allow Duplicate Pokémon',
                                        desc: 'When unchecked (default), each Pokémon generated in the batch will be a unique species. Check this box if you want to allow multiple Pokémon of the exact same species.'
                                    })
                                }
                            />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );
}
