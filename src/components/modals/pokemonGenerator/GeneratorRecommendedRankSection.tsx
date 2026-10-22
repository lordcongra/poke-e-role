import type { GeneratorConfig, Rank } from '../../../store/storeTypes';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { RANKS } from '../../../data/constants';

export interface GeneratorRecommendedRankSectionProps {
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    currentRank: Rank;
    batchCount: number;
    syncPresets: boolean;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function GeneratorRecommendedRankSection({
    config,
    onUpdateConfig,
    currentRank,
    batchCount,
    syncPresets,
    onOpenTooltip
}: GeneratorRecommendedRankSectionProps) {
    const handleCustomSlotRankChange = (index: number, value: string) => {
        const nextArr = [
            ...(config.customSlotRecommendedRanks || [
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
        <div className="generator-modal__rec-rank-box">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}
            >
                <label className="generator-modal__checkbox-label text-label" style={{ margin: 0, fontWeight: 600 }}>
                    <input
                        type="checkbox"
                        checked={Boolean(config.filterRecommendedRank)}
                        onChange={(e) => onUpdateConfig({ filterRecommendedRank: e.target.checked })}
                        className="generator-modal__checkbox"
                    />
                    Filter by Recommended Rank
                    <TooltipIcon
                        onClick={() =>
                            onOpenTooltip({
                                title: 'Recommended Rank Filter',
                                desc: 'Suggested ranks from core rules. When enabled, only species matching the selected recommended rank will be generated.'
                            })
                        }
                    />
                </label>

                {config.filterRecommendedRank && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="text-subtext" style={{ fontSize: '0.78rem' }}>
                            Allowed Rank:
                        </span>
                        <select
                            value={
                                config.recommendedRankMode === 'exact'
                                    ? config.exactRecommendedRank || 'Standard'
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

            {config.filterRecommendedRank && batchCount > 1 && syncPresets && (
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
                                className={`action-button ${
                                    config.recommendedRankMode !== 'custom'
                                        ? 'action-button--theme'
                                        : 'action-button--dark'
                                }`}
                                style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                onClick={() => onUpdateConfig({ recommendedRankMode: 'match' })}
                            >
                                Synced for Batch
                            </button>
                            <button
                                type="button"
                                className={`action-button ${
                                    config.recommendedRankMode === 'custom'
                                        ? 'action-button--theme'
                                        : 'action-button--dark'
                                }`}
                                style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                onClick={() => onUpdateConfig({ recommendedRankMode: 'custom' })}
                            >
                                Custom Per Slot
                            </button>
                        </div>
                    </div>

                    {config.recommendedRankMode === 'custom' && (
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
                                        value={config.customSlotRecommendedRanks?.[i] || 'match'}
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
    );
}
