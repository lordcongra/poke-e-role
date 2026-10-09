import type { Rank, GeneratorConfig } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { RANKS } from '../../../data/constants';
import { BIOMES, BIOME_TOOLTIP_NOTE } from '../../../data/biomeData';

export interface GeneratorSpeciesSectionProps {
    currentSpecies: string;
    onUpdateSpecies: (val: string) => void;
    currentRank: Rank;
    onUpdateRank: (val: Rank) => void;
    displayedSpecies: string[];
    activeConfig: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    activeTargetRecRank: string;
    batchCount: number;
    syncPresets: boolean;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function GeneratorSpeciesSection({
    currentSpecies,
    onUpdateSpecies,
    currentRank,
    onUpdateRank,
    displayedSpecies,
    activeConfig,
    onUpdateConfig,
    activeTargetRecRank,
    batchCount,
    syncPresets,
    onOpenTooltip
}: GeneratorSpeciesSectionProps) {
    const speciesPlaceholder = activeConfig.randomizeSpecies
        ? 'Random Species (Enabled Below)'
        : activeConfig.filterRecommendedRank
          ? `e.g. Lucario (${activeTargetRecRank})`
          : 'e.g. Lucario';

    const handleCustomSlotRankChange = (index: number, value: string) => {
        const nextArr = [
            ...(activeConfig.customSlotRecommendedRanks || [
                'Starter',
                'Starter',
                'Starter',
                'Starter',
                'Starter',
                'Starter'
            ])
        ];
        nextArr[index] = value;
        onUpdateConfig({ customSlotRecommendedRanks: nextArr });
    };

    return (
        <>
            {/* Species, Rank & Location Row */}
            <div className="generator-modal__row">
                <div className="generator-modal__col">
                    <label className="text-label">Species:</label>
                    <input
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
                <div className="generator-modal__col">
                    <label className="text-label">Rank:</label>
                    <select
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
                <div className="generator-modal__col">
                    <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Location / Biome:
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
            </div>

            {/* Recommended Rank Filter Row */}
            <div className="generator-modal__destination-box" style={{ padding: '8px 12px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}
                >
                    <label
                        className="generator-modal__checkbox-label text-label"
                        style={{ margin: 0, fontWeight: 600 }}
                    >
                        <input
                            type="checkbox"
                            checked={Boolean(activeConfig.filterRecommendedRank)}
                            onChange={(e) => onUpdateConfig({ filterRecommendedRank: e.target.checked })}
                            className="generator-modal__checkbox"
                        />
                        Filter by Recommended Rank
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Recommended Rank Filter',
                                    desc: "These are purely suggested ranks from the core rules and Pokédex, and are not necessarily 100% reflective of the rank these Pokémon absolutely should be used at — they're just suggestions. When enabled, only species matching the selected recommended rank criteria will be generated or suggested."
                                })
                            }
                        />
                    </label>

                    {activeConfig.filterRecommendedRank && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                                Allowed Rank:
                            </span>
                            <select
                                value={
                                    activeConfig.recommendedRankMode === 'exact'
                                        ? activeConfig.exactRecommendedRank || 'Standard'
                                        : 'match'
                                }
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'match') {
                                        onUpdateConfig({ recommendedRankMode: 'match' });
                                    } else {
                                        onUpdateConfig({
                                            recommendedRankMode: 'exact',
                                            exactRecommendedRank: val as Rank
                                        });
                                    }
                                }}
                                className="generator-modal__select text-label"
                                style={{ width: 'auto', minWidth: '170px', padding: '3px 8px', fontSize: '0.8rem' }}
                            >
                                <option value="match">Match Pokémon Rank ({currentRank})</option>
                                {RANKS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* If batchCount > 1 and syncPresets is ON, allow per-pokemon slot customization option */}
                {activeConfig.filterRecommendedRank && batchCount > 1 && syncPresets && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '4px'
                            }}
                        >
                            <span className="text-subtext" style={{ fontSize: '0.74rem' }}>
                                Per-Pokémon Batch Filter:
                            </span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    type="button"
                                    className={`action-button ${activeConfig.recommendedRankMode !== 'custom' ? 'action-button--theme' : 'action-button--dark'}`}
                                    style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                    onClick={() => onUpdateConfig({ recommendedRankMode: 'match' })}
                                >
                                    Synced for Batch
                                </button>
                                <button
                                    type="button"
                                    className={`action-button ${activeConfig.recommendedRankMode === 'custom' ? 'action-button--theme' : 'action-button--dark'}`}
                                    style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                    onClick={() => onUpdateConfig({ recommendedRankMode: 'custom' })}
                                >
                                    Custom Per Slot
                                </button>
                            </div>
                        </div>

                        {activeConfig.recommendedRankMode === 'custom' && (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '6px',
                                    marginTop: '4px'
                                }}
                            >
                                {Array.from({ length: batchCount }).map((_, i) => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span className="text-subtext" style={{ fontSize: '0.7rem' }}>
                                            Pokémon #{i + 1}:
                                        </span>
                                        <select
                                            value={activeConfig.customSlotRecommendedRanks?.[i] || 'match'}
                                            onChange={(e) => handleCustomSlotRankChange(i, e.target.value)}
                                            className="generator-modal__select text-label"
                                            style={{ fontSize: '0.74rem', padding: '2px 4px' }}
                                        >
                                            <option value="match">Match Rank</option>
                                            {RANKS.map((r) => (
                                                <option key={r} value={r}>
                                                    {r}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
