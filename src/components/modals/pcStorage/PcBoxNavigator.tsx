import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { PcBox } from '../../../types/pcStorageTypes';
import { getPlacementModePreference, setPlacementModePreference } from '../../../utils/pc/pcPlacementInteraction';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Check, Palette, Plus, MousePointerClick, Compass } from 'lucide-react';

interface PcBoxNavigatorProps {
    boxes: PcBox[];
    activeBoxIndex: number;
    currentBox: PcBox;
    onSelectBox: (index: number) => void;
    onAddBox: () => void;
    onDeleteBox?: (index: number) => void;
    onRenameBox: (index: number, name: string) => void;
    onSetBoxTheme: (index: number, color: string) => void;
}

export const PcBoxNavigator: React.FC<PcBoxNavigatorProps> = ({
    boxes,
    activeBoxIndex,
    currentBox,
    onSelectBox,
    onAddBox,
    onDeleteBox,
    onRenameBox,
    onSetBoxTheme
}) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [placementMode, setPlacementMode] = useState<'manual' | 'auto'>(getPlacementModePreference);

    useEffect(() => {
        const handlePref = (e: Event) => {
            const ce = e as CustomEvent<'manual' | 'auto'>;
            if (ce.detail) setPlacementMode(ce.detail);
        };
        window.addEventListener('pkr-placement-pref-changed', handlePref);
        return () => window.removeEventListener('pkr-placement-pref-changed', handlePref);
    }, []);

    const togglePlacementMode = () => {
        const next = placementMode === 'manual' ? 'auto' : 'manual';
        setPlacementMode(next);
        setPlacementModePreference(next);
        if (OBR.isAvailable) {
            OBR.notification.show(
                next === 'manual' ? 'Send Out: Click on map to place' : 'Send Out: Automatically organize near trainer',
                'INFO'
            );
        }
    };

    const handleStartRename = () => {
        setRenameValue(currentBox.name);
        setIsRenaming(true);
    };

    const handleConfirmRename = () => {
        if (renameValue.trim()) {
            onRenameBox(activeBoxIndex, renameValue.trim());
        }
        setIsRenaming(false);
    };

    const canGoPrev = activeBoxIndex > 0;
    const canGoNext = activeBoxIndex < boxes.length - 1;

    return (
        <div className="pc-header__box-nav-row">
            <div className="pc-header__box-nav">
                <button
                    type="button"
                    className="pc-header__nav-arrow"
                    onClick={() => canGoPrev && onSelectBox(activeBoxIndex - 1)}
                    disabled={!canGoPrev}
                    aria-label="Previous Box"
                >
                    <ChevronLeft size={18} />
                </button>

                {isRenaming ? (
                    <div className="pc-header__rename-wrap">
                        <input
                            type="text"
                            className="pc-header__rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRename();
                                if (e.key === 'Escape') setIsRenaming(false);
                            }}
                            autoFocus
                        />
                        <button
                            type="button"
                            className="pc-header__rename-ok"
                            onClick={handleConfirmRename}
                            aria-label="Confirm Box Rename"
                        >
                            <Check size={14} />
                        </button>
                    </div>
                ) : (
                    <div className="pc-header__box-title-wrap">
                        <select
                            className="pc-header__box-select text-title-primary"
                            value={activeBoxIndex}
                            onChange={(e) => onSelectBox(Number(e.target.value))}
                        >
                            {boxes.map((b, idx) => (
                                <option key={b.id} value={idx}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="pc-header__icon-btn"
                            onClick={handleStartRename}
                            title="Rename this Box"
                        >
                            <Edit2 size={13} />
                        </button>
                        {boxes.length > 1 && onDeleteBox && (
                            <button
                                type="button"
                                className="pc-header__icon-btn pc-header__icon-btn--danger"
                                onClick={() => {
                                    if (currentBox.slots.some(Boolean)) {
                                        if (OBR.isAvailable) {
                                            OBR.notification.show(
                                                'Cannot delete box: please empty or move stored Pokémon first.',
                                                'WARNING'
                                            );
                                        } else if (typeof window !== 'undefined' && window.alert) {
                                            window.alert('Cannot delete box: please empty or move stored Pokémon first.');
                                        }
                                        return;
                                    }
                                    if (
                                        window.confirm(
                                            `Are you sure you want to delete "${currentBox.name}"? This action cannot be undone.`
                                        )
                                    ) {
                                        onDeleteBox(activeBoxIndex);
                                    }
                                }}
                                title="Delete this Box"
                                aria-label="Delete this Box"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                )}

                <button
                    type="button"
                    className="pc-header__nav-arrow"
                    onClick={() => canGoNext && onSelectBox(activeBoxIndex + 1)}
                    disabled={!canGoNext}
                    aria-label="Next Box"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="pc-header__box-extra-actions">
                {/* OBR Placement Mode Toggle */}
                {OBR.isAvailable && (
                    <button
                        type="button"
                        className={`action-button ${
                            placementMode === 'manual' ? 'action-button--theme' : 'action-button--dark'
                        } pc-header__placement-btn text-theme-header`}
                        onClick={togglePlacementMode}
                        title={
                            placementMode === 'manual'
                                ? 'Send Out: Point-and-Click on map (Click to switch to Auto-Organize)'
                                : 'Send Out: Auto-place near trainer (Click to switch to Click-to-Place)'
                        }
                    >
                        {placementMode === 'manual' ? <MousePointerClick size={14} /> : <Compass size={14} />}
                        <span className="text-theme-header">
                            {placementMode === 'manual' ? 'Click-to-Place' : 'Auto-Place'}
                        </span>
                    </button>
                )}

                {/* Direct Native Color Picker */}
                <label
                    className="pc-header__theme-picker-label"
                    title="Pick Box Color Theme"
                    style={{
                        borderColor: currentBox.themeColor ? `${currentBox.themeColor}88` : undefined,
                        background: currentBox.themeColor ? `${currentBox.themeColor}1a` : undefined
                    }}
                >
                    <Palette size={14} style={{ color: currentBox.themeColor || 'var(--primary)' }} />
                    <span className="text-label" style={{ color: 'var(--text-main, #f8fafc)' }}>
                        Theme
                    </span>
                    <input
                        type="color"
                        className="pc-header__color-picker-input"
                        value={currentBox.themeColor || '#3b82f6'}
                        onChange={(e) => onSetBoxTheme(activeBoxIndex, e.target.value)}
                    />
                </label>

                <button
                    type="button"
                    className="action-button action-button--dark pc-header__new-box-btn"
                    onClick={onAddBox}
                    title="Add a new empty Box"
                >
                    <Plus size={13} /> New Box
                </button>
            </div>
        </div>
    );
};
