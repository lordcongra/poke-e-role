// src/App.tsx
import { useOwlbearSync } from './hooks/useOwlbearSync';
import { useCharacterStore } from './store/useCharacterStore';
import { IdentityHeader } from './components/IdentityHeader';
import { DerivedBoard } from './components/DerivedBoard';
import { CoreTable } from './components/CoreTable';
import { SocialTable } from './components/SocialTable';
import { TypeMatchups } from './components/TypeMatchups';
import { SkillsTable } from './components/SkillsTable';
import { ActionRolls } from './components/ActionRolls';
import { MovesTable } from './components/MovesTable';
import { InventoryTable } from './components/InventoryTable';
import { TrackerSection } from './components/TrackerSection';
import './style.css';

function App() {
    useOwlbearSync();
    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const role = useCharacterStore((state) => state.role);
    const mode = useCharacterStore((state) => state.identity.mode);

    if (isNPC && role === 'PLAYER') {
        return (
            <div
                id="gm-lock-screen"
                style={{ textAlign: 'center', paddingTop: '100px', color: 'var(--primary)', fontFamily: 'sans-serif' }}
            >
                <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>🔒</h2>
                <h3>This sheet is hidden by the GM.</h3>
                <div
                    style={{
                        marginTop: '40px',
                        maxWidth: '350px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        textAlign: 'left'
                    }}
                >
                    <TypeMatchups />
                </div>
            </div>
        );
    }

    return (
        <div className="sheet-container" style={{ padding: '10px', maxWidth: '900px', margin: '0 auto' }}>
            <IdentityHeader />
            <DerivedBoard />

            <div className="sheet-container__row">
                <div className="sheet-container__column">
                    <TrackerSection />
                    <CoreTable />
                    <SocialTable />
                    {mode === 'Pokémon' && <TypeMatchups />}
                </div>

                <div className="sheet-container__column">
                    <SkillsTable />
                    <ActionRolls />
                </div>
            </div>

            <MovesTable />
            <InventoryTable />
        </div>
    );
}

export default App;
