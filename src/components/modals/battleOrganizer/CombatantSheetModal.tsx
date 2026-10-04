import { useState, useEffect, useRef } from 'react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
import { hydrateActiveSheet } from '../../../utils/sync/unifiedSheetHydration';
import { setActiveTokenId, setIsPcSheetActive, hasPendingUpdates } from '../../../utils/sync/obr';
import { hasCharacterSheetChanged } from '../pcStorage/pcSheetSyncUtils';
import { flattenStateToMetadata } from '../../../utils/sync/stateMapper';
import { extractTokenImage } from '../../../utils/combat/initiativeHelpers';
import { resolveCombatantLiveToken } from './battleOrganizerUtils';
import { resolveCharacterThemeColors, applyDynamicThemeColors } from '../../../utils/common/colorUtils';
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
import { InModalRollLog } from './InModalRollLog';
import { X, ChevronLeft, ChevronRight, User, Loader2, Lock, AlertCircle } from 'lucide-react';
import './CombatantSheetModal.css';

interface CombatantSheetModalProps {
    combatant: CombatantRowData;
    allCombatants: CombatantRowData[];
    onSelectCombatant: (combatant: CombatantRowData) => void;
    onClose: () => void;
    onMarkAction?: (combatantId: string, moveName: string, status: 'success' | 'failed') => void;
}

