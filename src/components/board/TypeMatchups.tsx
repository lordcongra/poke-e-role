import { useCharacterStore } from '../../store/useCharacterStore';
import { getAbilityText, getMatchupGroups } from '../../utils/combatUtils';
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
    const ALL_COLORS = { ...TYPE_COLORS, ...Object.fromEntries(visibleTypes.map((t) => [t.name, t.color])) };

    const abilityText = getAbilityText(abilityName, customAbilities);
    const stringsToParse = inventory
        .filter((i) => i.active)
        .map((item) => ((item.name || '') + ' ' + (item.desc || '')).toLowerCase());

    if (abilityText) {
        stringsToParse.push(abilityText.toLowerCase());
    }

    // Parse passive tags from the active Custom Form
    if (activeTransformation === 'Custom' && activeFormId) {
        const activeForm = roomCustomForms.find((f) => f.id === activeFormId);
        if (activeForm && activeForm.tags) {
            stringsToParse.push(activeForm.tags.toLowerCase());
        }
    }

    const groups = getMatchupGroups(type1, type2, visibleTypes, stringsToParse);

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
            title={isTera ? `TYPE MATCHUPS (TERA: ${teraAffinity.toUpperCase()})` : 'TYPE MATCHUPS'}
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
