import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { getPlacementModePreference, setPlacementModePreference } from '../../../utils/pc/pcPlacementInteraction';
import {
    MousePointerClick,
    Compass,
    Palette,
    CloudUpload,
    CloudDownload,
    Download,
    RefreshCw,
    HelpCircle,
    SlidersHorizontal,
    X
} from 'lucide-react';
import './PcMobileHeaderMenu.css';

interface PcMobileHeaderMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentBoxTheme?: string;
    activeBoxIndex: number;
    onSetBoxTheme: (index: number, color: string) => void;
    onUploadCloud: () => void;
    onOpenImport: () => void;
    onSyncPlayers?: () => void;
    onOpenGuide?: () => void;
    hasUnbackedChanges?: boolean;
    onOpenTrainerOrg?: () => void;
}

export const PcMobileHeaderMenu: React.FC<PcMobileHeaderMenuProps> = ({
    isOpen,
    onClose,
    currentBoxTheme,
    activeBoxIndex,
    onSetBoxTheme,
    onUploadCloud,
    onOpenImport,
    onSyncPlayers,
    onOpenGuide,
    hasUnbackedChanges = false,
    onOpenTrainerOrg
}) => {
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

    if (!isOpen) return null;

    return (
        <div className="pc-mobile-menu">
            <div className="pc-mobile-menu__header">
                <span className="pc-mobile-menu__title text-title-primary">PC Tools & Options</span>
                <button
                    type="button"
                    className="pc-mobile-menu__close-btn"
                    onClick={onClose}
                    aria-label="Close tools menu"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Quick Global Toggles: Placement Mode & Theme */}
            <div className="pc-mobile-menu__section">
                {OBR.isAvailable && (
                    <button
                        type="button"
                        className={`action-button ${
                            placementMode === 'manual' ? 'action-button--theme' : 'action-button--dark'
                        } pc-mobile-menu__placement-btn`}
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

                <label
                    className="pc-mobile-menu__theme-picker"
                    title="Pick Box Color Theme"
                    style={{
                        borderColor: currentBoxTheme ? `${currentBoxTheme}88` : undefined,
                        background: currentBoxTheme ? `${currentBoxTheme}1a` : undefined
                    }}
                >
                    <Palette size={14} style={{ color: currentBoxTheme || 'var(--primary)' }} />
                    <span className="text-label" style={{ color: 'var(--text-main, #f8fafc)' }}>
                        Theme
                    </span>
                    <input
                        type="color"
                        className="pc-header__color-picker-input"
                        value={currentBoxTheme || '#3b82f6'}
                        onChange={(e) => onSetBoxTheme(activeBoxIndex, e.target.value)}
                    />
                </label>
            </div>

            {/* Cloud & Data Operations Grid */}
            <div className="pc-mobile-menu__grid">
                <button
                    type="button"
                    className={`action-button action-button--dark pc-mobile-menu__grid-btn ${
                        hasUnbackedChanges ? 'pc-header__cloud-btn--unbacked' : ''
                    }`}
                    onClick={() => {
                        onClose();
                        onUploadCloud();
                    }}
                    title="Backup PC Storage and character sheets"
                >
                    {OBR.isAvailable ? <CloudUpload size={14} /> : <Download size={14} />}
                    <span>Backup</span>
                    {hasUnbackedChanges && <span className="pc-header__backup-badge" />}
                </button>

                <button
                    type="button"
                    className="action-button action-button--dark pc-mobile-menu__grid-btn"
                    onClick={() => {
                        onClose();
                        onOpenImport();
                    }}
                    title="Import Pokémon from backup JSON or scene asset"
                >
                    <CloudDownload size={14} />
                    <span>Import</span>
                </button>

                {onOpenTrainerOrg && (
                    <button
                        type="button"
                        className="action-button action-button--dark pc-mobile-menu__grid-btn"
                        onClick={() => {
                            onClose();
                            onOpenTrainerOrg();
                        }}
                        title="Organize Trainers"
                    >
                        <SlidersHorizontal size={14} />
                        <span>Organize</span>
                    </button>
                )}

                {onSyncPlayers && (
                    <button
                        type="button"
                        className="action-button action-button--dark pc-mobile-menu__grid-btn"
                        onClick={() => {
                            onClose();
                            onSyncPlayers();
                        }}
                        title="Sync connected players' PC to GM"
                    >
                        <RefreshCw size={13} />
                        <span>Sync</span>
                    </button>
                )}

                {onOpenGuide && (
                    <button
                        type="button"
                        className="action-button action-button--dark pc-mobile-menu__grid-btn"
                        onClick={() => {
                            onClose();
                            onOpenGuide();
                        }}
                        title="Open Pokémon PC Guide"
                    >
                        <HelpCircle size={14} />
                        <span>Guide</span>
                    </button>
                )}
            </div>
        </div>
    );
};
