// src/components/ActionRolls.tsx
import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { rollSkillCheck } from '../utils/combatUtils';

const ATTR_OPTIONS = [...Object.values(CombatStat), ...Object.values(SocialStat), 'will'] as const;

export function ActionRolls() {
    const skillChecks = useCharacterStore((state) => state.skillChecks);
    const addSkillCheck = useCharacterStore((state) => state.addSkillCheck);
    const updateSkillCheck = useCharacterStore((state) => state.updateSkillCheck);
    const removeSkillCheck = useCharacterStore((state) => state.removeSkillCheck);

    const skills = useCharacterStore((state) => state.skills);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [deleteRollId, setDeleteRollId] = useState<string | null>(null);

    return (
        <div className="sheet-panel">
            <div className="sheet-panel__header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    ACTION ROLLS
                </span>
            </div>

            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div className="table-responsive-wrapper">
                        <table className="data-table" style={{ textAlign: 'left', width: '100%' }}>
                            <thead>
                                <tr style={{ background: '#333', color: 'white', fontSize: '0.8rem' }}>
                                    <th style={{ width: '40%' }}>Action Name</th>
                                    <th>Attribute</th>
                                    <th>Skill</th>
                                    <th style={{ width: '35px', textAlign: 'center' }}>Roll</th>
                                    <th style={{ width: '35px', textAlign: 'center' }}>Del</th>
                                </tr>
                            </thead>
                            <tbody>
                                {skillChecks.map((check) => (
                                    <tr
                                        key={check.id}
                                        className="data-table__row--dynamic"
                                        style={{ fontSize: '0.85rem' }}
                                    >
                                        <td className="data-table__cell--middle">
                                            <input
                                                type="text"
                                                className="identity-grid__input"
                                                placeholder="e.g. Investigate"
                                                value={check.name}
                                                onChange={(e) => updateSkillCheck(check.id, 'name', e.target.value)}
                                                style={{ width: '100%', padding: '4px' }}
                                            />
                                        </td>
                                        <td className="data-table__cell--middle" style={{ padding: '2px' }}>
                                            <select
                                                className="identity-grid__select"
                                                value={check.attr}
                                                onChange={(e) => updateSkillCheck(check.id, 'attr', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '2px',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                {ATTR_OPTIONS.map((a) => (
                                                    <option key={a} value={a}>
                                                        {a.toUpperCase()}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="data-table__cell--middle" style={{ padding: '2px' }}>
                                            <select
                                                className="identity-grid__select"
                                                value={check.skill}
                                                onChange={(e) => updateSkillCheck(check.id, 'skill', e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '2px',
                                                    border: '1px solid var(--border)'
                                                }}
                                            >
                                                <option value="none">-- None --</option>
                                                {Object.values(Skill).map((s) => (
                                                    <option key={s} value={s.toLowerCase()}>
                                                        {skills[s].customName || s.charAt(0).toUpperCase() + s.slice(1)}
                                                    </option>
                                                ))}
                                                {extraCategories.map((cat) => (
                                                    <optgroup key={cat.id} label={cat.name || 'EXTRA'}>
                                                        {cat.skills.map((sk) => (
                                                            <option key={sk.id} value={sk.id}>
                                                                {sk.name || 'Unnamed'}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="data-table__cell--middle">
                                            <button
                                                type="button"
                                                className="action-button action-button--dark"
                                                style={{ padding: '2px 6px', cursor: 'pointer' }}
                                                onClick={() => rollSkillCheck(check, useCharacterStore.getState())}
                                            >
                                                🎲
                                            </button>
                                        </td>
                                        <td className="data-table__cell--middle">
                                            <button
                                                type="button"
                                                className="action-button action-button--red"
                                                style={{ padding: '2px 6px', cursor: 'pointer' }}
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
                        className="action-button action-button--dark"
                        style={{ width: '100%', marginTop: '4px', background: '#1976d2', borderColor: '#1976d2' }}
                        onClick={addSkillCheck}
                    >
                        + Add Action Roll
                    </button>
                </div>
            )}

            {deleteRollId && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1200,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '300px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#C62828', marginTop: 0, fontSize: '1.1rem' }}>⚠️ Confirm Deletion</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            Are you sure you want to delete this Action Roll?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
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
        </div>
    );
}
