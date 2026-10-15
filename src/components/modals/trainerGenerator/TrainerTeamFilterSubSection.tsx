import React from 'react';
import { Sparkles } from 'lucide-react';
import { TooltipIcon } from '../../ui/TooltipIcon';

export interface TrainerTeamFilterSubSectionProps {
    allowedLineLengths: number[];
    setAllowedLineLengths: React.Dispatch<React.SetStateAction<number[]>>;
    allowedStageIndices: number[];
    setAllowedStageIndices: React.Dispatch<React.SetStateAction<number[]>>;
    allowedGenerations: number[];
    setAllowedGenerations: React.Dispatch<React.SetStateAction<number[]>>;
    includeLegendaries: boolean;
    setIncludeLegendaries: (val: boolean) => void;
    includeMythicals: boolean;
    setIncludeMythicals: (val: boolean) => void;
    includeUltraBeasts: boolean;
    setIncludeUltraBeasts: (val: boolean) => void;
    includeParadox: boolean;
    setIncludeParadox: (val: boolean) => void;
    includeMegas: boolean;
    setIncludeMegas: (val: boolean) => void;
    scaleLoyaltyHappiness: boolean;
    setScaleLoyaltyHappiness: (val: boolean) => void;
    allowDuplicates: boolean;
    setAllowDuplicates: (val: boolean) => void;
    onOpenTooltip: (info: { title: string; desc: string }) => void;
}

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

export const TrainerTeamFilterSubSection: React.FC<TrainerTeamFilterSubSectionProps> = ({
    allowedLineLengths,
    setAllowedLineLengths,
    allowedStageIndices,
    setAllowedStageIndices,
    allowedGenerations,
    setAllowedGenerations,
    includeLegendaries,
    setIncludeLegendaries,
    includeMythicals,
    setIncludeMythicals,
    includeUltraBeasts,
    setIncludeUltraBeasts,
    includeParadox,
    setIncludeParadox,
    includeMegas,
    setIncludeMegas,
    scaleLoyaltyHappiness,
    setScaleLoyaltyHappiness,
    allowDuplicates,
    setAllowDuplicates,
    onOpenTooltip
}) => {
    const handleToggleLineLength = (len: number) => {
        setAllowedLineLengths((prev) =>
            prev.includes(len) ? (prev.length > 1 ? prev.filter((l) => l !== len) : prev) : [...prev, len]
        );
    };

    const handleToggleStageIndex = (stage: number) => {
        setAllowedStageIndices((prev) =>
            prev.includes(stage) ? (prev.length > 1 ? prev.filter((s) => s !== stage) : prev) : [...prev, stage]
        );
    };

    const handleToggleGeneration = (gen: number) => {
        setAllowedGenerations((prev) =>
            prev.includes(gen) ? prev.filter((g) => g !== gen) : [...prev, gen].sort((a, b) => a - b)
        );
    };

    const handleSelectAllGens = () => {
        setAllowedGenerations([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    };

    const handleClearGens = () => {
        setAllowedGenerations([]);
    };

    return (
        <>
            {/* Evolutionary Filter Controls */}
            <div className="trainer-gen-modal__grid--2col">
                <div className="trainer-gen-modal__field">
                    <label className="trainer-gen-modal__field-label text-label">
                        Evolution Line Length:
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Line Length Filter',
                                    desc: 'Single-Stage: Pokémon that do not evolve (e.g. Lapras, Heracross).\n\n2-Stage: Two forms (e.g. Rattata -> Raticate).\n\n3-Stage: Three forms (e.g. Charmander -> Charmeleon -> Charizard).'
                                })
                            }
                        />
                    </label>
                    <div className="trainer-gen-modal__checkbox-group">
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowedLineLengths.includes(1)}
                                onChange={() => handleToggleLineLength(1)}
                            />
                            <span>Single-Stage</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowedLineLengths.includes(2)}
                                onChange={() => handleToggleLineLength(2)}
                            />
                            <span>2-Stage Line</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowedLineLengths.includes(3)}
                                onChange={() => handleToggleLineLength(3)}
                            />
                            <span>3-Stage Line</span>
                        </label>
                    </div>
                </div>

                <div className="trainer-gen-modal__field">
                    <label className="trainer-gen-modal__field-label text-label">
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
                    <div className="trainer-gen-modal__checkbox-group">
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowedStageIndices.includes(1)}
                                onChange={() => handleToggleStageIndex(1)}
                            />
                            <span>1st Evo / Basic</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowedStageIndices.includes(2)}
                                onChange={() => handleToggleStageIndex(2)}
                            />
                            <span>2nd Evo / Middle</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={allowedStageIndices.includes(3)}
                                onChange={() => handleToggleStageIndex(3)}
                            />
                            <span>3rd Evo / Final</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Generation Filter */}
            <div className="trainer-gen-modal__field" style={{ marginTop: '8px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                    }}
                >
                    <label className="trainer-gen-modal__field-label text-label">
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
                <div
                    className="trainer-gen-modal__checkbox-group"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}
                >
                    {GENERATION_ITEMS.map(({ gen, label, region }) => {
                        const isChecked = allowedGenerations.includes(gen);
                        return (
                            <label
                                key={gen}
                                className="trainer-gen-modal__checkbox-label"
                                title={`${label} (${region})`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleGeneration(gen)}
                                />
                                <span>{label}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Exclusions & Scalar Loyalty */}
            <div className="trainer-gen-modal__grid--2col" style={{ marginTop: '8px' }}>
                <div className="trainer-gen-modal__field">
                    <label className="trainer-gen-modal__field-label text-label">Special Forms & Species:</label>
                    <div className="trainer-gen-modal__checkbox-group">
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeLegendaries}
                                onChange={(e) => setIncludeLegendaries(e.target.checked)}
                            />
                            <span>Legendaries</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeMythicals}
                                onChange={(e) => setIncludeMythicals(e.target.checked)}
                            />
                            <span>Mythicals</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeUltraBeasts}
                                onChange={(e) => setIncludeUltraBeasts(e.target.checked)}
                            />
                            <span>Ultra Beasts</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeParadox}
                                onChange={(e) => setIncludeParadox(e.target.checked)}
                            />
                            <span>Paradox</span>
                        </label>
                        <label className="trainer-gen-modal__checkbox-label">
                            <input
                                type="checkbox"
                                checked={includeMegas}
                                onChange={(e) => setIncludeMegas(e.target.checked)}
                            />
                            <span>Megas / Special Forms</span>
                        </label>
                    </div>
                </div>

                <div className="trainer-gen-modal__field" style={{ justifyContent: 'center' }}>
                    <label className="trainer-gen-modal__checkbox-label">
                        <input
                            type="checkbox"
                            checked={scaleLoyaltyHappiness}
                            onChange={(e) => setScaleLoyaltyHappiness(e.target.checked)}
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

                    <label className="trainer-gen-modal__checkbox-label" style={{ marginTop: '8px' }}>
                        <input
                            type="checkbox"
                            checked={allowDuplicates}
                            onChange={(e) => setAllowDuplicates(e.target.checked)}
                        />
                        <span>Allow Duplicate Pokémon</span>
                        <TooltipIcon
                            onClick={() =>
                                onOpenTooltip({
                                    title: 'Allow Duplicate Pokémon',
                                    desc: 'When unchecked (default), each Pokémon generated for the team will be a unique species. Check this box if you want to allow trainers to carry multiple Pokémon of the exact same species (e.g. two Lapras).'
                                })
                            }
                        />
                    </label>
                </div>
            </div>
        </>
    );
};
