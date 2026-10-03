import React from 'react';
import type { Item } from '@owlbear-rodeo/sdk';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Check, Lock } from 'lucide-react';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';

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
    isInBoxes?: boolean;
    matchedEntityId?: string;
}

interface PcDepositCandidateCardProps {
    candidate: SceneCandidate;
    targetSlotType?: 'party' | 'box';
    partyButtonText?: string;
    isGm?: boolean;
    onSelect: () => void;
}

export const PcDepositCandidateCard: React.FC<PcDepositCandidateCardProps> = ({
    candidate,
    targetSlotType,
    partyButtonText = 'Add to Belt',
    isGm = false,
    onSelect
}) => {
    const resolvedAvatar = useResolvedImageUrl(candidate.imageUrl, getAbsolutePokeballUrl());
    const isPartySlot = targetSlotType === 'party';
    const isLocked =
        !isGm &&
        Boolean(
            candidate.claimedBy?.toLowerCase().includes('locked') ||
            isEntityLockedByGm(candidate.item, candidate.metadata)
        );
    const hasClaim = Boolean(candidate.claimedBy && !isLocked);

    return (
        <div className={`pc-deposit-card ${isLocked || hasClaim ? 'pc-deposit-card--claimed' : ''}`}>
            <img
                src={resolvedAvatar}
                alt={candidate.name}
                className="pc-deposit-card__avatar"
                draggable={false}
                onError={(e) => {
                    e.currentTarget.src = getAbsolutePokeballUrl();
                }}
            />
            <div className="pc-deposit-card__info">
                <span className="pc-deposit-card__name text-label" title={candidate.name}>
                    {candidate.name}
                </span>
                <span className="text-subtext">
                    {candidate.species}{' '}
                    {isLocked
                        ? '• Locked by GM'
                        : isGm && isEntityLockedByGm(candidate.item, candidate.metadata)
                          ? '• Locked NPC (GM Override)'
                          : `• ${candidate.hp}/${candidate.maxHp} HP`}
                </span>
                {isLocked ? (
                    <span
                        className="pc-deposit-card__claimed-tag text-subtext"
                        title="This sheet is locked by the GM. Ask your GM to unlock it to add it to your party."
                    >
                        <Lock size={10} /> Locked by GM
                    </span>
                ) : hasClaim ? (
                    <span
                        className="pc-deposit-card__claimed-tag text-subtext"
                        title={`Claimed by ${candidate.claimedBy}`}
                    >
                        <Lock size={10} /> {candidate.claimedBy}
                    </span>
                ) : isGm && isEntityLockedByGm(candidate.item, candidate.metadata) ? (
                    <span
                        className="pc-deposit-card__claimed-tag text-subtext"
                        title="GM Locked NPC - you can freely add to party"
                    >
                        <Lock size={10} /> NPC (Locked)
                    </span>
                ) : candidate.isInParty ? (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title="Already on your belt">
                        <Lock size={10} /> In Party
                    </span>
                ) : candidate.isInBoxes ? (
                    <span className="pc-deposit-card__claimed-tag text-subtext" title="Already stored in your PC">
                        <Lock size={10} /> In PC Box
                    </span>
                ) : null}
            </div>

            {!isGm && (isLocked || hasClaim) ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title={
                        isLocked
                            ? 'This sheet is locked by the GM. Ask your GM to unlock it to add it to your party.'
                            : `This Pokémon is already claimed by ${candidate.claimedBy}`
                    }
                >
                    <Lock size={14} /> {isLocked ? 'Locked by GM' : 'Claimed'}
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
            ) : !isPartySlot && candidate.isInBoxes ? (
                <button
                    type="button"
                    className="action-button action-button--dark pc-deposit-btn--disabled"
                    disabled
                    title="Already stored in your PC boxes"
                >
                    In Box
                </button>
            ) : (
                <button
                    type="button"
                    className="action-button action-button--theme"
                    onClick={onSelect}
                    title={
                        isGm && hasClaim
                            ? `Claimed by ${candidate.claimedBy} - Click to reassign or force transfer`
                            : undefined
                    }
                >
                    <Check size={14} /> {isPartySlot ? partyButtonText : 'Deposit'}
                </button>
            )}
        </div>
    );
};
