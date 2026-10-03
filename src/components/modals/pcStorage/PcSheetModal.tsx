import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { IdentityHeader } from '../../identity/IdentityHeader';
import { DerivedBoard } from '../../board/DerivedBoard';
import { CoreTable } from '../../tables/CoreTable';
import { SocialTable } from '../../tables/SocialTable';
import { TypeMatchups } from '../../board/TypeMatchups';
import { SkillsTable } from '../../tables/SkillsTable';
import { ActionRolls } from '../../tables/ActionRolls';
import { MovesTable } from '../../tables/MovesTable';
import { InventoryTable } from '../../tables/InventoryTable';
import { TrackerSection } from '../../board/TrackerSection';
import { TrainerBadges } from '../../board/TrainerBadges';
import { DemoRollModal } from '../combat/DemoRollModal';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePcSheetSync } from './usePcSheetSync';
import './PcSheetModal.css';

interface PcSheetModalProps {
    currentSummary: PcPokemonSummary;
    allSummaries: PcPokemonSummary[];
    onSelectEntity: (entityId: string) => void;
    onUpdateSummary: (summary: PcPokemonSummary) => void;
    onClose: () => void;
}

export const PcSheetModal: React.FC<PcSheetModalProps> = ({
    currentSummary,
    allSummaries,
    onSelectEntity,
    onUpdateSummary,
    onClose
}) => {
    const mode = useCharacterStore((state) => state.identity.mode);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    const { loading, flushSync } = usePcSheetSync({
        currentSummary,
        onUpdateSummary,
        mode,
        roomCustomTypes
    });

    // Previous / Next navigation
    const currentIndex = allSummaries.findIndex((s) => s.entityId === currentSummary.entityId);
    const hasMultiple = allSummaries.length > 1;

    const handlePrev = () => {
        if (!hasMultiple) return;
        flushSync();
        const prevIdx = (currentIndex - 1 + allSummaries.length) % allSummaries.length;
        onSelectEntity(allSummaries[prevIdx].entityId);
    };

    const handleNext = () => {
        if (!hasMultiple) return;
        flushSync();
        const nextIdx = (currentIndex + 1) % allSummaries.length;
        onSelectEntity(allSummaries[nextIdx].entityId);
    };

    const handleSelectEntity = (entityId: string) => {
        if (entityId === currentSummary.entityId) return;
        flushSync();
        onSelectEntity(entityId);
    };

    const handleClose = () => {
        flushSync();
        onClose();
    };

    const displayName = currentSummary.name || currentSummary.species;
    const resolvedAvatar = useResolvedImageUrl(currentSummary.tokenImageUrl, getAbsolutePokeballUrl());

    return (
        <div className="pc-sheet-modal__overlay" onClick={handleClose}>
            <div className="pc-sheet-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pc-sheet-modal__header">
                    <div className="pc-sheet-modal__header-left">
                        <div className="pc-sheet-modal__avatar">
                            <img
                                src={resolvedAvatar}
                                alt={displayName}
                                onError={(e) => {
                                    e.currentTarget.src = getAbsolutePokeballUrl();
                                }}
                            />
                        </div>
                        <div className="pc-sheet-modal__titles">
                            <h3 className="pc-sheet-modal__name">{displayName}</h3>
                            <div className="pc-sheet-modal__sub text-subtext">
                                <span>
                                    {currentSummary.rank === 'Trainer' ||
                                    currentSummary.fullMetadata?.mode === 'Trainer'
                                        ? (currentSummary.fullMetadata?.trainerClass as string) || 'Trainer'
                                        : currentSummary.species}
                                </span>
                                {OBR.isAvailable && currentSummary.isOnMap ? (
                                    <span className="pc-sheet-modal__map-badge">On Map</span>
                                ) : (
                                    <span className="pc-sheet-modal__storage-badge">In Storage</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {hasMultiple && (
                        <div className="pc-sheet-modal__header-center">
                            <div className="pc-sheet-modal__nav">
                                <button
                                    type="button"
                                    className="action-button action-button--dark pc-sheet-modal__nav-btn"
                                    onClick={handlePrev}
                                    title="Previous Pokémon"
                                    aria-label="Previous Pokémon"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <select
                                    className="pc-sheet-modal__select"
                                    value={currentSummary.entityId}
                                    onChange={(e) => handleSelectEntity(e.target.value)}
                                >
                                    {allSummaries.map((s, i) => (
                                        <option key={s.entityId} value={s.entityId}>
                                            {s.rank === 'Trainer' || s.fullMetadata?.mode === 'Trainer'
                                                ? `★ ${s.name} (Trainer)`
                                                : s.name || s.species || `Pokémon ${i + 1}`}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="action-button action-button--dark pc-sheet-modal__nav-btn"
                                    onClick={handleNext}
                                    title="Next Pokémon"
                                    aria-label="Next Pokémon"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="pc-sheet-modal__header-right">
                        <button
                            type="button"
                            className="action-button action-button--ghost pc-sheet-modal__close"
                            onClick={handleClose}
                            title="Close Sheet"
                            aria-label="Close Character Sheet"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="pc-sheet-modal__body">
                    {!loading && (
                        <div className="sheet-container app-container pc-sheet-modal__container">
                            <IdentityHeader />
                            <DerivedBoard />
                            <TrackerSection />
                            <MovesTable />
                            <ActionRolls />

                            <div className="sheet-container__row">
                                <div className="sheet-container__column">
                                    {mode === 'Pokémon' && <TypeMatchups />}
                                    <CoreTable />
                                    <SocialTable />
                                    {mode !== 'Pokémon' && <TrainerBadges />}
                                </div>

                                <div className="sheet-container__column">
                                    <SkillsTable />
                                </div>
                            </div>

                            <InventoryTable />
                        </div>
                    )}
                </div>

                <DemoRollModal />
            </div>
        </div>
    );
};
