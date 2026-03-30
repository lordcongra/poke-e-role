// src/components/GeneratorPreviewModal.tsx
import { useState } from 'react';
import type { TempBuild } from '../store/storeTypes';
import { useCharacterStore } from '../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../types/enums';

export function GeneratorPreviewModal({ build, onClose, onReroll }: { build: TempBuild, onClose: () => void, onReroll: () => void }) {
    const applyGeneratedBuild = useCharacterStore(state => state.applyGeneratedBuild);
    const mode = useCharacterStore(state => state.identity.mode);
    const extraCategories = useCharacterStore(state => state.extraCategories); 
    
    // AUDIT FIX: Pull Base Stats from the Store so the preview math is accurate!
    const baseStats = useCharacterStore(state => state.stats);
    const baseSocials = useCharacterStore(state => state.socials);
    const baseSkills = useCharacterStore(state => state.skills);
    const willMax = useCharacterStore(state => state.will.willMax);

    const [localBuild, setLocalBuild] = useState<TempBuild>(build);
    const [tooltipInfo, setTooltipInfo] = useState<{title: string, desc: string} | null>(null);

    const updateAttr = (stat: string, val: number) => setLocalBuild(prev => ({ ...prev, attr: { ...prev.attr, [stat]: Math.max(0, val) } }));
    const updateSoc = (stat: string, val: number) => setLocalBuild(prev => ({ ...prev, soc: { ...prev.soc, [stat]: Math.max(0, val) } }));
    const updateSkill = (sk: string, val: number) => setLocalBuild(prev => ({ ...prev, skills: { ...prev.skills, [sk]: Math.max(0, val) } }));

    const buildSpinner = (val: number, setVal: (v: number) => void) => (
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '3px', background: 'var(--input-bg)' }}>
            <button onClick={() => setVal(val - 1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 6px', cursor: 'pointer' }}>-</button>
            <span style={{ width: '20px', textAlign: 'center', fontSize: '0.85rem' }}>{val}</span>
            <button onClick={() => setVal(val + 1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 6px', cursor: 'pointer' }}>+</button>
        </div>
    );

    const isTrainer = mode === 'Trainer';

    const getSkillLabel = (sk: string) => {
        if (localBuild.customSkillMap[sk]) return localBuild.customSkillMap[sk] || 'Unnamed';
        if (isTrainer) {
            if (sk === 'channel') return 'Throw';
            if (sk === 'clash') return 'Weapon';
            if (sk === 'charm') return 'Empathy';
            if (sk === 'magic') return 'Science';
        }
        return sk.charAt(0).toUpperCase() + sk.slice(1);
    };

    // Helper functions to grab the combined Base + Generated stats for the dynamic UI
    const getBaseAttr = (attr: string) => {
        if (attr === 'will') return willMax;
        if (['str','dex','vit','spe','ins'].includes(attr)) return baseStats[attr as CombatStat]?.base || 1;
        if (['tou','coo','bea','cut','cle'].includes(attr)) return baseSocials[attr as SocialStat]?.base || 1;
        return 0;
    };

    const getBaseSkill = (skill: string) => {
        if (baseSkills[skill as Skill]) return baseSkills[skill as Skill].base;
        for (const cat of extraCategories) {
            const sk = cat.skills.find(s => s.id === skill);
            if (sk) return sk.base;
        }
        return 0;
    };

    const skillCategories = [
        { title: 'FIGHT', skills: ['brawl', 'channel', 'clash', 'evasion'] },
        { title: 'SURVIVE', skills: ['alert', 'athletic', 'nature', 'stealth'] },
        { title: 'SOCIAL', skills: ['charm', 'etiquette', 'intimidate', 'perform'] }
    ];

    if (build.includePmd) {
        skillCategories.push({ title: isTrainer ? 'KNOWLEDGE' : 'KNOWLEDGE (PMD)', skills: ['crafts', 'lore', 'medicine', 'magic'] });
    }

    const mappedExtraCats = extraCategories.map(cat => ({
        title: (cat.name || 'CUSTOM').toUpperCase(),
        skills: cat.skills.map(sk => sk.id)
    }));

    const allCategories = [...skillCategories, ...mappedExtraCats];

    // Dynamically calculate Max Moves based on the user adjusting the INS spinner!
    const dynamicMaxMoves = (baseStats[CombatStat.INS]?.base || 1) + (localBuild.attr['ins'] || 0) + 3;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '600px', border: '2px solid var(--primary)', color: 'var(--text-main)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0, color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '12px', textAlign: 'center' }}>🔍 Build Preview</h3>
                
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', overflowY: 'auto', paddingRight: '4px' }}>
                    <div style={{ background: 'var(--panel-alt)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}>Attributes (Rank Added)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                            {['str', 'dex', 'vit', 'spe', 'ins'].map(stat => (
                                <div key={stat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>{stat.toUpperCase()}</label>
                                    {buildSpinner(localBuild.attr[stat] || 0, (v) => updateAttr(stat, v))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'var(--panel-alt)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}>Socials (Rank Added)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                            {['tou', 'coo', 'bea', 'cut', 'cle'].map(stat => (
                                <div key={stat} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '2px' }}>{stat.toUpperCase()}</label>
                                    {buildSpinner(localBuild.soc[stat] || 0, (v) => updateSoc(stat, v))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'var(--panel-alt)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--primary)' }}>Skills</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 15px' }}>
                            {allCategories.map((cat, index) => (
                                <div key={`${cat.title}-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>{cat.title}</div>
                                    {cat.skills.map(sk => (
                                        <div key={sk} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' }} title={getSkillLabel(sk)}>
                                                {getSkillLabel(sk)}
                                            </label>
                                            {buildSpinner(localBuild.skills[sk] || 0, (v) => updateSkill(sk, v))}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'var(--panel-alt)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--primary)' }}>Moves (Max: {dynamicMaxMoves})</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {localBuild.moves.map((m, i) => {
                                // AUDIT FIX: Dynamically combine Base Stats + Local Generated Stats for live preview updates!
                                const accAttr = getBaseAttr(m.attr) + (localBuild.attr[m.attr] || localBuild.soc[m.attr] || 0);
                                const accSkill = getBaseSkill(m.skill) + (localBuild.skills[m.skill] || 0);
                                const accPool = accAttr + accSkill;

                                const dmgAttr = getBaseAttr(m.dmgStat) + (localBuild.attr[m.dmgStat] || localBuild.soc[m.dmgStat] || 0);
                                const dmgPool = m.cat === 'Status' ? '-' : m.power + dmgAttr;

                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '3px', padding: '4px' }}>
                                        <span style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>{m.name}</span>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', paddingRight: '4px', marginRight: '4px' }}>
                                            [{m.cat.substring(0,4)}] A:{accPool} | D:{dmgPool}
                                        </span>
                                        <button 
                                            type="button" 
                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', padding: '0 4px' }}
                                            onClick={() => setTooltipInfo({
                                                title: m.name, 
                                                desc: `Type: ${m.type} | Category: ${m.cat} | Power: ${m.power}\nAccuracy: ${m.attr.toUpperCase()} + ${m.skill.charAt(0).toUpperCase() + m.skill.slice(1)}\nDamage: ${m.dmgStat ? m.dmgStat.toUpperCase() : 'N/A'}\n\n${m.desc}`
                                            })}
                                        >
                                            ?
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
                    <button type="button" onClick={onClose} className="action-button action-button--dark" style={{ flex: 1, padding: '6px' }}>Discard</button>
                    <button type="button" onClick={onReroll} className="action-button action-button--dark" style={{ flex: 1, padding: '6px', background: '#1976d2', borderColor: '#1976d2' }}>🎲 Reroll</button>
                    <button type="button" onClick={() => { applyGeneratedBuild(localBuild); onClose(); }} className="action-button action-button--red" style={{ flex: 1, padding: '6px' }}>✅ Apply Build</button>
                </div>
            </div>

            {tooltipInfo && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '280px', border: '2px solid var(--primary)', color: 'var(--text-main)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px', textAlign: 'center' }}>{tooltipInfo.title}</h3>
                        <p style={{ fontSize: '0.85rem', marginBottom: '15px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{tooltipInfo.desc}</p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button type="button" className="action-button action-button--dark" style={{ width: '100%', padding: '6px' }} onClick={() => setTooltipInfo(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}