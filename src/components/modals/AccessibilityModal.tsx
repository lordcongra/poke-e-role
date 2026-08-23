import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Eye, Type, Save, Trash2, XCircle, X } from 'lucide-react';
import './AccessibilityModal.css';

interface AccessibilityModalProps {
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

export function AccessibilityModal({ onClose }: AccessibilityModalProps) {
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes) || [];
    const allAvailableTypes = [...STANDARD_TYPES, ...roomCustomTypes.map((t) => t.name)].sort();

    // Master Toggle
    const [isHighContrast, setIsHighContrast] = useState<boolean>(true);

    // Contrast Specifics
    const [primaryIntensity, setPrimaryIntensity] = useState(20);
    const [secondaryIntensity, setSecondaryIntensity] = useState(20);
    const [forceAll, setForceAll] = useState(false);
    const [specificTypes, setSpecificTypes] = useState<string[]>([]);

    // Typography
    const [fontScale, setFontScale] = useState(100);
    const [dyslexiaFont, setDyslexiaFont] = useState(false);

    useEffect(() => {
        try {
            const contrastEnabled = localStorage.getItem('pkr_high_contrast');
            setIsHighContrast(contrastEnabled === null ? true : contrastEnabled === 'true');

            const savedP = localStorage.getItem('pkr_contrast_primary');
            if (savedP) setPrimaryIntensity(parseFloat(savedP) * 100);

            const savedS = localStorage.getItem('pkr_contrast_secondary');
            if (savedS) setSecondaryIntensity(parseFloat(savedS) * 100);

            const savedForce = localStorage.getItem('pkr_contrast_force');
            if (savedForce) setForceAll(savedForce === 'true');

            const savedTypes = localStorage.getItem('pkr_contrast_types');
            if (savedTypes) setSpecificTypes(JSON.parse(savedTypes));

            const savedScale = localStorage.getItem('pkr_font_scale');
            if (savedScale) setFontScale(parseInt(savedScale));

            const savedDys = localStorage.getItem('pkr_dyslexia');
            if (savedDys) setDyslexiaFont(savedDys === 'true');
        } catch (e) {
            console.warn('[AccessibilityModal] Could not read preferences from storage.', e);
        }
    }, []);

