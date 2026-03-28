// src/components/MovesTable.tsx
import { useState, useEffect } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import { fetchMoveData, loadGithubTree, ALL_MOVES } from '../utils/api';
import { NumberSpinner } from './NumberSpinner';
import { CombatStat, Skill } from '../types/enums';

const POKEMON_TYPES = ['', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const TYPE_COLORS: Record<string, string> = { 'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030', 'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0', 'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820', 'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848', 'Steel': '#B8B8D0', 'Fairy': '#EE99AC' };

const ATTR_OPTIONS = ['--', 'STR', 'DEX', 'VIT', 'SPE', 'INS'];
const SKILL_OPTIONS = ['--', 'BRAWL', 'CHANNEL', 'CLASH', 'EVASION', 'ALERT', 'ATHLETIC', 'NATURE', 'STEALTH', 'CHARM', 'ETIQUETTE', 'INTIMIDATE', 'PERFORM'];

export function MovesTable() {
    const moves = useCharacterStore(state => state.moves);
    const addMove = useCharacterStore(state => state.addMove);
    const updateMove = useCharacterStore(state => state.updateMove);
    const removeMove = useCharacterStore(state => state.removeMove);
    const moveUpMove = useCharacterStore(state => state.moveUpMove);
    const moveDownMove = useCharacterStore(state => state.moveDownMove);
    const applyMoveData = useCharacterStore(state => state.applyMoveData);
    
    const learnset = useCharacterStore(state => state.identity.learnset) || [];
    const stats = useCharacterStore(state => state.stats);
    const skills = useCharacterStore(state => state.skills);

    const [allMovesList, setAllMovesList] = useState<string[]>([]);
    const [isLearnsetOpen, setIsLearnsetOpen] = useState(false);
    const [fetchingMoves, setFetchingMoves] = useState<Record<string, boolean>>({});

    const [modAcc, setModAcc] = useState(0);
    const [modDmg, setModDmg] = useState(0);
    const [modSucc, setModSucc] = useState(0);

    useEffect(() => { loadGithubTree().then(() => { setAllMovesList([...ALL_MOVES]); }); }, []);

    const handleFetchMove = async (id: string, moveName: string) => {
        if (!moveName) return;
        setFetchingMoves(prev => ({ ...prev, [id]: true }));
        try {
            const data = await fetchMoveData(moveName);
            if (data) applyMoveData(id, data);
            else alert(`Could not find data for move: ${moveName}`);
        } catch (err) { console.error(err); } 
        finally { setFetchingMoves(prev => ({ ...prev, [id]: false })); }
    };

    // Calculate total dice based strictly on the selected dropdown options
    const getDicePool = (attrKey: string, skillKey: string, flatBonus: number): number => {
        let total = flatBonus;
        
        // Add Attribute
        const statMap: Record<string, CombatStat> = { 'STR': CombatStat.STR, 'DEX': CombatStat.DEX, 'VIT': CombatStat.VIT, 'SPE': CombatStat.SPE, 'INS': CombatStat.INS };
        if (statMap[attrKey]) {
            const s = stats[statMap[attrKey]];
            total += Math.max(1, s.base + s.rank + s.buff - s.debuff);
        }

        // Add Skill
        const skillMap: Record<string, Skill> = { 'BRAWL': Skill.BRAWL, 'CHANNEL': Skill.CHANNEL, 'CLASH': Skill.CLASH, 'EVASION': Skill.EVASION, 'ALERT': Skill.ALERT, 'ATHLETIC': Skill.ATHLETIC, 'NATURE': Skill.NATURE, 'STEALTH': Skill.STEALTH, 'CHARM': Skill.CHARM, 'ETIQUETTE': Skill.ETIQUETTE, 'INTIMIDATE': Skill.INTIMIDATE, 'PERFORM': Skill.PERFORM };
        if (skillMap[skillKey]) {
            const s = skills[skillMap[skillKey]];
            total += (s.base + s.buff);
        }

        return total;
    };

    const rollDicePlus = (diceCount: number, label: string) => {
        if (!OBR.isAvailable) { console.log(`[Offline Roll] ${diceCount}d6 for ${label}`); return; }
        OBR.broadcast.sendMessage("com.ssstormy.dice/roll", { dice: `${diceCount}d6`, label: label }).catch(e => console.warn(e));
    };

    const renderLearnset = () => {
        if (learnset.length === 0) return <div style={{ padding: '10px', fontStyle: 'italic', color: 'var(--text-muted)' }}>No learnset available. Load a Pokémon first.</div>;
        const grouped: Record<string, string[]> = {};
        learnset.forEach(m => { const rank = m.Learned || 'Other'; if (!grouped[rank]) grouped[rank] = []; grouped[rank].push(m.Name); });
        const rankOrder = ["Starter", "Beginner", "Rookie", "Amateur", "Standard", "Advanced", "Expert", "Master", "Champion", "Other"];
        const sortedRanks = Object.keys(grouped).sort((a, b) => {
            let idxA = rankOrder.indexOf(a); let idxB = rankOrder.indexOf(b);
            if (idxA === -1) idxA = 99; if (idxB === -1) idxB = 99;
            return idxA - idxB;
        });

        return sortedRanks.map(rank => (
            <div key={rank} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--border)', marginBottom: '4px', textTransform: 'capitalize' }}>{rank}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {grouped[rank].map((moveName, i) => (
                        <span key={`${rank}-${moveName}-${i}`} style={{ background: 'var(--panel-alt)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-main)' }}>{moveName}</span>
                    ))}
                </div>
            </div>
        ));
    };

    return (
        <div className="sheet-panel" style={{ marginTop: '10px' }}>
            <div className="sheet-panel__header" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px' }}>
                <span>▼ MOVES (Max: 5)</span>
                <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'white', alignItems: 'center' }}>
                    <span className="flex-layout--row-center" style={{ gap: '4px' }}>Acc ❔: <NumberSpinner value={modAcc} onChange={setModAcc} /></span>
                    <span className="flex-layout--row-center" style={{ gap: '4px' }}>Dmg ❔: <NumberSpinner value={modDmg} onChange={setModDmg} /></span>
                    <span className="flex-layout--row-center" style={{ gap: '4px' }}>Succ ❔: <NumberSpinner value={modSucc} onChange={setModSucc} /></span>
                    <span className="flex-layout--row-center" style={{ gap: '4px' }}>Chance: 0 <span style={{ cursor: 'pointer', fontSize: '1.2rem' }}>🎲</span></span>
                </div>
            </div>
            
            <div className="panel-content-wrapper" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', minWidth: '850px' }}>
                    <thead>
                        <tr style={{ background: '#444', color: 'white', fontSize: '0.8rem' }}>
                            <th style={{ width: '30px' }}>✔</th>
                            <th style={{ width: '80px' }}>Acc</th>
                            <th style={{ width: '140px', textAlign: 'left' }}>Name</th>
                            <th>Pool (Acc)</th>
                            <th style={{ width: '90px' }}>Type</th>
                            <th style={{ width: '70px' }}>Cat.</th>
                            <th>Damage</th>
                            <th style={{ width: '40px' }}>Dmg</th>
                            <th style={{ width: '30px' }}>Sort</th>
                            <th style={{ width: '30px' }}>Del</th>
                        </tr>
                    </thead>
                    <tbody>
                        {moves.map(move => {
                            const calculatedAcc = getDicePool(move.acc1, move.acc2, move.accBonus) + modAcc;
                            const calculatedDmg = getDicePool(move.dmg1, '--', move.power) + modDmg;

                            return (
                                <tr key={move.id} className="data-table__row--dynamic" style={{ fontSize: '0.85rem' }}>
                                    <td className="data-table__cell--middle">
                                        <input type="checkbox" checked={move.active} onChange={(e) => updateMove(move.id, 'active', e.target.checked)} />
                                    </td>
                                    
                                    {/* ACCURACY COLUMN: [Input] [Dice Btn] */}
                                    <td className="data-table__cell--middle">
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                            <input type="number" className="identity-grid__input" style={{ width: '35px', textAlign: 'center', padding: '2px', background: '#1976D2', color: 'white', fontWeight: 'bold', border: 'none' }} value={move.accBonus} onChange={(e) => updateMove(move.id, 'accBonus', Number(e.target.value) || 0)} />
                                            <button onClick={() => rollDicePlus(calculatedAcc, `${move.name} Accuracy`)} style={{ background: '#555', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '1rem', cursor: 'pointer' }}>🎲</button>
                                        </div>
                                    </td>
                                    
                                    {/* NAME & FETCH */}
                                    <td style={{ padding: '2px' }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input type="text" list="moves-datalist" className="identity-grid__input" style={{ flex: 1, minWidth: '0' }} value={move.name} onChange={(e) => updateMove(move.id, 'name', e.target.value)} placeholder="Move Name" />
                                            <span style={{ cursor: 'pointer', fontSize: '1.2rem', opacity: fetchingMoves[move.id] ? 0.5 : 1 }} onClick={() => handleFetchMove(move.id, move.name)}>🏷️</span>
                                        </div>
                                    </td>

                                    {/* POOL (ACC) DROPDOWNS */}
                                    <td style={{ padding: '2px' }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <select className="identity-grid__select" style={{ flex: 1 }} value={move.acc1} onChange={(e) => updateMove(move.id, 'acc1', e.target.value)}>
                                                {ATTR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                            <span style={{ fontWeight: 'bold' }}>+</span>
                                            <select className="identity-grid__select" style={{ flex: 1 }} value={move.acc2} onChange={(e) => updateMove(move.id, 'acc2', e.target.value)}>
                                                {SKILL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </td>
                                    
                                    {/* TYPE */}
                                    <td style={{ padding: '2px' }}>
                                        <select className="identity-grid__select" style={{ width: '100%', background: TYPE_COLORS[move.type] || 'var(--panel-alt)', color: move.type ? 'white' : 'inherit', fontWeight: 'bold', textShadow: move.type ? '1px 1px 1px rgba(0,0,0,0.5)' : 'none', padding: '2px 4px' }} value={move.type} onChange={(e) => updateMove(move.id, 'type', e.target.value)}>
                                            {POKEMON_TYPES.map(t => <option key={t} value={t}>{t || '--'}</option>)}
                                        </select>
                                    </td>

                                    {/* CAT */}
                                    <td style={{ padding: '2px' }}>
                                        <select className="identity-grid__select" style={{ width: '100%', padding: '2px' }} value={move.category} onChange={(e) => updateMove(move.id, 'category', e.target.value as any)}>
                                            <option value="Physical">Phys</option><option value="Special">Spec</option><option value="Status">Stat</option>
                                        </select>
                                    </td>

                                    {/* DAMAGE: [Power Input] + [Attr Dropdown] */}
                                    <td style={{ padding: '2px' }}>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <NumberSpinner value={move.power} onChange={v => updateMove(move.id, 'power', v)} />
                                            <span style={{ fontWeight: 'bold' }}>+</span>
                                            <select className="identity-grid__select" style={{ flex: 1 }} value={move.dmg1} onChange={(e) => updateMove(move.id, 'dmg1', e.target.value)}>
                                                {ATTR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </td>
                                    
                                    {/* DMG DICE BUTTON */}
                                    <td className="data-table__cell--middle">
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontWeight: 'bold', color: '#C62828' }}>{calculatedDmg}</span>
                                            <button onClick={() => rollDicePlus(calculatedDmg, `${move.name} Damage`)} style={{ background: '#C62828', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '1rem', cursor: 'pointer' }}>💥</button>
                                        </div>
                                    </td>

                                    {/* SORT ARROWS */}
                                    <td className="data-table__cell--middle">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <button onClick={() => moveUpMove(move.id)} style={{ padding: '0px 4px', fontSize: '0.6rem', cursor: 'pointer' }}>▲</button>
                                            <button onClick={() => moveDownMove(move.id)} style={{ padding: '0px 4px', fontSize: '0.6rem', cursor: 'pointer' }}>▼</button>
                                        </div>
                                    </td>
                                    
                                    {/* DELETE */}
                                    <td className="data-table__cell--middle">
                                        <button onClick={() => removeMove(move.id)} style={{ cursor: 'pointer', background: '#C62828', border: 'none', color: 'white', fontWeight: 'bold', padding: '4px 6px', borderRadius: '4px' }}>X</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <button onClick={addMove} className="action-button" style={{ width: '100%', background: '#C62828', color: 'white', marginTop: '4px' }}>+ Add Move Slot</button>

                <button onClick={() => setIsLearnsetOpen(!isLearnsetOpen)} className="action-button action-button--dark" style={{ width: '100%', marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                    <span>📖</span> {isLearnsetOpen ? 'Hide Learnset' : 'View Learnset'}
                </button>
                {isLearnsetOpen && (<div style={{ padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border)', borderTop: 'none', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px' }}>{renderLearnset()}</div>)}
            </div>

            <datalist id="moves-datalist">{allMovesList.map(m => <option key={m} value={m} />)}</datalist>
        </div>
    );
}