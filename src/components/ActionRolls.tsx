import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { rollSkillCheck } from '../utils/combatUtils';
import { CollapsingSection } from './CollapsingSection';
import './ActionRolls.css';

const ATTRIBUTE_OPTIONS = [...Object.values(CombatStat), ...Object.values(SocialStat), 'will'] as const;

export function ActionRolls() {
    const skillChecks = useCharacterStore((state) => state.skillChecks);
    const addSkillCheck = useCharacterStore((state) => state.addSkillCheck);
    const updateSkillCheck = useCharacterStore((state) => state.updateSkillCheck);
    const removeSkillCheck = useCharacterStore((state) => state.removeSkillCheck);

    const skills = useCharacterStore((state) => state.skills);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [deleteRollId, setDeleteRollId] = useState<string | null>(null);

    return (
        <CollapsingSection title="ACTION ROLLS">
            <div className="table-responsive-wrapper">
                <table className="data-table" style={{ textAlign: 'left', width: '100%' }}>
                    <thead>
                        <tr className="action-rolls__header-row">
                            <th className="action-rolls__name-column">Action Name</th>
                            <th>Attribute</th>
                            <th>Skill</th>
                            <th className="action-rolls__button-column">Roll</th>
                            <th className="action-rolls__button-column">Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        {skillChecks.map((check) => (
                            <tr key={check.id} className="data-table__row--dynamic action-rolls__row">
                                <td className="data-table__cell--middle">
                                    <input
                                        type="text"
                                        className="identity-grid__input action-rolls__input"
                                        placeholder="e.g. Investigate"
                                        value={check.name}
                                        onChange={(event) => updateSkillCheck(check.id, 'name', event.target.value)}
                                    />
                                </td>
                                <td className="data-table__cell--middle action-rolls__select-cell">
                                    <select
                                        className="identity-grid__select action-rolls__select"
                                        value={check.attr}
                                        onChange={(event) => updateSkillCheck(check.id, 'attr', event.target.value)}
                                    >
                                        {ATTRIBUTE_OPTIONS.map((attribute) => (
                                            <option key={attribute} value={attribute}>
                                                {attribute.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="data-table__cell--middle action-rolls__select-cell">
                                    <select
                                        className="identity-grid__select action-rolls__select"
                                        value={check.skill}
                                        onChange={(event) => updateSkillCheck(check.id, 'skill', event.target.value)}
                                    >
                                        <option value="none">-- None --</option>
                                        {Object.values(Skill).map((skill) => (
                                            <option key={skill} value={skill.toLowerCase()}>
                                                {skills[skill].customName || skill.charAt(0).toUpperCase() + skill.slice(1)}
                                            </option>
                                        ))}
                                        {extraCategories.map((category) => (
                                            <optgroup key={category.id} label={category.name || 'EXTRA'}>
                                                {category.skills.map((extraSkill) => (
                                                    <option key={extraSkill.id} value={extraSkill.id}>
                                                        {extraSkill.name || 'Unnamed'}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </td>
                                <td className="data-table__cell--middle">
                                    <button
                                        type="button"
                                        className="action-button action-button--dark action-rolls__icon-btn"
                                        onClick={() => rollSkillCheck(check, useCharacterStore.getState())}
                                    >
                                        🎲
                                    </button>
                                </td>
                                <td className="data-table__cell--middle">
                                    <button
                                        type="button"
                                        className="action-button action-button--red action-rolls__icon-btn"
                                        onClick={() => setDeleteRollId(check.id)}
                                    >
                                        X
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                type="button"
                className="action-button action-button--dark action-rolls__add-btn"
                onClick={addSkillCheck}
            >
                + Add Action Roll
            </button>

            {deleteRollId && (
                <div className="action-rolls__modal-overlay">
                    <div className="action-rolls__modal-content">
                        <h3 className="action-rolls__modal-title">⚠️ Confirm Deletion</h3>
                        <p className="action-rolls__modal-text">Are you sure you want to delete this Action Roll?</p>
                        <div className="action-rolls__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setDeleteRollId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => {
                                    removeSkillCheck(deleteRollId);
                                    setDeleteRollId(null);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsingSection>
    );
}