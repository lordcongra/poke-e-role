import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Check } from 'lucide-react';

interface PcDepositStoredCardProps {
    pokemon: PcPokemonSummary;
    targetSlotType?: 'party' | 'box';
    partyButtonText?: string;
    onSelect: () => void;
}

export const PcDepositStoredCard: React.FC<PcDepositStoredCardProps> = ({
    pokemon,
    targetSlotType,
    partyButtonText = 'Add to Belt',
    onSelect
}) => {
    const resolvedAvatar = useResolvedImageUrl(pokemon.tokenImageUrl, getAbsolutePokeballUrl());
    const isPartySlot = targetSlotType === 'party';

    return (
        <div className="pc-deposit-card">
            <img
                src={resolvedAvatar}
                alt={pokemon.name}
                className="pc-deposit-card__avatar"
                onError={(e) => {
                    e.currentTarget.src = getAbsolutePokeballUrl();
                }}
            />
            <div className="pc-deposit-card__info">
                <span className="pc-deposit-card__name text-label" title={pokemon.name}>
                    {pokemon.name || pokemon.species}
                </span>
                <span className="text-subtext">
                    {pokemon.species} • {pokemon.hp}/{pokemon.maxHp} HP
                </span>
            </div>
            <button type="button" className="action-button action-button--theme" onClick={onSelect}>
                <Check size={14} /> {isPartySlot ? partyButtonText : 'Select'}
            </button>
        </div>
    );
};
