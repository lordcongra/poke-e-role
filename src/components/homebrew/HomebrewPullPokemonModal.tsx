import { useState, useEffect, useMemo } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ALL_SPECIES, fetchBasePokemonData, loadLocalDataset } from '../../utils/api';
import type { PokemonApiResponse } from '../../utils/apiTypes';
import { convertApiPokemonToCustom } from '../../utils/macroHelpers';
import { TYPE_COLORS } from '../../data/constants';
import { Search, BookOpen, Copy, RefreshCw, X, AlertTriangle, Check, Loader2 } from 'lucide-react';
import './HomebrewPullPokemonModal.css';

interface HomebrewPullPokemonModalProps {
    isOpen: boolean;
    onClose: (pulledSpeciesName?: string) => void;
}

export function HomebrewPullPokemonModal({ isOpen, onClose }: HomebrewPullPokemonModalProps) {
    const roomCustomPokemon = useCharacterStore((state) => state.roomCustomPokemon);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const addCustomPokemon = useCharacterStore((state) => state.addCustomPokemon);
    const updateCustomPokemon = useCharacterStore((state) => state.updateCustomPokemon);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSpecies, setSelectedSpecies] = useState('');
    const [previewData, setPreviewData] = useState<PokemonApiResponse | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [speciesList, setSpeciesList] = useState<string[]>([]);

    // Merge custom types into color mapping
    const ALL_COLORS: Record<string, string> = useMemo(() => {
        const customTypeMap = Object.fromEntries(roomCustomTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customTypeMap };
    }, [roomCustomTypes]);

    // Initialize dataset & species list on modal open
    useEffect(() => {
        if (!isOpen) return;

        loadLocalDataset().then(() => {
            const list = [...ALL_SPECIES];
            setSpeciesList(list);
            setSelectedSpecies((prev) => (prev ? prev : list.length > 0 ? list[0] : ''));
        });
    }, [isOpen]);

    // Fetch species data when selectedSpecies changes
    useEffect(() => {
        let isMounted = true;

        if (!selectedSpecies) {
            return () => {
                isMounted = false;
            };
        }

        Promise.resolve().then(() => {
            if (isMounted) setIsLoadingData(true);
        });

        fetchBasePokemonData(selectedSpecies)
            .then((data) => {
                if (isMounted) {
                    setPreviewData(data);
                    setIsLoadingData(false);
                }
            })
            .catch((e) => {
                console.warn('[HomebrewPullPokemonModal] Failed to fetch species:', e);
                if (isMounted) {
                    setPreviewData(null);
                    setIsLoadingData(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [selectedSpecies]);

    // Derived typed custom preview object
    const customPreview = useMemo(() => {
        return previewData ? convertApiPokemonToCustom(previewData) : null;
    }, [previewData]);

    if (!isOpen) return null;

    const filteredSpecies = speciesList.filter((name) => name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    // Exact duplicate match checking
    const existingEntry = customPreview
        ? roomCustomPokemon.find((p) => p.Name.trim().toLowerCase() === customPreview.Name.trim().toLowerCase())
        : undefined;

    const handlePullNew = () => {
        if (!customPreview) return;
        addCustomPokemon(customPreview);

        if (OBR.isAvailable) {
            OBR.notification.show(`Pulled ${customPreview.Name} into Homebrew Workshop!`, 'SUCCESS');
        }
        onClose(customPreview.Name);
    };

    const handlePullAsCopy = () => {
        if (!customPreview) return;
        let copyName = `${customPreview.Name} (Copy)`;
        let counter = 2;
        while (roomCustomPokemon.some((p) => p.Name.trim().toLowerCase() === copyName.trim().toLowerCase())) {
            copyName = `${customPreview.Name} (Copy ${counter})`;
            counter++;
        }
        addCustomPokemon({ ...customPreview, Name: copyName });

        if (OBR.isAvailable) {
            OBR.notification.show(`Pulled ${copyName} into Homebrew Workshop!`, 'SUCCESS');
        }
        onClose(copyName);
    };

    const handleOverwriteExisting = () => {
        if (!customPreview || !existingEntry) return;
        Object.entries(customPreview).forEach(([key, val]) => {
            updateCustomPokemon(existingEntry.id, key as keyof typeof customPreview, val as never);
        });

        if (OBR.isAvailable) {
            OBR.notification.show(`Overwrote ${existingEntry.Name} with official Pokédex data!`, 'SUCCESS');
        }
        onClose(existingEntry.Name);
    };

    // Calculate moves per rank summary
    const movesSummary: Record<string, number> = {};
    if (previewData?.Moves) {
        const movesList = Array.isArray(previewData.Moves)
            ? previewData.Moves
            : Object.entries(previewData.Moves).flatMap(([rank, mList]) =>
                  Array.isArray(mList)
                      ? mList.map((m) => ({ Learned: rank, Name: typeof m === 'string' ? m : m.Name }))
                      : []
              );

        movesList.forEach((m) => {
            const rank = (typeof m === 'object' && m !== null && (m as { Learned?: string }).Learned) || 'Other';
            movesSummary[rank] = (movesSummary[rank] || 0) + 1;
        });
    }

    return (
        <div className="homebrew-pull-modal__overlay" onClick={() => onClose()}>
            <div className="homebrew-pull-modal__dialog" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="homebrew-pull-modal__header">
                    <h3 className="homebrew-pull-modal__header-title text-title-primary">
                        <BookOpen size={20} color="var(--primary)" />
                        Pull Pokémon from Pokédex
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="action-button action-button--dark"
                        style={{ padding: '4px' }}
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body: Split View */}
                <div className="homebrew-pull-modal__body">
                    {/* Left: Search & Species List */}
                    <div className="homebrew-pull-modal__sidebar">
                        <div className="homebrew-pull-modal__search-box">
                            <Search size={14} color="var(--text-muted)" />
                            <input
                                type="text"
                                placeholder="Search Pokédex..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="homebrew-pull-modal__search-input"
                                autoFocus
                            />
                        </div>
                        <div className="homebrew-pull-modal__species-list">
                            {filteredSpecies.length === 0 ? (
                                <div className="text-subtext" style={{ padding: '12px', textAlign: 'center' }}>
                                    No Pokémon found.
                                </div>
                            ) : (
                                filteredSpecies.map((speciesName) => {
                                    const isSelected = selectedSpecies.toLowerCase() === speciesName.toLowerCase();
                                    return (
                                        <button
                                            key={speciesName}
                                            type="button"
                                            onClick={() => setSelectedSpecies(speciesName)}
                                            className={`homebrew-pull-modal__species-item ${
                                                isSelected ? 'is-selected' : ''
                                            }`}
                                        >
                                            <span>{speciesName}</span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Species Details Preview */}
                    <div className="homebrew-pull-modal__content">
                        {isLoadingData ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    gap: '8px',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <Loader2 className="animate-spin" size={24} />
                                <span className="text-subtext">Loading Pokémon data...</span>
                            </div>
                        ) : !previewData ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: 'var(--text-muted)'
                                }}
                            >
                                <span className="text-subtext">Select a Pokémon from the list to preview.</span>
                            </div>
                        ) : (
                            <>
                                {/* Preview Header */}
                                <div className="homebrew-pull-modal__preview-header">
                                    <div className="homebrew-pull-modal__title-row">
                                        <h2 className="text-title-primary" style={{ margin: 0, fontSize: '1.4rem' }}>
                                            {previewData.Name}
                                        </h2>
                                        {previewData.DexID && (
                                            <span className="homebrew-pull-modal__dex-badge">
                                                #{String(previewData.DexID).padStart(3, '0')}
                                            </span>
                                        )}
                                        {previewData.DexCategory && (
                                            <span className="text-subtext" style={{ fontStyle: 'italic' }}>
                                                {previewData.DexCategory}
                                            </span>
                                        )}
                                    </div>

                                    <div className="homebrew-pull-modal__type-pills">
                                        {previewData.Type1 && (
                                            <span
                                                className="homebrew-pull-modal__type-pill"
                                                style={{
                                                    background: ALL_COLORS[previewData.Type1] || 'var(--primary)'
                                                }}
                                            >
                                                {previewData.Type1}
                                            </span>
                                        )}
                                        {previewData.Type2 && previewData.Type2.toLowerCase() !== 'none' && (
                                            <span
                                                className="homebrew-pull-modal__type-pill"
                                                style={{
                                                    background: ALL_COLORS[previewData.Type2] || 'var(--primary)'
                                                }}
                                            >
                                                {previewData.Type2}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Duplicate Warning if exact match already in Homebrew */}
                                {existingEntry && (
                                    <div className="homebrew-pull-modal__duplicate-alert">
                                        <AlertTriangle size={20} color="var(--semantic-danger)" />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                Existing Homebrew Pokémon Detected
                                            </div>
                                            <div className="text-subtext" style={{ fontSize: '0.8rem' }}>
                                                An entry named &quot;{existingEntry.Name}&quot; already exists in your
                                                Homebrew Workshop. You can overwrite it with official base stats or pull
                                                it in as a separate copy.
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Base Stats & Limits Grid */}
                                <div className="homebrew-pull-modal__stats-grid">
                                    <div className="homebrew-pull-modal__stat-cell">
                                        <span className="homebrew-pull-modal__stat-label">Base HP</span>
                                        <span className="homebrew-pull-modal__stat-value text-value-highlight">
                                            {customPreview?.BaseHP ?? 4}
                                        </span>
                                    </div>
                                    <div className="homebrew-pull-modal__stat-cell">
                                        <span className="homebrew-pull-modal__stat-label">Strength</span>
                                        <span className="homebrew-pull-modal__stat-value">
                                            {customPreview?.Strength ?? 2} / {customPreview?.MaxStrength ?? 5}
                                        </span>
                                    </div>
                                    <div className="homebrew-pull-modal__stat-cell">
                                        <span className="homebrew-pull-modal__stat-label">Dexterity</span>
                                        <span className="homebrew-pull-modal__stat-value">
                                            {customPreview?.Dexterity ?? 2} / {customPreview?.MaxDexterity ?? 5}
                                        </span>
                                    </div>
                                    <div className="homebrew-pull-modal__stat-cell">
                                        <span className="homebrew-pull-modal__stat-label">Vitality</span>
                                        <span className="homebrew-pull-modal__stat-value">
                                            {customPreview?.Vitality ?? 2} / {customPreview?.MaxVitality ?? 5}
                                        </span>
                                    </div>
                                    <div className="homebrew-pull-modal__stat-cell">
                                        <span className="homebrew-pull-modal__stat-label">Special</span>
                                        <span className="homebrew-pull-modal__stat-value">
                                            {customPreview?.Special ?? 2} / {customPreview?.MaxSpecial ?? 5}
                                        </span>
                                    </div>
                                    <div className="homebrew-pull-modal__stat-cell">
                                        <span className="homebrew-pull-modal__stat-label">Insight</span>
                                        <span className="homebrew-pull-modal__stat-value">
                                            {customPreview?.Insight ?? 1} / {customPreview?.MaxInsight ?? 5}
                                        </span>
                                    </div>
                                </div>

                                {/* Abilities */}
                                <div className="homebrew-pull-modal__section">
                                    <span className="homebrew-pull-modal__section-title">Official Abilities</span>
                                    <div className="homebrew-pull-modal__abilities-row">
                                        {previewData.Ability1 && (
                                            <span className="homebrew-pull-modal__ability-tag">
                                                <b>Ability 1:</b> {previewData.Ability1}
                                            </span>
                                        )}
                                        {previewData.Ability2 && previewData.Ability2.toLowerCase() !== 'none' && (
                                            <span className="homebrew-pull-modal__ability-tag">
                                                <b>Ability 2:</b> {previewData.Ability2}
                                            </span>
                                        )}
                                        {previewData.HiddenAbility &&
                                            previewData.HiddenAbility.toLowerCase() !== 'none' && (
                                                <span className="homebrew-pull-modal__ability-tag">
                                                    <b>Hidden:</b> {previewData.HiddenAbility}
                                                </span>
                                            )}
                                        {previewData.EventAbilities &&
                                            previewData.EventAbilities.toLowerCase() !== 'none' && (
                                                <span className="homebrew-pull-modal__ability-tag">
                                                    <b>Event:</b> {previewData.EventAbilities}
                                                </span>
                                            )}
                                    </div>
                                </div>

                                {/* Learnset Breakdown */}
                                <div className="homebrew-pull-modal__section">
                                    <span className="homebrew-pull-modal__section-title">Official Learnset</span>
                                    <div className="homebrew-pull-modal__learnset-summary">
                                        {Object.entries(movesSummary).map(([rank, count]) => (
                                            <span key={rank} className="homebrew-pull-modal__learnset-pill">
                                                {rank}: <b>{count}</b> moves
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Dex Info */}
                                {previewData.DexDescription && (
                                    <div className="homebrew-pull-modal__section">
                                        <span className="homebrew-pull-modal__section-title">Pokédex Entry</span>
                                        <div className="homebrew-pull-modal__desc-box">
                                            &ldquo;{previewData.DexDescription}&rdquo;
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="homebrew-pull-modal__footer">
                    <button type="button" onClick={() => onClose()} className="action-button action-button--dark">
                        Cancel
                    </button>

                    {previewData && existingEntry ? (
                        <>
                            <button
                                type="button"
                                onClick={handlePullAsCopy}
                                className="action-button action-button--secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Copy size={16} /> Pull as Copy
                            </button>
                            <button
                                type="button"
                                onClick={handleOverwriteExisting}
                                className="action-button action-button--red"
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <RefreshCw size={16} /> Overwrite Existing
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            disabled={!previewData || isLoadingData}
                            onClick={handlePullNew}
                            className="action-button action-button--theme"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Check size={16} /> Pull into Homebrew
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
