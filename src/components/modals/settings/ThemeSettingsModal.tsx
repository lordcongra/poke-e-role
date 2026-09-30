import { useState } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { Palette, Trash2, Save, XCircle, Database } from 'lucide-react';
import { ThemeActiveTab } from './ThemeActiveTab';
import { ThemeUnselectedTab } from './ThemeUnselectedTab';
import {
    backupAllSettingsToIndexedDB,
    removeSettingFromIndexedDB,
    scheduleSettingsBackup
} from '../../../utils/sync/userPreferences';
import './ThemeSettingsModal.css';

interface ThemeSettingsModalProps {
    onClose: () => void;
}

export function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const initialPrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const initialSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);

    const [activeTab, setActiveTab] = useState<'active' | 'unselected'>(activeTokenId ? 'active' : 'unselected');

    // 1. Active Character Custom Colors
    const [enableCustomColors, setEnableCustomColors] = useState(() => {
        try {
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            return !!(globalP || initialPrimaryOverride);
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return !!initialPrimaryOverride;
        }
    });
    const [primaryHex, setPrimaryHex] = useState(() => {
        try {
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            return globalP || initialPrimaryOverride || '#b92518';
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return initialPrimaryOverride || '#b92518';
        }
    });
    const [secondaryHex, setSecondaryHex] = useState(() => {
        try {
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            if (globalP) {
                return localStorage.getItem('pkr_global_theme_secondary') || '';
            }
            return initialSecondaryOverride || '';
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return initialSecondaryOverride || '';
        }
    });
    const [applyGlobally, setApplyGlobally] = useState(() => {
        try {
            return !!localStorage.getItem('pkr_global_theme_primary');
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return false;
        }
    });

    // 2. Default Unselected Theme (Base / Welcome Screen)
    const [enableCustomUnselected, setEnableCustomUnselected] = useState(() => {
        try {
            return !!localStorage.getItem('pkr_unselected_theme_primary');
        } catch {
            return false;
        }
    });
    const [unselectedPrimaryHex, setUnselectedPrimaryHex] = useState(() => {
        try {
            return localStorage.getItem('pkr_unselected_theme_primary') || '#b92518';
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return '#b92518';
        }
    });
    const [unselectedSecondaryHex, setUnselectedSecondaryHex] = useState(() => {
        try {
            return localStorage.getItem('pkr_unselected_theme_secondary') || '';
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return '';
        }
    });

    // 3. Match Popovers
    const [syncPopoverTheme, setSyncPopoverTheme] = useState(() => {
        try {
            return localStorage.getItem('pkr_sync_popover_theme') === 'true';
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
            return false;
        }
    });

    const handleSave = () => {
        try {
            localStorage.setItem('pkr_sync_popover_theme', String(syncPopoverTheme));
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not save sync popover theme setting:', e);
        }

        // Save Unselected Theme
        try {
            if (enableCustomUnselected) {
                localStorage.setItem('pkr_unselected_theme_primary', unselectedPrimaryHex);
                localStorage.setItem('pkr_unselected_theme_secondary', unselectedSecondaryHex);
            } else {
                localStorage.removeItem('pkr_unselected_theme_primary');
                localStorage.removeItem('pkr_unselected_theme_secondary');
                removeSettingFromIndexedDB('pkr_unselected_theme_primary');
                removeSettingFromIndexedDB('pkr_unselected_theme_secondary');
            }
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not save unselected theme colors:', e);
        }

        // Save Active Character or Global Override
        if (activeTokenId) {
            if (enableCustomColors) {
                if (applyGlobally) {
                    try {
                        localStorage.setItem('pkr_global_theme_primary', primaryHex);
                        localStorage.setItem('pkr_global_theme_secondary', secondaryHex);
                    } catch (e) {
                        console.warn('[ThemeSettingsModal] Could not save global theme colors:', e);
                    }
                    setIdentity('themePrimaryOverride', '');
                    setIdentity('themeSecondaryOverride', '');
                } else {
                    setIdentity('themePrimaryOverride', primaryHex);
                    setIdentity('themeSecondaryOverride', secondaryHex);
                    try {
                        localStorage.removeItem('pkr_global_theme_primary');
                        localStorage.removeItem('pkr_global_theme_secondary');
                        removeSettingFromIndexedDB('pkr_global_theme_primary');
                        removeSettingFromIndexedDB('pkr_global_theme_secondary');
                    } catch (e) {
                        console.warn('[ThemeSettingsModal] Could not clear global theme overrides:', e);
                    }
                }
            } else {
                setIdentity('themePrimaryOverride', '');
                setIdentity('themeSecondaryOverride', '');
                try {
                    localStorage.removeItem('pkr_global_theme_primary');
                    localStorage.removeItem('pkr_global_theme_secondary');
                    removeSettingFromIndexedDB('pkr_global_theme_primary');
                    removeSettingFromIndexedDB('pkr_global_theme_secondary');
                } catch (e) {
                    console.warn('[ThemeSettingsModal] Could not clear theme colors:', e);
                }
            }
        } else {
            if (applyGlobally && enableCustomUnselected) {
                try {
                    localStorage.setItem('pkr_global_theme_primary', unselectedPrimaryHex);
                    localStorage.setItem('pkr_global_theme_secondary', unselectedSecondaryHex);
                } catch (e) {
                    console.warn('[ThemeSettingsModal] Could not save global theme colors:', e);
                }
            } else if (!applyGlobally) {
                try {
                    localStorage.removeItem('pkr_global_theme_primary');
                    localStorage.removeItem('pkr_global_theme_secondary');
                    removeSettingFromIndexedDB('pkr_global_theme_primary');
                    removeSettingFromIndexedDB('pkr_global_theme_secondary');
                } catch (e) {
                    console.warn('[ThemeSettingsModal] Could not clear global theme overrides:', e);
                }
            }
        }

        // Auto-mirror all current settings to IndexedDB
        backupAllSettingsToIndexedDB().catch(() => {});

        window.dispatchEvent(new Event('theme-override-updated'));
        onClose();
    };

    const handleClear = () => {
        if (activeTokenId) {
            setIdentity('themePrimaryOverride', '');
            setIdentity('themeSecondaryOverride', '');
        }
        try {
            localStorage.removeItem('pkr_global_theme_primary');
            localStorage.removeItem('pkr_global_theme_secondary');
            localStorage.removeItem('pkr_unselected_theme_primary');
            localStorage.removeItem('pkr_unselected_theme_secondary');
            localStorage.removeItem('pkr_sync_popover_theme');

            removeSettingFromIndexedDB('pkr_global_theme_primary');
            removeSettingFromIndexedDB('pkr_global_theme_secondary');
            removeSettingFromIndexedDB('pkr_unselected_theme_primary');
            removeSettingFromIndexedDB('pkr_unselected_theme_secondary');
            removeSettingFromIndexedDB('pkr_sync_popover_theme');

            setSyncPopoverTheme(false);
            setEnableCustomColors(false);
            setEnableCustomUnselected(false);
            setApplyGlobally(false);

            scheduleSettingsBackup(100);
            window.dispatchEvent(new Event('theme-override-updated'));
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not clear theme preferences:', e);
        }
        onClose();
    };

    return (
        <div className="theme-modal__overlay">
            <div className="theme-modal__content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 className="theme-modal__title modal-title-with-icon text-title-primary" style={{ margin: 0 }}>
                        <Palette size={20} /> Color Overrides
                    </h3>
                    <span
                        className="text-subtext"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)'
                        }}
                        title="Theme presets and preferences automatically back up to IndexedDB to survive browser cache purges"
                    >
                        <Database size={12} style={{ color: 'var(--primary)' }} /> IndexedDB Backup Active
                    </span>
                </div>

                {activeTokenId && (
                    <div className="theme-modal__tabs">
                        <button
                            type="button"
                            className={`theme-modal__tab-btn ${activeTab === 'active' ? 'theme-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('active')}
                        >
                            Active Pokémon
                        </button>
                        <button
                            type="button"
                            className={`theme-modal__tab-btn ${activeTab === 'unselected' ? 'theme-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('unselected')}
                        >
                            Base Overview
                        </button>
                    </div>
                )}

                {/* TAB: ACTIVE CHARACTER */}
                {activeTokenId && activeTab === 'active' && (
                    <ThemeActiveTab
                        enableCustomColors={enableCustomColors}
                        setEnableCustomColors={setEnableCustomColors}
                        primaryHex={primaryHex}
                        setPrimaryHex={setPrimaryHex}
                        secondaryHex={secondaryHex}
                        setSecondaryHex={setSecondaryHex}
                        applyGlobally={applyGlobally}
                        setApplyGlobally={setApplyGlobally}
                    />
                )}

                {/* TAB: UNSELECTED / BASE OVERVIEW */}
                {(!activeTokenId || activeTab === 'unselected') && (
                    <ThemeUnselectedTab
                        enableCustomUnselected={enableCustomUnselected}
                        setEnableCustomUnselected={setEnableCustomUnselected}
                        unselectedPrimaryHex={unselectedPrimaryHex}
                        setUnselectedPrimaryHex={setUnselectedPrimaryHex}
                        unselectedSecondaryHex={unselectedSecondaryHex}
                        setUnselectedSecondaryHex={setUnselectedSecondaryHex}
                        applyGlobally={applyGlobally}
                        setApplyGlobally={setApplyGlobally}
                        showGlobalToggle={!activeTokenId}
                    />
                )}

                <label
                    className="theme-modal__checkbox-container theme-modal__checkbox-container--alt"
                    style={{ marginTop: '5px', marginBottom: '15px' }}
                >
                    <input
                        type="checkbox"
                        className="theme-modal__checkbox"
                        checked={syncPopoverTheme}
                        onChange={(e) => setSyncPopoverTheme(e.target.checked)}
                    />
                    <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                        <span className="theme-modal__checkbox-title text-label">Match Popovers to Sheet Theme</span>
                        Allows the Roll Log and Initiative Tracker popovers on Owlbear Rodeo to match the theme color of
                        the active character sheet.
                    </div>
                </label>

                <div className="theme-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark theme-modal__btn text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red theme-modal__btn text-theme-header"
                        onClick={handleClear}
                    >
                        <Trash2 size={16} /> Reset All
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--theme theme-modal__btn text-theme-header"
                        onClick={handleSave}
                    >
                        <Save size={16} /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}