    const handleAddType = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val && !specificTypes.includes(val)) {
            setSpecificTypes([...specificTypes, val]);
        }
        e.target.value = '';
    };

    const handleSave = () => {
        try {
            localStorage.setItem('pkr_high_contrast', String(isHighContrast));
            if (isHighContrast) {
                document.body.setAttribute('data-high-contrast', 'true');
            } else {
                document.body.removeAttribute('data-high-contrast');
            }

            localStorage.setItem('pkr_contrast_primary', (primaryIntensity / 100).toString());
            localStorage.setItem('pkr_contrast_secondary', (secondaryIntensity / 100).toString());
            localStorage.setItem('pkr_contrast_force', String(forceAll));
            localStorage.setItem('pkr_contrast_types', JSON.stringify(specificTypes));

            localStorage.setItem('pkr_font_scale', String(fontScale));
            localStorage.setItem('pkr_dyslexia', String(dyslexiaFont));

            window.dispatchEvent(new Event('accessibility-settings-updated'));
        } catch (e) {
            console.error('[AccessibilityModal] Failed to save accessibility settings.', e);
        }
        onClose();
    };

    const handleReset = () => {
        try {
            localStorage.removeItem('pkr_high_contrast');
            localStorage.removeItem('pkr_contrast_primary');
            localStorage.removeItem('pkr_contrast_secondary');
            localStorage.removeItem('pkr_contrast_force');
            localStorage.removeItem('pkr_contrast_types');
            localStorage.removeItem('pkr_font_scale');
            localStorage.removeItem('pkr_dyslexia');

            document.body.setAttribute('data-high-contrast', 'true');
            window.dispatchEvent(new Event('accessibility-settings-updated'));
        } catch (e) {}
        onClose();
    };

    return (
        <div className="access-modal__overlay">
            <div className="access-modal__content">
                <h3 className="access-modal__title modal-title-with-icon text-title-primary">
                    <Eye size={20} /> Contrast & Vision
                </h3>

                <label className="access-modal__checkbox-container">
                    <input
                        type="checkbox"
                        className="access-modal__checkbox"
                        checked={isHighContrast}
                        onChange={(e) => setIsHighContrast(e.target.checked)}
                    />
                    <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                        <span className="access-modal__checkbox-title text-title-primary">Enable Dynamic Contrast</span>
                        Automatically dims extremely bright theme colors to ensure text remains readable.
                    </div>
                </label>

                <div
                    style={{
                        opacity: isHighContrast ? 1 : 0.4,
                        pointerEvents: isHighContrast ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease'
                    }}
                >
                    <div className="access-modal__slider-group">
                        <div className="access-modal__slider-header">
                            <span className="text-label">Primary Color Intensity:</span>
                            <span className="text-value-highlight">{primaryIntensity}%</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="80"
                            step="5"
                            value={primaryIntensity}
                            onChange={(e) => setPrimaryIntensity(Number(e.target.value))}
                            className="access-modal__slider"
                        />
                    </div>

                    <div className="access-modal__slider-group">
                        <div className="access-modal__slider-header">
                            <span className="text-label">Secondary Color Intensity:</span>
                            <span className="text-value-highlight">{secondaryIntensity}%</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="80"
                            step="5"
                            value={secondaryIntensity}
                            onChange={(e) => setSecondaryIntensity(Number(e.target.value))}
                            className="access-modal__slider"
                        />
                    </div>

                    <label className="access-modal__checkbox-container access-modal__checkbox-container--alt">
                        <input
                            type="checkbox"
                            className="access-modal__checkbox"
                            checked={forceAll}
                            onChange={(e) => setForceAll(e.target.checked)}
                        />
                        <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                            <span className="access-modal__checkbox-title text-label">Force Darken All Types</span>
                            Bypasses smart luminance and aggressively darkens every type.
                        </div>
                    </label>

                    <div className="access-modal__row" style={{ marginTop: '10px' }}>
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
                        <div className="access-modal__pill-container">
                            {specificTypes.map((type) => (
                                <div key={type} className="access-modal__pill text-subtext">
                                    {type}
                                    <button
                                        type="button"
                                        onClick={() => setSpecificTypes(specificTypes.filter((t) => t !== type))}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="access-modal__divider" />

                <h3 className="access-modal__title modal-title-with-icon text-title-primary">
                    <Type size={20} /> Typography
                </h3>

                <div className="access-modal__row">
                    <span className="access-modal__label text-label">Global Text Scale</span>
                    <select
                        className="form-select--transparent text-label"
                        style={{ padding: '4px' }}
                        value={fontScale}
                        onChange={(e) => setFontScale(Number(e.target.value))}
                    >
                        <option value={90}>Small (90%)</option>
                        <option value={100}>Default (100%)</option>
                        <option value={110}>Large (110%)</option>
                        <option value={125}>Extra Large (125%)</option>
                    </select>
                </div>

                <label
                    className="access-modal__checkbox-container access-modal__checkbox-container--alt"
                    style={{ marginTop: '10px' }}
                >
                    <input
                        type="checkbox"
                        className="access-modal__checkbox"
                        checked={dyslexiaFont}
                        onChange={(e) => setDyslexiaFont(e.target.checked)}
                    />
                    <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                        <span className="access-modal__checkbox-title text-label">Dyslexia Friendly Font</span>
                        Overrides structural fonts with Lexend or Comic Sans to improve readability.
                    </div>
                </label>

                <div className="access-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark access-modal__btn text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red access-modal__btn text-theme-header"
                        onClick={handleReset}
                    >
                        <Trash2 size={16} /> Reset All
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--theme access-modal__btn text-theme-header"
                        onClick={handleSave}
                    >
                        <Save size={16} /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}
