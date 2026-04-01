import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomPokemon } from '../../store/storeTypes';
import { LearnsetMoveRow } from './LearnsetMoveRow';
import { RANKS } from '../../data/constants';
import './HomebrewPokemonCard.css';

interface HomebrewPokemonLearnsetProps {
    pokemon: CustomPokemon;
    canEdit: boolean;
}

export function HomebrewPokemonLearnset({ pokemon, canEdit }: HomebrewPokemonLearnsetProps) {
    const updateCustomPokemon = useCharacterStore((state) => state.updateCustomPokemon);

    const addLearnsetMove = (rank: string) => {
        updateCustomPokemon(pokemon.id, 'Moves', [...pokemon.Moves, { Learned: rank, Name: '' }]);
    };

    return (
        <div className="homebrew-pokemon-card__learnset-section">
            <span className="homebrew-pokemon-card__learnset-title">Learnset Categories</span>
            <div className="homebrew-pokemon-card__learnset-list">
                {[...RANKS, 'Other'].map((rankOption) => {
                    const movesInRank = pokemon.Moves.map((move, index) => ({ move, index })).filter(
                        (item) => item.move.Learned === rankOption
                    );
                    return (
                        <div key={rankOption} className="homebrew-pokemon-card__learnset-rank-box">
                            <div className="homebrew-pokemon-card__learnset-rank-title">{rankOption}</div>
                            {movesInRank.map(({ move, index }) => (
                                <LearnsetMoveRow
                                    key={index}
                                    pokemonId={pokemon.id}
                                    moveIndex={index}
                                    move={move}
                                    currentMoves={pokemon.Moves}
                                    canEdit={canEdit}
                                />
                            ))}
                            {canEdit && (
                                <button
                                    onClick={() => addLearnsetMove(rankOption)}
                                    className="action-button action-button--dark homebrew-pokemon-card__learnset-add-btn"
                                >
                                    + Add {rankOption} Move
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
