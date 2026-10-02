import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Check, Lock } from 'lucide-react';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';

interface PcDepositStoredCardProps {
    pokemon: PcPokemonSummary;
    targetSlotType?: 'party' | 'box';
    partyButtonText?: string;
    isGm?: boolean;
    onSelect: () => void;
}

export const PcDepositStoredCard: React.FC<PcDepositStoredCardProps> = ({
    pokemon,
    targetSlotType,
    partyButtonText = 'Add to Belt',
    isGm = false,
    onSelect
}) => {
    const resolvedAvatar = useResolvedImageUrl(pokemon.tokenImageUrl, getAbsolutePokeballUrl());
    const isPartySlot = targetSlotType === 'party';
    const isLocked = !isGm && isEntityLockedByGm(pokemon);

    return (
        <div className={`pc-deposit-card ${isLocked ? 'pc-deposit-card--claimed' : ''}`}>
            <img
                src={resolvedAvatar}
                alt={pokemon.name}
                className="pc-deposit-card__avatar"
                draggable={false}
                onError={(e) => {
                    e.currentTarget.src = getAbsolutePokeballUrl();
                }}
            />
            <div className="pc-deposit-card__info">
                <span className="pc-deposit-card__name text-label" title={pokemon.name}>
                    {pokemon.name || pokemon.species}
                </span>
                <span className="text-subtext">
                    {pokemon.species} {isLocked ? '• Locked by GM' : `• ${pokemon.hp}/${pokemon.maxHp} HP`}
                </span>
                {isLocked && (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title="Locked by GM">
                        <Lock size={10} /> Locked by GM
                    </span>
                )}
            </div>
            {isLocked ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title="This sheet is locked by the GM. Ask your GM to unlock it."
                >
                    <Lock size={14} /> Locked by GM
                </button>
            ) : (
                <button type="button" className="action-button action-button--theme" onClick={onSelect}>
                    <Check size={14} /> {isPartySlot ? partyButtonText : 'Select'}
                </button>
            )}
        </div>
    );
};
