import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Palette, Trash2, Save, XCircle } from 'lucide-react';
import './ThemeSettingsModal.css';

interface ThemeSettingsModalProps {
    onClose: () => void;
}

export function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const initialPrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const initialSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);

    const [enableCustomColors, setEnableCustomColors] = useState(!!initialPrimaryOverride);
    const [primaryHex, setPrimaryHex] = useState(initialPrimaryOverride || '#b92518');
    const [secondaryHex, setSecondaryHex] = useState(initialSecondaryOverride || '');
    const [applyGlobally, setApplyGlobally] = useState(false);
    const [syncPopoverTheme, setSyncPopoverTheme] = useState(false);

    useEffect(() => {
        try {
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            const globalS = localStorage.getItem('pkr_global_theme_secondary');
            if (globalP) {
                setPrimaryHex(globalP);
                setSecondaryHex(globalS || '');
                setApplyGlobally(true);
                setEnableCustomColors(true);
            }
            const syncPopovers = localStorage.getItem('pkr_sync_popover_theme') === 'true';
            setSyncPopoverTheme(syncPopovers);
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
        }
    }, []);

    const handleSave = () => {
        try {
            localStorage.setItem('pkr_sync_popover_theme', String(syncPopoverTheme));
        } catch (e) {}

        if (enableCustomColors) {
            if (applyGlobally) {
                try {
                    localStorage.setItem('pkr_global_theme_primary', primaryHex);
                    localStorage.setItem('pkr_global_theme_secondary', secondaryHex);
                    window.dispatchEvent(new Event('theme-override-updated'));
                } catch (e) {}
                if (activeTokenId) {
                    setIdentity('themePrimaryOverride', '');
                    setIdentity('themeSecondaryOverride', '');
                }
            } else {
                if (activeTokenId) {
                    setIdentity('themePrimaryOverride', primaryHex);
                    setIdentity('themeSecondaryOverride', secondaryHex);
                }
                try {
                    localStorage.removeItem('pkr_global_theme_primary');
                    localStorage.removeItem('pkr_global_theme_secondary');
                    window.dispatchEvent(new Event('theme-override-updated'));
                } catch (e) {}
            }
        } else {
            if (activeTokenId) {
                setIdentity('themePrimaryOverride', '');
                setIdentity('themeSecondaryOverride', '');
            }
            try {
                localStorage.removeItem('pkr_global_theme_primary');
                localStorage.removeItem('pkr_global_theme_secondary');
                window.dispatchEvent(new Event('theme-override-updated'));
            } catch (e) {}
        }
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
            localStorage.removeItem('pkr_sync_popover_theme');
            setSyncPopoverTheme(false);
            window.dispatchEvent(new Event('theme-override-updated'));
        } catch (e) {}
        onClose();
    };

    return (
        <div className="theme-modal__overlay">
            <div className="theme-modal__content">
                <h3 className="theme-modal__title modal-title-with-icon text-title-primary">
                    <Palette size={20} /> Color Overrides
                </h3>

                <label className="theme-modal__checkbox-container" style={{ marginBottom: '15px' }}>
                    <input
                        type="checkbox"
                        className="theme-modal__checkbox"
                        checked={enableCustomColors}
                        onChange={(e) => setEnableCustomColors(e.target.checked)}
                    />
                    <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                        <span className="theme-modal__checkbox-title text-title-primary">Enable Custom Colors</span>
                        Turn this on to manually override the dynamic Pokémon typing theme with your own hex codes.
                    </div>
                </label>

                <div
                    style={{
                        opacity: enableCustomColors ? 1 : 0.4,
                        pointerEvents: enableCustomColors ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                    }}
                >
                    <div className="theme-modal__row">
                        <span className="theme-modal__label text-label">Primary Color</span>
                        <div className="theme-modal__input-group">
                            <input
                                type="color"
                                className="theme-modal__color-picker"
                                value={primaryHex}
                                onChange={(e) => setPrimaryHex(e.target.value)}
                            />
                            <input
                                type="text"
                                className="theme-modal__hex-input text-label"
                                style={{ color: 'var(--text-main)' }}
                                value={primaryHex}
                                placeholder="#HEX"
                                onChange={(e) => setPrimaryHex(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="theme-modal__row">
                        <span className="theme-modal__label text-label">Secondary Color</span>
                        <div className="theme-modal__input-group">
                            <input
                                type="color"
                                className="theme-modal__color-picker"
                                value={secondaryHex || '#000000'}
                                onChange={(e) => setSecondaryHex(e.target.value)}
                            />
                            <input
                                type="text"
                                className="theme-modal__hex-input text-label"
                                style={{ color: 'var(--text-main)' }}
                                value={secondaryHex}
                                placeholder="Auto"
                                onChange={(e) => setSecondaryHex(e.target.value)}
                            />
                        </div>
                    </div>

                    <label
                        className="theme-modal__checkbox-container theme-modal__checkbox-container--alt"
                        style={{ marginTop: '0', marginBottom: '15px' }}
                    >
                        <input
                            type="checkbox"
                            className="theme-modal__checkbox"
                            checked={applyGlobally}
                            onChange={(e) => setApplyGlobally(e.target.checked)}
                        />
                        <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                            <span className="theme-modal__checkbox-title text-label">Apply as Default (Global)</span>
                            Applies these colors to ALL sheets. Uncheck to apply to this specific character only.
                        </div>
                    </label>
                </div>

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
                        Allows the Roll Log and Initiative Tracker popovers on Owlbear Rodeo to match the theme color of the active character sheet.
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
