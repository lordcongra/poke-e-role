import { useState, useEffect, useMemo } from 'react';
import {
    X,
    Swords,
    Target,
    Crosshair,
    Tag,
    Zap,
    Copy,
    Check,
    Megaphone,
    Plus,
    Loader2,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS } from '../../../data/constants';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import { fetchMoveLookupIndex, fetchMoveData } from '../../../utils/api';
import type { MoveLookupEntry } from '../../../utils/apiTypes';
import { broadcastInfo } from '../../../utils/diceRoller';
import {
    formatAccuracy,
    formatDamage,
    formatAttributeName,
    buildMoveDiscordMarkdown,
    buildMoveBroadcast
} from './moveLookupUtils';
import './MoveDetailModal.css';

interface MoveDetailModalProps {
    moveName: string;
    onClose: () => void;
}

export function MoveDetailModal({ moveName, onClose }: MoveDetailModalProps) {
    const [move, setMove] = useState<MoveLookupEntry | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [copiedDiscord, setCopiedDiscord] = useState<boolean>(false);
    const [isBroadcasted, setIsBroadcasted] = useState<boolean>(false);
    const [isAdded, setIsAdded] = useState<boolean>(false);

    // Global Store States
    const moves = useCharacterStore((state) => state.moves);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);

    // Type Color Mapping (Defaults + Custom Room Types)
    const allTypeColors: Record<string, string> = useMemo(() => {
        const visibleTypes = roomCustomTypes.filter((t) => isStandaloneMode || role === 'GM' || !t.gmOnly);
        const customTypeMap = Object.fromEntries(visibleTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customTypeMap };
    }, [roomCustomTypes, role]);

    // Check if Pokemon already has this move
    const isLearned = useMemo(() => {
        if (!move) return false;
        const cleanName = move.name.toLowerCase().trim();
        return moves.some((m) => m.name.toLowerCase().trim() === cleanName);
    }, [moves, move]);

    // Fetch move data on mount or when moveName changes
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setError(null);
        setIsAdded(false);

        const loadMove = async () => {
            try {
                // 1. Try to find in cached lookup index first (fastest)
                const lookupList = await fetchMoveLookupIndex();
                const cleanTarget = moveName.toLowerCase().trim();
                let found = lookupList.find((m) => m.name.toLowerCase().trim() === cleanTarget);

                // Try partial/fuzzy match if not exact
                if (!found) {
                    found = lookupList.find(
                        (m) =>
                            m.name
                                .toLowerCase()
                                .trim()
                                .replace(/[^a-z0-9]/g, '') === cleanTarget.replace(/[^a-z0-9]/g, '')
                    );
                }

                if (found) {
                    if (isMounted) {
                        setMove(found);
                        setIsLoading(false);
                    }
                    return;
                }

                // 2. Fallback to individual API/Homebrew fetch
                const apiData = await fetchMoveData(moveName);
                if (apiData) {
                    const mappedEntry: MoveLookupEntry = {
                        name: apiData.Name || moveName,
                        type: apiData.Type || 'Normal',
                        category: apiData.Category || 'Physical',
                        power: apiData.Power ?? 0,
                        accuracy1: apiData.Accuracy1 || '',
                        accuracy2: apiData.Accuracy2 || '',
                        damage1: apiData.Damage1 || '',
                        damage2: apiData.Damage2 || '',
                        target: apiData.Target || '',
                        effect: apiData.Effect || '',
                        description: apiData.Description || '',
                        attributes: apiData.Attributes || {},
                        isCustom: false
                    };
                    if (isMounted) {
                        setMove(mappedEntry);
                        setIsLoading(false);
                    }
                    return;
                }

                if (isMounted) {
                    setError(`Could not find move details for "${moveName}".`);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('[MoveDetailModal] Error loading move details:', err);
                if (isMounted) {
                    setError('Failed to load move details.');
                    setIsLoading(false);
                }
            }
        };

        loadMove();

        return () => {
            isMounted = false;
        };
    }, [moveName]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Actions
    const handleCopyDiscord = async () => {
        if (!move) return;
        try {
            const text = buildMoveDiscordMarkdown(move);
            await navigator.clipboard.writeText(text);
            setCopiedDiscord(true);
            setTimeout(() => setCopiedDiscord(false), 2000);
        } catch (err) {
            console.error('[MoveDetailModal] Failed to copy Discord markdown:', err);
        }
    };

    const handleBroadcast = async () => {
        if (!move) return;
        try {
            const { title, desc } = buildMoveBroadcast(move);
            await broadcastInfo(title, desc);
            setIsBroadcasted(true);
            setTimeout(() => setIsBroadcasted(false), 2000);
        } catch (err) {
            console.error('[MoveDetailModal] Failed to broadcast move:', err);
        }
    };

    const handleLearnMove = async () => {
        if (!move || isLearned) return;
        try {
            const store = useCharacterStore.getState();
            const existingMoves = store.moves;

            // Find an empty move slot or create a new slot
            const emptySlot = existingMoves.find((m) => !m.name || m.name.trim() === '');
            let targetId: string;

            if (emptySlot) {
                targetId = emptySlot.id;
            } else {
                store.addMove();
                const updatedMoves = useCharacterStore.getState().moves;
                targetId = updatedMoves[updatedMoves.length - 1].id;
            }

            // Fetch complete MoveApiResponse structure for applyMoveData
            const fullData = await fetchMoveData(move.name);
            if (fullData) {
                store.applyMoveData(targetId, fullData as Record<string, unknown>);
            } else {
                store.applyMoveData(targetId, {
                    Name: move.name,
                    Type: move.type,
                    Category: move.category,
                    Power: move.power,
                    Accuracy1: move.accuracy1,
                    Accuracy2: move.accuracy2,
                    Damage1: move.damage1,
                    Damage2: move.damage2,
                    Target: move.target,
                    Effect: move.effect,
                    Description: move.description,
                    Attributes: move.attributes
                });
            }

            setIsAdded(true);
        } catch (err) {
            console.error('[MoveDetailModal] Failed to learn move:', err);
        }
    };

    // Derived formatting
    const typeColor = move ? allTypeColors[move.type] || 'var(--primary)' : 'var(--primary)';
    const accStr = move ? formatAccuracy(move.accuracy1, move.accuracy2) : 'None';
    const dmgStr = move ? formatDamage(move.damage1, move.damage2, move.power) : '-';

    const activeAttributes = move?.attributes
        ? Object.entries(move.attributes)
              .filter(([, val]) => Boolean(val))
              .map(([key, val]) =>
                  typeof val === 'boolean' ? formatAttributeName(key) : `${formatAttributeName(key)}: ${val}`
              )
        : [];

    const powerBadgeLabel = move
        ? move.category === 'Status' || String(move.power) === '0'
            ? 'Support'
            : String(move.power).toLowerCase().includes('var')
              ? 'Variable'
              : `Power ${move.power}`
        : '';

    return (
        <div className="move-detail-modal__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div
                className="move-detail-modal__dialog"
                onClick={(e) => e.stopPropagation()}
                style={{ '--move-type-color': typeColor } as React.CSSProperties}
            >
                {/* Colored Top Accent Bar */}
                <div className="move-detail-modal__accent-bar" style={{ backgroundColor: typeColor }} />

                {/* Close Button */}
                <button
                    type="button"
                    className="move-detail-modal__close-btn"
                    onClick={onClose}
                    title="Close (Esc)"
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>

                {isLoading ? (
                    <div className="move-detail-modal__loading">
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <span className="text-label" style={{ marginTop: 8 }}>
                            Loading {moveName}...
                        </span>
                    </div>
                ) : error || !move ? (
                    <div className="move-detail-modal__error">
                        <AlertCircle size={32} style={{ color: 'var(--semantic-danger)' }} />
                        <p className="text-subtext" style={{ margin: '8px 0 16px' }}>
                            {error || 'Move details unavailable.'}
                        </p>
                        <button type="button" className="action-button action-button--dark" onClick={onClose}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header Section */}
                        <div className="move-detail-modal__header">
                            <div className="move-detail-modal__title-row">
                                <h3 className="move-detail-modal__name text-title-primary">{move.name}</h3>
                                {move.isCustom && <span className="move-detail-modal__homebrew-badge">Homebrew</span>}
                            </div>

                            {/* Type / Category / Power Badges */}
                            <div className="move-detail-modal__badges-row">
                                <span className="move-detail-modal__type-badge" style={{ backgroundColor: typeColor }}>
                                    {move.type}
                                </span>
                                <span className="move-detail-modal__category-badge text-subtext">{move.category}</span>
                                <span className="move-detail-modal__power-badge text-value-highlight">
                                    {powerBadgeLabel}
                                </span>
                            </div>
                        </div>

                        {/* Quick Stat Bar (Accuracy, Damage, Target) */}
                        <div className="move-detail-modal__stats-grid">
                            <div className="move-detail-modal__stat-card">
                                <span className="move-detail-modal__stat-label text-label">
                                    <Target size={13} /> Accuracy
                                </span>
                                <span className="move-detail-modal__stat-value text-value-highlight">{accStr}</span>
                            </div>

                            <div className="move-detail-modal__stat-card">
                                <span className="move-detail-modal__stat-label text-label">
                                    <Swords size={13} /> Damage
                                </span>
                                <span
                                    className="move-detail-modal__stat-value text-value-highlight"
                                    style={{ color: typeColor }}
                                >
                                    {dmgStr}
                                </span>
                            </div>

                            {move.target && (
                                <div className="move-detail-modal__stat-card">
                                    <span className="move-detail-modal__stat-label text-label">
                                        <Crosshair size={13} /> Target
                                    </span>
                                    <span className="move-detail-modal__stat-value text-subtext">{move.target}</span>
                                </div>
                            )}
                        </div>

                        {/* Attributes / Tags */}
                        {activeAttributes.length > 0 && (
                            <div className="move-detail-modal__attributes-section">
                                <span className="move-detail-modal__attr-title text-label">
                                    <Tag size={12} /> Tags
                                </span>
                                <div className="move-detail-modal__attributes-list">
                                    {activeAttributes.map((attr) => (
                                        <span key={`attr-${attr}`} className="move-detail-modal__attribute-pill">
                                            {attr}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Effect Box */}
                        {move.effect && (
                            <div className="move-detail-modal__effect-box">
                                <div className="move-detail-modal__effect-header text-label">
                                    <Zap size={14} style={{ color: typeColor }} /> Effect
                                </div>
                                <div className="move-detail-modal__effect-text text-subtext">{move.effect}</div>
                            </div>
                        )}

                        {/* Description Flavor Quote */}
                        {move.description && (
                            <div className="move-detail-modal__desc-box text-subtext">"{move.description}"</div>
                        )}

                        {/* Action Footer */}
                        <div className="move-detail-modal__actions">
                            {/* Learn Move / Already Learned */}
                            {isLearned || isAdded ? (
                                <div className="move-detail-modal__learned-tag">
                                    <CheckCircle size={15} color="var(--semantic-success, #4caf50)" />
                                    <span>{isAdded ? 'Move Learned!' : 'Already in Move Slots'}</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="action-button action-button--theme move-detail-modal__learn-btn"
                                    onClick={handleLearnMove}
                                    title="Add this move to your active move slots"
                                >
                                    <Plus size={15} /> Learn Move
                                </button>
                            )}

                            <div className="move-detail-modal__secondary-actions">
                                {/* Discord Copy */}
                                <button
                                    type="button"
                                    className="action-button action-button--dark move-detail-modal__action-btn"
                                    onClick={handleCopyDiscord}
                                    title="Copy Discord Markdown summary"
                                >
                                    {copiedDiscord ? (
                                        <>
                                            <Check size={14} color="var(--primary)" /> Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} /> Discord
                                        </>
                                    )}
                                </button>

                                {/* Broadcast */}
                                <button
                                    type="button"
                                    className="action-button action-button--secondary move-detail-modal__action-btn"
                                    onClick={handleBroadcast}
                                    title="Broadcast move to Owlbear Rodeo chat"
                                >
                                    {isBroadcasted ? (
                                        <>
                                            <Check size={14} color="var(--primary)" /> Broadcasted!
                                        </>
                                    ) : (
                                        <>
                                            <Megaphone size={14} /> Broadcast
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
