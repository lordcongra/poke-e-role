import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { Skill } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { parseCombatTags, getAbilityText } from '../utils/combatMath';

interface SkillRowProps {
    skill: Skill;
    defaultLabel: string;
}

export function SkillRow({ skill, defaultLabel }: SkillRowProps) {
    const data = useCharacterStore((state) => state.skills[skill]);
    const setSkill = useCharacterStore((state) => state.setSkill);
    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);

    const abilityText = getAbilityText(ability, customAbilities);
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText);
    const itemBonus = inventoryModifiers.skills[skill] || 0;
    const total = data.base + data.buff + itemBonus;

    const [localName, setLocalName] = useState(data.customName || defaultLabel);

    useEffect(() => {
        setLocalName(data.customName || defaultLabel);
    }, [data.customName, defaultLabel]);

    return (
        <tr className="data-table__row--dynamic">
            <td className="data-table__cell--middle-left" style={{ paddingLeft: '4px' }}>
                <input
                    type="text"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onBlur={() => setSkill(skill, 'customName', localName || defaultLabel)}
                    style={{
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '3px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                        color: 'var(--text-main)',
                        fontWeight: 'bold',
                        width: '90px',
                        padding: '3px 4px',
                        outline: 'none'
                    }}
                />
            </td>
            <td className="data-table__cell--middle">
                <div className="flex-layout--row-center">
                    <NumberSpinner value={data.base} onChange={(val) => setSkill(skill, 'base', val)} min={0} max={5} />
                </div>
            </td>
            <td className="data-table__cell--middle">
                <div className="flex-layout--row-center">
                    <NumberSpinner value={data.buff} onChange={(val) => setSkill(skill, 'buff', val)} min={0} />
                </div>
            </td>
            <td
                className="data-table__cell--middle"
                style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}
            >
                {total}
            </td>
        </tr>
    );
}
