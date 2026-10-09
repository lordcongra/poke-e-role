import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { CornerDownLeft, FileText, Lock, MoreHorizontal } from 'lucide-react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';

interface PcSlotPartyActionsProps {
    summary: PcPokemonSummary;
    isLocked: boolean;
    onOpenSheet?: () => void;
    onSendOut?: () => void;
    onRecall?: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export const PcSlotPartyActions: React.FC<PcSlotPartyActionsProps> = ({
    summary,
    isLocked,
    onOpenSheet,
    onSendOut,
    onRecall,
    onContextMenu
}) => {
    return (
        <div className="pc-slot-card__party-actions">
            {onOpenSheet && (
                <button
                    type="button"
                    className={`action-button action-button--dark pc-slot-card__btn-sheet ${isLocked ? 'pc-slot-card__btn-sheet--disabled' : ''}`}
                    onClick={(e) => {
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
                        onOpenSheet();
                    }}
                    title={isLocked ? 'Locked by GM' : 'Open Character Sheet'}
                    aria-label={isLocked ? 'Locked by GM' : 'Open Character Sheet'}
                    disabled={isLocked}
                >
                    {isLocked ? <Lock size={13} /> : <FileText size={13} />}
                </button>
            )}
            {OBR.isAvailable &&
                (summary.isOnMap ? (
                    <button
                        type="button"
                        className={`action-button action-button--dark pc-slot-card__btn-action pc-slot-card__btn-recall ${isLocked ? 'pc-slot-card__btn-sheet--disabled' : ''}`}
                        disabled={isLocked}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isLocked) return;
                            onRecall?.();
                        }}
                        title={isLocked ? 'Locked by GM' : 'Recall Pokémon back into Pokéball'}
                        aria-label={isLocked ? 'Locked by GM' : 'Recall Pokémon back into Pokéball'}
                    >
                        <CornerDownLeft size={13} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className={`action-button action-button--theme pc-slot-card__btn-action pc-slot-card__btn-send ${isLocked ? 'pc-slot-card__btn-sheet--disabled' : ''}`}
                        disabled={isLocked}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isLocked) return;
                            onSendOut?.();
                        }}
                        title={isLocked ? 'Locked by GM' : 'Send Out Pokémon onto battle map'}
                        aria-label={isLocked ? 'Locked by GM' : 'Send Out Pokémon onto battle map'}
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
            <button
                type="button"
                className="action-button action-button--dark pc-slot-card__btn-menu"
                onClick={(e) => {
                    e.stopPropagation();
                    onContextMenu(e);
                }}
                title="More Options"
                aria-label="More Options"
            >
                <MoreHorizontal size={13} />
            </button>
        </div>
    );
};
