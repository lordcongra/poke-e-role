import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { X } from 'lucide-react';
import './HomebrewPokemonCard.css';

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
        <div className="homebrew-pokemon-card__learnset-row">
            <input
                type="text"
                value={localName}
                onChange={(event) => canEdit && setLocalName(event.target.value)}
                onBlur={handleBlur}
                list="hb-move-list"
                placeholder="Move Name"
                disabled={!canEdit}
                className="homebrew-pokemon-card__learnset-input text-label"
            />
            {canEdit && (
                <button
                    onClick={handleRemove}
                    className="action-button action-button--red homebrew-pokemon-card__learnset-remove-btn"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
