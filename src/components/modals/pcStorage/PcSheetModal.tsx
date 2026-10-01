import React, { useEffect, useRef, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId, setIsPcSheetActive } from '../../../utils/sync/obr';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { resolveCharacterThemeColors, applyDynamicThemeColors } from '../../../utils/common/colorUtils';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
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
    const [loading, setLoading] = useState(true);
    const mode = useCharacterStore((state) => state.identity.mode);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    // Save previous window theme & character state to restore when modal closes
    const prevThemeRef = useRef<{ primary: string; secondary: string } | null>(null);
    const prevMetaRef = useRef<Record<string, unknown> | null>(null);
    const prevTokenIdRef = useRef<string | null>(null);
    const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isHydratingRef = useRef(false);

    const currentSummaryRef = useRef(currentSummary);
    currentSummaryRef.current = currentSummary;
    const onUpdateSummaryRef = useRef(onUpdateSummary);
    onUpdateSummaryRef.current = onUpdateSummary;

    // Snapshot initial theme and character on mount
    useEffect(() => {
        setIsPcSheetActive(true);
        if (OBR.isAvailable) {
            OBR.player.select([]).catch(() => {});
        }

        const store = useCharacterStore.getState();
        prevTokenIdRef.current = store.tokenId;
        prevMetaRef.current = flattenStateToMetadata(store);

        prevThemeRef.current = {
            primary:
                document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
                document.body.style.getPropertyValue('--dynamic-type-color') ||
                '',
            secondary:
                document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
                document.body.style.getPropertyValue('--dynamic-secondary-color') ||
                ''
        };

        return () => {
            setIsPcSheetActive(false);
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
            // Restore previous character
            if (prevMetaRef.current) {
                setActiveTokenId(prevTokenIdRef.current);
                const s = useCharacterStore.getState();
                s.setTokenData(prevTokenIdRef.current || '', s.role || 'PLAYER');
                s.loadFromOwlbear(prevMetaRef.current);
            }
            // Restore previous theme
            if (prevThemeRef.current) {
                applyDynamicThemeColors(prevThemeRef.current.primary, prevThemeRef.current.secondary);
            }
        };
    }, []);

    // Load Pokémon metadata whenever currentSummary changes
    useEffect(() => {
        isHydratingRef.current = true;
        setLoading(true);
        const store = useCharacterStore.getState();
        const targetTokenId =
            currentSummary.isOnMap && currentSummary.mapTokenId ? currentSummary.mapTokenId : currentSummary.entityId;

        setActiveTokenId(targetTokenId);
        store.setTokenData(targetTokenId, store.role || 'PLAYER');

        if (currentSummary.fullMetadata && Object.keys(currentSummary.fullMetadata).length > 0) {
            store.loadFromOwlbear(currentSummary.fullMetadata);
        } else {
            // Fallback basic hydration via metadata
            store.loadFromOwlbear({
                name: currentSummary.name,
                nickname: currentSummary.name,
                species: currentSummary.species,
                rank: currentSummary.rank || 'Starter',
                type1: currentSummary.type1 || 'Normal',
                type2: currentSummary.type2 || '',
                'hp-curr': currentSummary.hp,
                'hp-max-display': currentSummary.maxHp,
                'will-curr': currentSummary.will,
                'will-max-display': currentSummary.maxWill,
                'token-image-url': currentSummary.tokenImageUrl || ''
            });
        }

        if (currentSummary.tokenImageUrl) {
            store.setIdentity('tokenImageUrl', currentSummary.tokenImageUrl);
        }

        // Apply Pokémon theme
        const colors = resolveCharacterThemeColors(
            {
                type1: currentSummary.type1 || store.identity.type1,
                type2: currentSummary.type2 || store.identity.type2,
                themePrimaryOverride: store.identity.themePrimaryOverride,
                themeSecondaryOverride: store.identity.themeSecondaryOverride
            },
            roomCustomTypes
        );
        applyDynamicThemeColors(colors.primary, colors.secondary);
        setLoading(false);

        const timer = setTimeout(() => {
            isHydratingRef.current = false;
        }, 100);
        return () => clearTimeout(timer);
    }, [currentSummary.entityId, roomCustomTypes]);

    // Two-Way Sync: Listen to store changes (HP, Will, stats, inventory potions, etc.)
    useEffect(() => {
        const syncNow = () => {
            if (isHydratingRef.current) return;
            const currentStore = useCharacterStore.getState();
            const curr = currentSummaryRef.current;
            const nextMeta = flattenStateToMetadata(currentStore);
            const nextHp = currentStore.health.hpCurr ?? curr.hp;
            const nextMaxHp = currentStore.health.hpMax ?? curr.maxHp;
            const nextWill = currentStore.will.willCurr ?? curr.will;
            const nextMaxWill = currentStore.will.willMax ?? curr.maxWill;
            const nextName = currentStore.identity.nickname || currentStore.identity.species || curr.name;

            onUpdateSummaryRef.current({
                ...curr,
                name: nextName,
                species: currentStore.identity.species || curr.species,
                rank: currentStore.identity.rank || curr.rank,
                type1: currentStore.identity.type1 || curr.type1,
                type2: currentStore.identity.type2,
                hp: nextHp,
                maxHp: nextMaxHp,
                will: nextWill,
                maxWill: nextMaxWill,
                tokenImageUrl: currentStore.identity.tokenImageUrl || curr.tokenImageUrl,
                fullMetadata: nextMeta,
                lastModified: Date.now()
            });
        };

        const unsub = useCharacterStore.subscribe((state, prevState) => {
            if (isHydratingRef.current) return;
            if (
                state.health !== prevState.health ||
                state.will !== prevState.will ||
                state.identity !== prevState.identity ||
                state.inventory !== prevState.inventory ||
                state.stats !== prevState.stats ||
                state.skills !== prevState.skills ||
                state.moves !== prevState.moves
            ) {
                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = setTimeout(syncNow, 150);
            }
        });

        return () => {
            unsub();
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };
    }, [currentSummary.entityId]);

    // Previous / Next navigation
    const currentIndex = allSummaries.findIndex((s) => s.entityId === currentSummary.entityId);
    const hasMultiple = allSummaries.length > 1;

    const handlePrev = () => {
        if (!hasMultiple) return;
        const prevIdx = (currentIndex - 1 + allSummaries.length) % allSummaries.length;
        onSelectEntity(allSummaries[prevIdx].entityId);
    };

    const handleNext = () => {
        if (!hasMultiple) return;
        const nextIdx = (currentIndex + 1) % allSummaries.length;
        onSelectEntity(allSummaries[nextIdx].entityId);
    };

    const handleClose = () => {
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            const currentStore = useCharacterStore.getState();
            const curr = currentSummaryRef.current;
            const nextMeta = flattenStateToMetadata(currentStore);
            onUpdateSummaryRef.current({
                ...curr,
                name: currentStore.identity.nickname || currentStore.identity.species || curr.name,
                species: currentStore.identity.species || curr.species,
                rank: currentStore.identity.rank || curr.rank,
                type1: currentStore.identity.type1 || curr.type1,
                type2: currentStore.identity.type2,
                hp: currentStore.health.hpCurr ?? curr.hp,
                maxHp: currentStore.health.hpMax ?? curr.maxHp,
                will: currentStore.will.willCurr ?? curr.will,
                maxWill: currentStore.will.willMax ?? curr.maxWill,
                tokenImageUrl: currentStore.identity.tokenImageUrl || curr.tokenImageUrl,
                fullMetadata: nextMeta,
                lastModified: Date.now()
            });
        }
        onClose();
    };

    const displayName = currentSummary.name || currentSummary.species;

    return (
        <div className="pc-sheet-modal__overlay" onClick={handleClose}>
            <div className="pc-sheet-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pc-sheet-modal__header">
                    <div className="pc-sheet-modal__header-left">
                        <div className="pc-sheet-modal__avatar">
                            <img
                                src={currentSummary.tokenImageUrl || getAbsolutePokeballUrl()}
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
                                {currentSummary.isOnMap ? (
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
                                    onChange={(e) => onSelectEntity(e.target.value)}
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
