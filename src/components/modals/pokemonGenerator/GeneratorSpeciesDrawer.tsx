import { Filter } from 'lucide-react';
import type { GeneratorConfig, Rank } from '../../../store/storeTypes';
import { GeneratorDrawer } from './GeneratorDrawer';
import { GeneratorTypeSection } from './GeneratorTypeSection';
import { GeneratorSpeciesFilterSection } from './GeneratorSpeciesFilterSection';
import { GeneratorRecommendedRankSection } from './GeneratorRecommendedRankSection';

export interface GeneratorSpeciesDrawerProps {
    isOpen: boolean;
    onToggle: () => void;
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    currentRank: Rank;
    batchCount: number;
    syncPresets: boolean;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function getSpeciesDrawerSummary(config: GeneratorConfig, currentRank: Rank): { text: string; isActive: boolean } {
    let typePart = 'Any Type';
    if (config.typeSpecialtyMode === 'monotype') typePart = 'Monotype';
    else if (config.typeSpecialtyMode === 'dual') typePart = 'Dual-Type';
    else if (config.typeSpecialtyMode === 'manual') {
        typePart = config.manualTypes && config.manualTypes.length > 0 ? config.manualTypes.join('/') : 'Manual Types';
    }

    const gens = config.allowedGenerations ?? [1, 2, 3, 4, 5, 6, 7, 8, 9];
    let genPart = 'Gen 1-9';
    if (gens.length === 0) genPart = 'No Gens';
    else if (gens.length < 9) {
        if (gens.length <= 3) genPart = `Gen ${gens.join(',')}`;
        else genPart = `${gens.length} Gens`;
    }

    const stages = config.allowedStageIndices ?? [1, 2, 3];
    let stagePart = 'All Stages';
    if (stages.length < 3) {
        stagePart = stages.map((s) => (s === 1 ? 'Basic' : s === 2 ? 'Mid' : 'Final')).join('/');
    }

    let recPart = '';
    if (config.filterRecommendedRank) {
        const mode =
            config.recommendedRankMode === 'exact'
                ? config.exactRecommendedRank || 'Standard'
                : `Match (${currentRank})`;
        recPart = ` • Rec: ${mode}`;
    }

    const isActive =
        (config.typeSpecialtyMode && config.typeSpecialtyMode !== 'any') ||
        gens.length < 9 ||
        stages.length < 3 ||
        Boolean(config.filterRecommendedRank) ||
        Boolean(config.includeLegendaries) ||
        Boolean(config.includeMythicals) ||
        Boolean(config.includeUltraBeasts) ||
        Boolean(config.includeParadox) ||
        Boolean(config.includeMegas);

    return {
        text: `${typePart} • ${genPart} • ${stagePart}${recPart}`,
        isActive: Boolean(isActive)
    };
}

export function GeneratorSpeciesDrawer({
    isOpen,
    onToggle,
    config,
    onUpdateConfig,
    currentRank,
    batchCount,
    syncPresets,
    onOpenTooltip
}: GeneratorSpeciesDrawerProps) {
    const summary = getSpeciesDrawerSummary(config, currentRank);

    return (
        <GeneratorDrawer
            isOpen={isOpen}
            onToggle={onToggle}
            title="Species & Encounter Filters"
            icon={<Filter size={16} />}
            summary={summary.text}
            summaryVariant={summary.isActive ? 'active' : 'default'}
        >
            {/* 1. Type Drafting */}
            <GeneratorTypeSection
                config={config}
                onUpdateConfig={onUpdateConfig}
                onOpenTooltip={onOpenTooltip}
            />

            {/* 2. Generation, Evolutionary & Special Species Filters */}
            <GeneratorSpeciesFilterSection
                config={config}
                onUpdateConfig={onUpdateConfig}
                batchCount={batchCount}
                onOpenTooltip={onOpenTooltip}
            />

            {/* 3. Recommended Rank Filter */}
            <GeneratorRecommendedRankSection
                config={config}
                onUpdateConfig={onUpdateConfig}
                currentRank={currentRank}
                batchCount={batchCount}
                syncPresets={syncPresets}
                onOpenTooltip={onOpenTooltip}
            />
        </GeneratorDrawer>
    );
}
