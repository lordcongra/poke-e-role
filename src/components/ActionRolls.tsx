// src/components/ActionRolls.tsx
import { useCharacterStore } from '../store/useCharacterStore';

// Strict arrays for our dropdowns (No magic strings!)
const ATTR_OPTIONS = ['str', 'dex', 'vit', 'spe', 'ins', 'tou', 'coo', 'bea', 'cut', 'cle', 'will'];
const SKILL_OPTIONS = ['none', 'brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'charm', 'etiquette', 'intimidate', 'perform', 'crafts', 'lore', 'medicine', 'magic'];

export function ActionRolls() {
    // 1. Subscribe to the Brain
    const skillChecks = useCharacterStore(state => state.skillChecks);
    const addSkillCheck = useCharacterStore(state => state.addSkillCheck);
    const updateSkillCheck = useCharacterStore(state => state.updateSkillCheck);
    const removeSkillCheck = useCharacterStore(state => state.removeSkillCheck);

    return (
        <div className="sheet-panel">
            <div className="sheet-panel__header">ACTION ROLLS</div>
            <div className="panel-content-wrapper">
                <table className="data-table" style={{ textAlign: 'left' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '40%' }}>Action Name</th>
                            <th>Attribute</th>
                            <th>Skill</th>
                            <th style={{ width: '35px', textAlign: 'center' }}>Roll</th>
                            <th style={{ width: '35px', textAlign: 'center' }}>Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 2. Map over the array to generate rows dynamically */}
                        {skillChecks.map(check => (
                            <tr key={check.id} className="data-table__row--dynamic">
                                <td className="data-table__cell--middle">
                                    <input 
                                        type="text" 
                                        className="check-input form-input--transparent" 
                                        placeholder="e.g. Investigate"
                                        value={check.name}
                                        onChange={e => updateSkillCheck(check.id, 'name', e.target.value)}
                                    />
                                </td>
                                <td className="data-table__cell--middle">
                                    <select 
                                        className="check-input form-select--bordered"
                                        value={check.attr}
                                        onChange={e => updateSkillCheck(check.id, 'attr', e.target.value)}
                                    >
                                        {ATTR_OPTIONS.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                                    </select>
                                </td>
                                <td className="data-table__cell--middle">
                                    <select 
                                        className="check-input form-select--bordered"
                                        value={check.skill}
                                        onChange={e => updateSkillCheck(check.id, 'skill', e.target.value)}
                                    >
                                        {SKILL_OPTIONS.map(s => (
                                            <option key={s} value={s}>
                                                {s === 'none' ? '-- None --' : s.charAt(0).toUpperCase() + s.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="data-table__cell--middle">
                                    <button 
                                        type="button" 
                                        className="check-roll-btn action-button action-button--dark" 
                                        style={{ padding: '2px 6px' }} 
                                        onClick={() => alert(`Rolled ${check.name || 'Skill Check'}!`)}
                                    >
                                        🎲
                                    </button>
                                </td>
                                <td className="data-table__cell--middle">
                                    <button 
                                        type="button" 
                                        className="check-del-btn action-button action-button--red" 
                                        style={{ padding: '2px 6px' }} 
                                        onClick={() => removeSkillCheck(check.id)}
                                    >
                                        X
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button 
                    type="button" 
                    className="action-button action-button--dark action-button--full-width" 
                    style={{ background: '#1976d2', color: 'white' }} 
                    onClick={addSkillCheck}
                >
                    + Add Action Roll
                </button>
            </div>
        </div>
    );
}