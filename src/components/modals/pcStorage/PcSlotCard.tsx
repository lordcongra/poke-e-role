import React from 'react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { Zap, CornerDownLeft, Sparkles, FileText } from 'lucide-react';
import './PcSlotCard.css';

interface PcSlotCardProps {
    summary: PcPokemonSummary;
    isSelected: boolean;
    isPartySlot?: boolean;
    onClick: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onOpenSheet?: () => void;
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
    onSendOut,
    onRecall,
    onDragStart
}) => {
    const hpPercent = summary.maxHp > 0 ? Math.max(0, Math.min(100, (summary.hp / summary.maxHp) * 100)) : 100;
    const hpColor =
        hpPercent > 50
            ? 'var(--hp-green, #22c55e)'
            : hpPercent > 20
              ? 'var(--hp-yellow, #eab308)'
              : 'var(--hp-red, #ef4444)';

    return (
        <div
            className={`pc-slot-card ${isSelected ? 'pc-slot-card--selected' : ''} ${isPartySlot ? 'pc-slot-card--party' : ''}`}
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
            title={`${summary.name || summary.species} (${summary.species}) - Double-click to open sheet, right-click for options`}
        >
            <div className="pc-slot-card__avatar-wrapper">
                <img
                    src={summary.tokenImageUrl || getAbsolutePokeballUrl()}
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
                <div className="pc-slot-card__title-row">
                    <span className="pc-slot-card__name text-label" title={summary.name || summary.species}>
                        {summary.name || summary.species}
                    </span>
                    <span className="pc-slot-card__rank text-subtext">{summary.rank || 'Starter'}</span>
                </div>

                <div className="pc-slot-card__meta-row">
                    <span className="pc-slot-card__species text-subtext">{summary.species}</span>
                    <div className="pc-slot-card__types">
                        <span className={`pc-slot-card__type-pill pc-slot-card__type--${summary.type1?.toLowerCase()}`}>
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
                        >
                            <FileText size={11} /> Sheet
                        </button>
                    )}
                    {summary.isOnMap ? (
                        <button
                            type="button"
                            className="action-button action-button--dark pc-slot-card__btn-recall"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRecall?.();
                            }}
                            title="Recall Pokémon back into Pokéball"
                        >
                            <CornerDownLeft size={12} /> Recall
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="action-button action-button--theme pc-slot-card__btn-send"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSendOut?.();
                            }}
                            title="Send Out Pokémon onto battle map"
                        >
                            <Zap size={12} /> Send Out
                        </button>
                    )}
                </div>
            ) : (
                onOpenSheet && (
                    <div className="pc-slot-card__box-actions">
                        <button
                            type="button"
                            className="action-button action-button--dark pc-slot-card__btn-box-sheet"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenSheet();
                            }}
                            title="Open Pokémon Sheet"
                        >
                            <FileText size={12} />
                        </button>
                    </div>
                )
            )}
        </div>
    );
};
