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

    const [primaryHex, setPrimaryHex] = useState(initialPrimaryOverride || '#b92518');
    const [secondaryHex, setSecondaryHex] = useState(initialSecondaryOverride || '');
    const [applyGlobally, setApplyGlobally] = useState(false);

    useEffect(() => {
        try {
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            const globalS = localStorage.getItem('pkr_global_theme_secondary');
            if (globalP) {
                setPrimaryHex(globalP);
                setSecondaryHex(globalS || '');
                setApplyGlobally(true);
            }
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read global theme state.', e);
        }
    }, []);

    const handleSave = () => {
        if (applyGlobally) {
            try {
                localStorage.setItem('pkr_global_theme_primary', primaryHex);
                localStorage.setItem('pkr_global_theme_secondary', secondaryHex);
                window.dispatchEvent(new Event('theme-override-updated'));
            } catch (e) {
                console.error('[ThemeSettingsModal] Failed to save global theme.', e);
            }
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
            } catch (e) {
                console.error('[ThemeSettingsModal] Failed to remove global theme.', e);
            }
        }
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
            window.dispatchEvent(new Event('theme-override-updated'));
        } catch (e) {
            console.error('[ThemeSettingsModal] Failed to clear global theme.', e);
        }
        onClose();
    };

    return (
        <div className="theme-modal__overlay">
            <div className="theme-modal__content">
                <h3 className="theme-modal__title modal-title-with-icon text-title-primary">
                    <Palette size={20} /> Custom Theme Colors
                </h3>
                <p className="theme-modal__desc text-subtext">
                    Override the dynamic typing colors with your own custom Hex codes. Leave the Secondary Color blank
                    to auto-generate a matching accent!
                </p>

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

                <label className="theme-modal__checkbox-container">
                    <input
                        type="checkbox"
                        className="theme-modal__checkbox"
                        checked={applyGlobally}
                        onChange={(e) => setApplyGlobally(e.target.checked)}
                    />
                    <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                        <span className="theme-modal__checkbox-title text-title-primary">
                            Apply as Default (Global)
                        </span>
                        Applies these colors to ALL sheets on your screen. Uncheck to apply to this specific character
                        only.
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
                        <Trash2 size={16} /> Clear
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
