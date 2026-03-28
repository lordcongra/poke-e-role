// src/App.tsx
import { useOwlbearSync } from './hooks/useOwlbearSync';
import { IdentityHeader } from './components/IdentityHeader';
import { DerivedBoard } from './components/DerivedBoard';
import { CoreTable } from './components/CoreTable';
import { SocialTable } from './components/SocialTable';
import { TypeMatchups } from './components/TypeMatchups';
import { SkillsTable } from './components/SkillsTable';
import { ActionRolls } from './components/ActionRolls';
import { MovesTable } from './components/MovesTable'; // <-- ADDED THIS
import './style.css';

function App() {
  useOwlbearSync();

  return (
    <div className="sheet-container" style={{ padding: '10px', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* 1. Header & Derived Stats */}
      <IdentityHeader />
      <DerivedBoard />

      {/* 2. The Core Two-Column Layout */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <CoreTable />
            <SocialTable />
            <TypeMatchups />
            <ActionRolls />
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <SkillsTable />
        </div>
      </div>

      {/* 3. The Full-Width Bottom Section */}
      <MovesTable /> {/* <-- ADDED THIS */}

    </div>
  );
}

export default App;