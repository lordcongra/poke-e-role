import React, { useState } from 'react';
import { useCharacterStore, getRankPoints } from '../../store/useCharacterStore';
import { Skill } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { CategoryHeader } from '../ui/CategoryHeader';
import { SkillRow } from './SkillRow';
import { CollapsingSection } from '../ui/CollapsingSection';
import './SkillsTable.css';

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

    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

    let spentSkill = Object.values(Skill).reduce(
        (accumulator: number, skillKey: string) => accumulator + skills[skillKey as Skill].base,
        0
    );
    extraCategories.forEach((category) => category.skills.forEach((extraSkill) => (spentSkill += extraSkill.base)));
    const remainingPoints = rankData.skills + extras.skill - spentSkill;

    const isTrainer = mode === 'Trainer';

    return (
        <CollapsingSection title="SKILLS">
            <div className="skills-table__info-bar">
                <span>
                    Pts Remaining:{' '}
                    <strong
                        className={`skills-table__remaining-text ${
                            remainingPoints < 0 ? 'skills-table__negative-remaining' : ''
                        }`}
                    >
                        {remainingPoints}
                    </strong>{' '}
                    <span className="skills-table__max-label">
                        (Max Rank: <span>{rankData.skillLimit}</span>)
                    </span>
                </span>
                <span className="skills-table__extra-container">
                    Extra Pts:{' '}
                    <NumberSpinner
                        value={extras.skill}
                        onChange={(value: number) => setExtra('skill', value)}
                        min={0}
                    />
                </span>
            </div>

            <div className="table-responsive-wrapper">
                <table className="data-table">
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
                                <tr className="category-header__row">
                                    <th className="category-header__title">
                                        <div className="skills-table__custom-category-header">
                                            <input
                                                type="text"
                                                value={category.name}
                                                onChange={(event) =>
                                                    updateExtraCategory(category.id, event.target.value)
                                                }
                                                placeholder="CAT NAME"
                                                className="skills-table__custom-category-input"
                                            />
                                        </div>
                                    </th>
                                    <th>Base</th>
                                    <th>Buff</th>
                                    <th>Total</th>
                                </tr>
                                {category.skills.map((extraSkill) => (
                                    <tr key={extraSkill.id} className="data-table__row--dynamic">
                                        <td className="data-table__cell--middle-left skill-row__input-cell">
                                            <input
                                                type="text"
                                                value={extraSkill.name}
                                                onChange={(event) =>
                                                    updateExtraSkill(
                                                        category.id,
                                                        extraSkill.id,
                                                        'name',
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Skill"
                                                className="skills-table__custom-skill-input"
                                            />
                                        </td>
                                        <td className="data-table__cell--middle">
                                            <div className="flex-layout--row-center">
                                                <NumberSpinner
                                                    value={extraSkill.base}
                                                    onChange={(value: number) =>
                                                        updateExtraSkill(category.id, extraSkill.id, 'base', value)
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
                                                    onChange={(value: number) =>
                                                        updateExtraSkill(category.id, extraSkill.id, 'buff', value)
                                                    }
                                                    min={0}
                                                />
                                            </div>
                                        </td>
                                        <td className="data-table__cell--middle skill-row__total-cell">
                                            {extraSkill.base + extraSkill.buff}
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={4} className="skills-table__delete-cell">
                                        <button
                                            type="button"
                                            onClick={() => setDeleteCategoryId(category.id)}
                                            className="action-button action-button--red action-button--full-width"
                                        >
                                            - Delete "{category.name || 'Category'}"
                                        </button>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                type="button"
                onClick={addExtraCategory}
                className="action-button action-button--dark skills-table__add-btn"
            >
                + Add Skill Category
            </button>

            {deleteCategoryId && (
                <div className="skills-table__modal-overlay">
                    <div className="skills-table__modal-content">
                        <h3 className="skills-table__modal-title">⚠️ Confirm Deletion</h3>
                        <p className="skills-table__modal-text">
                            Are you sure you want to delete this custom skill category?
                        </p>
                        <div className="skills-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark skills-table__modal-btn"
                                onClick={() => setDeleteCategoryId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red skills-table__modal-btn"
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
        </CollapsingSection>
    );
}
