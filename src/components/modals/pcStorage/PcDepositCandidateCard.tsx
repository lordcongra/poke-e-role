import React from 'react';
import type { Item } from '@owlbear-rodeo/sdk';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Check, Lock } from 'lucide-react';

export interface SceneCandidate {
    id: string;
    name: string;
    species: string;
    imageUrl: string;
    hp: number;
    maxHp: number;
    will: number;
    maxWill: number;
    type1: string;
    type2?: string;
    rank: string;
    item: Item;
    metadata: Record<string, unknown>;
    claimedBy?: string;
    isInParty?: boolean;
    matchedEntityId?: string;
}

interface PcDepositCandidateCardProps {
    candidate: SceneCandidate;
    targetSlotType?: 'party' | 'box';
    partyButtonText?: string;
    onSelect: () => void;
}

export const PcDepositCandidateCard: React.FC<PcDepositCandidateCardProps> = ({
    candidate,
    targetSlotType,
    partyButtonText = 'Add to Belt',
    onSelect
}) => {
    const resolvedAvatar = useResolvedImageUrl(candidate.imageUrl, getAbsolutePokeballUrl());
    const isPartySlot = targetSlotType === 'party';

    return (
        <div className={`pc-deposit-card ${candidate.claimedBy ? 'pc-deposit-card--claimed' : ''}`}>
            <img
                src={resolvedAvatar}
                alt={candidate.name}
                className="pc-deposit-card__avatar"
                onError={(e) => {
                    e.currentTarget.src = getAbsolutePokeballUrl();
                }}
            />
            <div className="pc-deposit-card__info">
                <span className="pc-deposit-card__name text-label" title={candidate.name}>
                    {candidate.name}
                </span>
                <span className="text-subtext">
                    {candidate.species} • {candidate.hp}/{candidate.maxHp} HP
                </span>
                {candidate.claimedBy ? (
                    <span
                        className="pc-deposit-card__claimed-tag text-subtext"
                        title={`Claimed by ${candidate.claimedBy}`}
                    >
                        <Lock size={10} /> Claimed by {candidate.claimedBy}
                    </span>
                ) : candidate.isInParty ? (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title="Already on your belt">
                        <Lock size={10} /> In Party
                    </span>
                ) : null}
            </div>

            {candidate.claimedBy ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title={`This Pokémon is already claimed by ${candidate.claimedBy}`}
                >
                    Claimed
                </button>
            ) : isPartySlot && candidate.isInParty ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title="Already in your party belt"
                >
                    In Party
                </button>
            ) : (
                <button type="button" className="action-button action-button--theme" onClick={onSelect}>
                    <Check size={14} /> {isPartySlot ? partyButtonText : 'Deposit'}
                </button>
            )}
        </div>
    );
};
