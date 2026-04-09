import { useCharacterStore } from '../../store/useCharacterStore';
import { getAbilityText } from '../../utils/combatUtils';
import { BASE_TYPE_CHART, BASE_TYPES } from '../../data/typeMatchups';
import { TYPE_COLORS } from '../../data/constants';
import { CollapsingSection } from '../ui/CollapsingSection';
import './TypeMatchups.css';

export function TypeMatchups() {
    const role = useCharacterStore((state) => state.role);
    const rawType1 = useCharacterStore((state) => state.identity.type1);
    const rawType2 = useCharacterStore((state) => state.identity.type2);
    
    const activeTransformation = useCharacterStore((state) => state.identity.activeTransformation);
    const activeFormId = useCharacterStore((state) => state.identity.activeFormId);
    const roomCustomForms = useCharacterStore((state) => state.roomCustomForms);
    
    const isTera = activeTransformation === 'Terastallize';
    const teraAffinity = useCharacterStore((state) => state.identity.terastallizeAffinity);

    const type1 = isTera ? teraAffinity : rawType1;
    const type2 = isTera ? '' : rawType2;

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const inventory = useCharacterStore((state) => state.inventory);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const abilityName = useCharacterStore((state) => state.identity.ability);

    if (!type1 && !type2) {
        return (
            <div className="sheet-panel type-matchups__panel">
                <div className="sheet-panel__header type-matchups__header--left">▼ TYPE MATCHUPS</div>
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

    Object.entries(BASE_TYPE_CHART).forEach(([def, atkMap]) => {
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

    // 🔥 NEW: Parse passive tags from the active Custom Form!
    if (activeTransformation === 'Custom' && activeFormId) {
        const activeForm = roomCustomForms.find(f => f.id === activeFormId);
        if (activeForm && activeForm.tags) {
            stringsToParse.push(activeForm.tags.toLowerCase());
        }
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
        <CollapsingSection 
            title={isTera ? `TYPE MATCHUPS (TERA: ${teraAffinity.toUpperCase()})` : "TYPE MATCHUPS"} 
            className="sheet-panel type-matchups__panel"
        >
            <div className="type-matchups__content">
                {renderGroup('4x', groups[4])}
                {renderGroup('2x', groups[2])}
                {renderGroup('0.5x', groups[0.5])}
                {renderGroup('0.25x', groups[0.25])}
                {renderGroup('0x', groups[0])}
            </div>
        </CollapsingSection>
    );
}