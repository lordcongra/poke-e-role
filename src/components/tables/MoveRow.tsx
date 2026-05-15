import { useState, memo } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { MoveData, SkillData, ExtraCategory } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { fetchMoveData } from '../../utils/api';
import {
    rollAccuracy,
    calculateBaseDamage,
    parseCombatTags,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal
} from '../../utils/combatUtils';
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

export const MoveRow = memo(function MoveRow({ move, skills, extraCategories, onTarget, onDelete }: MoveRowProps) {
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
    const [bankModalOpen, setBankModalOpen] = useState(false);

    const handleNameBlur = async (event: React.FocusEvent<HTMLInputElement>) => {
        const value = event.target.value.trim();
        if (value) {
            const data = await fetchMoveData(value);
            if (data) applyMoveData(move.id, data as Record<string, unknown>);
        }
    };

    // Keep selectors to ensure the component re-renders when these change!
    const inventory = useCharacterStore((state) => state.inventory);
    useCharacterStore((state) => state.will);
    useCharacterStore((state) => state.stats);
    useCharacterStore((state) => state.socials);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);

    // 🔥 Reactive First Hit Selectors
    useCharacterStore((state) => state.trackers.firstHitDmg);
    const firstHitAccActive = useCharacterStore((state) => state.trackers.firstHitAcc);

    const abilityText = getAbilityText(ability, customAbilities);
    const itemBuffs = parseCombatTags(inventory, extraCategories, move, abilityText);
    const fullState = useCharacterStore.getState();

    const attributeTotal = calculateStatTotal(move.acc1, fullState, itemBuffs);
    const skillTotal = calculateSkillTotal(move.acc2, fullState, itemBuffs);

    const trackers = useCharacterStore((state) => state.trackers);
    const bankedAccDice = trackers.bankedAccDice || {};
    const bankedDiceForThisMove = bankedAccDice[move.id] || 0;
    const totalBanked = Object.values(bankedAccDice).reduce((a, b) => a + b, 0);

    let customFirstHitAccTag = 0;
    if (itemBuffs.firstHitAcc !== 0 && firstHitAccActive) {
        customFirstHitAccTag = itemBuffs.firstHitAcc;
    }

    const accuracyTotal = attributeTotal + skillTotal + trackers.globalAcc + itemBuffs.acc + customFirstHitAccTag;

    const baseDamage = move.category === 'Status' ? 0 : calculateBaseDamage(move, fullState);
    const damageTotal = move.category === 'Status' ? '-' : baseDamage + bankedDiceForThisMove;

    const handleAccuracyClick = () => {
        if (totalBanked > 0) {
            setBankModalOpen(true);
        } else {
            rollAccuracy(move, useCharacterStore.getState());
        }
    };

    const confirmWipeBank = () => {
        useCharacterStore.getState().updateTracker('bankedAccDice', {});
        rollAccuracy(move, useCharacterStore.getState());
        setBankModalOpen(false);
    };

    const confirmKeepBank = () => {
        rollAccuracy(move, useCharacterStore.getState());
        setBankModalOpen(false);
    };

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
                            onClick={handleAccuracyClick}
                            className="action-button action-button--dark move-row__roll-btn"
                            title="Roll Accuracy"
                        >
                            🎯
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="move-row__name-container">
                        <select
                            value={move.marker || ''}
                            onChange={(event) => updateMove(move.id, 'marker', event.target.value)}
                            className="form-select--transparent move-row__marker-select"
                            title="Mark Move"
                        >
                            <option value="">-</option>
                            <option value="★">★</option>
                            <option value="◼">◼</option>
                            <option value="▲">▲</option>
                            <option value="◆">◆</option>
                            <option value="⬟">⬟</option>
                        </select>
                        <input
                            type="text"
                            list="move-list"
                            value={move.name}
                            onChange={(event) => updateMove(move.id, 'name', event.target.value)}
                            onBlur={handleNameBlur}
                            className="form-input--transparent move-row__name-input"
                            placeholder="Move Name"
                        />
                    </div>
                </td>
                <td className="data-table__cell--middle move-row__tag-cell">
                    <button
                        type="button"
                        onClick={() => setEditModalOpen(true)}
                        className="action-button action-button--transparent-white move-row__edit-btn"
                        title="Edit Move & Tags"
                    >
                        🏷️
                    </button>
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

            {bankModalOpen && (
                <div className="moves-table__modal-overlay">
                    <div className="moves-table__modal-content" style={{ width: '340px', maxWidth: '90%' }}>
                        <h3 className="moves-table__modal-title">⚠️ Banked Dice Detected</h3>
                        <p className="moves-table__modal-text" style={{ textAlign: 'left' }}>
                            You currently have <strong>{totalBanked}</strong> extra Damage Dice banked from previous
                            rolls.
                            <br />
                            <br />
                            Are you abandoning your previous attack, or is this a Reaction move where you want to keep
                            your previously banked dice?
                        </p>
                        <div className="moves-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark moves-table__modal-btn"
                                onClick={() => setBankModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark moves-table__modal-btn"
                                onClick={confirmKeepBank}
                            >
                                Keep Bank
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red moves-table__modal-btn"
                                onClick={confirmWipeBank}
                            >
                                Clear Bank
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});
