import React, { useState } from 'react';
import { useCharacterStore, getRankPoints } from '../../store/useCharacterStore';
import { Skill } from '../../types/enums';
import { NumberSpinner } from '../ui/NumberSpinner';
import { CategoryHeader } from '../ui/CategoryHeader';
import { SkillRow } from './SkillRow';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TooltipIcon } from '../ui/TooltipIcon';
import { parseCombatTags, getAbilityText, calculateSkillTotal } from '../../utils/combat/combatUtils';
import { Plus, Trash2, FolderPlus } from 'lucide-react';
import { SkillsTableModals } from './SkillsTableModals';
import './SkillsTable.css';

export function SkillsTable() {
    const skills = useCharacterStore((state) => state.skills);
    const extras = useCharacterStore((state) => state.extras);
    const setExtra = useCharacterStore((state) => state.setExtra);

    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const addExtraCategory = useCharacterStore((state) => state.addExtraCategory);
    const addExtraSkill = useCharacterStore((state) => state.addExtraSkill);
    const removeExtraSkill = useCharacterStore((state) => state.removeExtraSkill);
    const updateExtraCategory = useCharacterStore((state) => state.updateExtraCategory);
    const updateExtraSkill = useCharacterStore((state) => state.updateExtraSkill);
    const removeExtraCategory = useCharacterStore((state) => state.removeExtraCategory);

    const currentRank = useCharacterStore((state) => state.identity.rank);
    const mode = useCharacterStore((state) => state.identity.mode);
    const pmdSkills = useCharacterStore((state) => state.identity.pmdSkills);
    const rankData = getRankPoints(currentRank);

    const inventory = useCharacterStore((state) => state.inventory);
    const passives = useCharacterStore((state) => state.passives);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);
    useCharacterStore((state) => state.identity.abilityActive);
    useCharacterStore((state) => state.identity.abilityTags);
    useCharacterStore((state) => state.health.hpCurr);
    useCharacterStore((state) => state.health.hpMax);

    const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleteSkillTarget, setDeleteSkillTarget] = useState<{
        categoryId: string;
        skillId: string;
        name: string;
    } | null>(null);
    const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

    const isTrainer = mode !== 'Pokémon';
    const isSpecialTrainer = mode === 'Trainer (Special)';
    const showKnowledgeCategory = isTrainer || pmdSkills !== false;

    const PMD_SKILLS = new Set<Skill>([Skill.CRAFTS, Skill.LORE, Skill.MEDICINE, Skill.MAGIC]);

    let spentSkill = Object.values(Skill).reduce((accumulator: number, skillKey: string) => {
        if (!showKnowledgeCategory && PMD_SKILLS.has(skillKey as Skill)) {
            return accumulator;
        }
        return accumulator + skills[skillKey as Skill].base;
    }, 0);
    extraCategories.forEach((category) => category.skills.forEach((extraSkill) => (spentSkill += extraSkill.base)));
    const remainingPoints = rankData.skills + extras.skill - spentSkill;

    const abilityText = getAbilityText(ability, customAbilities);
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText, passives);
    const fullState = useCharacterStore.getState();

    return (
        <CollapsingSection title="SKILLS">
            <div className="skills-table__info-bar text-label">
                <span>
                    Pts Remaining:{' '}
                    <strong
                        className={`text-value-highlight ${
                            remainingPoints < 0 ? 'skills-table__negative-remaining' : ''
                        }`}
                        style={{ fontSize: '1rem' }}
                    >
                        {remainingPoints}
                    </strong>{' '}
                    <span className="text-subtext">
                        (Max Rank: <span>{rankData.skillLimit}</span>)
                    </span>
                </span>
                <span className="skills-table__extra-container">
                    <span className="text-subtext">Extra Pts:</span>
                    <NumberSpinner
                        value={extras.skill}
                        onChange={(value: number) => setExtra('skill', value)}
                        min={0}
                    />
                </span>
            </div>

            <div className="table-responsive-wrapper">
                <table className="data-table skills-table__table">
                    <colgroup>
                        <col className="skills-table__col-name" />
                        <col className="skills-table__col-rank" />
                        <col className="skills-table__col-buff" />
                        <col className="skills-table__col-total" />
                    </colgroup>
                    <tbody>
                        <CategoryHeader title="FIGHT" />
                        <SkillRow skill={Skill.BRAWL} defaultLabel="Brawl" />
                        <SkillRow skill={Skill.CHANNEL} defaultLabel={isTrainer ? 'Throw' : 'Channel'} />
                        <SkillRow
                            skill={Skill.CLASH}
                            defaultLabel={isSpecialTrainer ? 'Channel' : isTrainer ? 'Weapon' : 'Clash'}
                        />
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

                        {showKnowledgeCategory && (
                            <>
                                <CategoryHeader
                                    title={
                                        isTrainer ? (
                                            'KNOWLEDGE'
                                        ) : (
                                            <span className="skills-table__pmd-header">
                                                KNOWLEDGE (PMD){' '}
                                                <TooltipIcon
                                                    onClick={() =>
                                                        setInfoModal({
                                                            title: 'Pokémon Mystery Dungeon Skills',
                                                            content:
                                                                'These Knowledge skills (Crafts, Lore, Medicine, and Magic) are enabled for Pokémon Mystery Dungeon (PMD) campaigns. If you are playing a standard Pokémon game without Mystery Dungeon rules, a GM can disable this category in Room Rules & Permissions.'
                                                        })
                                                    }
                                                />
                                            </span>
                                        )
                                    }
                                />
                                <SkillRow skill={Skill.CRAFTS} defaultLabel="Crafts" />
                                <SkillRow skill={Skill.LORE} defaultLabel="Lore" />
                                <SkillRow skill={Skill.MEDICINE} defaultLabel="Medicine" />
                                <SkillRow skill={Skill.MAGIC} defaultLabel={isTrainer ? 'Science' : 'Magic'} />
                            </>
                        )}

                        {extraCategories.map((category) => (
                            <React.Fragment key={category.id}>
                                <tr className="category-header__row text-theme-header">
                                    <th className="category-header__title">
                                        <div className="skills-table__custom-category-header">
                                            <input
                                                type="text"
                                                value={category.name}
                                                onChange={(event) =>
                                                    updateExtraCategory(category.id, event.target.value)
                                                }
                                                placeholder="CATEGORY"
                                                className="skills-table__custom-category-input text-theme-header"
                                            />
                                        </div>
                                    </th>
                                    <th>Rank</th>
                                    <th>Buff</th>
                                    <th>Total</th>
                                </tr>
                                {category.skills.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            style={{
                                                textAlign: 'center',
                                                padding: '10px 4px',
                                                color: 'var(--text-subtext)',
                                                fontSize: '0.82rem'
                                            }}
                                        >
                                            No skills in this category yet. Click &ldquo;Add Skill&rdquo; below to add
                                            one.
                                        </td>
                                    </tr>
                                )}
                                {category.skills.map((extraSkill) => (
                                    <tr key={extraSkill.id} className="data-table__row--dynamic">
                                        <td className="data-table__cell--middle-left skill-row__input-cell">
                                            <div className="skills-table__custom-skill-row">
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
                                                    className="skills-table__custom-skill-input text-label"
                                                    style={{ color: 'var(--text-main)' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteSkillTarget({
                                                            categoryId: category.id,
                                                            skillId: extraSkill.id,
                                                            name: extraSkill.name || 'Skill'
                                                        })
                                                    }
                                                    className="skills-table__skill-delete-btn"
                                                    title={`Delete ${extraSkill.name || 'Skill'}`}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
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
                                        <td className="data-table__cell--middle text-value-highlight">
                                            {calculateSkillTotal(extraSkill.id as Skill, fullState, inventoryModifiers)}
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={4} className="skills-table__delete-cell">
                                        <div className="skills-table__category-row-actions">
                                            <button
                                                type="button"
                                                onClick={() => addExtraSkill(category.id)}
                                                className="action-button action-button--dark skills-table__category-action-btn text-theme-header"
                                                title={`Add another skill to ${category.name || 'Category'}`}
                                            >
                                                <Plus size={13} style={{ flexShrink: 0 }} />
                                                <span>Add Skill</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDeleteCategoryTarget({
                                                        id: category.id,
                                                        name: category.name || 'Category'
                                                    })
                                                }
                                                className="action-button action-button--red skills-table__category-action-btn text-theme-header"
                                                title={`Delete ${category.name || 'Category'}`}
                                            >
                                                <Trash2 size={13} style={{ flexShrink: 0 }} />
                                                <span className="skills-table__btn-label">
                                                    Delete &ldquo;{category.name || 'Category'}&rdquo;
                                                </span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="skills-table__bottom-actions">
                <button
                    type="button"
                    onClick={() => addExtraSkill()}
                    className="action-button action-button--dark skills-table__bottom-btn text-theme-header"
                    title="Add a single skill"
                >
                    <Plus size={15} /> Add Skill
                </button>
                <button
                    type="button"
                    onClick={() => addExtraCategory()}
                    className="action-button action-button--dark skills-table__bottom-btn text-theme-header"
                    title="Add a new custom skill category"
                >
                    <FolderPlus size={15} /> Add Category
                </button>
            </div>

            <SkillsTableModals
                deleteCategoryTarget={deleteCategoryTarget}
                onCloseCategoryDelete={() => setDeleteCategoryTarget(null)}
                onConfirmCategoryDelete={(id) => {
                    removeExtraCategory(id);
                    setDeleteCategoryTarget(null);
                }}
                deleteSkillTarget={deleteSkillTarget}
                onCloseSkillDelete={() => setDeleteSkillTarget(null)}
                onConfirmSkillDelete={(categoryId, skillId) => {
                    removeExtraSkill(categoryId, skillId);
                    setDeleteSkillTarget(null);
                }}
                infoModal={infoModal}
                onCloseInfoModal={() => setInfoModal(null)}
            />
        </CollapsingSection>
    );
}
