import { useState, useEffect } from 'react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import { isStandaloneMode, storageAdapter } from '../../../utils/storageAdapter';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { setActiveTokenId } from '../../../utils/obr';
import { imageManager } from '../../../utils/imageManager';
import OBR, { type Image } from '@owlbear-rodeo/sdk';
import { extractCharacterName, extractTokenImage } from '../../../utils/initiativeHelpers';
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
import { X, ChevronLeft, ChevronRight, User, Loader2 } from 'lucide-react';
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
    const [resolvedImage, setResolvedImage] = useState<string>('');
    const mode = useCharacterStore((state) => state.identity.mode);

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
                    } else if (isMounted) {
                        const store = useCharacterStore.getState();
                        store.setIdentity('nickname', combatant.name);
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
                        }
                    } else if (isMounted) {
                        const store = useCharacterStore.getState();
                        store.setIdentity('nickname', combatant.name);
                    }
                }
            } catch (err) {
                console.error('[CombatantSheetModal] Error loading character data:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadCharacter();
        return () => {
            isMounted = false;
        };
    }, [combatant]);

    const currentIndex = allCombatants.findIndex((c) => c.id === combatant.id);
    const hasMultiple = allCombatants.length > 1;

    const handlePrev = () => {
        if (!hasMultiple) return;
        const prevIdx = (currentIndex - 1 + allCombatants.length) % allCombatants.length;
        onSelectCombatant(allCombatants[prevIdx]);
    };

    const handleNext = () => {
        if (!hasMultiple) return;
        const nextIdx = (currentIndex + 1) % allCombatants.length;
        onSelectCombatant(allCombatants[nextIdx]);
    };

    const handleSelectChange = (id: string) => {
        const found = allCombatants.find((c) => c.id === id);
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
                                    {allCombatants.map((c, i) => (
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
