import { Skill } from '../../types/enums';
import { calculateSkillTotal } from '../../utils/combat/combatUtils';
import { renderSkill } from './printHelpers';
import type { CharacterState, PrintConfig } from '../../store/storeTypes';
import type { CombatBonuses } from '../../utils/tagParser/tagTypes';

interface PrintSkillsGridProps {
    fullState: CharacterState;
    inventoryModifiers: CombatBonuses;
    config: PrintConfig;
}

export function PrintSkillsGrid({ fullState, inventoryModifiers, config }: PrintSkillsGridProps) {
    if (config.hideSkills) return null;

    const { skills, identity, extraCategories } = fullState;
    const statStyle = config.statStyle || 'dots';

    const getSkillVal = (skillKey: Skill) => calculateSkillTotal(skillKey, fullState, inventoryModifiers);

    const skillColumns = [];

    // Fight
    skillColumns.push(
        <div key="fight">
            <div className="print-sheet__skill-col-title">FIGHT</div>
            {renderSkill('Brawl', getSkillVal(Skill.BRAWL), config.blankSkills, statStyle)}
            {renderSkill(
                skills[Skill.CHANNEL]?.customName || 'Channel',
                getSkillVal(Skill.CHANNEL),
                config.blankSkills,
                statStyle
            )}
            {renderSkill(
                skills[Skill.CLASH]?.customName || 'Clash',
                getSkillVal(Skill.CLASH),
                config.blankSkills,
                statStyle
            )}
            {renderSkill('Evasion', getSkillVal(Skill.EVASION), config.blankSkills, statStyle)}
        </div>
    );

    // Survive
    skillColumns.push(
        <div key="survive">
            <div className="print-sheet__skill-col-title">SURVIVE</div>
            {renderSkill('Alert', getSkillVal(Skill.ALERT), config.blankSkills, statStyle)}
            {renderSkill('Athletic', getSkillVal(Skill.ATHLETIC), config.blankSkills, statStyle)}
            {renderSkill('Nature', getSkillVal(Skill.NATURE), config.blankSkills, statStyle)}
            {renderSkill('Stealth', getSkillVal(Skill.STEALTH), config.blankSkills, statStyle)}
        </div>
    );

    // Social
    skillColumns.push(
        <div key="social">
            <div className="print-sheet__skill-col-title">SOCIAL</div>
            {renderSkill(
                skills[Skill.CHARM]?.customName || 'Charm',
                getSkillVal(Skill.CHARM),
                config.blankSkills,
                statStyle
            )}
            {renderSkill('Etiquette', getSkillVal(Skill.ETIQUETTE), config.blankSkills, statStyle)}
            {renderSkill('Intimidate', getSkillVal(Skill.INTIMIDATE), config.blankSkills, statStyle)}
            {renderSkill('Perform', getSkillVal(Skill.PERFORM), config.blankSkills, statStyle)}
        </div>
    );

    if (!config.coreSkillsOnly) {
        const isTrainer = identity.mode !== 'Pokémon';
        const showKnowledge = !config.hideKnowledgeSkills && (isTrainer || identity.pmdSkills !== false);

        if (showKnowledge) {
            skillColumns.push(
                <div key="knowledge">
                    <div className="print-sheet__skill-col-title">KNOWLEDGE</div>
                    {renderSkill('Crafts', getSkillVal(Skill.CRAFTS), config.blankSkills, statStyle)}
                    {renderSkill('Lore', getSkillVal(Skill.LORE), config.blankSkills, statStyle)}
                    {renderSkill('Medicine', getSkillVal(Skill.MEDICINE), config.blankSkills, statStyle)}
                    {renderSkill(
                        skills[Skill.MAGIC]?.customName || (isTrainer ? 'Science' : 'Magic'),
                        getSkillVal(Skill.MAGIC),
                        config.blankSkills,
                        statStyle
                    )}
                </div>
            );
        }

        if (!config.hideCustomSkills && extraCategories) {
            extraCategories.forEach((cat) => {
                const catSkills = cat.skills.filter(
                    (sk) => config.blankSkills || (sk.name && sk.name.trim().length > 0) || sk.base > 0
                );
                if (catSkills.length > 0 || config.blankSkills) {
                    skillColumns.push(
                        <div key={cat.id}>
                            <div className="print-sheet__skill-col-title">{cat.name.toUpperCase() || 'CUSTOM'}</div>
                            {catSkills.map((sk) =>
                                renderSkill(sk.name || '__________', sk.base, config.blankSkills, statStyle)
                            )}
                        </div>
                    );
                }
            });
        }
    }

    if (skillColumns.length === 0) return null;

    return (
        <div className="print-sheet__section">
            <h4 className="print-sheet__section-title">Skills</h4>
            <div
                className={`print-sheet__skills-grid ${config.coreSkillsOnly ? 'print-sheet__skills-grid--core' : ''}`}
            >
                {skillColumns}
            </div>
        </div>
    );
}
