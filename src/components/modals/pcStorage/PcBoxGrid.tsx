import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcBox, PcPokemonSummary } from '../../../types/pcStorageTypes';
import { PcSlotCard } from './PcSlotCard';
import { AlertTriangle, X, PlusCircle } from 'lucide-react';
import './PcBoxGrid.css';

// In-memory session tracker: resets only upon full page refresh/launch
let hasTokenAttachmentTipDismissedThisSession = false;

interface PcBoxGridProps {
    box: PcBox;
    pokemonSummaries: Record<string, PcPokemonSummary>;
    selectedSlot: { type: 'party' | 'box'; index: number } | null;
    onSelectSlot: (index: number) => void;
    onEmptySlotClick?: (index: number) => void;
    onOpenDepositDrawer?: () => void;
    onContextMenu: (e: React.MouseEvent, index: number, entityId: string) => void;
    onOpenSheet?: (entityId: string) => void;
    onMoveToParty?: (entityId: string) => void;
    onSendOut?: (entityId: string) => void;
    onRecall?: (entityId: string) => void;
    onDropOnSlot: (e: React.DragEvent, targetIndex: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragEnd?: (e: React.DragEvent) => void;
}

export const PcBoxGrid: React.FC<PcBoxGridProps> = ({
    box,
    pokemonSummaries,
    selectedSlot,
    onSelectSlot,
    onEmptySlotClick,
    onOpenDepositDrawer,
    onContextMenu,
    onOpenSheet,
    onMoveToParty,
    onSendOut,
    onRecall,
    onDropOnSlot,
    onDragStart,
    onDragEnd
}) => {
    const [dismissBanner, setDismissBanner] = useState(() => hasTokenAttachmentTipDismissedThisSession);

    const handleDismissBanner = () => {
        hasTokenAttachmentTipDismissedThisSession = true;
        setDismissBanner(true);
    };

    // Automatically mark as dismissed for this session once viewed when modal closes
    useEffect(() => {
        return () => {
            hasTokenAttachmentTipDismissedThisSession = true;
        };
    }, []);

    // Ensure 30 slots exist
    const slots = Array.from({ length: 30 }, (_, i) => box.slots[i] ?? null);
    const occupiedCount = slots.filter(Boolean).length;
    const theme = box.themeColor || '#3b82f6';

    return (
        <section
            className="pc-box-grid-container"
            style={
                {
                    '--box-theme': theme,
                    borderColor: `${theme}66`,
                    background: `radial-gradient(ellipse at 50% -10%, color-mix(in srgb, ${theme} 22%, transparent) 0%, var(--bg) 75%, color-mix(in srgb, var(--bg) 85%, #000) 100%)`,
                    boxShadow: `inset 0 1px 0 ${theme}33`
                } as React.CSSProperties
            }
        >
            {!dismissBanner && OBR.isAvailable && (
                <div className="pc-box-grid__banner">
                    <div className="pc-box-grid__banner-content">
                        <AlertTriangle size={15} className="pc-box-grid__banner-icon" />
                        <span className="pc-box-grid__banner-text text-subtext">
                            <strong style={{ color: 'var(--semantic-warning, #f59e0b)' }}>
                                Token Attachment Warning:
                            </strong>{' '}
                            Held items, hats, and accessories attach smoothly with your Pokémon! For best results, avoid
                            attaching two Pokémon or Trainer tokens directly to each other. Do not try attaching two
                            Pokémon that are in the PC together, as they could create a self-duplicating loop.
                        </span>
                    </div>
                    <button
                        type="button"
                        className="pc-box-grid__banner-close"
                        onClick={handleDismissBanner}
                        aria-label="Dismiss warning"
                    >
                        <X size={13} />
                    </button>
                </div>
            )}

            <div
                className="pc-box-grid__subheader"
                style={{
                    borderBottom: `1px solid ${theme}2a`,
                    paddingBottom: 6
                }}
            >
                <span className="pc-box-grid__count text-subtext" style={{ color: theme, fontWeight: 700 }}>
                    Capacity: {occupiedCount} / 30 Pokémon
                </span>
                <div className="pc-box-grid__subheader-actions">
                    {onOpenDepositDrawer && (
                        <button
                            type="button"
                            className="action-button action-button--theme pc-box-grid__deposit-btn"
                            style={{ background: theme, borderColor: theme }}
                            onClick={onOpenDepositDrawer}
                            title={
                                OBR.isAvailable
                                    ? 'Deposit Pokémon from current map or sheet into this box'
                                    : 'Deposit Pokémon into this box'
                            }
                        >
                            <PlusCircle size={13} /> Deposit Pokémon
                        </button>
                    )}
                </div>
            </div>

            <div className="pc-box-grid">
                {slots.map((entityId, index) => {
                    const summary = entityId ? pokemonSummaries[entityId] : null;
                    const isSelected = selectedSlot?.type === 'box' && selectedSlot?.index === index;

                    if (summary && entityId) {
                        return (
                            <div
                                key={`box-slot-${index}-${entityId}`}
                                className="pc-box-grid__slot-wrapper"
                                data-slot-type="box"
                                data-slot-index={index}
                                onDragEnter={(e) => e.preventDefault()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => onDropOnSlot(e, index)}
                            >
                                <PcSlotCard
                                    summary={summary}
                                    isSelected={isSelected}
                                    isPartySlot={false}
                                    slotIndex={index}
                                    onClick={() => onSelectSlot(index)}
                                    onContextMenu={(e) => onContextMenu(e, index, entityId)}
                                    onOpenSheet={() => onOpenSheet?.(entityId)}
                                    onMoveToParty={() => onMoveToParty?.(entityId)}
                                    onSendOut={() => onSendOut?.(entityId)}
                                    onRecall={() => onRecall?.(entityId)}
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragEnd={onDragEnd}
                                />
                            </div>
                        );
                    }

                    return (
                        <div
                            key={`box-slot-empty-${index}`}
                            className={`pc-box-grid__empty-slot ${isSelected ? 'pc-box-grid__empty-slot--selected' : ''}`}
                            data-slot-type="box"
                            data-slot-index={index}
                            style={{
                                borderColor: isSelected ? theme : `${theme}22`,
                                background: isSelected ? `${theme}26` : undefined
                            }}
                            onClick={() => {
                                if (onEmptySlotClick) {
                                    onEmptySlotClick(index);
                                } else {
                                    onSelectSlot(index);
                                }
                            }}
                            onDragEnter={(e) => e.preventDefault()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => onDropOnSlot(e, index)}
                            title={`Empty Slot ${index + 1} - Click to deposit a Pokémon here`}
                        >
                            <span className="pc-box-grid__empty-number text-subtext" style={{ color: `${theme}88` }}>
                                {index + 1}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
