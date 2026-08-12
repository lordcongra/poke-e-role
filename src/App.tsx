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
import { isStandaloneMode } from './utils/storageAdapter';
import './App.css';
import './style.css';

function App() {
    useOwlbearSync();

    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const role = useCharacterStore((state) => state.role);
    const mode = useCharacterStore((state) => state.identity.mode);
    const isPrinting = useCharacterStore((state) => state.identity.isPrinting);
    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);
    const activeTokenId = useCharacterStore((state) => state.tokenId);

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
            <>
                <IdentityHeader />
                <DerivedBoard />

                {/* --- COMBAT DASHBOARD --- */}
                <TrackerSection />
                <MovesTable />
                <ActionRolls />

                {/* --- STATS & SKILLS --- */}
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
            </>
        );
    };

    // ==========================================
    // PATH 1: OWLBEAR RODEO VTT MODE
    // ==========================================
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

    // ==========================================
    // PATH 2: STANDALONE WEB APP MODE
    // ==========================================
    return (
        <div className="app-layout">
            <Sidebar />

            <div className="app-main-content">
                <div className="sheet-container app-container" style={{ maxWidth: '100%', margin: '0' }}>
                    <GlobalToolbar />

                    {!activeTokenId ? (
                        <div className="standalone-empty-state">
                            <p>👈 Select or create a file in the directory to begin</p>
                        </div>
                    ) : (
                        renderSheetContent()
                    )}
                </div>

                <DemoRollModal />
                {isPrinting && <PrintSheet />}
            </div>
        </div>
    );
}

export default App;
