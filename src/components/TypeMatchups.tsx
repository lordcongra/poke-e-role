// src/components/TypeMatchups.tsx
import { useCharacterStore } from '../store/useCharacterStore';

// The standard Pokémon Type Chart. 
// Defender -> Attacker -> Multiplier
const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal: { Fighting: 2, Ghost: 0 },
  Fire: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 },
  Water: { Electric: 2, Grass: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
  Electric: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 },
  Grass: { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ground: 0.5 },
  Ice: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 },
  Fighting: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 },
  Poison: { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 },
  Ground: { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 },
  Flying: { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 },
  Psychic: { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 },
  Bug: { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 },
  Rock: { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 },
  Ghost: { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 },
  Dragon: { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5 },
  Dark: { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 },
  Steel: { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 },
  Fairy: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }
};

const ALL_TYPES = Object.keys(TYPE_CHART);

const TYPE_COLORS: Record<string, string> = {
    'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030',
    'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0',
    'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820',
    'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848',
    'Steel': '#B8B8D0', 'Fairy': '#EE99AC'
};

export function TypeMatchups() {
    const type1 = useCharacterStore(state => state.identity.type1);
    const type2 = useCharacterStore(state => state.identity.type2);

    if (!type1 && !type2) {
        return (
            <div className="sheet-panel" style={{ paddingBottom: '10px' }}>
                <div className="sheet-panel__header" style={{ textAlign: 'left', paddingLeft: '10px' }}>▼ TYPE MATCHUPS</div>
                <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                    Load a Pokémon to see matchups...
                </div>
            </div>
        );
    }

    // Calculate weaknesses/resistances!
    const multipliers: Record<string, number> = {};
    
    ALL_TYPES.forEach(attackerType => {
        const mult1 = TYPE_CHART[type1]?.[attackerType] ?? 1;
        const mult2 = TYPE_CHART[type2]?.[attackerType] ?? 1;
        const finalMult = mult1 * mult2;
        if (finalMult !== 1) {
            multipliers[attackerType] = finalMult;
        }
    });

    // Group them for display
    const groups: Record<number, string[]> = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
    Object.entries(multipliers).forEach(([type, mult]) => {
        if (groups[mult]) groups[mult].push(type);
    });

    const renderGroup = (label: string, types: string[]) => {
        if (types.length === 0) return null;
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ width: '35px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>{label}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {types.map(t => (
                        <span key={t} style={{ background: TYPE_COLORS[t], color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textShadow: '1px 1px 1px rgba(0,0,0,0.5)' }}>
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="sheet-panel" style={{ paddingBottom: '10px' }}>
            <div className="sheet-panel__header" style={{ textAlign: 'left', paddingLeft: '10px' }}>▼ TYPE MATCHUPS</div>
            <div style={{ padding: '10px 10px 4px 10px' }}>
                {renderGroup('4x', groups[4])}
                {renderGroup('2x', groups[2])}
                {renderGroup('0.5x', groups[0.5])}
                {renderGroup('0.25x', groups[0.25])}
                {renderGroup('0x', groups[0])}
            </div>
        </div>
    );
}