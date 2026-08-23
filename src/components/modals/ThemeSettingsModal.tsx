import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Palette, Trash2, Save, XCircle, X, SlidersHorizontal } from 'lucide-react';
import './ThemeSettingsModal.css';

interface ThemeSettingsModalProps {
    onClose: () => void;
}

const STANDARD_TYPES = [
    'Normal',
    'Fire',
    'Water',
    'Electric',
    'Grass',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Dark',
    'Steel',
    'Fairy',
    'Stellar'
];

export function ThemeSettingsModal({ onClose }: ThemeSettingsModalProps) {
    const activeTokenId = useCharacterStore((state) => state.tokenId);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes) || [];

    const initialPrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const initialSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);

    // Color Overrides
    const [enableCustomColors, setEnableCustomColors] = useState(!!initialPrimaryOverride);
    const [primaryHex, setPrimaryHex] = useState(initialPrimaryOverride || '#b92518');
    const [secondaryHex, setSecondaryHex] = useState(initialSecondaryOverride || '');
    const [applyGlobally, setApplyGlobally] = useState(false);

    // Contrast Settings
    const [intensity, setIntensity] = useState(20); // 20%
    const [forceAll, setForceAll] = useState(false);
    const [specificTypes, setSpecificTypes] = useState<string[]>([]);

    const allAvailableTypes = [...STANDARD_TYPES, ...roomCustomTypes.map((t) => t.name)].sort();

    useEffect(() => {
        try {
            // Load Global Color Overrides
            const globalP = localStorage.getItem('pkr_global_theme_primary');
            const globalS = localStorage.getItem('pkr_global_theme_secondary');
            if (globalP) {
                setPrimaryHex(globalP);
                setSecondaryHex(globalS || '');
                setApplyGlobally(true);
                setEnableCustomColors(true);
            }

            // Load Contrast Settings
            const savedInt = localStorage.getItem('pkr_contrast_intensity');
            if (savedInt) setIntensity(parseFloat(savedInt) * 100);

            const savedForce = localStorage.getItem('pkr_contrast_force');
            if (savedForce) setForceAll(savedForce === 'true');

            const savedTypes = localStorage.getItem('pkr_contrast_types');
            if (savedTypes) setSpecificTypes(JSON.parse(savedTypes));
        } catch (e) {
            console.warn('[ThemeSettingsModal] Could not read preferences from storage.', e);
        }
    }, []);

    const handleAddType = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val && !specificTypes.includes(val)) {
            setSpecificTypes([...specificTypes, val]);
        }
        e.target.value = '';
    };

    const handleRemoveType = (typeToRemove: string) => {
        setSpecificTypes(specificTypes.filter((t) => t !== typeToRemove));
    };

    const handleSave = () => {
        // Save Color Overrides ONLY if enabled, otherwise clear them
        if (enableCustomColors) {
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
                } catch (e) {}
            }
        } else {
            // User disabled custom colors, ensure we wipe any existing overrides
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

        // Save Contrast Settings safely
        try {
            localStorage.setItem('pkr_contrast_intensity', (intensity / 100).toString());
            localStorage.setItem('pkr_contrast_force', forceAll.toString());
            localStorage.setItem('pkr_contrast_types', JSON.stringify(specificTypes));
            window.dispatchEvent(new Event('contrast-settings-updated'));
        } catch (e) {
            console.error('[ThemeSettingsModal] Failed to save contrast settings.', e);
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

            // Reset Contrast settings to default smart-mode
            localStorage.removeItem('pkr_contrast_intensity');
            localStorage.removeItem('pkr_contrast_force');
            localStorage.removeItem('pkr_contrast_types');

            window.dispatchEvent(new Event('theme-override-updated'));
            window.dispatchEvent(new Event('contrast-settings-updated'));
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

                {/* Gray out the color inputs if the user hasn't toggled them on */}
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

                <div className="theme-modal__divider" />

                <h3 className="theme-modal__title modal-title-with-icon text-title-primary">
                    <SlidersHorizontal size={20} /> Contrast Adjustments
                </h3>
                <p className="theme-modal__desc text-subtext">
                    Control how aggressively bright colors are darkened when the Toolbar's "Contrast" toggle is enabled.
                </p>

                <div className="theme-modal__slider-group">
                    <div className="theme-modal__slider-header">
                        <span className="text-label">Darken Intensity:</span>
                        <span className="text-value-highlight">{intensity}%</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="80"
                        step="5"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="theme-modal__slider"
                    />
                </div>

                <label className="theme-modal__checkbox-container theme-modal__checkbox-container--alt">
                    <input
                        type="checkbox"
                        className="theme-modal__checkbox"
                        checked={forceAll}
                        onChange={(e) => setForceAll(e.target.checked)}
                    />
                    <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                        <span className="theme-modal__checkbox-title text-label">Force Darken All Types</span>
                        Bypasses the "smart" luminance check and applies the darken intensity to every single type.
                    </div>
                </label>

                <div className="theme-modal__row" style={{ marginTop: '10px' }}>
                    <select
                        className="form-select--transparent text-label"
                        onChange={handleAddType}
                        defaultValue=""
                        disabled={forceAll}
                        style={{ width: '100%', opacity: forceAll ? 0.5 : 1 }}
                    >
                        <option value="" disabled>
                            Force specific type to darken...
                        </option>
                        {allAvailableTypes.map((t) => (
                            <option key={t} value={t} disabled={specificTypes.includes(t)}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                {specificTypes.length > 0 && !forceAll && (
                    <div className="theme-modal__pill-container">
                        {specificTypes.map((type) => (
                            <div key={type} className="theme-modal__pill text-subtext">
                                {type}
                                <button type="button" onClick={() => handleRemoveType(type)}>
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

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
                        title="Resets all colors and contrast adjustments to their defaults"
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
