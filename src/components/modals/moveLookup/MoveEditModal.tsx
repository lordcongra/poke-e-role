import { useState, useEffect, useMemo } from 'react';
import { X, Pencil, Tags, Megaphone, Check, Target, Swords, FileText } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { TYPE_COLORS } from '../../../data/constants';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import { TagBuilderModal } from '../items/TagBuilderModal';
import { broadcastInfo } from '../../../utils/diceRoller';
import './MoveEditModal.css';

interface MoveEditModalProps {
    moveId: string;
    onClose: () => void;
}

export function MoveEditModal({ moveId, onClose }: MoveEditModalProps) {
    const move = useCharacterStore((state) => state.moves.find((m) => m.id === moveId));
    const updateMove = useCharacterStore((state) => state.updateMove);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);

    const [showTagBuilder, setShowTagBuilder] = useState(false);
    const [isBroadcasted, setIsBroadcasted] = useState(false);

    // Type Color Mapping
    const allTypeColors: Record<string, string> = useMemo(() => {
        const visibleTypes = roomCustomTypes.filter((t) => isStandaloneMode || role === 'GM' || !t.gmOnly);
        const customTypeMap = Object.fromEntries(visibleTypes.map((t) => [t.name, t.color]));
        return { ...TYPE_COLORS, ...customTypeMap };
    }, [roomCustomTypes, role]);

    const typeColor = move?.type ? allTypeColors[move.type] || 'var(--primary)' : 'var(--primary)';

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !showTagBuilder) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, showTagBuilder]);

    if (!move) return null;

    const handleBroadcast = () => {
        broadcastInfo(move.name || 'Move', move.desc || 'No description provided.');
        setIsBroadcasted(true);
        setTimeout(() => setIsBroadcasted(false), 2000);
    };

    const powerBadgeLabel =
        move.category === 'Status' || String(move.power) === '0'
            ? 'Support'
            : String(move.power).toLowerCase().includes('var')
              ? 'Variable'
              : `Power ${move.power}`;

    const accStr = `${(move.acc1 || 'STR').toUpperCase()} + ${(move.acc2 === 'none' ? 'None' : move.acc2 || 'Brawl').toUpperCase()}`;
    const dmgStr =
        move.category === 'Status' ? '-' : `${move.dmg1 ? move.dmg1.toUpperCase() + ' + ' : ''}${move.power}`;

    return (
        <div className="move-edit-modal__overlay" onClick={onClose} role="dialog" aria-modal="true">
            <div
                className="move-edit-modal__dialog"
                onClick={(e) => e.stopPropagation()}
                style={{ '--move-type-color': typeColor } as React.CSSProperties}
            >
                {/* Colored Top Accent Bar */}
                <div className="move-edit-modal__accent-bar" style={{ backgroundColor: typeColor }} />

                {/* Close Button */}
                <button
                    type="button"
                    className="move-edit-modal__close-btn"
                    onClick={onClose}
                    title="Close (Esc)"
                    aria-label="Close modal"
                >
                    <X size={18} />
                </button>

                {/* Header Section */}
                <div className="move-edit-modal__header">
                    <div className="move-edit-modal__title-row">
                        <Pencil size={18} style={{ color: typeColor }} />
                        <h3 className="move-edit-modal__name text-title-primary">{move.name || 'Unnamed Move'}</h3>
                        {move.marker && <span className="move-edit-modal__marker-badge">{move.marker}</span>}
                    </div>

                    {/* Type / Category / Power Badges */}
                    <div className="move-edit-modal__badges-row">
                        {move.type && (
                            <span className="move-edit-modal__type-badge" style={{ backgroundColor: typeColor }}>
                                {move.type}
                            </span>
                        )}
                        <span className="move-edit-modal__category-badge text-subtext">{move.category}</span>
                        <span className="move-edit-modal__power-badge text-value-highlight">{powerBadgeLabel}</span>
                    </div>
                </div>

                {/* Quick Stat Summary Cards */}
                <div className="move-edit-modal__stats-grid">
                    <div className="move-edit-modal__stat-card">
                        <span className="move-edit-modal__stat-label text-label">
                            <Target size={13} /> Accuracy Pool
                        </span>
                        <span className="move-edit-modal__stat-value text-value-highlight">{accStr}</span>
                    </div>

                    <div className="move-edit-modal__stat-card">
                        <span className="move-edit-modal__stat-label text-label">
                            <Swords size={13} /> Damage Formula
                        </span>
                        <span className="move-edit-modal__stat-value text-value-highlight" style={{ color: typeColor }}>
                            {dmgStr}
                        </span>
                    </div>
                </div>

                {/* Textarea Field Section */}
                <div className="move-edit-modal__body-section">
                    <div className="move-edit-modal__label-row">
                        <span className="move-edit-modal__section-title text-label">
                            <FileText size={13} style={{ color: typeColor }} /> Description & Combat Tags
                        </span>
                        <span className="text-subtext" style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                            Editable text
                        </span>
                    </div>

                    <textarea
                        className="move-edit-modal__textarea text-subtext"
                        style={{ color: 'var(--text-main)' }}
                        placeholder="Enter move description, targeting rules, effects, and tags (e.g. [High Crit], [Recoil], etc.)..."
                        value={move.desc || ''}
                        onChange={(e) => updateMove(move.id, 'desc', e.target.value)}
                        rows={5}
                    />

                    <div className="move-edit-modal__hint text-subtext">
                        Tip: Use the <strong>Tag Builder</strong> to visually construct and append combat modifier tags
                        to this move!
                    </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="move-edit-modal__actions">
                    <div className="move-edit-modal__secondary-actions">
                        {/* Tag Builder Button */}
                        <button
                            type="button"
                            className="action-button action-button--dark move-edit-modal__action-btn"
                            onClick={() => setShowTagBuilder(true)}
                            title="Open Tag Builder to add combat tags"
                        >
                            <Tags size={14} /> Tag Builder
                        </button>

                        {/* Broadcast Button */}
                        <button
                            type="button"
                            className="action-button action-button--secondary move-edit-modal__action-btn"
                            onClick={handleBroadcast}
                            title="Broadcast move to chat"
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

                    {/* Done / Close Button */}
                    <button
                        type="button"
                        className="action-button action-button--theme move-edit-modal__done-btn"
                        onClick={onClose}
                        title="Finish editing"
                    >
                        <Check size={15} /> Done
                    </button>
                </div>
            </div>

            {showTagBuilder && (
                <TagBuilderModal targetId={move.id} targetType="move" onClose={() => setShowTagBuilder(false)} />
            )}
        </div>
    );
}
