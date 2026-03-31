import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';

interface LearnsetMoveRowProps {
    pokemonId: string;
    moveIndex: number;
    move: { Learned: string; Name: string };
    currentMoves: Array<{ Learned: string; Name: string }>;
    canEdit: boolean;
}

export function LearnsetMoveRow({ pokemonId, moveIndex, move, currentMoves, canEdit }: LearnsetMoveRowProps) {
    const updateCustomPokemon = useCharacterStore((state) => state.updateCustomPokemon);
    const [localName, setLocalName] = useState(move.Name);

    useEffect(() => {
        setLocalName(move.Name);
    }, [move.Name]);

    const handleRemove = () => {
        const newMoves = [...currentMoves];
        newMoves.splice(moveIndex, 1);
        updateCustomPokemon(pokemonId, 'Moves', newMoves);
    };

    const handleBlur = () => {
        if (localName !== move.Name) {
            const newMoves = [...currentMoves];
            newMoves[moveIndex] = { ...newMoves[moveIndex], Name: localName };
            updateCustomPokemon(pokemonId, 'Moves', newMoves);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
            <input
                type="text"
                value={localName}
                onChange={(event) => canEdit && setLocalName(event.target.value)}
                onBlur={handleBlur}
                list="hb-move-list"
                placeholder="Move Name"
                disabled={!canEdit}
                style={{
                    flex: 1,
                    padding: '4px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                }}
            />
            {canEdit && (
                <button
                    onClick={handleRemove}
                    className="action-button action-button--red"
                    style={{ padding: '0 6px' }}
                >
                    X
                </button>
            )}
        </div>
    );
}
