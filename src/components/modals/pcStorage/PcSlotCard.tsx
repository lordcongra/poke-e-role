import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { CornerDownLeft, Sparkles, FileText, ArrowRightLeft } from 'lucide-react';
import './PcSlotCard.css';

interface PcSlotCardProps {
    summary: PcPokemonSummary;
    isSelected: boolean;
    isPartySlot?: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onOpenSheet?: () => void;
    onMoveToParty?: () => void;
    onRelease?: () => void;
    onSendOut?: () => void;
    onRecall?: () => void;
    onDragStart?: (e: React.DragEvent) => void;
}

export const PcSlotCard: React.FC<PcSlotCardProps> = ({
    summary,
    isSelected,
    isPartySlot = false,
    onClick,
    onContextMenu,
    onOpenSheet,
    onMoveToParty,
    onSendOut,
    onRecall,
    onDragStart
}) => {
    const resolvedAvatar = useResolvedImageUrl(summary.tokenImageUrl, getAbsolutePokeballUrl());
    const hpPercent = summary.maxHp > 0 ? Math.max(0, Math.min(100, (summary.hp / summary.maxHp) * 100)) : 100;
    const hpColor =
        hpPercent > 50
            ? 'var(--hp-green, #22c55e)'
            : hpPercent > 20
              ? 'var(--hp-yellow, #eab308)'
              : 'var(--hp-red, #ef4444)';

    return (
        <div
            className={`pc-slot-card ${isSelected ? 'pc-slot-card--selected' : ''} ${isPartySlot ? 'pc-slot-card--party' : 'pc-slot-card--box'}`}
            onClick={onClick}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onOpenSheet?.();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e);
            }}
            draggable={!!onDragStart}
            onDragStart={onDragStart}
            title={`${summary.name || summary.species}${summary.species && summary.species !== summary.name ? ` (${summary.species})` : ''} - Double-click to open sheet, right-click for options`}
        >
            <div className="pc-slot-card__avatar-wrapper">
                <img
                    src={resolvedAvatar}
                    alt={summary.name || summary.species}
                    className="pc-slot-card__avatar"
                    onError={(e) => {
                        e.currentTarget.src = getAbsolutePokeballUrl();
                    }}
                />
                {summary.shiny && (
                    <span className="pc-slot-card__shiny-badge" title="Shiny">
                        <Sparkles size={11} />
                    </span>
                )}
            </div>

            <div className="pc-slot-card__info">
                {isPartySlot ? (
                    <>
                        <div className="pc-slot-card__title-row">
                            <span className="pc-slot-card__name text-label" title={summary.name || summary.species}>
                                {summary.name || summary.species}
                            </span>
                            <span className="pc-slot-card__rank text-subtext">{summary.rank || 'Starter'}</span>
                        </div>

                        <div className="pc-slot-card__meta-row">
                            <span className="pc-slot-card__species text-subtext">{summary.species}</span>
                            <div className="pc-slot-card__types">
                                <span
                                    className={`pc-slot-card__type-pill pc-slot-card__type--${summary.type1?.toLowerCase()}`}
                                >
                                    {summary.type1 || 'Normal'}
                                </span>
                                {summary.type2 && (
                                    <span
                                        className={`pc-slot-card__type-pill pc-slot-card__type--${summary.type2?.toLowerCase()}`}
                                    >
                                        {summary.type2}
                                    </span>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="pc-slot-card__title-row pc-slot-card__title-row--box">
                            <span
                                className="pc-slot-card__name pc-slot-card__name--box text-label"
                                title={
                                    summary.species && summary.species !== summary.name
                                        ? `${summary.name} (${summary.species})`
                                        : summary.name || summary.species
                                }
                            >
                                {summary.name || summary.species}
                            </span>
                        </div>

                        <div className="pc-slot-card__meta-row pc-slot-card__meta-row--box">
                            <div className="pc-slot-card__types pc-slot-card__types--box">
                                <span
                                    className={`pc-slot-card__type-pill pc-slot-card__type--${summary.type1?.toLowerCase()}`}
                                >
                                    {summary.type1 || 'Normal'}
                                </span>
                                {summary.type2 && (
                                    <span
                                        className={`pc-slot-card__type-pill pc-slot-card__type--${summary.type2?.toLowerCase()}`}
                                    >
                                        {summary.type2}
                                    </span>
                                )}
                            </div>
                            {summary.rank && summary.rank !== 'Starter' && (
                                <span
                                    className="pc-slot-card__rank pc-slot-card__rank--box text-subtext"
                                    title={`Rank: ${summary.rank}`}
                                >
                                    {summary.rank}
                                </span>
                            )}
                        </div>
                    </>
                )}

                <div className="pc-slot-card__hp-bar" title={`HP: ${summary.hp} / ${summary.maxHp}`}>
                    <div
                        className="pc-slot-card__hp-fill"
                        style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                    />
                </div>
            </div>

            {isPartySlot ? (
                <div className="pc-slot-card__party-actions">
                    {onOpenSheet && (
                        <button
                            type="button"
                            className="action-button action-button--dark pc-slot-card__btn-sheet"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenSheet();
                            }}
                            title="Open Character Sheet"
                            aria-label="Open Character Sheet"
                        >
                            <FileText size={13} />
                        </button>
                    )}
                    {OBR.isAvailable &&
                        (summary.isOnMap ? (
                            <button
                                type="button"
                                className="action-button action-button--dark pc-slot-card__btn-action pc-slot-card__btn-recall"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRecall?.();
                                }}
                                title="Recall Pokémon back into Pokéball"
                                aria-label="Recall Pokémon back into Pokéball"
                            >
                                <CornerDownLeft size={13} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="action-button action-button--theme pc-slot-card__btn-action pc-slot-card__btn-send"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSendOut?.();
                                }}
                                title="Send Out Pokémon onto battle map"
                                aria-label="Send Out Pokémon onto battle map"
                            >
                                <svg
                                    width={13}
                                    height={13}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ display: 'block' }}
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <circle cx="12" cy="12" r="3" />
                                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                                </svg>
                            </button>
                        ))}
                </div>
            ) : (
                <div className="pc-slot-card__box-actions">
                    {OBR.isAvailable &&
                        (summary.isOnMap
                            ? onRecall && (
                                  <button
                                      type="button"
                                      className="action-button action-button--dark pc-slot-card__btn-box-action pc-slot-card__btn-recall"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          onRecall();
                                      }}
                                      title="Recall Pokémon from map into PC Box"
                                      aria-label="Recall Pokémon from map into PC Box"
                                  >
                                      <CornerDownLeft size={12} />
                                  </button>
                              )
                            : onSendOut && (
                                  <button
                                      type="button"
                                      className="action-button action-button--theme pc-slot-card__btn-box-action pc-slot-card__btn-send"
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          onSendOut();
                                      }}
                                      title="Send Out Pokémon onto battle map"
                                      aria-label="Send Out Pokémon onto battle map"
                                  >
                                      <svg
                                          width={11}
                                          height={11}
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          style={{ display: 'block' }}
                                      >
                                          <circle cx="12" cy="12" r="10" />
                                          <line x1="2" y1="12" x2="22" y2="12" />
                                          <circle cx="12" cy="12" r="3" />
                                          <circle cx="12" cy="12" r="1" fill="currentColor" />
                                      </svg>
                                  </button>
                              ))}
                    {onMoveToParty && (
                        <button
                            type="button"
                            className="action-button action-button--dark pc-slot-card__btn-box-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveToParty();
                            }}
                            title="Move Pokémon to Trainer Belt (Party)"
                            aria-label="Move Pokémon to Trainer Belt"
                        >
                            <ArrowRightLeft size={11} />
                        </button>
                    )}
                    {onOpenSheet && (
                        <button
                            type="button"
                            className="action-button action-button--dark pc-slot-card__btn-box-sheet"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenSheet();
                            }}
                            title="Open Pokémon Sheet"
                            aria-label="Open Pokémon Sheet"
                        >
                            <FileText size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
