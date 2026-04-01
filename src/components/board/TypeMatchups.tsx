// src/components/board/TypeMatchups.tsx
import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getAbilityText } from '../../utils/combatUtils';
import './TypeMatchups.css';

const BASE_CHART: Record<string, Record<string, number>> = {
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
    Steel: {
        Fire: 2,
        Fighting: 2,
        Ground: 2,
        Normal: 0.5,
        Grass: 0.5,
        Ice: 0.5,
        Flying: 0.5,
        Psychic: 0.5,
        Bug: 0.5,
        Rock: 0.5,
        Dragon: 0.5,
        Steel: 0.5,
        Fairy: 0.5,
        Poison: 0
    },
    Fairy: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }
};

const BASE_TYPES = Object.keys(BASE_CHART);
const TYPE_COLORS: Record<string, string> = {
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
    Fairy: '#EE99AC'
};

export function TypeMatchups() {
    const role = useCharacterStore((state) => state.role);
    const type1 = useCharacterStore((state) => state.identity.type1);
    const type2 = useCharacterStore((state) => state.identity.type2);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    const inventory = useCharacterStore((state) => state.inventory);

    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const abilityName = useCharacterStore((state) => state.identity.ability);

    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!type1 && !type2) {
        return (
            <div className="sheet-panel type-matchups__panel">
                <div className="sheet-panel__header" style={{ textAlign: 'left', paddingLeft: '10px' }}>
                    ▼ TYPE MATCHUPS
                </div>
                <div className="type-matchups__empty">Load a Pokémon to see matchups...</div>
            </div>
        );
    }

    const visibleTypes = roomCustomTypes.filter((t) => role === 'GM' || !t.gmOnly);

    const ALL_TYPES = [...BASE_TYPES, ...visibleTypes.map((t) => t.name)];
    const ALL_COLORS = { ...TYPE_COLORS, ...Object.fromEntries(visibleTypes.map((t) => [t.name, t.color])) };

    const matrix: Record<string, Record<string, number>> = {};
    ALL_TYPES.forEach((def) => {
        matrix[def] = {};
        ALL_TYPES.forEach((atk) => (matrix[def][atk] = 1));
    });

    Object.entries(BASE_CHART).forEach(([def, atkMap]) => {
        Object.entries(atkMap).forEach(([atk, mult]) => {
            matrix[def][atk] = mult;
        });
    });

    visibleTypes.forEach((ct) => {
        (ct.weaknesses || []).forEach((atk) => {
            if (matrix[ct.name]) matrix[ct.name][atk] = 2;
        });
        (ct.resistances || []).forEach((atk) => {
            if (matrix[ct.name]) matrix[ct.name][atk] = 0.5;
        });
        (ct.immunities || []).forEach((atk) => {
            if (matrix[ct.name]) matrix[ct.name][atk] = 0;
        });
        (ct.seAgainst || []).forEach((def) => {
            if (matrix[def]) matrix[def][ct.name] = 2;
        });
        (ct.nveAgainst || []).forEach((def) => {
            if (matrix[def]) matrix[def][ct.name] = 0.5;
        });
        (ct.noEffectAgainst || []).forEach((def) => {
            if (matrix[def]) matrix[def][ct.name] = 0;
        });
    });

    let removeImmunities = false;
    const removeSpecificImmunities: string[] = [];
    const extraImmunities: string[] = [];
    const extraResistances: string[] = [];
    const extraWeaknesses: string[] = [];

    const abilityText = getAbilityText(abilityName, customAbilities);
    const stringsToParse = inventory
        .filter((i) => i.active)
        .map((item) => ((item.name || '') + ' ' + (item.desc || '')).toLowerCase());

    if (abilityText) {
        stringsToParse.push(abilityText.toLowerCase());
    }

    stringsToParse.forEach((desc) => {
        if (desc.includes('[remove immunities]')) removeImmunities = true;

        const remImmuneMatches = desc.match(/\[remove immunity:\s*([a-z]+)\]/g);
        if (remImmuneMatches)
            remImmuneMatches.forEach((m) => {
                const type = m.match(/\[remove immunity:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                if (properType) removeSpecificImmunities.push(properType);
            });

        const immuneMatches = desc.match(/\[immune:\s*([a-z]+)\]/g);
        if (immuneMatches)
            immuneMatches.forEach((m) => {
                const type = m.match(/\[immune:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                if (properType) extraImmunities.push(properType);
            });

        const resistMatches = desc.match(/\[resist:\s*([a-z]+)\]/g);
        if (resistMatches)
            resistMatches.forEach((m) => {
                const type = m.match(/\[resist:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                if (properType) extraResistances.push(properType);
            });

        const weakMatches = desc.match(/\[weak:\s*([a-z]+)\]/g);
        if (weakMatches)
            weakMatches.forEach((m) => {
                const type = m.match(/\[weak:\s*([a-z]+)\]/)?.[1];
                const properType = ALL_TYPES.find((t) => t.toLowerCase() === type);
                if (properType) extraWeaknesses.push(properType);
            });
    });

    const multipliers: Record<string, number> = {};
    ALL_TYPES.forEach((attackerType) => {
        let mult1 = matrix[type1]?.[attackerType] ?? 1;
        let mult2 = matrix[type2]?.[attackerType] ?? 1;

        if (removeImmunities || removeSpecificImmunities.includes(attackerType)) {
            if (mult1 === 0) mult1 = 1;
            if (mult2 === 0) mult2 = 1;
        }

        let finalMult = mult1 * mult2;

        if (extraImmunities.includes(attackerType)) finalMult *= 0;
        if (extraResistances.includes(attackerType)) finalMult *= 0.5;
        if (extraWeaknesses.includes(attackerType)) finalMult *= 2;

        if (finalMult !== 1) multipliers[attackerType] = finalMult;
    });

    const groups: Record<number, string[]> = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };

    Object.entries(multipliers).forEach(([type, mult]) => {
        if (groups[mult]) groups[mult].push(type);
    });

    const renderGroup = (label: string, types: string[]) => {
        if (types.length === 0) return null;
        return (
            <div className="type-matchups__group-row">
                <span className="type-matchups__group-label">{label}</span>
                <div className="type-matchups__pill-container">
                    {types.map((t) => (
                        <span key={t} className="type-matchups__pill" style={{ background: ALL_COLORS[t] || '#777' }}>
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="sheet-panel type-matchups__panel">
            <div className="sheet-panel__header">
                <span className="type-matchups__header-text">
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    TYPE MATCHUPS
                </span>
            </div>

            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div className="type-matchups__content">
                        {renderGroup('4x', groups[4])}
                        {renderGroup('2x', groups[2])}
                        {renderGroup('0.5x', groups[0.5])}
                        {renderGroup('0.25x', groups[0.25])}
                        {renderGroup('0x', groups[0])}
                    </div>
                </div>
            )}
        </div>
    );
}
