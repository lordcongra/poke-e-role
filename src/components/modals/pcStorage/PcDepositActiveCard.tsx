import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Check, Lock } from 'lucide-react';

interface PcDepositActiveCardProps {
    summary: PcPokemonSummary;
    targetSlotType?: 'party' | 'box';
    isAlreadyOnBelt: boolean;
    partyButtonText?: string;
    onSelect: () => void;
}

export const PcDepositActiveCard: React.FC<PcDepositActiveCardProps> = ({
    summary,
    targetSlotType,
    isAlreadyOnBelt,
    partyButtonText = 'Add to Belt',
    onSelect
}) => {
    const resolvedAvatar = useResolvedImageUrl(summary.tokenImageUrl, getAbsolutePokeballUrl());
    const isPartySlot = targetSlotType === 'party';

    return (
        <div className="pc-deposit-card pc-deposit-card--active">
            <img
                src={resolvedAvatar}
                alt={summary.name}
                className="pc-deposit-card__avatar"
                onError={(e) => {
                    e.currentTarget.src = getAbsolutePokeballUrl();
                }}
            />
            <div className="pc-deposit-card__info">
                <span className="pc-deposit-card__name text-label">{summary.name || summary.species}</span>
                <span className="text-subtext">
                    {summary.species} • HP {summary.hp}/{summary.maxHp}
                </span>
            </div>
            {isPartySlot && isAlreadyOnBelt ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title="This Pokémon is already on your belt."
                >
                    <Lock size={14} /> Already on Belt
                </button>
            ) : (
                <button type="button" className="action-button action-button--theme" onClick={onSelect}>
                    <Check size={14} /> {isPartySlot ? partyButtonText : 'Deposit'}
                </button>
            )}
        </div>
    );
};
