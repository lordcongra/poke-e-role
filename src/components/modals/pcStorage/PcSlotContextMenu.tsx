import React, { useEffect, useRef } from 'react';
import {
    FileText,
    ArrowRightLeft,
    Zap,
    CornerDownLeft,
    Image as ImageIcon,
    Copy,
    Trash2,
    X,
    Unlink
} from 'lucide-react';

interface PcSlotContextMenuProps {
    x: number;
    y: number;
    isPartySlot: boolean;
    isOnMap: boolean;
    pokemonName: string;
    onClose: () => void;
    onOpenSheet: () => void;
    onTogglePartyBox: () => void;
    onToggleMap?: () => void;
    onRelinkArtwork?: () => void;
    onClone: () => void;
    onUnlink: () => void;
    onRelease: () => void;
}

export const PcSlotContextMenu: React.FC<PcSlotContextMenuProps> = ({
    x,
    y,
    isPartySlot,
    isOnMap,
    pokemonName,
    onClose,
    onOpenSheet,
    onTogglePartyBox,
    onToggleMap,
    onRelinkArtwork,
    onClone,
    onUnlink,
    onRelease
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Ensure menu stays within window bounds
    const adjustedX = Math.min(x, window.innerWidth - 220);
    const adjustedY = Math.min(y, window.innerHeight - 280);

    return (
        <div ref={menuRef} className="pc-context-menu" style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}>
            <div className="pc-context-menu__header">
                <span className="pc-context-menu__title text-label" title={pokemonName}>
                    {pokemonName}
                </span>
                <button type="button" className="pc-context-menu__close-btn" onClick={onClose} aria-label="Close menu">
                    <X size={14} />
                </button>
            </div>

            <div className="pc-context-menu__list">
                <button
                    type="button"
                    className="pc-context-menu__item"
                    onClick={() => {
                        onOpenSheet();
                        onClose();
                    }}
                >
                    <FileText size={15} /> Open Character Sheet
                </button>

                <button
                    type="button"
                    className="pc-context-menu__item"
                    onClick={() => {
                        onTogglePartyBox();
                        onClose();
                    }}
                >
                    <ArrowRightLeft size={15} />
                    {isPartySlot ? 'Deposit to Box' : 'Move to Party'}
                </button>

                {onToggleMap && (
                    <button
                        type="button"
                        className="pc-context-menu__item"
                        onClick={() => {
                            onToggleMap();
                            onClose();
                        }}
                    >
                        {isOnMap ? (
                            <>
                                <CornerDownLeft size={15} /> Recall into Pokéball
                            </>
                        ) : (
                            <>
                                <Zap size={15} /> Send Out to Map
                            </>
                        )}
                    </button>
                )}

                {onRelinkArtwork && (
                    <button
                        type="button"
                        className="pc-context-menu__item"
                        onClick={() => {
                            onRelinkArtwork();
                            onClose();
                        }}
                    >
                        <ImageIcon size={15} /> Relink Token Artwork
                    </button>
                )}

                <button
                    type="button"
                    className="pc-context-menu__item"
                    onClick={() => {
                        onClone();
                        onClose();
                    }}
                >
                    <Copy size={15} /> Clone Pokémon
                </button>

                <button
                    type="button"
                    className="pc-context-menu__item"
                    onClick={() => {
                        onUnlink();
                        onClose();
                    }}
                    title="Unlink Pokémon from PC / Party. If stored away, it will be placed onto the map."
                >
                    <Unlink size={15} /> Unlink from Party/PC
                </button>

                <div className="pc-context-menu__divider" />

                <button
                    type="button"
                    className="pc-context-menu__item pc-context-menu__item--danger"
                    onClick={() => {
                        onRelease();
                        onClose();
                    }}
                >
                    <Trash2 size={15} /> Release Pokémon
                </button>
            </div>
        </div>
    );
};
