import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Check, Lock } from 'lucide-react';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';

interface PcDepositActiveCardProps {
    summary: PcPokemonSummary;
    targetSlotType?: 'party' | 'box';
    isAlreadyOnBelt?: boolean;
    isInParty?: boolean;
    isInBoxes?: boolean;
    claimedBy?: string;
    partyButtonText?: string;
    onSelect: () => void;
}

export const PcDepositActiveCard: React.FC<PcDepositActiveCardProps> = ({
    summary,
    targetSlotType,
    isAlreadyOnBelt,
    isInParty: propIsInParty,
    isInBoxes = false,
    claimedBy,
    partyButtonText = 'Add to Belt',
    onSelect
}) => {
    const resolvedAvatar = useResolvedImageUrl(summary.tokenImageUrl, getAbsolutePokeballUrl());
    const isPartySlot = targetSlotType === 'party';
    const isInParty = propIsInParty ?? isAlreadyOnBelt;
    const isLocked = Boolean(claimedBy?.toLowerCase().includes('locked') || isEntityLockedByGm(summary));

    return (
        <div
            className={`pc-deposit-card pc-deposit-card--active ${claimedBy || isLocked ? 'pc-deposit-card--claimed' : ''}`}
        >
            <img
                src={resolvedAvatar}
                alt={summary.name}
                className="pc-deposit-card__avatar"
                draggable={false}
                onError={(e) => {
                    e.currentTarget.src = getAbsolutePokeballUrl();
                }}
            />
            <div className="pc-deposit-card__info">
                <span className="pc-deposit-card__name text-label" title={summary.name || summary.species}>
                    {summary.name || summary.species}
                </span>
                <span className="text-subtext">
                    {summary.species} {isLocked ? '• Locked by GM' : `• HP ${summary.hp}/${summary.maxHp}`}
                </span>
                {isLocked ? (
                    <span
                        className="pc-deposit-card__claimed-tag text-subtext"
                        title="This sheet is locked by the GM. Ask your GM to unlock it to add it to your party."
                    >
                        <Lock size={10} /> Locked by GM
                    </span>
                ) : claimedBy ? (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title={`Claimed by ${claimedBy}`}>
                        <Lock size={10} /> {claimedBy}
                    </span>
                ) : isInParty ? (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title="Already on your belt">
                        <Lock size={10} /> In Party
                    </span>
                ) : isInBoxes ? (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title="Already stored in PC boxes">
                        <Lock size={10} /> In PC Box
                    </span>
                ) : null}
            </div>

            {claimedBy || isLocked ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title={
                        isLocked
                            ? 'This sheet is locked by the GM. Ask your GM to unlock it to add it to your party.'
                            : `This Pokémon is already claimed by ${claimedBy}`
                    }
                >
                    <Lock size={14} /> {isLocked ? 'Locked by GM' : 'Claimed'}
                </button>
            ) : isPartySlot && isInParty ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title="This Pokémon is already on your belt."
                >
                    <Lock size={14} /> Already on Belt
                </button>
            ) : !isPartySlot && isInBoxes ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title="Already stored in your PC boxes"
                >
                    <Lock size={14} /> In Box
                </button>
            ) : (
                <button type="button" className="action-button action-button--theme" onClick={onSelect}>
                    <Check size={14} /> {isPartySlot ? partyButtonText : 'Deposit'}
                </button>
            )}
        </div>
    );
};
