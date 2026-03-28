// src/components/SkillsTable.tsx
import { useCharacterStore } from '../store/useCharacterStore';
import { Skill } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';

function CategoryHeader({ title }: { title: string }) {
    return (
        <tr>
            <th style={{ textAlign: 'left' }}>{title}</th>
            <th>Base</th>
            <th>Buff</th>
            <th>Total</th>
        </tr>
    );
}

function SkillRow({ skill, label }: { skill: Skill, label: string }) {
    // We now grab the full object { base, buff }
    const data = useCharacterStore(state => state.skills[skill]);
    const setSkill = useCharacterStore(state => state.setSkill);
    
    // Math Engine: Derive total dynamically
    const total = data.base + data.buff;

    return (
        <tr className="data-table__row--dynamic">
            <td className="data-table__cell--middle-left" style={{ fontWeight: 'bold' }}>{label}</td>
            <td className="data-table__cell--middle">
                <div className="flex-layout--row-center">
                    <NumberSpinner value={data.base} onChange={(val) => setSkill(skill, 'base', val)} min={0} max={5} />
                </div>
            </td>
            <td className="data-table__cell--middle">
                <div className="flex-layout--row-center">
                    <NumberSpinner value={data.buff} onChange={(val) => setSkill(skill, 'buff', val)} min={0} />
                </div>
            </td>
            <td className="data-table__cell--middle" style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1rem' }}>
                {total}
            </td>
        </tr>
    );
}

export function SkillsTable() {
    return (
        <div className="sheet-panel" style={{ marginBottom: '10px' }}>
            <div className="sheet-panel__header">SKILLS</div>
            <div className="panel-content-wrapper">
                <table className="data-table data-table--red-header" id="skills-table">
                    <tbody>
                        <CategoryHeader title="FIGHT" />
                        <SkillRow skill={Skill.BRAWL} label="Brawl" />
                        <SkillRow skill={Skill.CHANNEL} label="Channel" />
                        <SkillRow skill={Skill.CLASH} label="Clash" />
                        <SkillRow skill={Skill.EVASION} label="Evasion" />

                        <CategoryHeader title="SURVIVE" />
                        <SkillRow skill={Skill.ALERT} label="Alert" />
                        <SkillRow skill={Skill.ATHLETIC} label="Athletic" />
                        <SkillRow skill={Skill.NATURE} label="Nature" />
                        <SkillRow skill={Skill.STEALTH} label="Stealth" />

                        <CategoryHeader title="SOCIAL" />
                        <SkillRow skill={Skill.CHARM} label="Charm" />
                        <SkillRow skill={Skill.ETIQUETTE} label="Etiquette" />
                        <SkillRow skill={Skill.INTIMIDATE} label="Intimidate" />
                        <SkillRow skill={Skill.PERFORM} label="Perform" />

                        <CategoryHeader title="KNOWLEDGE (PMD)" />
                        <SkillRow skill={Skill.CRAFTS} label="Crafts" />
                        <SkillRow skill={Skill.LORE} label="Lore" />
                        <SkillRow skill={Skill.MEDICINE} label="Medicine" />
                        <SkillRow skill={Skill.MAGIC} label="Magic" />
                    </tbody>
                </table>
            </div>
        </div>
    );
}