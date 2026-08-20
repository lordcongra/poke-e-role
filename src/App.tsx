import { useState, useEffect } from 'react';
import { useOwlbearSync } from './hooks/useOwlbearSync';
import { useCharacterStore } from './store/useCharacterStore';
import { IdentityHeader } from './components/identity/IdentityHeader';
import { DerivedBoard } from './components/board/DerivedBoard';
import { CoreTable } from './components/tables/CoreTable';
import { SocialTable } from './components/tables/SocialTable';
import { TypeMatchups } from './components/board/TypeMatchups';
import { SkillsTable } from './components/tables/SkillsTable';
import { ActionRolls } from './components/tables/ActionRolls';
import { MovesTable } from './components/tables/MovesTable';
import { InventoryTable } from './components/tables/InventoryTable';
import { TrackerSection } from './components/board/TrackerSection';
import { TrainerBadges } from './components/board/TrainerBadges';
import { PrintSheet } from './components/print/PrintSheet';
import { DemoRollModal } from './components/modals/DemoRollModal';
import { GlobalToolbar } from './components/ui/GlobalToolbar';
import { Sidebar } from './components/standalone/Sidebar';
import { InitiativeTracker } from './components/initiative/InitiativeTracker';
import { RollLogWidget } from './components/standalone/RollLogWidget';
import { isStandaloneMode } from './utils/storageAdapter';
import './App.css';
import './style.css';

const STANDARD_TYPE_COLORS: Record<string, string> = {
    Normal: '#A8A878',
    Fire: '#F08030',
    Water: '#6890F0',
    Electric: '#F8D030',
    Grass: '#78C850',
    Ice: '#98D8D8',
    Fighting: '#C03028',
    Poison: '#A040A0',
    Ground: '#E0C068',
    Flying: '#A890F0',
    Psychic: '#F85888',
    Bug: '#A8B820',
    Rock: '#B8A038',
    Ghost: '#705898',
    Dragon: '#7038F8',
    Dark: '#705848',
    Steel: '#B8B8D0',
    Fairy: '#EE99AC',
    Stellar: '#4FB1D2'
};

const getHarmoniousAccentHex = (hex: string): string => {
    let c = hex.replace('#', '');
    if (c.length === 3)
        c = c
            .split('')
            .map((x) => x + x)
            .join('');
    if (c.length !== 6) return '#888888';

    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h = 0,
        s = 0,
        l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    h = (h + 0.12) % 1;
    s = Math.min(1, s + 0.15);

    let r1, g1, b1;
    if (s === 0) {
        r1 = g1 = b1 = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r1 = hue2rgb(p, q, h + 1 / 3);
        g1 = hue2rgb(p, q, h);
        b1 = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
        const hexStr = Math.round(x * 255).toString(16);
        return hexStr.length === 1 ? '0' + hexStr : hexStr;
    };
    return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
};

