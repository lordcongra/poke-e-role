import { useState, useEffect, useMemo } from 'react';
import { Dices, AlertTriangle, XCircle, Hourglass, FilePlus } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { generateBuild } from '../../../utils/generators/generatorUtils';
import type { TempBuild, Rank } from '../../../store/storeTypes';
import { GeneratorPreviewModal } from './GeneratorPreviewModal';
import { GeneratorBatchSection } from './GeneratorBatchSection';
import { GeneratorSpeciesSection } from './GeneratorSpeciesSection';
import { GeneratorTypeSection } from './GeneratorTypeSection';
import { GeneratorBuildSettingsSection } from './GeneratorBuildSettingsSection';
import { GeneratorThresholdsSection } from './GeneratorThresholdsSection';
import { GeneratorSpeciesFilterSection } from './GeneratorSpeciesFilterSection';
import { GeneratorPrivacySection } from './GeneratorPrivacySection';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import {
    loadLocalDataset,
    SPECIES_URLS,
    fetchPokemonLookupIndex,
    type PokemonLookupEntry
} from '../../../utils/api/api';
import './GeneratorModal.css';

export function GeneratorModal({ onClose }: { onClose: () => void }) {
    const identity = useCharacterStore((s) => s.identity);
    const globalStoreConfig = useCharacterStore((s) => s.generatorConfig);
    const setGlobalStoreConfig = useCharacterStore((s) => s.setGeneratorConfig);
    const activeTokenId = useCharacterStore((s) => s.tokenId);
    const role = useCharacterStore((s) => s.role);
    const roomCustomPokemon = useCharacterStore((s) => s.roomCustomPokemon || []);

    const [destination, setDestination] = useState<'new' | 'overwrite'>(() => (activeTokenId ? 'overwrite' : 'new'));
    const [targetSpecies, setTargetSpecies] = useState<string>(identity.species || '');
    const [targetRank, setTargetRank] = useState<Rank>(identity.rank || 'Starter');
    const [sheetName, setSheetName] = useState<string>('');
    const [speciesList, setSpeciesList] = useState<string[]>([]);
    const [pokedexLookup, setPokedexLookup] = useState<PokemonLookupEntry[]>([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewBuilds, setPreviewBuilds] = useState<TempBuild[] | null>(null);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    // Batch & Presets State
    const [batchCount, setBatchCount] = useState<number>(1);
    const [syncPresets, setSyncPresets] = useState<boolean>(true);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

    const [slotConfigs, setSlotConfigs] = useState(() =>
        Array.from({ length: 6 }, () => ({
            config: { ...globalStoreConfig, manualTypes: globalStoreConfig.manualTypes ?? [] },
            targetSpecies: identity.species || '',
            targetRank: identity.rank || 'Starter'
        }))
    );

    const isPerSlot = batchCount > 1 && !syncPresets;
    const activeConfig = isPerSlot ? slotConfigs[activeSlotIndex]?.config || globalStoreConfig : globalStoreConfig;
    const currentSpecies = isPerSlot ? (slotConfigs[activeSlotIndex]?.targetSpecies ?? targetSpecies) : targetSpecies;
    const currentRank = isPerSlot ? (slotConfigs[activeSlotIndex]?.targetRank ?? targetRank) : targetRank;

    const setConfigProxy = (partial: Partial<typeof globalStoreConfig>) => {
        if (!isPerSlot) return setGlobalStoreConfig(partial);
        setSlotConfigs((prev) =>
            prev.map((slot, i) => (i === activeSlotIndex ? { ...slot, config: { ...slot.config, ...partial } } : slot))
        );
    };

    const updateCurrentSpecies = (val: string) => {
        if (!isPerSlot) return setTargetSpecies(val);
        setSlotConfigs((prev) => prev.map((s, i) => (i === activeSlotIndex ? { ...s, targetSpecies: val } : s)));
    };

    const updateCurrentRank = (val: Rank) => {
        if (!isPerSlot) return setTargetRank(val);
        setSlotConfigs((prev) => prev.map((s, i) => (i === activeSlotIndex ? { ...s, targetRank: val } : s)));
    };

    const handleCopyPresetToAll = () => {
        const active = slotConfigs[activeSlotIndex];
        if (!active) return;
        setSlotConfigs(Array.from({ length: 6 }, () => ({ ...active, config: { ...active.config } })));
    };

    useEffect(() => {
        loadLocalDataset()
            .then(() => {
                const formattedSpecies = Object.keys(SPECIES_URLS).map((species) =>
                    species
                        .split('-')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join('-')
                );
                setSpeciesList(formattedSpecies.sort());
            })
            .catch((err) => console.error('[GeneratorModal] Failed to load dataset:', err));

        fetchPokemonLookupIndex()
            .then((lookup) => setPokedexLookup(lookup))
            .catch((err) => console.error('[GeneratorModal] Failed to load lookup:', err));
    }, []);

    const filteredCustomPokemon = roomCustomPokemon
        .filter((p) => isStandaloneMode || role === 'GM' || !p.gmOnly)
        .map((p) => p.Name);
    const uniqueSpecies = Array.from(new Set([...speciesList, ...filteredCustomPokemon]));

    const activeTargetRecRank =
        activeConfig.recommendedRankMode === 'exact'
            ? String(activeConfig.exactRecommendedRank || 'Standard')
            : currentRank;

    const displayedSpecies = useMemo(() => {
        if (pokedexLookup.length === 0) return uniqueSpecies;

        const manualFilter =
            activeConfig.typeSpecialtyMode === 'manual' &&
            activeConfig.manualTypes &&
            activeConfig.manualTypes.length > 0
                ? activeConfig.manualTypes
                : null;

        const filterByRecRank = Boolean(activeConfig.filterRecommendedRank);

        if (!filterByRecRank && !manualFilter) return uniqueSpecies;

        const targetRankLower = activeTargetRecRank.toLowerCase();

        const allowed = new Set(
            pokedexLookup
                .filter((p) => {
                    if (filterByRecRank) {
                        const recRank = (p.recommendedRank || 'Standard').toLowerCase();
                        if (recRank !== targetRankLower) return false;
                    }
                    if (manualFilter) {
                        const matchesType1 = manualFilter.includes(p.type1);
                        const matchesType2 = Boolean(p.type2 && p.type2 !== 'None' && manualFilter.includes(p.type2));
                        if (!matchesType1 && !matchesType2) return false;
                    }
                    return true;
                })
                .map((p) => p.name.toLowerCase())
        );

        return uniqueSpecies.filter((name) => allowed.has(name.toLowerCase()));
    }, [
        activeConfig.filterRecommendedRank,
        activeConfig.typeSpecialtyMode,
        activeConfig.manualTypes,
        activeTargetRecRank,
        pokedexLookup,
        uniqueSpecies
    ]);

    const hasType2 = Boolean(identity.type2 && identity.type2 !== 'None');
    const type1Label = identity.type1 || 'Primary';
    const type2Label = hasType2 ? identity.type2 : 'Secondary';

    const getEffectiveConfigForSlot = (slotIdx: number) => {
        if (batchCount === 1 || syncPresets) {
            return {
                ...activeConfig,
                manualTypes: activeConfig.manualTypes ?? [],
                targetSpecies: activeConfig.randomizeSpecies ? undefined : targetSpecies.trim() || undefined,
                targetRank: targetRank,
                slotIndex: slotIdx
            };
        }
        const slot = slotConfigs[slotIdx] || { config: activeConfig, targetSpecies, targetRank };
        return {
            ...slot.config,
            manualTypes: slot.config.manualTypes ?? [],
            targetSpecies: slot.config.randomizeSpecies ? undefined : slot.targetSpecies.trim() || undefined,
            targetRank: slot.targetRank,
            slotIndex: slotIdx
        };
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const builds: TempBuild[] = [];
            const usedSpecies = new Set<string>();
            for (let i = 0; i < batchCount; i++) {
                const cfg = {
                    ...getEffectiveConfigForSlot(i),
                    usedSpecies: activeConfig.allowDuplicates ? undefined : usedSpecies,
                    slotIndex: i
                };
                const build = await generateBuild(cfg, useCharacterStore.getState());
                if (build) {
                    builds.push(build);
                    usedSpecies.add(build.species);
                    usedSpecies.add(build.species.toLowerCase());
                }
            }
            if (builds.length > 0) setPreviewBuilds(builds);
        } catch (error) {
            console.error('[GeneratorModal] Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRerollIndex = async (index: number) => {
        try {
            const usedSpecies = new Set<string>();
            if (!activeConfig.allowDuplicates && previewBuilds) {
                previewBuilds.forEach((b, idx) => {
                    if (idx !== index && b?.species) {
                        usedSpecies.add(b.species);
                        usedSpecies.add(b.species.toLowerCase());
                    }
                });
            }
            const cfg = {
                ...getEffectiveConfigForSlot(index),
                usedSpecies: activeConfig.allowDuplicates ? undefined : usedSpecies,
                slotIndex: index
            };
            const build = await generateBuild(cfg, useCharacterStore.getState());
            if (build && previewBuilds) {
                const next = [...previewBuilds];
                next[index] = build;
                setPreviewBuilds(next);
            }
        } catch (error) {
            console.error('[GeneratorModal] Reroll index failed:', error);
        }
    };

    if (previewBuilds && previewBuilds.length > 0) {
        return (
            <GeneratorPreviewModal
                builds={previewBuilds}
                destination={batchCount > 1 ? 'new' : destination}
                sheetName={sheetName}
                onClose={() => {
                    setPreviewBuilds(null);
                    onClose();
                }}
                onReroll={handleGenerate}
                onRerollIndex={handleRerollIndex}
            />
        );
    }

    return (
        <div className="generator-modal__overlay">
            <div className="generator-modal__content">
                <h3 className="generator-modal__title modal-title-with-icon text-title-primary">
                    <Dices size={20} /> Auto-Build Pokémon
                </h3>
                <p className="generator-modal__desc text-subtext">
                    Generate stats, skills, and moves based on selected Rank and Tier.
                </p>

                <div className="generator-modal__form-group">
                    <GeneratorBatchSection
                        batchCount={batchCount}
                        setBatchCount={setBatchCount}
                        syncPresets={syncPresets}
                        setSyncPresets={setSyncPresets}
                        activeSlotIndex={activeSlotIndex}
                        setActiveSlotIndex={setActiveSlotIndex}
                        onCopyPresetToAll={handleCopyPresetToAll}
                        destination={destination}
                        setDestination={setDestination}
                        activeTokenId={activeTokenId}
                        sheetName={sheetName}
                        setSheetName={setSheetName}
                    />
                    <GeneratorSpeciesSection
                        currentSpecies={currentSpecies}
                        onUpdateSpecies={updateCurrentSpecies}
                        currentRank={currentRank}
                        onUpdateRank={updateCurrentRank}
                        displayedSpecies={displayedSpecies}
                        activeConfig={activeConfig}
                        onUpdateConfig={setConfigProxy}
                        activeTargetRecRank={activeTargetRecRank}
                        batchCount={batchCount}
                        syncPresets={syncPresets}
                        onOpenTooltip={setTooltipInfo}
                    />
                    <GeneratorTypeSection
                        config={activeConfig}
                        onUpdateConfig={setConfigProxy}
                        onOpenTooltip={setTooltipInfo}
                    />
                    <GeneratorBuildSettingsSection
                        config={activeConfig}
                        onUpdateConfig={setConfigProxy}
                        onOpenTooltip={setTooltipInfo}
                    />
                    <GeneratorThresholdsSection
                        config={activeConfig}
                        onUpdateConfig={setConfigProxy}
                        type1Label={type1Label}
                        type2Label={type2Label}
                        hasType2={hasType2}
                        onOpenTooltip={setTooltipInfo}
                    />
                    <GeneratorSpeciesFilterSection
                        config={activeConfig}
                        onUpdateConfig={setConfigProxy}
                        batchCount={batchCount}
                        onOpenTooltip={setTooltipInfo}
                    />
                    <GeneratorPrivacySection
                        config={activeConfig}
                        onUpdateConfig={setConfigProxy}
                        onOpenTooltip={setTooltipInfo}
                    />
                </div>

                {isStandaloneMode && destination === 'new' ? (
                    <div className="generator-modal__info">
                        <FilePlus size={18} /> A new Pokémon sheet will be added to your Directory and opened upon
                        generation.
                    </div>
                ) : (
                    <div className="generator-modal__warning">
                        <AlertTriangle size={18} /> WARNING: This will completely overwrite this token's current stats,
                        skills, and moves!
                    </div>
                )}

                <div className="generator-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark generator-modal__btn"
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={
                            isGenerating ||
                            (!activeConfig.randomizeSpecies &&
                                !currentSpecies.trim() &&
                                !activeConfig.selectedBiome &&
                                !(
                                    activeConfig.typeSpecialtyMode &&
                                    activeConfig.typeSpecialtyMode !== 'any' &&
                                    (activeConfig.typeSpecialtyMode !== 'manual' ||
                                        (activeConfig.manualTypes && activeConfig.manualTypes.length > 0))
                                ))
                        }
                        className={`action-button ${isStandaloneMode && destination === 'new' ? 'action-button--theme' : 'action-button--red'} generator-modal__btn`}
                    >
                        {isGenerating ? (
                            <>
                                <Hourglass size={16} /> Generating...
                            </>
                        ) : (
                            <>
                                <Dices size={16} />{' '}
                                {batchCount > 1 ? `Generate ${batchCount} Pokémon` : 'Generate Build'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {tooltipInfo && (
                <div className="generator-modal__tooltip-overlay">
                    <div className="generator-modal__tooltip-content">
                        <h3 className="generator-modal__tooltip-title text-title-primary">{tooltipInfo.title}</h3>
                        <p className="generator-modal__tooltip-desc text-subtext">{tooltipInfo.desc}</p>
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
