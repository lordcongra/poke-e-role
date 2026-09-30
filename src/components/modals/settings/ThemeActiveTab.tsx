interface ThemeActiveTabProps {
    enableCustomColors: boolean;
    setEnableCustomColors: (val: boolean) => void;
    primaryHex: string;
    setPrimaryHex: (val: string) => void;
    secondaryHex: string;
    setSecondaryHex: (val: string) => void;
    applyGlobally: boolean;
    setApplyGlobally: (val: boolean) => void;
}

export function ThemeActiveTab({
    enableCustomColors,
    setEnableCustomColors,
    primaryHex,
    setPrimaryHex,
    secondaryHex,
    setSecondaryHex,
    applyGlobally,
    setApplyGlobally
}: ThemeActiveTabProps) {
    return (
        <div>
            <label className="theme-modal__checkbox-container" style={{ marginBottom: '15px' }}>
                <input
                    type="checkbox"
                    className="theme-modal__checkbox"
                    checked={enableCustomColors}
                    onChange={(e) => setEnableCustomColors(e.target.checked)}
                />
                <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                    <span className="theme-modal__checkbox-title text-title-primary">Override Pokémon Type Color</span>
                    Manually override this Pokémon&apos;s dynamic typing theme with custom hex codes.
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
        </div>
    );
}
