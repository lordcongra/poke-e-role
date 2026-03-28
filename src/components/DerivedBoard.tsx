// src/components/DerivedBoard.tsx
import { useCharacterStore } from '../store/useCharacterStore';
import { CombatStat, Skill } from '../types/enums';
import { ResourceBox } from './ResourceBox';
import { NumberSpinner } from './NumberSpinner';

export function DerivedBoard() {
    const ruleset = useCharacterStore(state => state.identity.ruleset);
    const health = useCharacterStore(state => state.health);
    const will = useCharacterStore(state => state.will);
    const updateHealth = useCharacterStore(state => state.updateHealth);
    const updateWill = useCharacterStore(state => state.updateWill);
    
    const stats = useCharacterStore(state => state.stats);
    const skills = useCharacterStore(state => state.skills);
    const derived = useCharacterStore(state => state.derived);
    const setDerived = useCharacterStore(state => state.setDerived);

    const vitTotal = Math.max(1, stats[CombatStat.VIT].base + stats[CombatStat.VIT].rank + stats[CombatStat.VIT].buff - stats[CombatStat.VIT].debuff);
    const insTotal = Math.max(1, stats[CombatStat.INS].base + stats[CombatStat.INS].rank + stats[CombatStat.INS].buff - stats[CombatStat.INS].debuff);
    const dexTotal = Math.max(1, stats[CombatStat.DEX].base + stats[CombatStat.DEX].rank + stats[CombatStat.DEX].buff - stats[CombatStat.DEX].debuff);
    const strTotal = Math.max(1, stats[CombatStat.STR].base + stats[CombatStat.STR].rank + stats[CombatStat.STR].buff - stats[CombatStat.STR].debuff);
    const speTotal = Math.max(1, stats[CombatStat.SPE].base + stats[CombatStat.SPE].rank + stats[CombatStat.SPE].buff - stats[CombatStat.SPE].debuff);

    const defTotal = Math.max(1, vitTotal + derived.defBuff - derived.defDebuff);
    
    // NEW: Ruleset actually drives the math!
    let sdefBase = insTotal;
    if (ruleset === 'VIT = DEF/SPD/HP') {
        sdefBase = vitTotal; // Uses VIT for Spec Defense in this ruleset
    }
    const sdefTotal = Math.max(1, sdefBase + derived.sdefBuff - derived.sdefDebuff);
    
    const alertTotal = skills[Skill.ALERT].base + skills[Skill.ALERT].buff;
    const initiative = dexTotal + alertTotal;
    
    const clashP = strTotal + skills[Skill.BRAWL].base + skills[Skill.BRAWL].buff;
    const clashS = speTotal + skills[Skill.CHANNEL].base + skills[Skill.CHANNEL].buff;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><ResourceBox title="HP" curr={health.hpCurr} max={health.hpMax} base={health.hpBase} color="#C62828" onCurrChange={(v) => updateHealth('hpCurr', v)} onBaseChange={(v) => updateHealth('hpBase', v)} /></div>
                <div style={{ flex: 1 }}><ResourceBox title="WILL" curr={will.willCurr} max={will.willMax} base={will.willBase} color="#C62828" onCurrChange={(v) => updateWill('willCurr', v)} onBaseChange={(v) => updateWill('willBase', v)} /></div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', border: '1px solid #7E57C2' }}>
                    <div style={{ background: '#7E57C2', color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', padding: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ paddingLeft: '4px' }}>STATUS</span><span style={{ cursor: 'pointer', paddingRight: '4px' }}>+ Add</span>
                    </div>
                    <div style={{ padding: '6px', display: 'flex', gap: '4px' }}>
                        <select className="identity-grid__select" style={{ flex: 1, background: '#C8E6C9', color: '#1B5E20', fontWeight: 'bold' }}><option>Healthy</option></select>
                        <NumberSpinner value={0} onChange={()=>{}} min={0} />
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', overflow: 'hidden' }}>
                    <div style={{ background: '#C62828', color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', padding: '4px' }}>DEFENSE</div>
                    <div className="flex-layout--row-center" style={{ padding: '6px', justifyContent: 'center', gap: '8px', background: 'var(--panel-alt)' }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>Total: <strong>{defTotal}</strong></span>
                        <span style={{ color: '#4CAF50' }}>+</span> <NumberSpinner value={derived.defBuff} onChange={v => setDerived('defBuff', v)} min={0} />
                        <span style={{ color: '#F44336' }}>-</span> <NumberSpinner value={derived.defDebuff} onChange={v => setDerived('defDebuff', v)} min={0} />
                    </div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', overflow: 'hidden' }}>
                    <div style={{ background: '#C62828', color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', padding: '4px' }}>SPEC. DEFENSE</div>
                    <div className="flex-layout--row-center" style={{ padding: '6px', justifyContent: 'center', gap: '8px', background: 'var(--panel-alt)' }}>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>Total: <strong>{sdefTotal}</strong></span>
                        <span style={{ color: '#4CAF50' }}>+</span> <NumberSpinner value={derived.sdefBuff} onChange={v => setDerived('sdefBuff', v)} min={0} />
                        <span style={{ color: '#F44336' }}>-</span> <NumberSpinner value={derived.sdefDebuff} onChange={v => setDerived('sdefDebuff', v)} min={0} />
                    </div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', border: '1px solid #4FC3F7' }}>
                    <div style={{ background: '#4FC3F7', color: '#111', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem', padding: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ paddingLeft: '4px' }}>TIMERS</span><span style={{ cursor: 'pointer', paddingRight: '4px' }}>+ Add</span>
                    </div>
                    <div style={{ padding: '6px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>No active effects.</div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
                <div className="sheet-panel" style={{ flex: 1.5, padding: '0', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ background: '#555', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px' }}>INITIATIVE</div>
                    <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>1d6 + {initiative}</div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ background: '#555', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px' }}>EVADE</div>
                    <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>{dexTotal}</div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ background: '#555', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px' }}>CLASH(P)</div>
                    <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>{clashP}</div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ background: '#555', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px' }}>CLASH(S)</div>
                    <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>{clashS}</div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', textAlign: 'center', border: '1px solid #FFB300' }}>
                    <div style={{ background: '#FFB300', color: '#111', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px' }}>HAPPY</div>
                    <div className="flex-layout--row-center" style={{ padding: '4px', justifyContent: 'center' }}><NumberSpinner value={derived.happy} onChange={v => setDerived('happy', v)} min={0} /></div>
                </div>
                <div className="sheet-panel" style={{ flex: 1, padding: '0', textAlign: 'center', border: '1px solid #AB47BC' }}>
                    <div style={{ background: '#AB47BC', color: 'white', fontWeight: 'bold', fontSize: '0.75rem', padding: '4px' }}>LOYAL</div>
                    <div className="flex-layout--row-center" style={{ padding: '4px', justifyContent: 'center' }}><NumberSpinner value={derived.loyal} onChange={v => setDerived('loyal', v)} min={0} /></div>
                </div>
            </div>

        </div>
    );
}