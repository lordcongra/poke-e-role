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
import './App.css';
import './style.css';

function App() {
    useOwlbearSync();
    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const role = useCharacterStore((state) => state.role);
    const mode = useCharacterStore((state) => state.identity.mode);
    const isPrinting = useCharacterStore((state) => state.identity.isPrinting);

    const gmOnlyMatchups = useCharacterStore((state) => state.identity.gmOnlyMatchups);

    if (isNPC && role === 'PLAYER') {
        return (
            <>
                <div id="gm-lock-screen" className="app-gm-lock">
                    <h2 className="app-gm-lock__icon">🔒</h2>
                    <h3>This sheet is hidden by the GM.</h3>
                    {!gmOnlyMatchups && (
                        <div className="app-gm-lock__content">
                            <TypeMatchups />
                        </div>
                    )}
                </div>
                {isPrinting && <PrintSheet />}
            </>
        );
    }

    return (
        <>
            <div className="sheet-container app-container">
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
            </div>

            {/* Global Modals / Interceptors */}
            <DemoRollModal />
            {isPrinting && <PrintSheet />}
        </>
    );
}

export default App;
