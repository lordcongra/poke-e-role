import React, { useState } from 'react';
import { useCharacterStore, getRankPoints } from '../store/useCharacterStore';
import { Skill } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { CategoryHeader } from './CategoryHeader';
import { SkillRow } from './SkillRow';

export function SkillsTable() {
    const skills = useCharacterStore((state) => state.skills);
    const extras = useCharacterStore((state) => state.extras);
    const setExtra = useCharacterStore((state) => state.setExtra);

    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const addExtraCategory = useCharacterStore((state) => state.addExtraCategory);
    const updateExtraCategory = useCharacterStore((state) => state.updateExtraCategory);
    const updateExtraSkill = useCharacterStore((state) => state.updateExtraSkill);
    const removeExtraCategory = useCharacterStore((state) => state.removeExtraCategory);

    const currentRank = useCharacterStore((state) => state.identity.rank);
    const mode = useCharacterStore((state) => state.identity.mode);
    const rankData = getRankPoints(currentRank);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

    let spentSkill = Object.values(Skill).reduce((accumulator, skillKey) => accumulator + skills[skillKey].base, 0);
    extraCategories.forEach((category) => category.skills.forEach((extraSkill) => (spentSkill += extraSkill.base)));
    const remaining = rankData.skills + extras.skill - spentSkill;

    const isTrainer = mode === 'Trainer';

    return (
        <div className="sheet-panel" style={{ marginBottom: '10px' }}>
            <div className="sheet-panel__header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    SKILLS
                </span>
            </div>

            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div
                        style={{
                            fontSize: '0.85rem',
                            marginBottom: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '4px',
                            background: 'var(--panel-alt)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px'
                        }}
                    >
                        <span>
                            Pts Remaining:{' '}
                            <strong style={{ fontSize: '1rem', color: remaining < 0 ? '#C62828' : 'inherit' }}>
                                {remaining}
                            </strong>{' '}
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                (Max Rank: <span>{rankData.skillLimit}</span>)
                            </span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                            Extra Pts:{' '}
                            <NumberSpinner
                                value={extras.skill}
                                onChange={(value) => setExtra('skill', value)}
                                min={0}
                            />
                        </span>
                    </div>

                    <div className="table-responsive-wrapper">
                        <table className="data-table" id="skills-table">
                            <tbody>
                                <CategoryHeader title="FIGHT" />
                                <SkillRow skill={Skill.BRAWL} defaultLabel="Brawl" />
                                <SkillRow skill={Skill.CHANNEL} defaultLabel={isTrainer ? 'Throw' : 'Channel'} />
                                <SkillRow skill={Skill.CLASH} defaultLabel={isTrainer ? 'Weapon' : 'Clash'} />
                                <SkillRow skill={Skill.EVASION} defaultLabel="Evasion" />

                                <CategoryHeader title="SURVIVE" />
                                <SkillRow skill={Skill.ALERT} defaultLabel="Alert" />
                                <SkillRow skill={Skill.ATHLETIC} defaultLabel="Athletic" />
                                <SkillRow skill={Skill.NATURE} defaultLabel="Nature" />
                                <SkillRow skill={Skill.STEALTH} defaultLabel="Stealth" />

                                <CategoryHeader title="SOCIAL" />
                                <SkillRow skill={Skill.CHARM} defaultLabel={isTrainer ? 'Empathy' : 'Charm'} />
                                <SkillRow skill={Skill.ETIQUETTE} defaultLabel="Etiquette" />
                                <SkillRow skill={Skill.INTIMIDATE} defaultLabel="Intimidate" />
                                <SkillRow skill={Skill.PERFORM} defaultLabel="Perform" />

                                <CategoryHeader title={isTrainer ? 'KNOWLEDGE' : 'KNOWLEDGE (PMD)'} />
                                <SkillRow skill={Skill.CRAFTS} defaultLabel="Crafts" />
                                <SkillRow skill={Skill.LORE} defaultLabel="Lore" />
                                <SkillRow skill={Skill.MEDICINE} defaultLabel="Medicine" />
                                <SkillRow skill={Skill.MAGIC} defaultLabel={isTrainer ? 'Science' : 'Magic'} />

                                {extraCategories.map((category) => (
                                    <React.Fragment key={category.id}>
                                        <tr style={{ background: '#C62828', color: 'white' }}>
                                            <th style={{ textAlign: 'left', paddingLeft: '6px' }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        value={category.name}
                                                        onChange={(e) =>
                                                            updateExtraCategory(category.id, e.target.value)
                                                        }
                                                        placeholder="CAT NAME"
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            width: '100px',
                                                            outline: 'none'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => setDeleteCategoryId(category.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            </th>
                                            <th>Base</th>
                                            <th>Buff</th>
                                            <th>Total</th>
                                        </tr>
                                        {category.skills.map((extraSkill) => (
                                            <tr key={extraSkill.id} className="data-table__row--dynamic">
                                                <td
                                                    className="data-table__cell--middle-left"
                                                    style={{ paddingLeft: '4px' }}
                                                >
                                                    <input
                                                        type="text"
                                                        value={extraSkill.name}
                                                        onChange={(e) =>
                                                            updateExtraSkill(
                                                                category.id,
                                                                extraSkill.id,
                                                                'name',
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Skill"
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
                                                        <NumberSpinner
                                                            value={extraSkill.base}
                                                            onChange={(value) =>
                                                                updateExtraSkill(
                                                                    category.id,
                                                                    extraSkill.id,
                                                                    'base',
                                                                    value
                                                                )
                                                            }
                                                            min={0}
                                                            max={5}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="data-table__cell--middle">
                                                    <div className="flex-layout--row-center">
                                                        <NumberSpinner
                                                            value={extraSkill.buff}
                                                            onChange={(value) =>
                                                                updateExtraSkill(
                                                                    category.id,
                                                                    extraSkill.id,
                                                                    'buff',
                                                                    value
                                                                )
                                                            }
                                                            min={0}
                                                        />
                                                    </div>
                                                </td>
                                                <td
                                                    className="data-table__cell--middle"
                                                    style={{
                                                        fontWeight: 'bold',
                                                        color: 'var(--primary)',
                                                        fontSize: '1rem'
                                                    }}
                                                >
                                                    {extraSkill.base + extraSkill.buff}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        onClick={addExtraCategory}
                        className="action-button action-button--dark"
                        style={{ width: '100%', marginTop: '4px' }}
                    >
                        + Add Skill Category
                    </button>
                </div>
            )}

            {deleteCategoryId && (
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
                            Are you sure you want to delete this custom skill category?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setDeleteCategoryId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => {
                                    removeExtraCategory(deleteCategoryId);
                                    setDeleteCategoryId(null);
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
