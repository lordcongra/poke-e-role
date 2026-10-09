import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';
import { getAbsolutePokeballUrl } from '../../../utils/generators/trainerTokenSpawner';
import { useResolvedImageUrl } from '../../../utils/graphics/useResolvedImageUrl';
import { Sparkles, Lock } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { isEntityLockedByGm } from '../../../utils/pc/pcCandidateMatching';
import { usePcSlotTouch } from './usePcSlotTouch';
import { PcSlotPartyActions } from './PcSlotPartyActions';
import { PcSlotBoxActions } from './PcSlotBoxActions';
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
    onDragEnd?: (e: React.DragEvent) => void;
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
    onDragStart,
    onDragEnd
}) => {
    const role = useCharacterStore((s) => s.role);
    const isLocked = role !== 'GM' && isEntityLockedByGm(summary);
    const resolvedAvatar = useResolvedImageUrl(summary.tokenImageUrl, getAbsolutePokeballUrl());
    const hpPercent = summary.maxHp > 0 ? Math.max(0, Math.min(100, (summary.hp / summary.maxHp) * 100)) : 100;
    const hpColor =
        hpPercent > 50
            ? 'var(--hp-green, #22c55e)'
            : hpPercent > 20
              ? 'var(--hp-yellow, #eab308)'
              : 'var(--hp-red, #ef4444)';

    const hasType2 = Boolean(summary.type2 && summary.type2.toLowerCase() !== 'none' && summary.type2.trim() !== '');
    const type1Display = summary.type1 && summary.type1.toLowerCase() !== 'none' ? summary.type1 : 'Normal';

    const {
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleTouchCancel,
        handleClick,
        handleDragStartWrapped
    } = usePcSlotTouch({
        onContextMenu,
        onClick,
        onDragStart
    });

    return (
        <div
            className={`pc-slot-card ${isSelected ? 'pc-slot-card--selected' : ''} ${isPartySlot ? 'pc-slot-card--party' : 'pc-slot-card--box'}`}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onDoubleClick={(e) => {
                e.stopPropagation();
                if (isLocked) {
                    if (OBR.isAvailable) {
                        OBR.notification.show(
                            'This character token is locked by the GM. Ask your GM to unlock it.',
                            'WARNING'
                        );
                    }
                    return;
                }
                onOpenSheet?.();
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e);
            }}
            draggable={!isLocked && !!onDragStart}
            onDragStart={handleDragStartWrapped}
            onDragEnd={onDragEnd}
            title={`${summary.name || summary.species}${summary.species && summary.species !== summary.name ? ` (${summary.species})` : ''} - Double-click to open sheet, right-click for options`}
        >
            <div className="pc-slot-card__avatar-wrapper">
                <img
                    src={resolvedAvatar}
                    alt={summary.name || summary.species}
                    className="pc-slot-card__avatar"
                    draggable={false}
                    onError={(e) => {
                        e.currentTarget.src = getAbsolutePokeballUrl();
                    }}
                />
                {summary.shiny && (
                    <span className="pc-slot-card__shiny-badge" title="Shiny">
                        <Sparkles size={11} />
                    </span>
                )}
                {isLocked && (
                    <span className="pc-slot-card__locked-badge" title="Locked by GM">
                        <Lock size={11} />
                    </span>
                )}
            </div>

            <div className="pc-slot-card__info">
                {isPartySlot ? (
                    <>
                        <div className="pc-slot-card__title-row">
                            <div className="pc-slot-card__name-wrapper">
                                <span
                                    className={`pc-slot-card__name pc-slot-card__name--party ${(summary.name || summary.species || '').length > 12 ? 'pc-slot-card__name--marquee' : ''} text-label`}
                                    title={summary.name || summary.species}
                                >
                                    {summary.name || summary.species}
                                </span>
                            </div>
                            <span className="pc-slot-card__rank text-subtext">{summary.rank || 'Starter'}</span>
                        </div>

                        <div className="pc-slot-card__meta-row">
                            <span className="pc-slot-card__species text-subtext">{summary.species}</span>
                            <div className="pc-slot-card__types">
                                <span
                                    className={`pc-slot-card__type-pill pc-slot-card__type--${type1Display.toLowerCase()}`}
                                >
                                    {type1Display}
                                </span>
                                {hasType2 && (
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
                                className={`pc-slot-card__name pc-slot-card__name--box ${(summary.name || summary.species || '').length > 13 ? 'pc-slot-card__name--marquee' : ''} text-label`}
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
                            <div
                                className={`pc-slot-card__types pc-slot-card__types--box ${hasType2 ? 'pc-slot-card__types--dual' : ''}`}
                            >
                                <span
                                    className={`pc-slot-card__type-pill pc-slot-card__type--${type1Display.toLowerCase()}`}
                                >
                                    {type1Display}
                                </span>
                                {hasType2 && (
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
                <PcSlotPartyActions
                    summary={summary}
                    isLocked={isLocked}
                    onOpenSheet={onOpenSheet}
                    onSendOut={onSendOut}
                    onRecall={onRecall}
                    onContextMenu={onContextMenu}
                />
            ) : (
                <PcSlotBoxActions
                    summary={summary}
                    isLocked={isLocked}
                    onOpenSheet={onOpenSheet}
                    onMoveToParty={onMoveToParty}
                    onSendOut={onSendOut}
                    onRecall={onRecall}
                    onContextMenu={onContextMenu}
                />
            )}
        </div>
    );
};
