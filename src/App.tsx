import { useState, useEffect } from 'react';
import { useOwlbearSync } from './hooks/useOwlbearSync';
import { useDynamicThemeSync } from './hooks/useDynamicThemeSync';
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
import { DemoRollModal } from './components/modals/combat/DemoRollModal';
import { GlobalToolbar } from './components/ui/GlobalToolbar';
import { Sidebar } from './components/standalone/Sidebar';
import { InitiativeTracker } from './components/initiative/InitiativeTracker';
import { RollLogWidget } from './components/standalone/RollLogWidget';
import { isStandaloneMode } from './utils/sync/storageAdapter';
import { Lock } from 'lucide-react';
import { TokenEmptyState } from './components/ui/TokenEmptyState';
import { initSettingsBackupSync } from './utils/sync/userPreferences';
import { dismissPlacementTool } from './utils/pc/pcPlacementInteraction';
import './App.css';
import './style.css';

function App() {
    useOwlbearSync();
    useDynamicThemeSync();

    useEffect(() => {
        dismissPlacementTool().catch(() => {});
    }, []);

    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const role = useCharacterStore((state) => state.role);
    const mode = useCharacterStore((state) => state.identity.mode);
    const isPrinting = useCharacterStore((state) => state.identity.isPrinting);
    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);
    const activeTokenId = useCharacterStore((state) => state.tokenId);

    const initLayout = useCharacterStore((state) => state.identity.initiativeTrackerLayout) || 'vertical';
    const [showStandaloneTracker, setShowStandaloneTracker] = useState(false);

    useEffect(() => {
        const handleToggle = () => setShowStandaloneTracker((prev) => !prev);
        window.addEventListener('toggle-standalone-tracker', handleToggle);
        initSettingsBackupSync().catch((err) => console.warn('[App] Settings backup sync error:', err));
        useCharacterStore
            .getState()
            .initPcStorage()
            .catch((err) => console.warn('[App] PC storage init error:', err));
        return () => window.removeEventListener('toggle-standalone-tracker', handleToggle);
    }, []);

    const renderSheetContent = () => {
        if (!isStandaloneMode && isNPC && role === 'PLAYER') {
            return (
                <div id="gm-lock-screen" className="app-gm-lock">
                    <h2 className="app-gm-lock__icon text-title-primary">
                        <Lock size={40} />
                    </h2>
                    <h3 className="text-label" style={{ color: 'var(--text-main)' }}>
                        This sheet is hidden by the GM.
                    </h3>
                    {!gmOnlyMatchups && (
                        <div className="app-gm-lock__content">
                            <TypeMatchups />
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="sheet-container" style={{ maxWidth: '100%', margin: '0' }}>
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
                        {mode !== 'Pokémon' && <TrainerBadges />}
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
                    {!activeTokenId ? <TokenEmptyState /> : renderSheetContent()}
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

                <div className="standalone-layout-wrapper">
                    <div className="standalone-main-col">
                        {showStandaloneTracker && initLayout === 'horizontal' && (
                            <div className="standalone-layout-tracker--horizontal">
                                <InitiativeTracker isStandaloneWidget={true} />
                            </div>
                        )}

                        <div className="standalone-layout-sheet">
                            {!activeTokenId ? <TokenEmptyState isStandalone={true} /> : renderSheetContent()}
                        </div>
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

                <DemoRollModal />
                {isPrinting && <PrintSheet />}
            </div>
        </div>
    );
}

export default App;
