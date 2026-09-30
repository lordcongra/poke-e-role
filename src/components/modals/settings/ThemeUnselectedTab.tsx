interface ThemeUnselectedTabProps {
    enableCustomUnselected: boolean;
    setEnableCustomUnselected: (val: boolean) => void;
    unselectedPrimaryHex: string;
    setUnselectedPrimaryHex: (val: string) => void;
    unselectedSecondaryHex: string;
    setUnselectedSecondaryHex: (val: string) => void;
    applyGlobally: boolean;
    setApplyGlobally: (val: boolean) => void;
    showGlobalToggle: boolean;
}

export function ThemeUnselectedTab({
    enableCustomUnselected,
    setEnableCustomUnselected,
    unselectedPrimaryHex,
    setUnselectedPrimaryHex,
    unselectedSecondaryHex,
    setUnselectedSecondaryHex,
    applyGlobally,
    setApplyGlobally,
    showGlobalToggle
}: ThemeUnselectedTabProps) {
    return (
        <div>
            <label className="theme-modal__checkbox-container" style={{ marginBottom: '15px' }}>
                <input
                    type="checkbox"
                    className="theme-modal__checkbox"
                    checked={enableCustomUnselected}
                    onChange={(e) => setEnableCustomUnselected(e.target.checked)}
                />
                <div className="text-subtext" style={{ color: 'var(--text-main)' }}>
                    <span className="theme-modal__checkbox-title text-title-primary">Custom Base Overview Theme</span>
                    Set the theme colors when no Pokémon is selected. (Pokémon sheets still use their own type colors).
                </div>
            </label>

            <div
                style={{
                    opacity: enableCustomUnselected ? 1 : 0.4,
                    pointerEvents: enableCustomUnselected ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease'
                }}
            >
                <div className="theme-modal__row">
                    <span className="theme-modal__label text-label">Primary Color</span>
                    <div className="theme-modal__input-group">
                        <input
                            type="color"
                            className="theme-modal__color-picker"
                            value={unselectedPrimaryHex}
                            onChange={(e) => setUnselectedPrimaryHex(e.target.value)}
                        />
                        <input
                            type="text"
                            className="theme-modal__hex-input text-label"
                            style={{ color: 'var(--text-main)' }}
                            value={unselectedPrimaryHex}
                            placeholder="#HEX"
                            onChange={(e) => setUnselectedPrimaryHex(e.target.value)}
                        />
                    </div>
                </div>

                <div className="theme-modal__row">
                    <span className="theme-modal__label text-label">Secondary Color</span>
                    <div className="theme-modal__input-group">
                        <input
                            type="color"
                            className="theme-modal__color-picker"
                            value={unselectedSecondaryHex || '#000000'}
                            onChange={(e) => setUnselectedSecondaryHex(e.target.value)}
                        />
                        <input
                            type="text"
                            className="theme-modal__hex-input text-label"
                            style={{ color: 'var(--text-main)' }}
                            value={unselectedSecondaryHex}
                            placeholder="Auto"
                            onChange={(e) => setUnselectedSecondaryHex(e.target.value)}
                        />
                    </div>
                </div>

                {showGlobalToggle && (
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
                            <span className="theme-modal__checkbox-title text-label">Override All Sheets Globally</span>
                            Force these colors across all Pokémon sheets, ignoring their typing colors.
                        </div>
                    </label>
                )}
            </div>
        </div>
    );
}