export function CombatantSheetModal({
    combatant,
    allCombatants,
    onSelectCombatant,
    onClose,
    onMarkAction
}: CombatantSheetModalProps) {
    const [loading, setLoading] = useState(true);
    const [noTokenLinked, setNoTokenLinked] = useState(false);
    const resolvedImage = useResolvedImageUrl(combatant.image);
    const mode = useCharacterStore((state) => state.identity.mode);
    const type1 = useCharacterStore((state) => state.identity.type1);
    const type2 = useCharacterStore((state) => state.identity.type2);
    const themePrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const themeSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);
    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);
    const isLocked = !isStandaloneMode && role === 'PLAYER' && (Boolean(combatant.isNPC) || Boolean(isNPC));

    // Save previous character state and window theme colors to restore when CombatantSheetModal is closed
    const prevTokenIdRef = useRef<string | null>(null);
    const prevMetaRef = useRef<Record<string, unknown> | null>(null);
    const initialThemeRef = useRef<{ primary: string; secondary: string } | null>(null);
    const lastModifiedRef = useRef<number>(0);
    const isDirtyRef = useRef(false);
    const isHydratingRef = useRef(false);

    useEffect(() => {
        setIsPcSheetActive(true);
        const store = useCharacterStore.getState();
        prevTokenIdRef.current = store.tokenId;
        prevMetaRef.current = flattenStateToMetadata(store);

        initialThemeRef.current = {
            primary:
                document.documentElement.style.getPropertyValue('--dynamic-type-color') ||
                document.body.style.getPropertyValue('--dynamic-type-color') ||
                '',
            secondary:
                document.documentElement.style.getPropertyValue('--dynamic-secondary-color') ||
                document.body.style.getPropertyValue('--dynamic-secondary-color') ||
                ''
        };

        const unsubStore = useCharacterStore.subscribe((state, prevState) => {
            if (isHydratingRef.current) return;
            if (hasCharacterSheetChanged(state, prevState)) {
                isDirtyRef.current = true;
                lastModifiedRef.current = Date.now();
            }
        });

        return () => {
            unsubStore();
            setIsPcSheetActive(false);
            const prevId = prevTokenIdRef.current;
            const prevMeta = prevMetaRef.current;
            const prevTheme = initialThemeRef.current;
            const currentRole = (useCharacterStore.getState().role as 'PLAYER' | 'GM') || 'PLAYER';

            if (prevId) {
                setActiveTokenId(prevId);
                const s = useCharacterStore.getState();
                s.setTokenData(prevId, currentRole);
                if (prevMeta) {
                    s.loadFromOwlbear(prevMeta);
                }
                if (prevTheme) {
                    applyDynamicThemeColors(prevTheme.primary, prevTheme.secondary);
                }
            } else {
                setActiveTokenId(null);
                const s = useCharacterStore.getState();
                s.setTokenData('', currentRole);
                s.loadFromOwlbear({});
                if (OBR.isAvailable) {
                    OBR.player.select([]).catch(() => {});
                }
                if (prevTheme) {
                    applyDynamicThemeColors(prevTheme.primary, prevTheme.secondary);
                } else {
                    applyDynamicThemeColors('', '');
                }
            }
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('theme-override-updated'));
            }
        };
    }, []);

    // Dynamically apply combatant theme colors when loaded or when identity updates
    useEffect(() => {
        if (loading || noTokenLinked) return;

        const resolved = resolveCharacterThemeColors(
            {
                type1,
                type2,
                themePrimaryOverride,
                themeSecondaryOverride
            },
            roomCustomTypes
        );

        applyDynamicThemeColors(resolved.primary, resolved.secondary);
    }, [loading, noTokenLinked, type1, type2, themePrimaryOverride, themeSecondaryOverride, roomCustomTypes]);

    // Load full character metadata into useCharacterStore
    useEffect(() => {
        let isMounted = true;
        const loadCharacter = async () => {
            setLoading(true);
            setNoTokenLinked(false);
            isHydratingRef.current = true;
            try {
                const resolved = await resolveCombatantLiveToken(combatant);
                if (resolved.tokenItem && isMounted) {
                    const item = resolved.tokenItem;
                    const meta = (item.metadata['pokerole-extension/stats'] ||
                        item.metadata['pokerole-pmd-extension/stats'] ||
                        item.metadata) as Record<string, unknown>;

                    await hydrateActiveSheet({
                        targetId: item.id,
                        sourceMeta: meta,
                        tokenItem: item,
                        overrideRole: isStandaloneMode ? 'GM' : undefined,
                        saveIfNewer: false,
                        applyTheme: true
                    });
                    lastModifiedRef.current = Number(meta.lastModified) || Date.now();

                    const store = useCharacterStore.getState();
                    const imgItem = item as Image;
                    const tokenImgUrl = imgItem.image?.url || combatant.image || extractTokenImage(meta);
                    if (tokenImgUrl) {
                        store.setIdentity('tokenImageUrl', tokenImgUrl);
                    }
                    setNoTokenLinked(false);
                } else if (isMounted) {
                    setNoTokenLinked(true);
                }
            } catch (err) {
                console.error('[CombatantSheetModal] Error loading character data:', err);
                if (isMounted) setNoTokenLinked(true);
            } finally {
                isHydratingRef.current = false;
                isDirtyRef.current = false;
                if (isMounted) setLoading(false);
            }
        };

        loadCharacter();

        let unsubScene: (() => void) | undefined;
        if (OBR.isAvailable && !isStandaloneMode) {
            unsubScene = OBR.scene.items.onChange(async (items) => {
                if (!isMounted || isHydratingRef.current || hasPendingUpdates()) return;
                const tId = combatant.tokenId;
                if (!tId) return;
                const matched = items.find((i) => i.id === tId);
                if (!matched) return;
                const meta = (matched.metadata['pokerole-extension/stats'] ||
                    matched.metadata['pokerole-pmd-extension/stats'] ||
                    matched.metadata) as Record<string, unknown>;
                if (!meta) return;

                const lastMod = Number(meta.lastModified) || 0;
                if (lastModifiedRef.current > 0 && lastMod > 0 && lastMod <= lastModifiedRef.current) return;
                lastModifiedRef.current = lastMod;
                isDirtyRef.current = false;

                try {
                    isHydratingRef.current = true;
                    await hydrateActiveSheet({
                        targetId: matched.id,
                        sourceMeta: meta,
                        tokenItem: matched,
                        saveIfNewer: false,
                        applyTheme: true
                    });
                } catch (e) {
                    console.error('[CombatantSheetModal] Error updating from live scene item:', e);
                } finally {
                    isHydratingRef.current = false;
                }
            });
        }

        return () => {
            isMounted = false;
            if (unsubScene) {
                unsubScene();
            }
        };
    }, [combatant]);

    const selectableCombatants = allCombatants.filter((c) => !(!isStandaloneMode && role === 'PLAYER' && c.isNPC));
    const currentIndex = selectableCombatants.findIndex((c) => c.id === combatant.id);
    const hasMultiple = selectableCombatants.length > 1;

    const handlePrev = () => {
        if (!hasMultiple) return;
        const prevIdx = (currentIndex - 1 + selectableCombatants.length) % selectableCombatants.length;
        onSelectCombatant(selectableCombatants[prevIdx]);
    };

    const handleNext = () => {
        if (!hasMultiple) return;
        const nextIdx = (currentIndex + 1) % selectableCombatants.length;
        onSelectCombatant(selectableCombatants[nextIdx]);
    };

    const handleSelectChange = (id: string) => {
        const found = selectableCombatants.find((c) => c.id === id);
        if (found) onSelectCombatant(found);
    };

    return (
        <div className="bo-sheet-modal__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bo-sheet-modal__content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bo-sheet-modal__header">
                    <div className="bo-sheet-modal__header-left">
                        <div className="bo-sheet-modal__avatar">
                            {resolvedImage ? (
                                <img src={resolvedImage} alt={combatant.name} />
                            ) : (
                                <User size={18} color="var(--text-muted)" />
                            )}
                        </div>
                        <div className="bo-sheet-modal__titles">
                            <h2 className="bo-sheet-modal__name text-title-primary">
                                {combatant.name || 'Unnamed Combatant'}
                            </h2>
                            <span className="bo-sheet-modal__sub text-subtext">
                                {combatant.isPlayerSide ? "Player's Side" : "Foe's Side"}
                                {combatant.initiative ? ` • Init: ${combatant.initiative}` : ''}
                            </span>
                        </div>
                    </div>

                    {/* Quick Switcher between combatants */}
                    <div className="bo-sheet-modal__header-center">
                        {hasMultiple && (
                            <div className="bo-sheet-modal__switcher">
                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-sheet-modal__nav-btn"
                                    onClick={handlePrev}
                                    title="Previous Combatant"
                                    aria-label="Previous Combatant"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <select
                                    className="bo-sheet-modal__dropdown text-label"
                                    value={combatant.id}
                                    onChange={(e) => handleSelectChange(e.target.value)}
                                    aria-label="Switch Combatant"
                                >
                                    {selectableCombatants.map((c, i) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name || `Combatant ${i + 1}`} ({c.isPlayerSide ? 'P' : 'F'})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-sheet-modal__nav-btn"
                                    onClick={handleNext}
                                    title="Next Combatant"
                                    aria-label="Next Combatant"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bo-sheet-modal__header-right">
                        <button
                            type="button"
                            className="action-button action-button--ghost bo-sheet-modal__close"
                            onClick={onClose}
                            title="Close Sheet"
                            aria-label="Close Character Sheet"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="bo-sheet-modal__body">
                    {loading ? (
                        <div className="bo-sheet-modal__loading text-subtext">
                            <Loader2 size={24} className="bo-spin-anim" color="var(--primary)" />
                            <span>Loading Pokémon sheet data...</span>
                        </div>
                    ) : noTokenLinked ? (
                        <div className="bo-sheet-modal__no-token">
                            <div className="bo-sheet-modal__no-token-icon">
                                <AlertCircle size={36} color="var(--primary)" />
                            </div>
                            <h3 className="bo-sheet-modal__no-token-title text-title-primary">
                                No Token Linked for &ldquo;{combatant.name || 'Combatant'}&rdquo;
                            </h3>
                            <p className="bo-sheet-modal__no-token-desc text-subtext">
                                In Owlbear Rodeo, character sheets are attached directly to tokens on the map. There is
                                currently no active token linked to this combatant.
                            </p>
                            <div className="bo-sheet-modal__no-token-card">
                                <span className="bo-sheet-modal__card-heading text-label">
                                    How to connect a character sheet:
                                </span>
                                <div className="bo-sheet-modal__step">
                                    <span className="bo-sheet-modal__step-num">1</span>
                                    <span className="text-subtext">
                                        Drag and drop a token image onto the Owlbear Rodeo map.
                                    </span>
                                </div>
                                <div className="bo-sheet-modal__step">
                                    <span className="bo-sheet-modal__step-num">2</span>
                                    <span className="text-subtext">
                                        Rename that token to match{' '}
                                        <strong>&ldquo;{combatant.name || 'Combatant'}&rdquo;</strong>, or click{' '}
                                        <em>Pull from Initiative</em> in the Battle Organizer.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="action-button action-button--primary bo-sheet-modal__no-token-btn"
                                onClick={onClose}
                            >
                                Got It
                            </button>
                        </div>
                    ) : isLocked ? (
                        <div
                            id="gm-lock-screen"
                            className="app-gm-lock"
                            style={{ padding: '60px 20px', textAlign: 'center' }}
                        >
                            <h2 className="app-gm-lock__icon text-title-primary">
                                <Lock size={40} />
                            </h2>
                            <h3 className="text-label" style={{ color: 'var(--text-main)', marginTop: '12px' }}>
                                This sheet is hidden by the GM.
                            </h3>
                            {!gmOnlyMatchups && (
                                <div className="app-gm-lock__content" style={{ marginTop: '20px' }}>
                                    <TypeMatchups />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="sheet-container app-container" style={{ maxWidth: '100%', margin: '0' }}>
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

                {/* Built-in demo dice modal if CAR is not active */}
                <DemoRollModal />

                {/* Built-in Roll Log for live results and quick action marking */}
                <InModalRollLog combatants={allCombatants} onMarkAction={onMarkAction} />
            </div>
        </div>
    );
}
