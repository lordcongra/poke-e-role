import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { getAbilityText } from '../../utils/combatUtils';
import { fetchAbilityData } from '../../utils/api';
import './PrintSheet.css';

export function PrintSheet() {
    const state = useCharacterStore();
    const { identity, stats, socials, skills, moves, roomCustomAbilities, extraCategories } = state;
    const config = identity.printConfig;
    const statStyle = config.statStyle || 'dots';

    const [fetchedAbilities, setFetchedAbilities] = useState<Record<string, string>>({});
    const [isReadyToPrint, setIsReadyToPrint] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const preparePrint = async () => {
            const results: Record<string, string> = {};
            for (const abName of identity.availableAbilities) {
                if (!getAbilityText(abName, roomCustomAbilities)) {
                    const data = await fetchAbilityData(abName);
                    if (data && (data.Description || data.Effect)) {
                        results[abName] = [data.Description, data.Effect].filter(Boolean).join(' ');
                    }
                }
            }
            if (isMounted) {
                setFetchedAbilities(results);
                setIsReadyToPrint(true);
            }
        };
        preparePrint();
        return () => { isMounted = false; };
    }, [identity.availableAbilities, roomCustomAbilities]);

    useEffect(() => {
        if (isReadyToPrint) {
            const timer = setTimeout(() => {
                window.print();
                useCharacterStore.getState().setIdentity('isPrinting', false);
            }, 250);
            return () => clearTimeout(timer);
        }
    }, [isReadyToPrint]);

    const renderStatValue = (filled: number, limit: number, isBlank: boolean) => {
        const val = isBlank ? '' : filled;
        
        let dotsNode = null;
        if (statStyle === 'dots' || statStyle === 'both') {
            const dots = [];
            for (let i = 0; i < limit; i++) {
                dots.push(i < filled && !isBlank ? '●' : '○');
            }
            dotsNode = <span className="print-sheet__dots">{dots.join('')}</span>;
        }

        let numNode = null;
        if (statStyle === 'numbers' || statStyle === 'both') {
            numNode = <span className="print-sheet__number">{val}</span>;
        }

        return (
            <div className="print-sheet__stat-value-container">
                {dotsNode}
                {numNode}
            </div>
        );
    };

    const renderStat = (label: string, filled: number, limit: number, isBlank: boolean) => (
        <div className="print-sheet__stat-row">
            <span className="print-sheet__stat-name">{label}</span>
            {renderStatValue(filled, limit, isBlank)}
        </div>
    );

    const renderSkill = (label: string, filled: number, isBlank: boolean) => (
        <div className="print-sheet__stat-row">
            <span className="print-sheet__stat-name" style={{ width: '65px', fontSize: '0.75rem' }}>
                {label}
            </span>
            {renderStatValue(filled, 5, isBlank)}
        </div>
    );

    const skillColumns = [];

    skillColumns.push(
        <div key="fight">
            <div className="print-sheet__skill-col-title">FIGHT</div>
            {renderSkill('Brawl', skills[Skill.BRAWL].base, config.blankSkills)}
            {renderSkill(skills[Skill.CHANNEL].customName || 'Channel', skills[Skill.CHANNEL].base, config.blankSkills)}
            {renderSkill(skills[Skill.CLASH].customName || 'Clash', skills[Skill.CLASH].base, config.blankSkills)}
            {renderSkill('Evasion', skills[Skill.EVASION].base, config.blankSkills)}
        </div>
    );

    skillColumns.push(
        <div key="survive">
            <div className="print-sheet__skill-col-title">SURVIVE</div>
            {renderSkill('Alert', skills[Skill.ALERT].base, config.blankSkills)}
            {renderSkill('Athletic', skills[Skill.ATHLETIC].base, config.blankSkills)}
            {renderSkill('Nature', skills[Skill.NATURE].base, config.blankSkills)}
            {renderSkill('Stealth', skills[Skill.STEALTH].base, config.blankSkills)}
        </div>
    );

    skillColumns.push(
        <div key="social">
            <div className="print-sheet__skill-col-title">SOCIAL</div>
            {renderSkill(skills[Skill.CHARM].customName || 'Charm', skills[Skill.CHARM].base, config.blankSkills)}
            {renderSkill('Etiquette', skills[Skill.ETIQUETTE].base, config.blankSkills)}
            {renderSkill('Intimidate', skills[Skill.INTIMIDATE].base, config.blankSkills)}
            {renderSkill('Perform', skills[Skill.PERFORM].base, config.blankSkills)}
        </div>
    );

    if (!config.coreSkillsOnly) {
        if (!config.hideKnowledgeSkills) {
            skillColumns.push(
                <div key="knowledge">
                    <div className="print-sheet__skill-col-title">KNOWLEDGE</div>
                    {renderSkill('Crafts', skills[Skill.CRAFTS].base, config.blankSkills)}
                    {renderSkill('Lore', skills[Skill.LORE].base, config.blankSkills)}
                    {renderSkill('Medicine', skills[Skill.MEDICINE].base, config.blankSkills)}
                    {renderSkill(skills[Skill.MAGIC].customName || 'Magic', skills[Skill.MAGIC].base, config.blankSkills)}
                </div>
            );
        }

        if (!config.hideCustomSkills) {
            extraCategories.forEach((cat) => {
                skillColumns.push(
                    <div key={cat.id}>
                        <div className="print-sheet__skill-col-title">{cat.name.toUpperCase() || 'CUSTOM'}</div>
                        {cat.skills.map((sk) => renderSkill(sk.name || '__________', sk.base, config.blankSkills))}
                    </div>
                );
            });
        }

        while (skillColumns.length < 4 || skillColumns.length % 4 !== 0) {
            skillColumns.push(
                <div key={`blank-${skillColumns.length}`}>
                    <div className="print-sheet__skill-col-title">EXTRA</div>
                    {renderSkill('__________', 0, true)}
                    {renderSkill('__________', 0, true)}
                    {renderSkill('__________', 0, true)}
                    {renderSkill('__________', 0, true)}
                </div>
            );
        }
    }

    return (
        <div className={`print-sheet-wrapper ${config.compactMode ? 'print-sheet-wrapper--compact' : ''}`}>
            <div className="print-sheet">
                <div className="print-sheet__header">
                    <div className="print-sheet__field">
                        <span className="print-sheet__field-label">Name:</span>
                        <span className="print-sheet__field-val">{config.blankName ? '' : identity.nickname}</span>
                    </div>
                    <div className="print-sheet__field">
                        <span className="print-sheet__field-label">Species:</span>
                        <span className="print-sheet__field-val">{config.blankSpecies ? '' : identity.species}</span>
                    </div>
                    <div className="print-sheet__field">
                        <span className="print-sheet__field-label">Rank:</span>
                        <span className="print-sheet__field-val">{config.blankRank ? '' : identity.rank}</span>
                    </div>
                    <div className="print-sheet__field">
                        <span className="print-sheet__field-label">Type:</span>
                        <span className="print-sheet__field-val">
                            {config.blankType ? '' : `${identity.type1}${identity.type2 ? ` / ${identity.type2}` : ''}`}
                        </span>
                    </div>
                    <div className="print-sheet__field">
                        <span className="print-sheet__field-label">Nature:</span>
                        <span className="print-sheet__field-val">{config.blankNature ? '' : identity.nature}</span>
                    </div>
                    <div className="print-sheet__field">
                        <span className="print-sheet__field-label">{config.hideAge ? 'Gender:' : 'Age/Gender:'}</span>
                        <span className="print-sheet__field-val">
                            {config.blankAgeGender ? '' : config.hideAge ? identity.gender : `${identity.age} ${identity.gender}`}
                        </span>
                    </div>
                </div>

                <div className="print-sheet__top-grid">
                    <div className="print-sheet__portrait-box">
                        {identity.tokenImageUrl && (
                            <img src={identity.tokenImageUrl} className="print-sheet__portrait-img" alt="Token" />
                        )}
                    </div>
                    <div className="print-sheet__stats-grid">
                        <div className="print-sheet__section">
                            <h4 className="print-sheet__section-title">Core Stats</h4>
                            {renderStat('Strength', stats[CombatStat.STR].base, stats[CombatStat.STR].limit, config.blankStats)}
                            {renderStat('Dexterity', stats[CombatStat.DEX].base, stats[CombatStat.DEX].limit, config.blankStats)}
                            {renderStat('Vitality', stats[CombatStat.VIT].base, stats[CombatStat.VIT].limit, config.blankStats)}
                            {renderStat('Special', stats[CombatStat.SPE].base, stats[CombatStat.SPE].limit, config.blankStats)}
                            {renderStat('Insight', stats[CombatStat.INS].base, stats[CombatStat.INS].limit, config.blankStats)}
                        </div>
                        <div className="print-sheet__section">
                            <h4 className="print-sheet__section-title">Social Stats</h4>
                            {renderStat('Tough', socials[SocialStat.TOU].base, 5, config.blankSocials)}
                            {renderStat('Cool', socials[SocialStat.COO].base, 5, config.blankSocials)}
                            {renderStat('Beauty', socials[SocialStat.BEA].base, 5, config.blankSocials)}
                            {renderStat('Cute', socials[SocialStat.CUT].base, 5, config.blankSocials)}
                            {renderStat('Clever', socials[SocialStat.CLE].base, 5, config.blankSocials)}
                        </div>
                    </div>
                </div>

                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Skills</h4>
                    <div className={`print-sheet__skills-grid ${config.coreSkillsOnly ? 'print-sheet__skills-grid--core' : ''}`}>
                        {skillColumns}
                    </div>
                </div>

                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Abilities</h4>
                    <table className="print-sheet__ability-table">
                        <thead>
                            <tr>
                                <th style={{ width: '5%', textAlign: 'center' }}>✔</th>
                                <th style={{ width: '25%' }}>Ability</th>
                                {config.abilityDescStyle !== 'none' && <th>Description / Effects</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {config.blankAbilities ? (
                                <>
                                    <tr>
                                        <td style={{ height: '25px' }}></td>
                                        <td></td>
                                        {config.abilityDescStyle !== 'none' && <td></td>}
                                    </tr>
                                    <tr>
                                        <td style={{ height: '25px' }}></td>
                                        <td></td>
                                        {config.abilityDescStyle !== 'none' && <td></td>}
                                    </tr>
                                </>
                            ) : (
                                identity.availableAbilities
                                    .filter(abName => !config.showOnlyActiveAbility || identity.ability === abName)
                                    .map((abName, i) => {
                                        const isChecked = identity.ability === abName;
                                        const customDesc = getAbilityText(abName, roomCustomAbilities);
                                        const desc = customDesc || fetchedAbilities[abName] || '';
                                        
                                        let showDesc = false;
                                        if (config.abilityDescStyle === 'all') showDesc = true;
                                        if (config.abilityDescStyle === 'selected' && isChecked) showDesc = true;

                                        return (
                                            <tr key={i}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className="print-sheet__checkbox" style={{ backgroundColor: isChecked ? 'black' : 'white', margin: '0 auto' }} />
                                                </td>
                                                <td><strong>{abName}</strong></td>
                                                {config.abilityDescStyle !== 'none' && <td>{showDesc ? desc : ''}</td>}
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Moves</h4>
                    <table className="print-sheet__move-table">
                        <thead>
                            <tr>
                                <th style={{ width: '20%' }}>Name</th>
                                <th style={{ width: '10%' }}>Type</th>
                                <th style={{ width: '8%' }}>Cat.</th>
                                <th style={{ width: '8%' }}>Power</th>
                                <th style={{ width: '15%' }}>Accuracy</th>
                                <th style={{ width: '10%' }}>Damage</th>
                                {!config.hideMoveDesc && <th>Description / Effects</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {config.blankMoves
                                ? Array.from({ length: 6 }).map((_, i) => (
                                      <tr key={i}>
                                          <td style={{ height: '25px' }}></td>
                                          <td></td><td></td><td></td><td></td><td></td>
                                          {!config.hideMoveDesc && <td></td>}
                                      </tr>
                                  ))
                                : moves.map((move, i) => {
                                    const dualAccMatch = move.desc?.match(/\[Dual Accuracy:\s*([^\]]+)\]/i);
                                    const dualDmgMatch = move.desc?.match(/\[Dual Damage:\s*([^\]]+)\]/i);
                                    
                                    const accString = dualAccMatch ? dualAccMatch[1] : `${move.acc1.toUpperCase()} + ${move.acc2.charAt(0).toUpperCase() + move.acc2.slice(1)}`;
                                    const dmgString = dualDmgMatch ? dualDmgMatch[1] : move.dmg1.toUpperCase();
                                    const cleanDesc = move.desc?.replace(/\[Dual (Accuracy|Damage):\s*[^\]]+\]\n?/gi, '');

                                    return (
                                        <tr key={i}>
                                            <td><strong>{move.name}</strong></td>
                                            <td>{move.type}</td>
                                            <td>{move.category}</td>
                                            <td>{move.power}</td>
                                            <td>{accString}</td>
                                            <td>{move.category === 'Status' ? '-' : dmgString}</td>
                                            {!config.hideMoveDesc && <td>{cleanDesc}</td>}
                                        </tr>
                                    );
                                  })}
                        </tbody>
                    </table>
                </div>

                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Items</h4>
                    <div className="print-sheet__items-grid">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="print-sheet__item-box" />
                        ))}
                    </div>
                </div>

                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Notes</h4>
                    <div className="print-sheet__notes-container">
                        <div className="print-sheet__note-line" />
                        <div className="print-sheet__note-line" />
                        <div className="print-sheet__note-line" />
                        <div className="print-sheet__note-line" />
                    </div>
                </div>
            </div>
        </div>
    );
}