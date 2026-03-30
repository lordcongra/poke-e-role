// src/components/MovesTable.tsx
import { useState, useEffect } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { MoveData } from '../store/storeTypes';
import { CombatStat } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { loadGithubTree, ALL_MOVES } from '../utils/api';
import { calculateBaseDamage, executeDamageRoll, rollDicePlus, parseCombatTags, getAbilityText } from '../utils/combatUtils';
import { TargetingModal } from './TargetingModal';
import { MoveCard } from './MoveCard';
import { MoveRow } from './MoveRow';

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#555', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '10px', cursor: 'pointer', marginLeft: '4px', fontWeight: 'bold' }}>?</span>
);

export function MovesTable() {
    const role = useCharacterStore(state => state.role);
    const moves = useCharacterStore(state => state.moves);
    const addMove = useCharacterStore(state => state.addMove);
    const removeMove = useCharacterStore(state => state.removeMove); 
    const trackers = useCharacterStore(state => state.trackers);
    const updateTracker = useCharacterStore(state => state.updateTracker);
    const learnset = useCharacterStore(state => state.identity.learnset);
    
    const skills = useCharacterStore(state => state.skills);
    const extraCategories = useCharacterStore(state => state.extraCategories);
    const customAbilities = useCharacterStore(state => state.roomCustomAbilities);
    const ability = useCharacterStore(state => state.identity.ability);
    const painEnabled = useCharacterStore(state => state.identity.pain) === 'Enabled';
    
    const roomCustomMoves = useCharacterStore(state => state.roomCustomMoves);
    
    const [targetingMove, setTargetingMove] = useState<MoveData | null>(null);
    const [deleteMoveId, setDeleteMoveId] = useState<string | null>(null); 
    const [moveList, setMoveList] = useState<string[]>([]);
    const [showLearnset, setShowLearnset] = useState(false);
    
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    const [showModsModal, setShowModsModal] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{title: string, desc: string} | null>(null);

    useEffect(() => {
        loadGithubTree().then(() => setMoveList([...ALL_MOVES]));
    }, []);

    const state = useCharacterStore.getState();
    const abilityText = getAbilityText(ability, customAbilities);
    const itemBuffs = parseCombatTags(state.inventory, extraCategories, undefined, abilityText);
    
    const insStat = state.stats[CombatStat.INS];
    const maxMoves = 3 + Math.max(1, insStat.base + insStat.rank + insStat.buff - insStat.debuff + (itemBuffs.stats.ins || 0));

    const handleTargetClick = (move: MoveData) => {
        if (move.category === 'Status') {
            alert(`${move.name || "This"} is a Support move (No Damage).`);
            return;
        }

        const moveDesc = (move.desc || "").toLowerCase();
        const setDmgMatch = moveDesc.match(/set damage\s*(\d+)?/i);
        if (setDmgMatch || moveDesc.includes("set damage")) {
            const dmgVal = (setDmgMatch && setDmgMatch[1]) ? setDmgMatch[1] : move.power;
            const currentState = useCharacterStore.getState();
            const nickname = currentState.identity.nickname || currentState.identity.species || "Someone";
            rollDicePlus(`0d6+${dmgVal}`, `💥 ${nickname} used ${move.name || "a Move"}! (Deals exactly ${dmgVal} Set Damage, ignores defenses)`);
            return;
        }

        setTargetingMove(move);
    };

    const handleExecuteDamage = (baseDmg: number, isCrit: boolean, isSE: boolean, reduction: number) => {
        if (targetingMove) {
            executeDamageRoll(targetingMove, useCharacterStore.getState(), baseDmg, isCrit, isSE, reduction);
        }
        setTargetingMove(null);
    };

    const handleGlobalChanceRoll = () => {
        const st = useCharacterStore.getState();
        const aTxt = getAbilityText(st.identity.ability, st.roomCustomAbilities);
        const items = parseCombatTags(st.inventory, st.extraCategories, undefined, aTxt);
        const totalChance = trackers.globalChance + items.chance;
        
        if (totalChance <= 0) return;
        
        const nickname = st.identity.nickname || st.identity.species || "Someone";
        const tags = items.chance > 0 ? ` [ Item Bonus +${items.chance} ]` : "";
        rollDicePlus(`${totalChance}d6>5`, `🍀 ${nickname} rolled a Chance Roll!${tags}`, "chance");
    };

    const groupedLearnset = learnset.reduce((acc, move) => {
        if (!acc[move.Learned]) acc[move.Learned] = [];
        acc[move.Learned].push(move.Name);
        return acc;
    }, {} as Record<string, string[]>);
    
    const rankOrder = ["Starter", "Beginner", "Rookie", "Amateur", "Standard", "Advanced", "Expert", "Master", "Champion", "Other"];
    const sortedRanks = Object.keys(groupedLearnset).sort((a, b) => {
        let idxA = rankOrder.indexOf(a); let idxB = rankOrder.indexOf(b);
        if (idxA === -1) idxA = 99; if (idxB === -1) idxB = 99;
        return idxA - idxB;
    });

    return (
        <div className="sheet-panel">
            <datalist id="move-list">
                {[...moveList, ...roomCustomMoves.filter(m => role === 'GM' || !m.gmOnly).map(m => m.name)].map(m => <option key={m} value={m} />)}
            </datalist>
            
            <div className="sheet-panel__header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button type="button" className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                    MOVES <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '4px' }}>(Max: {maxMoves})</span>
                </span>
                
                <div className="desktop-only-flex" style={{ fontSize: '0.75rem', gap: '4px', background: 'var(--label-bg)', padding: '2px 4px', borderRadius: '3px', alignItems: 'center', fontWeight: 'normal', color: 'var(--text-muted)', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', marginLeft: 'auto' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>Acc<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Accuracy", desc: "Adds or removes bonus dice to all Accuracy rolls."})} />: <NumberSpinner value={trackers.globalAcc} onChange={(v) => updateTracker('globalAcc', v)} /></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>Dmg<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Damage", desc: "Adds or removes bonus dice to all Damage rolls."})} />: <NumberSpinner value={trackers.globalDmg} onChange={(v) => updateTracker('globalDmg', v)} /></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>Succ<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Success Modifier", desc: "Flat Bonus/Penalty to final Successes (e.g., Low Accuracy = -1)."})} />: <NumberSpinner value={trackers.globalSucc} onChange={(v) => updateTracker('globalSucc', v)} /></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap' }}>
                        Chance<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Chance", desc: "Adds bonus dice to all Chance rolls."})} />: <NumberSpinner value={trackers.globalChance} onChange={(v) => updateTracker('globalChance', v)} min={0} />
                        <button type="button" onClick={handleGlobalChanceRoll} className="action-button action-button--dark" style={{ padding: '1px 4px' }}>🎲</button>
                    </span>
                    {painEnabled && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px', borderLeft: '1px solid var(--border)', paddingLeft: '4px', whiteSpace: 'nowrap' }}>
                            Pain<TooltipIcon onClick={() => setTooltipInfo({ title: "Ignored Pain", desc: "Ignored Pain Penalties (Resets per Scene). Use the 'Ign.Pain(-1W)' button in the Tracker to increase this."})} />: <NumberSpinner value={trackers.ignoredPain} onChange={(v) => updateTracker('ignoredPain', v)} min={0} />
                        </span>
                    )}
                </div>

                <button type="button" className="mobile-only-flex action-button action-button--dark" style={{ padding: '2px 6px', fontSize: '0.75rem', marginLeft: 'auto' }} onClick={() => setShowModsModal(true)}>⚙️ Modifiers</button>
            </div>
            
            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div className="desktop-only-flex table-responsive-wrapper">
                        <table className="data-table" style={{ textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '25px', textAlign: 'center' }} title="Used this round?">✔</th>
                                    <th style={{ width: '45px', textAlign: 'center' }}>Acc</th>
                                    <th>Name</th>
                                    <th>Pool (Acc)</th>
                                    <th>Type</th>
                                    <th>Cat.</th>
                                    <th>Damage</th>
                                    <th style={{ width: '45px', textAlign: 'center' }}>Dmg</th>
                                    <th style={{ width: '30px', textAlign: 'center' }}>Sort</th>
                                    <th style={{ width: '30px', textAlign: 'center' }}>Del</th>
                                </tr>
                            </thead>
                            <tbody>
                                {moves.map((move) => (
                                    <MoveRow key={move.id} move={move} skills={skills} extraCategories={extraCategories} onTarget={handleTargetClick} onDelete={setDeleteMoveId} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mobile-only-flex" style={{ flexDirection: 'column', width: '100%' }}>
                        {moves.map((move) => (
                            <MoveCard key={move.id} move={move} skills={skills} extraCategories={extraCategories} onTarget={handleTargetClick} onDelete={setDeleteMoveId} />
                        ))}
                    </div>

                    <button type="button" onClick={addMove} className="action-button action-button--red action-button--full-width">+ Add Move Slot</button>
                    
                    {learnset.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <button type="button" onClick={() => setShowLearnset(!showLearnset)} className="action-button action-button--dark" style={{ width: '100%', fontSize: '0.8rem', padding: '4px', margin: 0 }}>
                                {showLearnset ? "📖 Hide Learnset" : "📖 View Learnset"}
                            </button>
                            {showLearnset && (
                                <div style={{ border: '1px solid var(--border)', padding: '8px', borderRadius: '4px', background: 'var(--panel-alt)', marginTop: '4px', maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem' }}>
                                    {sortedRanks.map(rank => (
                                        <div key={rank} style={{ marginBottom: '6px' }}>
                                            <div style={{ fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--border)', marginBottom: '4px', textTransform: 'capitalize' }}>{rank}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {groupedLearnset[rank].map((mName, idx) => (
                                                    <span key={idx} style={{ background: 'var(--label-bg)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{mName}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showModsModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '300px', width: '90%', border: '2px solid var(--primary)', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                        <h3 style={{ color: 'var(--primary)', marginTop: 0, fontSize: '1.1rem', textAlign: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>⚙️ Global Modifiers</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>Acc<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Accuracy", desc: "Adds or removes bonus dice to all Accuracy rolls."})} /></span>
                                <NumberSpinner value={trackers.globalAcc} onChange={(v) => updateTracker('globalAcc', v)} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>Dmg<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Damage", desc: "Adds or removes bonus dice to all Damage rolls."})} /></span>
                                <NumberSpinner value={trackers.globalDmg} onChange={(v) => updateTracker('globalDmg', v)} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>Succ<TooltipIcon onClick={() => setTooltipInfo({ title: "Global Success Modifier", desc: "Flat Bonus/Penalty to final Successes (e.g., Low Accuracy = -1)."})} /></span>
                                <NumberSpinner value={trackers.globalSucc} onChange={(v) => updateTracker('globalSucc', v)} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    Chance
                                    <button type="button" onClick={handleGlobalChanceRoll} className="action-button action-button--dark" style={{ padding: '1px 4px' }}>🎲</button>
                                </span>
                                <NumberSpinner value={trackers.globalChance} onChange={(v) => updateTracker('globalChance', v)} min={0} />
                            </div>
                            {painEnabled && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.85rem', color: '#c62828' }}>Ign.Pain<TooltipIcon onClick={() => setTooltipInfo({ title: "Ignored Pain", desc: "Ignored Pain Penalties (Resets per Scene). Use the 'Ign.Pain(-1W)' button in the Tracker to increase this."})} /></span>
                                    <NumberSpinner value={trackers.ignoredPain} onChange={(v) => updateTracker('ignoredPain', v)} min={0} />
                                </div>
                            )}
                        </div>

                        <button type="button" className="action-button action-button--dark" style={{ width: '100%', padding: '6px' }} onClick={() => setShowModsModal(false)}>Close</button>
                    </div>
                </div>
            )}

            {targetingMove && (
                <TargetingModal move={targetingMove} baseDamage={calculateBaseDamage(targetingMove, useCharacterStore.getState())} onClose={() => setTargetingMove(null)} onRoll={handleExecuteDamage} />
            )}

            {deleteMoveId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '6px', maxWidth: '300px', width: '90%', border: '2px solid #C62828', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', textAlign: 'center' }}>
                        <h3 style={{ color: '#C62828', marginTop: 0, fontSize: '1.1rem' }}>⚠️ Confirm Deletion</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>Are you sure you want to delete this Move?</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" className="action-button action-button--dark" style={{ flex: 1, padding: '6px' }} onClick={() => setDeleteMoveId(null)}>Cancel</button>
                            <button type="button" className="action-button action-button--red" style={{ flex: 1, padding: '6px' }} onClick={() => { removeMove(deleteMoveId); setDeleteMoveId(null); }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

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