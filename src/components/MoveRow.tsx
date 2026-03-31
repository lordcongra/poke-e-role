// src/components/MoveRow.tsx
import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { MoveData, SkillData, ExtraCategory } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { fetchMoveData } from '../utils/api';
import { rollAccuracy, calculateBaseDamage, parseCombatTags, getAbilityText } from '../utils/combatUtils';
import { MoveEditModal } from './MoveEditModal';

const ALL_TYPES = [
    'Normal',
    'Fire',
    'Water',
    'Electric',
    'Grass',
    'Ice',
    'Fighting',
    'Poison',
    'Ground',
    'Flying',
    'Psychic',
    'Bug',
    'Rock',
    'Ghost',
    'Dragon',
    'Dark',
    'Steel',
    'Fairy'
];
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

export function MoveRow({
    move,
    skills,
    extraCategories,
    onTarget,
    onDelete
}: {
    move: MoveData;
    skills: Record<Skill, SkillData>;
    extraCategories: ExtraCategory[];
    onTarget: (m: MoveData) => void;
    onDelete: (id: string) => void;
}) {
    const updateMove = useCharacterStore((state) => state.updateMove);
    const moveUpMove = useCharacterStore((state) => state.moveUpMove);
    const moveDownMove = useCharacterStore((state) => state.moveDownMove);
    const applyMoveData = useCharacterStore((state) => state.applyMoveData);

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const combinedTypes = [...ALL_TYPES, ...roomCustomTypes.map((t) => t.name)];
    const combinedColors = { ...TYPE_COLORS, ...Object.fromEntries(roomCustomTypes.map((t) => [t.name, t.color])) };

    const [editModalOpen, setEditModalOpen] = useState(false);

    const handleNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        if (val) {
            const data = await fetchMoveData(val);
            if (data) applyMoveData(move.id, data);
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

    let attrTotal = 0;
    if (move.acc1 === 'will') attrTotal = will.willMax;
    else if (stats[move.acc1 as CombatStat]) {
        const s = stats[move.acc1 as CombatStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[move.acc1] || 0));
    } else if (socials[move.acc1 as SocialStat]) {
        const s = socials[move.acc1 as SocialStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[move.acc1] || 0));
    }

    let skillTotal = 0;
    if (move.acc2 !== 'none' && skills[move.acc2 as Skill]) {
        skillTotal =
            skills[move.acc2 as Skill].base + skills[move.acc2 as Skill].buff + (itemBuffs.skills[move.acc2] || 0);
    } else if (move.acc2 !== 'none') {
        for (const cat of extraCategories) {
            const sk = cat.skills.find((s) => s.id === move.acc2);
            if (sk) {
                skillTotal = sk.base + sk.buff + (itemBuffs.skills[move.acc2] || 0);
                break;
            }
        }
    }

    const trackers = useCharacterStore((state) => state.trackers);
    const accTotal = attrTotal + skillTotal + trackers.globalAcc + itemBuffs.acc;

    const dmgTotal = move.category === 'Status' ? '-' : calculateBaseDamage(move, useCharacterStore.getState());

    return (
        <>
            <tr
                className="data-table__row--dynamic"
                style={{ opacity: move.active ? 0.5 : 1, transition: 'opacity 0.2s ease' }}
            >
                <td style={{ textAlign: 'center' }}>
                    <input
                        type="checkbox"
                        checked={move.active}
                        onChange={(e) => updateMove(move.id, 'active', e.target.checked)}
                        style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                        title="Mark as used this round"
                    />
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--row-center">
                        <span
                            style={{
                                fontWeight: 'bold',
                                fontSize: '0.9em',
                                color: 'var(--text-main)',
                                minWidth: '1em',
                                textAlign: 'right'
                            }}
                        >
                            {accTotal}
                        </span>
                        <button
                            type="button"
                            onClick={() => rollAccuracy(move, useCharacterStore.getState())}
                            className="action-button action-button--dark"
                            style={{ padding: '2px 6px' }}
                            title="Roll Accuracy"
                        >
                            🎯
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            type="text"
                            list="move-list"
                            value={move.name}
                            onChange={(e) => updateMove(move.id, 'name', e.target.value)}
                            onBlur={handleNameBlur}
                            className="form-input--transparent"
                            placeholder="Move Name"
                            style={{ flex: 1, minWidth: '80px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(true)}
                            className="action-button action-button--transparent-white"
                            style={{ color: 'var(--primary)', padding: '0 2px', fontSize: '0.8rem' }}
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
                            onChange={(e) => updateMove(move.id, 'acc1', e.target.value)}
                            className="form-select--bordered"
                            style={{ minWidth: '50px' }}
                        >
                            {Object.values(CombatStat).map((s) => (
                                <option key={s} value={s}>
                                    {s.toUpperCase()}
                                </option>
                            ))}
                            <option value="will">WILL</option>
                        </select>
                        {' + '}
                        <select
                            value={move.acc2}
                            onChange={(e) => updateMove(move.id, 'acc2', e.target.value)}
                            className="form-select--bordered"
                            style={{ minWidth: '70px' }}
                        >
                            <option value="none">-- None --</option>
                            {Object.values(Skill).map((s) => (
                                <option key={s} value={s}>
                                    {skills[s]?.customName || s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                            ))}
                            {extraCategories.length > 0 &&
                                extraCategories.map((cat) => (
                                    <optgroup key={cat.id} label={cat.name || 'EXTRA'}>
                                        {cat.skills.map((sk) => (
                                            <option key={sk.id} value={sk.id}>
                                                {sk.name || 'Unnamed'}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                        </select>
                    </div>
                </td>
                <td className="data-table__cell--middle" style={{ padding: '2px' }}>
                    <select
                        value={move.type}
                        onChange={(e) => updateMove(move.id, 'type', e.target.value)}
                        className="form-select--transparent"
                        style={{
                            background: combinedColors[move.type] || 'transparent',
                            color: move.type ? 'white' : 'inherit',
                            fontWeight: 'bold',
                            textShadow: move.type ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Type</option>
                        {combinedTypes.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </td>
                <td className="data-table__cell--middle">
                    <select
                        value={move.category}
                        onChange={(e) =>
                            updateMove(move.id, 'category', e.target.value as 'Physical' | 'Special' | 'Status')
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
                        <NumberSpinner value={move.power} onChange={(val) => updateMove(move.id, 'power', val)} />
                        {' + '}
                        <select
                            value={move.dmg1}
                            onChange={(e) => updateMove(move.id, 'dmg1', e.target.value)}
                            className="form-select--bordered"
                            style={{ minWidth: '50px' }}
                        >
                            <option value="">-</option>
                            {Object.values(CombatStat).map((s) => (
                                <option key={s} value={s}>
                                    {s.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--row-center">
                        <span
                            style={{
                                fontWeight: 'bold',
                                fontSize: '0.9em',
                                color: 'var(--primary)',
                                minWidth: '1em',
                                textAlign: 'right'
                            }}
                        >
                            {dmgTotal}
                        </span>
                        <button
                            type="button"
                            onClick={() => onTarget(move)}
                            className="action-button action-button--red"
                            style={{ padding: '2px 6px' }}
                            title="Roll Damage"
                        >
                            💥
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <div className="flex-layout--column-center">
                        <button
                            type="button"
                            onClick={() => moveUpMove(move.id)}
                            className="action-button action-button--sort"
                        >
                            ▲
                        </button>
                        <button
                            type="button"
                            onClick={() => moveDownMove(move.id)}
                            className="action-button action-button--sort"
                        >
                            ▼
                        </button>
                    </div>
                </td>
                <td className="data-table__cell--middle">
                    <button
                        type="button"
                        onClick={() => onDelete(move.id)}
                        className="action-button action-button--red"
                        style={{ padding: '2px 6px' }}
                    >
                        X
                    </button>
                </td>
            </tr>
            {editModalOpen && <MoveEditModal moveId={move.id} onClose={() => setEditModalOpen(false)} />}
        </>
    );
}
