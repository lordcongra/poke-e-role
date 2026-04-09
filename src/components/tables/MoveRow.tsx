import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { MoveData, SkillData, ExtraCategory } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { fetchMoveData } from '../../utils/api';
import { rollAccuracy, calculateBaseDamage, parseCombatTags, getAbilityText } from '../../utils/combatUtils';
import { MoveEditModal } from '../modals/MoveEditModal';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import './MoveRow.css';

interface MoveRowProps {
    move: MoveData;
    skills: Record<Skill, SkillData>;
    extraCategories: ExtraCategory[];
    onTarget: (moveData: MoveData) => void;
    onDelete: (id: string) => void;
}

export function MoveRow({ move, skills, extraCategories, onTarget, onDelete }: MoveRowProps) {
    const updateMove = useCharacterStore((state) => state.updateMove);
    const moveUpMove = useCharacterStore((state) => state.moveUpMove);
    const moveDownMove = useCharacterStore((state) => state.moveDownMove);
    const applyMoveData = useCharacterStore((state) => state.applyMoveData);

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const combinedTypes = [...POKEMON_TYPES, ...roomCustomTypes.map((type) => type.name)];
    const combinedColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(roomCustomTypes.map((type) => [type.name, type.color]))
    };

    const [editModalOpen, setEditModalOpen] = useState(false);

    const handleNameBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
        const value = event.target.value.trim();
        if (value) {
            const data = await fetchMoveData(value);
            if (data) applyMoveData(move.id, data as Record<string, unknown>);
        }
    };

    const inventory = useCharacterStore((state) => state.inventory);
    const will = useCharacterStore((state) => state.will);
    const stats = useCharacterStore((state) => state.stats);
    const socials = useCharacterStore((state) => state.socials);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);

    // 🔥 Reactive First Hit Selectors
    useCharacterStore((state) => state.trackers.firstHitDmg);
    const firstHitAccActive = useCharacterStore((state) => state.trackers.firstHitAcc);

    const abilityText = getAbilityText(ability, customAbilities);
    const itemBuffs = parseCombatTags(inventory, extraCategories, move, abilityText);

    let attributeTotal = 0;
    if (move.acc1 === 'will') {
        attributeTotal = will.willMax;
    } else if (stats[move.acc1 as CombatStat]) {
        const statistic = stats[move.acc1 as CombatStat];
        attributeTotal = Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[move.acc1] || 0)
        );
    } else if (socials[move.acc1 as SocialStat]) {
        const statistic = socials[move.acc1 as SocialStat];
        attributeTotal = Math.max(
            1,
            statistic.base + statistic.rank + statistic.buff - statistic.debuff + (itemBuffs.stats[move.acc1] || 0)
        );
    }

    let skillTotal = 0;
    if (move.acc2 !== 'none' && skills[move.acc2 as Skill]) {
        skillTotal =
            skills[move.acc2 as Skill].base + skills[move.acc2 as Skill].buff + (itemBuffs.skills[move.acc2] || 0);
    } else if (move.acc2 !== 'none') {
        for (const category of extraCategories) {
            const extraSkill = category.skills.find((s) => s.id === move.acc2);
            if (extraSkill) {
                skillTotal = extraSkill.base + extraSkill.buff + (itemBuffs.skills[move.acc2] || 0);
                break;
            }
        }
    }

    const trackers = useCharacterStore((state) => state.trackers);

    let customFirstHitAccTag = 0;
    if (itemBuffs.firstHitAcc !== 0 && firstHitAccActive) {
        customFirstHitAccTag = itemBuffs.firstHitAcc;
    }

    const accuracyTotal = attributeTotal + skillTotal + trackers.globalAcc + itemBuffs.acc + customFirstHitAccTag;
    const damageTotal = move.category === 'Status' ? '-' : calculateBaseDamage(move, useCharacterStore.getState());

    return (
        <>
            <tr className={`data-table__row--dynamic move-row ${!move.active ? '' : 'move-row--inactive'}`}>
                <td className="move-row__checkbox-cell">
                    <input
                        type="checkbox"
                        checked={move.active}
                        onChange={(event) => updateMove(move.id, 'active', event.target.checked)}
                        className="move-row__checkbox"
                        title="Mark as used this round"
                    />
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--row-center">
                        <span className="move-row__accuracy-text">{accuracyTotal}</span>
                        <button
                            type="button"
                            onClick={() => rollAccuracy(move, useCharacterStore.getState())}
                            className="action-button action-button--dark move-row__roll-btn"
                            title="Roll Accuracy"
                        >
                            🎯
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="move-row__name-container">
                        <input
                            type="text"
                            list="move-list"
                            value={move.name}
                            onChange={(event) => updateMove(move.id, 'name', event.target.value)}
                            onBlur={handleNameBlur}
                            className="form-input--transparent move-row__name-input"
                            placeholder="Move Name"
                        />
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(true)}
                            className="action-button action-button--transparent-white move-row__edit-btn"
                            title="Edit Move & Tags"
                        >
                            🏷️
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--row-start">
                        <select
                            value={move.acc1}
                            onChange={(event) => updateMove(move.id, 'acc1', event.target.value)}
                            className="form-select--bordered move-row__select-stat"
                        >
                            {Object.values(CombatStat).map((statistic) => (
                                <option key={statistic} value={statistic}>
                                    {statistic.toUpperCase()}
                                </option>
                            ))}
                            {Object.values(SocialStat).map((statistic) => (
                                <option key={statistic} value={statistic}>
                                    {statistic.toUpperCase()}
                                </option>
                            ))}
                            <option value="will">WILL</option>
                        </select>
                        {' + '}
                        <select
                            value={move.acc2}
                            onChange={(event) => updateMove(move.id, 'acc2', event.target.value)}
                            className="form-select--bordered move-row__select-skill"
                        >
                            <option value="none">-- None --</option>
                            {Object.values(Skill).map((skillName) => (
                                <option key={skillName} value={skillName}>
                                    {skills[skillName]?.customName ||
                                        skillName.charAt(0).toUpperCase() + skillName.slice(1)}
                                </option>
                            ))}
                            {extraCategories.length > 0 &&
                                extraCategories.map((category) => (
                                    <optgroup key={category.id} label={category.name || 'EXTRA'}>
                                        {category.skills.map((extraSkill) => (
                                            <option key={extraSkill.id} value={extraSkill.id}>
                                                {extraSkill.name || 'Unnamed'}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                        </select>
                    </div>
                </td>
                <td className="data-table__cell--middle move-row__type-cell">
                    <select
                        value={move.type}
                        onChange={(event) => updateMove(move.id, 'type', event.target.value)}
                        className="form-select--transparent move-row__type-select"
                        style={{
                            background: combinedColors[move.type] || 'transparent',
                            color: move.type ? 'white' : 'inherit',
                            textShadow: move.type ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none'
                        }}
                    >
                        <option value="">Type</option>
                        {combinedTypes.map((typeOption) => (
                            <option key={typeOption} value={typeOption}>
                                {typeOption}
                            </option>
                        ))}
                    </select>
                </td>
                <td className="data-table__cell--middle">
                    <select
                        value={move.category}
                        onChange={(event) =>
                            updateMove(move.id, 'category', event.target.value as 'Physical' | 'Special' | 'Status')
                        }
                        className="form-select--transparent"
                    >
                        <option value="Physical">Phys</option>
                        <option value="Special">Spec</option>
                        <option value="Status">Supp</option>
                    </select>
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--row-start">
                        <NumberSpinner
                            value={move.power}
                            onChange={(value: number) => updateMove(move.id, 'power', value)}
                        />
                        {' + '}
                        <select
                            value={move.dmg1}
                            onChange={(event) => updateMove(move.id, 'dmg1', event.target.value)}
                            className="form-select--bordered move-row__select-stat"
                        >
                            <option value="">-</option>
                            {Object.values(CombatStat).map((statistic) => (
                                <option key={statistic} value={statistic}>
                                    {statistic.toUpperCase()}
                                </option>
                            ))}
                            {Object.values(SocialStat).map((statistic) => (
                                <option key={statistic} value={statistic}>
                                    {statistic.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--row-center">
                        <span className="move-row__damage-text">{damageTotal}</span>
                        <button
                            type="button"
                            onClick={() => onTarget(move)}
                            className="action-button action-button--red move-row__roll-btn"
                            title="Roll Damage"
                        >
                            💥
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--column-center">
                        <button type="button" onClick={() => moveUpMove(move.id)} className="move-row__sort-btn">
                            ▲
                        </button>
                        <button type="button" onClick={() => moveDownMove(move.id)} className="move-row__sort-btn">
                            ▼
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <button
                        type="button"
                        onClick={() => onDelete(move.id)}
                        className="action-button action-button--red move-row__roll-btn"
                    >
                        X
                    </button>
                </td>
            </tr>
            {editModalOpen && <MoveEditModal moveId={move.id} onClose={() => setEditModalOpen(false)} />}
        </>
    );
}