function App() {
    useOwlbearSync();

    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const role = useCharacterStore((state) => state.role);
    const mode = useCharacterStore((state) => state.identity.mode);
    const isPrinting = useCharacterStore((state) => state.identity.isPrinting);
    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);
    const activeTokenId = useCharacterStore((state) => state.tokenId);

    const type1 = useCharacterStore((state) => state.identity.type1);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes || []);

    const themePrimaryOverride = useCharacterStore((state) => state.identity.themePrimaryOverride);
    const themeSecondaryOverride = useCharacterStore((state) => state.identity.themeSecondaryOverride);

    const initLayout = useCharacterStore((state) => state.identity.initiativeTrackerLayout) || 'vertical';
    const [showStandaloneTracker, setShowStandaloneTracker] = useState(false);
    const [globalOverride, setGlobalOverride] = useState<{ p: string; s: string } | null>(null);

    useEffect(() => {
        const checkGlobalTheme = () => {
            try {
                const p = localStorage.getItem('pkr_global_theme_primary');
                const s = localStorage.getItem('pkr_global_theme_secondary');
                if (p) setGlobalOverride({ p, s: s || '' });
                else setGlobalOverride(null);
            } catch (e) {
                console.warn('[App] Failed to access local storage for global theme.', e);
            }
        };

        checkGlobalTheme();
        window.addEventListener('theme-override-updated', checkGlobalTheme);
        return () => window.removeEventListener('theme-override-updated', checkGlobalTheme);
    }, []);

    useEffect(() => {
        let finalPrimary = '';
        let finalSecondary = '';

        // Priority 1: Token-Specific Override
        if (themePrimaryOverride) {
            finalPrimary = themePrimaryOverride;
            finalSecondary = themeSecondaryOverride || getHarmoniousAccentHex(themePrimaryOverride);
        }
        // Priority 2: User's Global Browser Override
        else if (globalOverride) {
            finalPrimary = globalOverride.p;
            finalSecondary = globalOverride.s || getHarmoniousAccentHex(globalOverride.p);
        }
        // Priority 3: Default Pokémon Type Math
        else if (type1) {
            let typeColor = '';
            if (STANDARD_TYPE_COLORS[type1]) {
                typeColor = STANDARD_TYPE_COLORS[type1];
            } else {
                const customType = roomCustomTypes.find((t) => t.name === type1);
                if (customType && customType.color) typeColor = customType.color;
            }

            if (typeColor) {
                finalPrimary = typeColor;
                finalSecondary = getHarmoniousAccentHex(typeColor);
            }
        }

        // Apply final resolved theme to DOM
        if (finalPrimary) {
            document.body.style.setProperty('--dynamic-type-color', finalPrimary);
            document.documentElement.style.setProperty('--dynamic-type-color', finalPrimary);

            document.body.style.setProperty('--dynamic-secondary-color', finalSecondary);
            document.documentElement.style.setProperty('--dynamic-secondary-color', finalSecondary);
        } else {
            document.body.style.removeProperty('--dynamic-type-color');
            document.documentElement.style.removeProperty('--dynamic-type-color');

            document.body.style.removeProperty('--dynamic-secondary-color');
            document.documentElement.style.removeProperty('--dynamic-secondary-color');
        }
    }, [type1, roomCustomTypes, themePrimaryOverride, themeSecondaryOverride, globalOverride]);

    useEffect(() => {
        const handleToggle = () => setShowStandaloneTracker((prev) => !prev);
        window.addEventListener('toggle-standalone-tracker', handleToggle);
        return () => window.removeEventListener('toggle-standalone-tracker', handleToggle);
    }, []);

    const renderSheetContent = () => {
        if (isNPC && role === 'PLAYER') {
            return (
                <div id="gm-lock-screen" className="app-gm-lock">
                    <h2 className="app-gm-lock__icon">🔒</h2>
                    <h3>This sheet is hidden by the GM.</h3>
                    {!gmOnlyMatchups && (
                        <div className="app-gm-lock__content">
                            <TypeMatchups />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="sheet-container app-container" style={{ maxWidth: '100%', margin: '0' }}>
                <IdentityHeader />
                <DerivedBoard />

                <TrackerSection />
                <MovesTable />
                <ActionRolls />

                <div className="sheet-container__row">
                    <div className="sheet-container__column">
                        {mode === 'Pokémon' && <TypeMatchups />}
                        <CoreTable />
                        <SocialTable />
                        {mode === 'Trainer' && <TrainerBadges />}
                    </div>

                    <div className="sheet-container__column">
                        <SkillsTable />
                    </div>
                </div>

                <InventoryTable />
            </div>
        );
    };

    if (!isStandaloneMode) {
        return (
            <>
                <div className="sheet-container app-container">
                    <GlobalToolbar />
                    {renderSheetContent()}
                </div>

                <DemoRollModal />
                {isPrinting && <PrintSheet />}
            </>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />

            <div className="app-main-content">
                <GlobalToolbar />

                {!activeTokenId ? (
                    <div className="standalone-empty-state">
                        <p>👈 Select or create a file in the directory to begin</p>
                    </div>
                ) : (
                    <div className="standalone-layout-wrapper">
                        <div className="standalone-main-col">
                            {showStandaloneTracker && initLayout === 'horizontal' && (
                                <div className="standalone-layout-tracker--horizontal">
                                    <InitiativeTracker isStandaloneWidget={true} />
                                </div>
                            )}

                            <div className="standalone-layout-sheet">{renderSheetContent()}</div>
                        </div>

                        <div className="standalone-right-sidebar">
                            {showStandaloneTracker && initLayout === 'vertical' && (
                                <div className="standalone-tracker-dock">
                                    <InitiativeTracker isStandaloneWidget={true} />
                                </div>
                            )}

                            <RollLogWidget isDocked={true} />
                        </div>
                    </div>
                )}

                <DemoRollModal />
                {isPrinting && <PrintSheet />}
            </div>
        </div>
    );
}

export default App;
