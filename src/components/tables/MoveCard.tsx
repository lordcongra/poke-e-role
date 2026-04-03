import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { MoveData, SkillData, ExtraCategory } from '../../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { fetchMoveData } from '../../utils/api';
import { rollAccuracy, calculateBaseDamage, parseCombatTags, getAbilityText } from '../../utils/combatUtils';
import { MoveEditModal } from '../modals/MoveEditModal';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import './MoveCard.css';

interface MoveCardProps {
    move: MoveData;
    skills: Record<Skill, SkillData>;
    extraCategories: ExtraCategory[];
    onTarget: (moveData: MoveData) => void;
    onDelete: (id: string) => void;
}

export function MoveCard({ move, skills, extraCategories, onTarget, onDelete }: MoveCardProps) {
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
    const accuracyTotal = attributeTotal + skillTotal + trackers.globalAcc + itemBuffs.acc;
    const damageTotal = move.category === 'Status' ? '-' : calculateBaseDamage(move, useCharacterStore.getState());

    return (
        <div className={`move-card ${!move.active ? '' : 'move-card--inactive'}`}>
            <div className="move-card__header">
                <input
                    type="checkbox"
                    checked={move.active}
                    onChange={(event) => updateMove(move.id, 'active', event.target.checked)}
                    className="move-card__checkbox"
                    title="Mark as used this round"
                />
                <span className="move-card__accuracy-text">{accuracyTotal}</span>
                <button
                    type="button"
                    onClick={() => rollAccuracy(move, useCharacterStore.getState())}
                    className="action-button action-button--dark move-card__roll-btn"
                    title="Roll Accuracy"
                >
                    🎯
                </button>
                <input
                    type="text"
                    list="move-list"
                    value={move.name}
                    onChange={(event) => updateMove(move.id, 'name', event.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="Move Name"
                    className="move-card__name-input"
                />
                <button
                    type="button"
                    onClick={() => setEditModalOpen(true)}
                    className="action-button action-button--transparent-white move-card__edit-btn"
                    title="Edit Move & Tags"
                >
                    🏷️
                </button>
            </div>

            <div className="move-card__row">
                <select
                    value={move.type}
                    onChange={(event) => updateMove(move.id, 'type', event.target.value)}
                    className="move-card__select"
                    style={{
                        background: combinedColors[move.type] || 'var(--panel-alt)',
                        color: move.type ? 'white' : 'var(--text-main)',
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
                <select
                    value={move.category}
                    onChange={(event) =>
                        updateMove(move.id, 'category', event.target.value as 'Physical' | 'Special' | 'Status')
                    }
                    className="move-card__select move-card__select--static"
                >
                    <option value="Physical">Physical</option>
                    <option value="Special">Special</option>
                    <option value="Status">Support</option>
                </select>
            </div>

            <div className="move-card__stat-row">
                <div className="move-card__stat-group">
                    <span className="move-card__stat-label">ACC:</span>
                    <select
                        value={move.acc1}
                        onChange={(event) => updateMove(move.id, 'acc1', event.target.value)}
                        className="move-card__stat-select"
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
                    <span className="move-card__plus-sign">+</span>
                    <select
                        value={move.acc2}
                        onChange={(event) => updateMove(move.id, 'acc2', event.target.value)}
                        className="move-card__stat-select"
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

                <div className="move-card__stat-group">
                    <span className="move-card__stat-label">DMG:</span>
                    <NumberSpinner
                        value={move.power}
                        onChange={(value: number) => updateMove(move.id, 'power', value)}
                    />
                    <span className="move-card__plus-sign--right">+</span>
                    <select
                        value={move.dmg1}
                        onChange={(event) => updateMove(move.id, 'dmg1', event.target.value)}
                        className="move-card__stat-select"
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
            </div>

            <div className="move-card__footer">
                <div className="move-card__damage-container">
                    <span className="move-card__damage-text">{damageTotal}</span>
                    <button
                        type="button"
                        onClick={() => onTarget(move)}
                        className="action-button action-button--red move-card__damage-btn"
                        title="Roll Damage"
                    >
                        💥 Roll Dmg
                    </button>
                </div>
                <div className="move-card__sort-container">
                    <button
                        type="button"
                        onClick={() => moveUpMove(move.id)}
                        className="action-button action-button--sort move-card__sort-btn"
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        onClick={() => moveDownMove(move.id)}
                        className="action-button action-button--sort move-card__sort-btn"
                    >
                        ▼
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(move.id)}
                        className="action-button action-button--red move-card__delete-btn"
                    >
                        X
                    </button>
                </div>
            </div>

            {editModalOpen && <MoveEditModal moveId={move.id} onClose={() => setEditModalOpen(false)} />}
        </div>
    );
}