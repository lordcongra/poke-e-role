import React from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { CornerDownLeft, FileText, ArrowRightLeft, MoreHorizontal } from 'lucide-react';
import type { PcPokemonSummary } from '../../../types/pcStorageTypes';

interface PcSlotBoxActionsProps {
    summary: PcPokemonSummary;
    isLocked: boolean;
    onOpenSheet?: () => void;
    onMoveToParty?: () => void;
    onSendOut?: () => void;
    onRecall?: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

export const PcSlotBoxActions: React.FC<PcSlotBoxActionsProps> = ({
    summary,
    isLocked,
    onOpenSheet,
    onMoveToParty,
    onSendOut,
    onRecall,
    onContextMenu
}) => {
    return (
        <div className="pc-slot-card__box-actions">
            {OBR.isAvailable &&
                (summary.isOnMap
                    ? onRecall && (
                          <button
                              type="button"
                              className={`action-button action-button--dark pc-slot-card__btn-box-action pc-slot-card__btn-recall ${isLocked ? 'pc-slot-card__btn-sheet--disabled' : ''}`}
                              disabled={isLocked}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (isLocked) return;
                                  onRecall();
                              }}
                              title={isLocked ? 'Locked by GM' : 'Recall Pokémon from map into PC Box'}
                              aria-label={isLocked ? 'Locked by GM' : 'Recall Pokémon from map into PC Box'}
                          >
                              <CornerDownLeft size={12} />
                          </button>
                      )
                    : onSendOut && (
                          <button
                              type="button"
                              className={`action-button action-button--theme pc-slot-card__btn-box-action pc-slot-card__btn-send ${isLocked ? 'pc-slot-card__btn-sheet--disabled' : ''}`}
                              disabled={isLocked}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (isLocked) return;
                                  onSendOut();
                              }}
                              title={isLocked ? 'Locked by GM' : 'Send Out Pokémon onto battle map'}
                              aria-label={isLocked ? 'Locked by GM' : 'Send Out Pokémon onto battle map'}
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
                    className={`action-button action-button--dark pc-slot-card__btn-box-action ${isLocked ? 'pc-slot-card__btn-sheet--disabled' : ''}`}
                    disabled={isLocked}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isLocked) return;
                        onMoveToParty();
                    }}
                    title={isLocked ? 'Locked by GM' : 'Move Pokémon to Trainer Belt (Party)'}
                    aria-label={isLocked ? 'Locked by GM' : 'Move Pokémon to Trainer Belt'}
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
                <MoreHorizontal size={12} />
            </button>
        </div>
    );
};
