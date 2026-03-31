import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomPokemon } from '../store/storeTypes';
import { NumberSpinner } from './NumberSpinner';
import './HomebrewPokemonCard.css';

interface HomebrewPokemonStatsProps {
    pokemon: CustomPokemon;
    canEdit: boolean;
}

export function HomebrewPokemonStats({ pokemon, canEdit }: HomebrewPokemonStatsProps) {
    const updateCustomPokemon = useCharacterStore((state) => state.updateCustomPokemon);

    const renderStatisticInput = (
        label: string,
        baseField: keyof CustomPokemon,
        maxField: keyof CustomPokemon,
        baseValue: number,
        maxValue: number
    ) => {
        const isHealthPoints = baseField === maxField;
        return (
            <div className="homebrew-pokemon-card__stat-box">
                <span className="homebrew-pokemon-card__stat-label">{label}</span>
                <div className="homebrew-pokemon-card__stat-inputs">
                    <div className="homebrew-pokemon-card__stat-column">
                        <span className="homebrew-pokemon-card__stat-sublabel">Base</span>
                        <div className="homebrew-pokemon-card__spinner-wrapper">
                            <NumberSpinner
                                value={baseValue}
                                onChange={(value) => canEdit && updateCustomPokemon(pokemon.id, baseField, value)}
                                min={0}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                    {!isHealthPoints && (
                        <>
                            <span className="homebrew-pokemon-card__stat-divider">/</span>
                            <div className="homebrew-pokemon-card__stat-column">
                                <span className="homebrew-pokemon-card__stat-sublabel">Limit</span>
                                <div className="homebrew-pokemon-card__spinner-wrapper">
                                    <NumberSpinner
                                        value={maxValue}
                                        onChange={(value) =>
                                            canEdit && updateCustomPokemon(pokemon.id, maxField, value)
                                        }
                                        min={0}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="homebrew-pokemon-card__stats-grid">
            {renderStatisticInput('HP', 'BaseHP', 'BaseHP', pokemon.BaseHP, pokemon.BaseHP)}
            {renderStatisticInput('STR', 'Strength', 'MaxStrength', pokemon.Strength, pokemon.MaxStrength)}
            {renderStatisticInput('DEX', 'Dexterity', 'MaxDexterity', pokemon.Dexterity, pokemon.MaxDexterity)}
            {renderStatisticInput('VIT', 'Vitality', 'MaxVitality', pokemon.Vitality, pokemon.MaxVitality)}
            {renderStatisticInput('SPE', 'Special', 'MaxSpecial', pokemon.Special, pokemon.MaxSpecial)}
            {renderStatisticInput('INS', 'Insight', 'MaxInsight', pokemon.Insight, pokemon.MaxInsight)}
        </div>
    );
}
