// src/components/MoveEditModal.tsx
import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { TagBuilderModal } from './TagBuilderModal';

interface MoveEditModalProps {
    moveId: string;
    onClose: () => void;
}

export function MoveEditModal({ moveId, onClose }: MoveEditModalProps) {
    const move = useCharacterStore(state => state.moves.find(m => m.id === moveId));
    const updateMove = useCharacterStore(state => state.updateMove);
    
    const [showTagBuilder, setShowTagBuilder] = useState(false);

    if (!move) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '300px', border: '2px solid var(--primary)', color: 'var(--text-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px', textAlign: 'center' }}>
                    {move.name || "Move Name"}
                </h3>
                
                <textarea 
                    style={{ width: '100%', height: '100px', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-main)', marginBottom: '10px' }} 
                    placeholder="Move description and tags..."
                    value={move.desc || ""}
                    onChange={(e) => updateMove(move.id, 'desc', e.target.value)}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <button type="button" className="action-button action-button--dark" style={{ flex: 1, padding: '6px' }} onClick={onClose}>
                        Close
                    </button>
                    <button type="button" className="action-button action-button--dark" style={{ flex: 1, padding: '6px', background: '#1976d2', borderColor: '#1976d2' }} onClick={() => setShowTagBuilder(true)}>
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