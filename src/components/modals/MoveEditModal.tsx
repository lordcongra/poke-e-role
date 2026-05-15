import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TagBuilderModal } from './TagBuilderModal';
import { broadcastInfo } from '../../utils/diceRoller';
import './MoveEditModal.css';

interface MoveEditModalProps {
    moveId: string;
    onClose: () => void;
}

export function MoveEditModal({ moveId, onClose }: MoveEditModalProps) {
    const move = useCharacterStore((state) => state.moves.find((m) => m.id === moveId));
    const updateMove = useCharacterStore((state) => state.updateMove);

    const [showTagBuilder, setShowTagBuilder] = useState(false);

    if (!move) return null;

    return (
        <div className="move-edit__overlay">
            <div className="move-edit__content">
                <h3 className="move-edit__title">{move.name || 'Move Name'}</h3>

                <textarea
                    className="move-edit__textarea"
                    placeholder="Move description and tags..."
                    value={move.desc || ''}
                    onChange={(e) => updateMove(move.id, 'desc', e.target.value)}
                />

                <div className="move-edit__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark move-edit__btn-close"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        className="action-button move-edit__btn-tags"
                        style={{ backgroundColor: '#1565c0', borderColor: '#1565c0', color: 'white' }}
                        onClick={() => {
                            broadcastInfo(move.name || 'Move', move.desc || 'No description provided.');
                            onClose();
                        }}
                    >
                        📢 Broadcast
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--dark move-edit__btn-tags"
                        onClick={() => setShowTagBuilder(true)}
                    >
                        🏷️ Tags
                    </button>
                </div>
            </div>

            {showTagBuilder && (
                <TagBuilderModal targetId={move.id} targetType="move" onClose={() => setShowTagBuilder(false)} />
            )}
        </div>
    );
}
