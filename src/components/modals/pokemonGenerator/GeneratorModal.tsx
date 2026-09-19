import { useState, useEffect } from 'react';
import {
    Dices,
    AlertTriangle,
    XCircle,
    Hourglass,
    FilePlus,
    ImagePlus,
    Link2,
    Sliders,
    Copy,
    Sparkles,
    Filter
} from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { generateBuild } from '../../../utils/generatorUtils';
import type { TempBuild, Rank } from '../../../store/storeTypes';
import { CombatStat, SocialStat } from '../../../types/enums';
import { GeneratorPreviewModal } from './GeneratorPreviewModal';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { NumberSpinner } from '../../ui/NumberSpinner';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import { loadLocalDataset, SPECIES_URLS } from '../../../utils/api';
import { RANKS } from '../../../data/constants';
import { BIOMES, BIOME_TOOLTIP_NOTE } from '../../../data/biomeData';
import './GeneratorModal.css';

export function GeneratorModal({ onClose }: { onClose: () => void }) {
    const identity = useCharacterStore((s) => s.identity);
    const globalStoreConfig = useCharacterStore((s) => s.generatorConfig);
    const setGlobalStoreConfig = useCharacterStore((s) => s.setGeneratorConfig);
    const activeTokenId = useCharacterStore((s) => s.tokenId);
    const role = useCharacterStore((s) => s.role);
    const roomCustomPokemon = useCharacterStore((s) => s.roomCustomPokemon || []);

    const [destination, setDestination] = useState<'new' | 'overwrite'>(() => {
        return activeTokenId ? 'overwrite' : 'new';
    });
    const [targetSpecies, setTargetSpecies] = useState<string>(identity.species || '');
    const [targetRank, setTargetRank] = useState<Rank>(identity.rank || 'Starter');
    const [sheetName, setSheetName] = useState<string>('');
    const [speciesList, setSpeciesList] = useState<string[]>([]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [previewBuilds, setPreviewBuilds] = useState<TempBuild[] | null>(null);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    // Batch & Presets State
    const [batchCount, setBatchCount] = useState<number>(1);
    const [syncPresets, setSyncPresets] = useState<boolean>(true);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

    const [slotConfigs, setSlotConfigs] = useState<
        Array<{
            config: typeof globalStoreConfig;
            targetSpecies: string;
            targetRank: Rank;
        }>
    >(() =>
        Array.from({ length: 6 }, () => ({
            config: { ...globalStoreConfig },
            targetSpecies: identity.species || '',
            targetRank: identity.rank || 'Starter'
        }))
    );

    const activeConfig =
        batchCount > 1 && !syncPresets ? slotConfigs[activeSlotIndex]?.config || globalStoreConfig : globalStoreConfig;
    const currentSpecies =
        batchCount > 1 && !syncPresets ? (slotConfigs[activeSlotIndex]?.targetSpecies ?? targetSpecies) : targetSpecies;
    const currentRank =
        batchCount > 1 && !syncPresets ? (slotConfigs[activeSlotIndex]?.targetRank ?? targetRank) : targetRank;

    const setConfigProxy = (partial: Partial<typeof globalStoreConfig>) => {
        if (batchCount > 1 && !syncPresets) {
            setSlotConfigs((prev) => {
                const next = [...prev];
                next[activeSlotIndex] = {
                    ...next[activeSlotIndex],
                    config: { ...next[activeSlotIndex].config, ...partial }
                };
                return next;
            });
        } else {
            setGlobalStoreConfig(partial);
        }
    };

    const config = activeConfig;
    const setConfig = setConfigProxy;

    const updateCurrentSpecies = (val: string) => {
        if (batchCount > 1 && !syncPresets) {
            setSlotConfigs((prev) => {
                const next = [...prev];
                next[activeSlotIndex] = {
                    ...next[activeSlotIndex],
                    targetSpecies: val
                };
                return next;
            });
        } else {
            setTargetSpecies(val);
        }
    };

    const updateCurrentRank = (val: Rank) => {
        if (batchCount > 1 && !syncPresets) {
            setSlotConfigs((prev) => {
                const next = [...prev];
                next[activeSlotIndex] = {
                    ...next[activeSlotIndex],
                    targetRank: val
                };
                return next;
            });
        } else {
            setTargetRank(val);
        }
    };

    const handleCopyPresetToAll = () => {
        const active = slotConfigs[activeSlotIndex];
        if (!active) return;
        setSlotConfigs(
            Array.from({ length: 6 }, () => ({
                config: { ...active.config },
                targetSpecies: active.targetSpecies,
                targetRank: active.targetRank
            }))
        );
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
            .catch((error) => console.error('[GeneratorModal] Failed to load local dataset:', error));
    }, []);

    const filteredCustomPokemon = roomCustomPokemon.filter((p) => role === 'GM' || !p.gmOnly).map((p) => p.Name);
    const uniqueSpecies = Array.from(new Set([...speciesList, ...filteredCustomPokemon]));

    const hasType2 = identity.type2 && identity.type2 !== 'None';
    const type1Label = identity.type1 || 'Primary';
    const type2Label = hasType2 ? identity.type2 : 'Secondary';

    const setMinStat = (stat: string, val: number) => {
        setConfigProxy({ minStats: { ...(activeConfig.minStats || {}), [stat]: val } });
    };

    const setMinSocial = (stat: string, val: number) => {
        setConfigProxy({ minSocials: { ...(activeConfig.minSocials || {}), [stat]: val } });
    };

    const handleToggleLineLength = (len: number) => {
        const current = activeConfig.allowedLineLengths ?? [1, 2, 3];
        const next = current.includes(len)
            ? current.length > 1
                ? current.filter((x) => x !== len)
                : current
            : [...current, len].sort();
        setConfigProxy({ allowedLineLengths: next });
    };

    const handleToggleStageIndex = (stage: number) => {
        const current = activeConfig.allowedStageIndices ?? [1, 2, 3];
        const next = current.includes(stage)
            ? current.length > 1
                ? current.filter((x) => x !== stage)
                : current
            : [...current, stage].sort();
        setConfigProxy({ allowedStageIndices: next });
    };

    const getEffectiveConfigForSlot = (slotIdx: number) => {
        if (batchCount === 1 || syncPresets) {
            return {
                ...config,
                targetSpecies: config.randomizeSpecies ? undefined : targetSpecies.trim() || undefined,
                targetRank: targetRank
            };
        }
        const slot = slotConfigs[slotIdx] || { config, targetSpecies, targetRank };
        return {
            ...slot.config,
            targetSpecies: slot.config.randomizeSpecies ? undefined : slot.targetSpecies.trim() || undefined,
            targetRank: slot.targetRank
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
            if (builds.length > 0) {
                setPreviewBuilds(builds);
            }
        } catch (error) {
            console.error('[GeneratorModal] Generation failed:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRerollAll = async () => {
        await handleGenerate();
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
                onReroll={handleRerollAll}
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
                    {/* Batch Count Selector */}
                    <div className="generator-modal__batch-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="generator-modal__destination-title text-title-primary">
                                Number of Pokémon to Generate:
                            </span>
                            <span className="text-subtext" style={{ fontSize: '0.8rem' }}>
                                {batchCount === 1 ? 'Single Pokémon' : `Batch of ${batchCount} Pokémon`}
                            </span>
                        </div>

                        <div className="generator-modal__count-selector">
                            {[1, 2, 3, 4, 5, 6].map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    className={`generator-modal__count-btn ${batchCount === count ? 'active' : ''}`}
                                    onClick={() => {
                                        setBatchCount(count);
                                        if (count > 1 && destination === 'overwrite') {
                                            setDestination('new');
                                        }
                                    }}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>

                        {batchCount > 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                <div className="generator-modal__mode-toggle">
                                    <button
                                        type="button"
                                        className={`action-button ${syncPresets ? 'action-button--theme' : 'action-button--dark'}`}
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            fontSize: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                        onClick={() => setSyncPresets(true)}
                                    >
                                        <Link2 size={14} /> Synced Presets (Shared by All)
                                    </button>
                                    <button
                                        type="button"
                                        className={`action-button ${!syncPresets ? 'action-button--theme' : 'action-button--dark'}`}
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            fontSize: '0.8rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                        onClick={() => setSyncPresets(false)}
                                    >
                                        <Sliders size={14} /> Individual Tinkering (Per-Pokémon)
                                    </button>
                                </div>

                                {!syncPresets && (
                                    <>
                                        <div className="generator-modal__slot-tabs">
                                            {Array.from({ length: batchCount }, (_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    className={`generator-modal__slot-tab-btn ${activeSlotIndex === i ? 'active' : ''}`}
                                                    onClick={() => setActiveSlotIndex(i)}
                                                >
                                                    Pokémon #{i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '2px 4px'
                                            }}
                                        >
                                            <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                                Configuring Pokémon #{activeSlotIndex + 1}
                                            </span>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark"
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '0.74rem',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                                onClick={handleCopyPresetToAll}
                                                title="Copy this Pokémon's settings to all other slots"
                                            >
                                                <Copy size={12} /> Copy Preset to All
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Destination Toggle */}
                    <div className="generator-modal__destination-box">
                        <span className="generator-modal__destination-title text-title-primary">
                            {isStandaloneMode ? 'Destination Sheet' : 'Destination Target'}
                        </span>
                        <div className="generator-modal__destination-buttons">
                            <button
                                type="button"
                                className={`action-button generator-modal__dest-btn ${destination === 'new' ? 'action-button--theme' : 'action-button--dark'}`}
                                onClick={() => setDestination('new')}
                            >
                                {isStandaloneMode ? (
                                    <>
                                        <FilePlus size={15} />{' '}
                                        {batchCount > 1 ? `Generate ${batchCount} New Sheets` : 'Generate New Sheet'}
                                    </>
                                ) : (
                                    <>
                                        <ImagePlus size={15} />{' '}
                                        {batchCount > 1 ? `Generate ${batchCount} New Tokens` : 'Generate New Token'}
                                    </>
                                )}
                            </button>
                            {activeTokenId && batchCount === 1 && (
                                <button
                                    type="button"
                                    className={`action-button generator-modal__dest-btn ${destination === 'overwrite' ? 'action-button--red' : 'action-button--dark'}`}
                                    onClick={() => setDestination('overwrite')}
                                    title={
                                        isStandaloneMode
                                            ? 'Overwrite currently open sheet'
                                            : 'Overwrite currently selected token'
                                    }
                                >
                                    <AlertTriangle size={15} />{' '}
                                    {isStandaloneMode ? 'Overwrite Current Sheet' : 'Overwrite Selected Token'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Species, Rank & Location Row */}
                    <div className="generator-modal__row">
                        <div className="generator-modal__col">
                            <label className="text-label">Species:</label>
                            <input
                                type="text"
                                list="generator-species-datalist"
                                className="generator-modal__input text-label"
                                placeholder={
                                    activeConfig.randomizeSpecies ? 'Random Species (Enabled Below)' : 'e.g. Lucario'
                                }
                                value={activeConfig.randomizeSpecies ? '' : currentSpecies}
                                onChange={(e) => updateCurrentSpecies(e.target.value)}
                                disabled={activeConfig.randomizeSpecies}
                            />
                            <datalist id="generator-species-datalist">
                                {uniqueSpecies.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </div>
                        <div className="generator-modal__col">
                            <label className="text-label">Rank:</label>
                            <select
                                value={currentRank}
                                onChange={(e) => updateCurrentRank(e.target.value as Rank)}
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
                                        setTooltipInfo({
                                            title: 'Location / Biome Filter',
                                            desc: BIOME_TOOLTIP_NOTE
                                        })
                                    }
                                />
                            </label>
                            <select
                                value={activeConfig.selectedBiome || ''}
                                onChange={(e) => setConfigProxy({ selectedBiome: e.target.value })}
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

                    {/* Optional Sheet / Token Nickname when generating New */}
                    {destination === 'new' && (
                        <div className="generator-modal__row">
                            <div className="generator-modal__col">
                                <label className="text-label">
                                    {isStandaloneMode
                                        ? 'Sheet Name / Nickname (Optional):'
                                        : 'Token Name / Nickname (Optional):'}
                                </label>
                                <input
                                    type="text"
                                    className="generator-modal__input text-label"
                                    placeholder="e.g. Sparky (Leave blank for Unnamed)"
                                    value={sheetName}
                                    onChange={(e) => setSheetName(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Build Tier, Combat Bias & Defensive Preference */}
                    <div className="generator-modal__row">
                        <div className="generator-modal__col">
                            <label className="text-label">Build Tier:</label>
                            <select
                                value={config.buildType}
                                onChange={(e) => setConfig({ buildType: e.target.value })}
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
                                onChange={(e) => setConfig({ combatBias: e.target.value })}
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
                                        setTooltipInfo({
                                            title: 'Defensive Style',
                                            desc: 'Determines how defensive skill points (Evasion vs Clash) are prioritized. "Auto" evaluates potential dice pools with an inherent preference for Evasion (dodging).'
                                        })
                                    }
                                />
                            </label>
                            <select
                                value={config.defensePreference || 'auto'}
                                onChange={(e) => setConfig({ defensePreference: e.target.value })}
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

                    <div className="generator-modal__side-by-side">
                        {/* COLUMN 1: Min Stats */}
                        <div className="generator-modal__composition">
                            <label className="generator-modal__comp-title text-title-primary">
                                Guaranteed Minimum Ranks
                            </label>
                            <p className="generator-modal__comp-desc text-subtext">
                                Force the generator to allocate points here before processing its primary logic.
                            </p>

                            <div className="generator-modal__min-wrapper">
                                <div className="generator-modal__min-grid">
                                    {Object.values(CombatStat).map((stat) => (
                                        <div key={stat} className="generator-modal__min-item">
                                            <span className="text-label text-subtext">{stat.toUpperCase()}</span>
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
                                            <span className="text-label text-subtext">{stat.toUpperCase()}</span>
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
                            <label className="generator-modal__comp-title text-title-primary">Move Composition</label>
                            <p className="generator-modal__comp-desc text-subtext">
                                Insight will automatically scale to fit this total.
                            </p>
                            <div className="generator-modal__comp-row">
                                <div className="generator-modal__comp-item">
                                    <span className="text-label">Attacks</span>
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
                                    <span className="text-label">Support</span>
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
                                <label className="generator-modal__checkbox-label text-label">
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
                                                <span className="text-label">Atk</span>
                                            </div>
                                            <span className="text-subtext">:</span>
                                            <div className="generator-modal__comp-item generator-modal__comp-item--row">
                                                <NumberSpinner
                                                    value={config.spilloverSupRatio}
                                                    onChange={(val) => setConfig({ spilloverSupRatio: val })}
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
                                <label className="generator-modal__comp-title text-title-primary">
                                    Attack Type Ratios
                                </label>
                                <p className="generator-modal__comp-desc text-subtext">
                                    Override STAB counts & Coverage.
                                </p>
                                <div className="generator-modal__coverage-section">
                                    <div className="generator-modal__coverage-row">
                                        <label
                                            className="generator-modal__checkbox-label text-label"
                                            title={type1Label}
                                        >
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
                                            <label
                                                className="generator-modal__checkbox-label text-label"
                                                title={type2Label}
                                            >
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
                                        <label className="text-label">Coverage Preference</label>
                                        <select
                                            value={config.coveragePreference}
                                            onChange={(e) => setConfig({ coveragePreference: e.target.value })}
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
                                <label className="generator-modal__comp-title generator-modal__comp-title--disabled text-title-primary">
                                    Attack Type Ratios
                                </label>
                                <p className="generator-modal__comp-desc text-subtext">
                                    Disabled during Wild (Random) Generation.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Species, Evolution & Special Filters Panel */}
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
                                            setTooltipInfo({
                                                title: 'Evolution Line Length',
                                                desc: 'Filter Pokémon based on how many stages exist in their evolutionary family (e.g. Kangaskhan is Single-Stage; Lucario is 2-Stage; Charizard is 3-Stage).'
                                            })
                                        }
                                    />
                                </label>
                                <div className="generator-modal__checkbox-subgroup">
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={(config.allowedLineLengths ?? [1, 2, 3]).includes(1)}
                                            onChange={() => handleToggleLineLength(1)}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>Single-Stage</span>
                                    </label>
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={(config.allowedLineLengths ?? [1, 2, 3]).includes(2)}
                                            onChange={() => handleToggleLineLength(2)}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>2-Stage Line</span>
                                    </label>
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={(config.allowedLineLengths ?? [1, 2, 3]).includes(3)}
                                            onChange={() => handleToggleLineLength(3)}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>3-Stage Line</span>
                                    </label>
                                </div>
                            </div>

                            <div className="generator-modal__filter-item">
                                <label className="generator-modal__filter-label text-label">
                                    Evolution Stage Level:
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
                                                title: 'Stage Level',
                                                desc: 'Filter species based on their current stage position. 1st Evo = Basic/Baby Pokémon; 2nd Evo = Middle Stage; 3rd Evo = Final Evolution.'
                                            })
                                        }
                                    />
                                </label>
                                <div className="generator-modal__checkbox-subgroup">
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={(config.allowedStageIndices ?? [1, 2, 3]).includes(1)}
                                            onChange={() => handleToggleStageIndex(1)}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>1st Evo / Basic</span>
                                    </label>
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={(config.allowedStageIndices ?? [1, 2, 3]).includes(2)}
                                            onChange={() => handleToggleStageIndex(2)}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>2nd Evo / Middle</span>
                                    </label>
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={(config.allowedStageIndices ?? [1, 2, 3]).includes(3)}
                                            onChange={() => handleToggleStageIndex(3)}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>3rd Evo / Final</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Special Forms & Scalar Loyalty */}
                        <div className="generator-modal__filter-grid">
                            <div className="generator-modal__filter-item">
                                <label className="generator-modal__filter-label text-label">
                                    Special Forms & Species:
                                </label>
                                <div className="generator-modal__checkbox-subgroup">
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(config.includeLegendaries)}
                                            onChange={(e) => setConfig({ includeLegendaries: e.target.checked })}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>Legendaries</span>
                                    </label>
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(config.includeMythicals)}
                                            onChange={(e) => setConfig({ includeMythicals: e.target.checked })}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>Mythicals</span>
                                    </label>
                                    <label className="generator-modal__checkbox-label text-label">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(config.includeMegas)}
                                            onChange={(e) => setConfig({ includeMegas: e.target.checked })}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>Megas / Special Forms</span>
                                    </label>
                                </div>
                            </div>

                            <div className="generator-modal__filter-item">
                                <label className="generator-modal__checkbox-label text-label">
                                    <input
                                        type="checkbox"
                                        checked={config.scaleLoyaltyHappiness !== false}
                                        onChange={(e) => setConfig({ scaleLoyaltyHappiness: e.target.checked })}
                                        className="generator-modal__checkbox"
                                    />
                                    <span>
                                        <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                        Scale Pokémon Loyalty & Happiness with Rank
                                    </span>
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
                                                title: 'Scalar Loyalty & Happiness',
                                                desc: 'Scales bond according to corebook rank achievements: Starter/Rookie Pokémon start at 1–2; Standard rank has 1 maxed partner (5) with others at 2–3; Expert and Ace+ rosters feature loyal 5/5 partners.'
                                            })
                                        }
                                    />
                                </label>

                                {batchCount > 1 && (
                                    <label
                                        className="generator-modal__checkbox-label text-label"
                                        style={{ marginTop: '4px' }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Boolean(config.allowDuplicates)}
                                            onChange={(e) => setConfig({ allowDuplicates: e.target.checked })}
                                            className="generator-modal__checkbox"
                                        />
                                        <span>Allow Duplicate Pokémon</span>
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
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

                    {/* 2-Column Checkbox Grid */}
                    <div className="generator-modal__checkbox-group">
                        {/* LEFT COLUMN: Basic Settings */}
                        <div className="generator-modal__checkbox-col">
                            <label className="generator-modal__checkbox-label text-label">
                                <input
                                    type="checkbox"
                                    checked={config.ensureDefenses}
                                    onChange={(e) => setConfig({ ensureDefenses: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Ensure Minimum Defenses (Scales with Rank)
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
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
                                    onChange={(e) => setConfig({ includePmd: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Include Knowledge Skills (Lore, Medicine, etc.)
                            </label>
                            <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                                <input
                                    type="checkbox"
                                    checked={config.includeCustom}
                                    onChange={(e) => setConfig({ includeCustom: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Include Custom Homebrew Skills
                            </label>

                            <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                                <input
                                    type="checkbox"
                                    checked={config.randomizeSpecies}
                                    onChange={(e) => setConfig({ randomizeSpecies: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Randomize Species
                            </label>
                            <label className="generator-modal__checkbox-label generator-modal__checkbox-label--indented text-label">
                                <input
                                    type="checkbox"
                                    checked={config.autoSelectBias}
                                    onChange={(e) => setConfig({ autoSelectBias: e.target.checked })}
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
                                    onChange={(e) => setConfig({ randomizeGender: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Randomize Gender (50/50 M/F)
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
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
                                    onChange={(e) => setConfig({ randomizeNature: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Randomize Nature
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({
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
                                    onChange={(e) => setConfig({ includePreEvolutions: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Include Pre-Evolution Moves
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
                                        <strong className="generator-modal__evo-title text-title-primary">
                                            2-Stage Lines (e.g. Vulpix → Ninetales)
                                        </strong>
                                        <div className="generator-modal__evo-row">
                                            <span className="text-subtext">Base Form (Offset Down)</span>
                                            <NumberSpinner
                                                value={config.evo2Stage1Offset}
                                                onChange={(val) => setConfig({ evo2Stage1Offset: val })}
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
                                                onChange={(val) => setConfig({ evo3Stage2Offset: val })}
                                                min={0}
                                                max={7}
                                            />
                                        </div>
                                        <div className="generator-modal__evo-row">
                                            <span className="text-subtext">Base Form (Offset Down)</span>
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

                            <label className="generator-modal__checkbox-label generator-modal__checkbox-label--spaced text-label">
                                <input
                                    type="checkbox"
                                    checked={config.allowOverrank}
                                    onChange={(e) => setConfig({ allowOverrank: e.target.checked })}
                                    className="generator-modal__checkbox"
                                />
                                Allow Overrank (Draft 1 Higher Rank Move)
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
                                        <span className="text-label">Max Ranks Above</span>
                                        <NumberSpinner
                                            value={config.overrankAmount}
                                            onChange={(val) => setConfig({ overrankAmount: val })}
                                            min={1}
                                            max={7}
                                        />
                                    </div>
                                    <label className="generator-modal__checkbox-label text-subtext">
                                        <input
                                            type="checkbox"
                                            checked={config.allowPreEvoOverrank}
                                            onChange={(e) => setConfig({ allowPreEvoOverrank: e.target.checked })}
                                            className="generator-modal__checkbox"
                                            disabled={!config.includePreEvolutions}
                                        />
                                        <span style={{ fontWeight: 'normal' }}>Include Pre-Evolutions in Pool</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
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
                            (!activeConfig.randomizeSpecies && !currentSpecies.trim() && !activeConfig.selectedBiome)
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
