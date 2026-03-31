import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { Skill } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { parseCombatTags, getAbilityText } from '../utils/combatMath';
import './SkillRow.css';

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
            <td className="data-table__cell--middle-left skill-row__input-cell">
                <input
                    type="text"
                    value={localName}
                    onChange={(event) => setLocalName(event.target.value)}
                    onBlur={() => setSkill(skill, 'customName', localName || defaultLabel)}
                    className="skill-row__input"
                />
            </td>
            <td className="data-table__cell--middle">
                <div className="flex-layout--row-center">
                    <NumberSpinner value={data.base} onChange={(value) => setSkill(skill, 'base', value)} min={0} max={5} />
                </div>
            </td>
            <td className="data-table__cell--middle">
                <div className="flex-layout--row-center">
                    <NumberSpinner value={data.buff} onChange={(value) => setSkill(skill, 'buff', value)} min={0} />
                </div>
            </td>
            <td className="data-table__cell--middle skill-row__total-cell">
                {total}
            </td>
        </tr>
    );
}