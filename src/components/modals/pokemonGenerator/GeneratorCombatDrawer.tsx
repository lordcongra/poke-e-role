import { Swords } from 'lucide-react';
import type { GeneratorConfig } from '../../../store/storeTypes';
import { GeneratorDrawer } from './GeneratorDrawer';
import { GeneratorCombatRulesSection } from './GeneratorCombatRulesSection';
import { GeneratorThresholdsSection } from './GeneratorThresholdsSection';

export interface GeneratorCombatDrawerProps {
    isOpen: boolean;
    onToggle: () => void;
    config: GeneratorConfig;
    onUpdateConfig: (partial: Partial<GeneratorConfig>) => void;
    type1Label?: string;
    type2Label?: string;
    hasType2?: boolean;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

export function getCombatOverridesSummary(config: GeneratorConfig): { text: string; isActive: boolean } {
    const hasMinCombat = Boolean(config.minStats && Object.values(config.minStats).some((v) => Number(v) > 0));
    const hasMinSocial = Boolean(config.minSocials && Object.values(config.minSocials).some((v) => Number(v) > 0));
    const hasMoveOverrides =
        (config.targetAtkCount !== undefined && config.targetAtkCount !== 4) ||
        (config.targetSupCount !== undefined && config.targetSupCount !== 1) ||
        Boolean(config.useSpilloverRatio) ||
        Boolean(config.overridePrimaryStab) ||
        Boolean(config.overrideSecondaryStab) ||
        (config.coveragePreference !== undefined && config.coveragePreference !== 'balanced');
    const hasRuleOverrides =
        Boolean(config.ensureDefenses) ||
        Boolean(config.includePmd) ||
        Boolean(config.includeCustom) ||
        Boolean(config.includePreEvolutions) ||
        Boolean(config.allowOverrank);

    const isCustom = hasMinCombat || hasMinSocial || hasMoveOverrides || hasRuleOverrides;

    return {
        text: isCustom ? 'Custom Overrides Active' : 'Default Allocation',
        isActive: isCustom
    };
}

export function GeneratorCombatDrawer({
    isOpen,
    onToggle,
    config,
    onUpdateConfig,
    type1Label,
    type2Label,
    hasType2,
    onOpenTooltip
}: GeneratorCombatDrawerProps) {
    const summary = getCombatOverridesSummary(config);

    return (
        <GeneratorDrawer
            isOpen={isOpen}
            onToggle={onToggle}
            title="Advanced Combat Overrides"
            icon={<Swords size={16} />}
            summary={summary.text}
            summaryVariant={summary.isActive ? 'active' : 'default'}
        >
            {/* Stat & Skill Rules + Move Rules */}
            <GeneratorCombatRulesSection
                config={config}
                onUpdateConfig={onUpdateConfig}
                onOpenTooltip={onOpenTooltip}
            />

            {/* Guaranteed Minimums, Move Composition & STAB / Coverage */}
            <GeneratorThresholdsSection
                config={config}
                onUpdateConfig={onUpdateConfig}
                type1Label={type1Label}
                type2Label={type2Label}
                hasType2={hasType2}
                onOpenTooltip={onOpenTooltip}
            />
        </GeneratorDrawer>
    );
}
