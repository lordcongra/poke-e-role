import { useState, useEffect, useRef } from 'react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId } from '../../../utils/obr';
import { imageManager } from '../../../utils/imageManager';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
import { extractCharacterName, extractTokenImage } from '../../../utils/initiativeHelpers';
import { resolveCharacterThemeColors, applyDynamicThemeColors } from '../../../utils/colorUtils';
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
import { DemoRollModal } from '../DemoRollModal';
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
    const [resolvedImage, setResolvedImage] = useState<string>('');
    const mode = useCharacterStore((state) => state.identity.mode);
    const type1 = useCharacterStore((state) => state.identity.type1);
    const type2 = useCharacterStore((state) => state.identity.type2);
    const themePrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const themeSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);
    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);
    const isLocked = role === 'PLAYER' && (Boolean(combatant.isNPC) || Boolean(isNPC));

    // Save previous window theme colors to restore when CombatantSheetModal is closed
    const initialThemeRef = useRef<{ primary: string; secondary: string } | null>(null);

    useEffect(() => {
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

        return () => {
            if (initialThemeRef.current) {
                applyDynamicThemeColors(initialThemeRef.current.primary, initialThemeRef.current.secondary);
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

    // Resolve combatant thumbnail
    useEffect(() => {
        let isMounted = true;
        const resolveImg = async () => {
            if (!combatant.image) {
                if (isMounted) setResolvedImage('');
                return;
            }
            if (isStandaloneMode && combatant.image.startsWith('local-img:')) {
                try {
                    const url = await imageManager.getImageUrl(combatant.image);
                    if (isMounted) setResolvedImage(url || '');
                } catch {
                    if (isMounted) setResolvedImage('');
                }
            } else {
                if (isMounted) setResolvedImage(combatant.image);
            }
        };
        resolveImg();
        return () => {
            isMounted = false;
        };
    }, [combatant.image]);

    // Load full character metadata into useCharacterStore
    useEffect(() => {
        let isMounted = true;
        const loadCharacter = async () => {
            setLoading(true);
            setNoTokenLinked(false);
            try {
                if (isStandaloneMode) {
                    const localChars = await storageAdapter.getLocalCharacters();
                    let match = localChars.find((c) => c.id === combatant.tokenId);
                    if (!match && combatant.name.trim()) {
                        match = localChars.find((c) => {
                            const meta = (c.metadata || {}) as Record<string, unknown>;
                            const resolvedName = extractCharacterName(meta, c.name);
                            return (
                                resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim() ||
                                c.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()
                            );
                        });
                    }
                    if (match && isMounted) {
                        const meta = (match.metadata || {}) as Record<string, unknown>;
                        setActiveTokenId(match.id);
                        const store = useCharacterStore.getState();
                        store.setTokenData(match.id, 'PLAYER');
                        store.loadFromOwlbear(meta);

                        const tokenImgUrl = combatant.image || extractTokenImage(meta);
                        if (tokenImgUrl) {
                            store.setIdentity('tokenImageUrl', tokenImgUrl);
                        }

                        // Immediately calculate and apply this combatant's theme colors
                        const resolved = resolveCharacterThemeColors(
                            {
                                type1: store.identity.type1,
                                type2: store.identity.type2,
                                themePrimaryOverride: store.identity.themePrimaryOverride,
                                themeSecondaryOverride: store.identity.themeSecondaryOverride
                            },
                            store.roomCustomTypes
                        );
                        applyDynamicThemeColors(resolved.primary, resolved.secondary);
                        setNoTokenLinked(false);
                    } else if (isMounted) {
                        setNoTokenLinked(true);
                    }
                } else if (OBR.isAvailable) {
                    let targetId = combatant.tokenId;
                    if (!targetId && combatant.name.trim()) {
                        const found = await OBR.scene.items.getItems((item) => {
                            if (item.layer !== 'CHARACTER') return false;
                            const meta = (item.metadata['pokerole-extension/stats'] || item.metadata) as Record<
                                string,
                                unknown
                            >;
                            const resolvedName = extractCharacterName(meta, item.name);
                            return (
                                resolvedName.toLowerCase().trim() === combatant.name.toLowerCase().trim() ||
                                item.name.toLowerCase().trim() === combatant.name.toLowerCase().trim()
                            );
                        });
                        if (found.length > 0) targetId = found[0].id;
                    }

                    if (targetId) {
                        const items = await OBR.scene.items.getItems([targetId]);
                        if (items.length > 0 && isMounted) {
                            const item = items[0];
                            const meta = (item.metadata['pokerole-extension/stats'] || item.metadata) as Record<
                                string,
                                unknown
                            >;
                            setActiveTokenId(item.id);
                            const store = useCharacterStore.getState();
                            store.setTokenData(item.id, store.role || 'PLAYER');
                            store.loadFromOwlbear(meta);

                            const imgItem = item as Image;
                            const tokenImgUrl = imgItem.image?.url || combatant.image || extractTokenImage(meta);
                            if (tokenImgUrl) {
                                store.setIdentity('tokenImageUrl', tokenImgUrl);
                            }

                            // Immediately calculate and apply this combatant's theme colors
                            const resolved = resolveCharacterThemeColors(
                                {
                                    type1: store.identity.type1,
                                    type2: store.identity.type2,
                                    themePrimaryOverride: store.identity.themePrimaryOverride,
                                    themeSecondaryOverride: store.identity.themeSecondaryOverride
                                },
                                store.roomCustomTypes
                            );
                            applyDynamicThemeColors(resolved.primary, resolved.secondary);
                            setNoTokenLinked(false);
                        } else if (isMounted) {
                            setNoTokenLinked(true);
                        }
                    } else if (isMounted) {
                        setNoTokenLinked(true);
                    }
                }
            } catch (err) {
                console.error('[CombatantSheetModal] Error loading character data:', err);
                if (isMounted) setNoTokenLinked(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadCharacter();
        return () => {
            isMounted = false;
        };
    }, [combatant]);

    const selectableCombatants = allCombatants.filter((c) => !(role === 'PLAYER' && c.isNPC));
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
                                        Rename that token to match <strong>&ldquo;{combatant.name || 'Combatant'}&rdquo;</strong>, or click{' '}
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
