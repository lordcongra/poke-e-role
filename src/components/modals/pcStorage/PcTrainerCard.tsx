import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { Shield, FileText, MapPin } from 'lucide-react';

interface PcTrainerCardProps {
    summary: PcPokemonSummary;
    isTrainerOnMap?: boolean;
    onOpenSheet?: () => void;
    onDropTrainerToken?: () => void;
}

export const PcTrainerCard: React.FC<PcTrainerCardProps> = ({
    summary,
    isTrainerOnMap = false,
    onOpenSheet,
    onDropTrainerToken
}) => {
    const resolvedAvatar = useResolvedImageUrl(summary.tokenImageUrl, getAbsolutePokeballUrl());
    const hpPercent = summary.maxHp > 0 ? Math.max(0, Math.min(100, (summary.hp / summary.maxHp) * 100)) : 100;
    const hpColor =
        hpPercent > 50
            ? 'var(--hp-green, #22c55e)'
            : hpPercent > 20
              ? 'var(--hp-yellow, #eab308)'
              : 'var(--hp-red, #ef4444)';
    const willPercent = summary.maxWill > 0 ? Math.max(0, Math.min(100, (summary.will / summary.maxWill) * 100)) : 100;

    return (
        <div
            className="pc-trainer-card"
            onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenSheet?.();
            }}
            title={`${summary.name} (Trainer) - Double-click to open character sheet`}
        >
            <div className="pc-trainer-card__avatar-wrapper">
                <img
                    src={resolvedAvatar}
                    alt={summary.name}
                    className="pc-trainer-card__avatar"
                    onError={(e) => {
                        e.currentTarget.src = getAbsolutePokeballUrl();
                    }}
                />
            </div>

            <div className="pc-trainer-card__info">
                <div className="pc-trainer-card__header-row">
                    <span className="pc-trainer-card__name text-label" title={summary.name}>
                        {summary.name}
                    </span>
                    <span className="pc-trainer-card__badge text-subtext">
                        <Shield size={10} style={{ marginRight: 3 }} />
                        Trainer
                    </span>
                </div>

                <div className="pc-trainer-card__bars">
                    <div className="pc-trainer-card__bar-row">
                        <span className="pc-trainer-card__bar-label text-subtext">HP</span>
                        <div className="pc-trainer-card__bar-track" title={`HP: ${summary.hp} / ${summary.maxHp}`}>
                            <div
                                className="pc-trainer-card__bar-fill"
                                style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                            />
                        </div>
                        <span className="pc-trainer-card__bar-val text-subtext">
                            {summary.hp}/{summary.maxHp}
                        </span>
                    </div>

                    {summary.maxWill > 0 && (
                        <div className="pc-trainer-card__bar-row">
                            <span className="pc-trainer-card__bar-label text-subtext">Will</span>
                            <div
                                className="pc-trainer-card__bar-track"
                                title={`Will: ${summary.will} / ${summary.maxWill}`}
                            >
                                <div
                                    className="pc-trainer-card__bar-fill pc-trainer-card__bar-fill--will"
                                    style={{ width: `${willPercent}%` }}
                                />
                            </div>
                            <span className="pc-trainer-card__bar-val text-subtext">
                                {summary.will}/{summary.maxWill}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="pc-trainer-card__actions">
                {onOpenSheet && (
                    <button
                        type="button"
                        className="action-button action-button--dark pc-trainer-card__btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenSheet();
                        }}
                        title={`Open ${summary.name}'s character sheet`}
                        aria-label={`Open ${summary.name}'s character sheet`}
                    >
                        <FileText size={13} />
                    </button>
                )}
                {OBR.isAvailable && onDropTrainerToken && (
                    <button
                        type="button"
                        className={`action-button action-button--theme pc-trainer-card__btn ${
                            isTrainerOnMap ? 'pc-trainer-card__btn--on-map' : ''
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onDropTrainerToken();
                        }}
                        title={isTrainerOnMap ? `${summary.name} is already on the board` : 'Drop token onto map'}
                        aria-label={isTrainerOnMap ? `${summary.name} is on map` : 'Drop token onto map'}
                    >
                        <MapPin size={13} />
                    </button>
                )}
            </div>
        </div>
    );
};
