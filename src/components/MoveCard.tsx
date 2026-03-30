// src/components/MoveCard.tsx
import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import type { MoveData, SkillData, ExtraCategory } from '../store/storeTypes';
import { CombatStat, SocialStat, Skill } from '../types/enums';
import { NumberSpinner } from './NumberSpinner';
import { fetchMoveData } from '../utils/api';
import { rollAccuracy, calculateBaseDamage, parseCombatTags, getAbilityText } from '../utils/combatUtils';
import { MoveEditModal } from './MoveEditModal';

const ALL_TYPES = ['Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'];
const TYPE_COLORS: Record<string, string> = { 'Normal': '#A8A878', 'Fire': '#F08030', 'Water': '#6890F0', 'Electric': '#F8D030', 'Grass': '#78C850', 'Ice': '#98D8D8', 'Fighting': '#C03028', 'Poison': '#A040A0', 'Ground': '#E0C068', 'Flying': '#A890F0', 'Psychic': '#F85888', 'Bug': '#A8B820', 'Rock': '#B8A038', 'Ghost': '#705898', 'Dragon': '#7038F8', 'Dark': '#705848', 'Steel': '#B8B8D0', 'Fairy': '#EE99AC' };

export function MoveCard({ move, skills, extraCategories, onTarget, onDelete }: { move: MoveData, skills: Record<Skill, SkillData>, extraCategories: ExtraCategory[], onTarget: (m: MoveData) => void, onDelete: (id: string) => void }) {
    const updateMove = useCharacterStore(state => state.updateMove);
    const moveUpMove = useCharacterStore(state => state.moveUpMove);
    const moveDownMove = useCharacterStore(state => state.moveDownMove);
    const applyMoveData = useCharacterStore(state => state.applyMoveData);
    
    const roomCustomTypes = useCharacterStore(state => state.roomCustomTypes);
    const combinedTypes = [...ALL_TYPES, ...roomCustomTypes.map(t => t.name)];
    const combinedColors = { ...TYPE_COLORS, ...Object.fromEntries(roomCustomTypes.map(t => [t.name, t.color])) };

    const [editModalOpen, setEditModalOpen] = useState(false);

    const handleNameBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const val = e.target.value.trim();
        if (val) {
            const data = await fetchMoveData(val);
            if (data) applyMoveData(move.id, data);
        }
    };

    const inventory = useCharacterStore(state => state.inventory);
    const will = useCharacterStore(state => state.will);
    const stats = useCharacterStore(state => state.stats);
    const socials = useCharacterStore(state => state.socials);
    const customAbilities = useCharacterStore(state => state.roomCustomAbilities);
    const ability = useCharacterStore(state => state.identity.ability);
    
    const abilityText = getAbilityText(ability, customAbilities);
    const itemBuffs = parseCombatTags(inventory, extraCategories, move, abilityText);
    
    let attrTotal = 0;
    if (move.acc1 === 'will') attrTotal = will.willMax;
    else if (stats[move.acc1 as CombatStat]) {
        const s = stats[move.acc1 as CombatStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[move.acc1] || 0));
    } else if (socials[move.acc1 as SocialStat]) {
        const s = socials[move.acc1 as SocialStat];
        attrTotal = Math.max(1, s.base + s.rank + s.buff - s.debuff + (itemBuffs.stats[move.acc1] || 0));
    }

    let skillTotal = 0;
    if (move.acc2 !== 'none' && skills[move.acc2 as Skill]) {
        skillTotal = skills[move.acc2 as Skill].base + skills[move.acc2 as Skill].buff + (itemBuffs.skills[move.acc2] || 0);
    } else if (move.acc2 !== 'none') {
        for (const cat of extraCategories) {
            const sk = cat.skills.find(s => s.id === move.acc2);
            if (sk) { skillTotal = sk.base + sk.buff + (itemBuffs.skills[move.acc2] || 0); break; }
        }
    }
    
    const trackers = useCharacterStore(state => state.trackers);
    const accTotal = attrTotal + skillTotal + trackers.globalAcc + itemBuffs.acc;
    
    const dmgTotal = move.category === 'Status' ? '-' : calculateBaseDamage(move, useCharacterStore.getState());

    return (
        <div style={{ opacity: move.active ? 0.5 : 1, background: 'var(--row-odd)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={move.active} onChange={(e) => updateMove(move.id, 'active', e.target.checked)} style={{ cursor: 'pointer', transform: 'scale(1.4)', flexShrink: 0, margin: '0 4px' }} title="Mark as used this round" />
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)', textAlign: 'center', minWidth: '20px', flexShrink: 0 }}>{accTotal}</span>
                <button type="button" onClick={() => rollAccuracy(move, useCharacterStore.getState())} className="action-button action-button--dark" style={{ padding: '6px 10px', flexShrink: 0 }} title="Roll Accuracy">🎯</button>
                <input type="text" list="move-list" value={move.name} onChange={(e) => updateMove(move.id, 'name', e.target.value)} onBlur={handleNameBlur} placeholder="Move Name" style={{ flex: 1, minWidth: '80px', padding: '6px 8px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-main)', outline: 'none', fontWeight: 'bold', fontSize: '0.9rem' }} />
                <button type="button" onClick={() => setEditModalOpen(true)} className="action-button action-button--transparent-white" style={{ color: 'var(--primary)', padding: '4px', fontSize: '1.2rem', flexShrink: 0 }} title="Edit Move & Tags">🏷️</button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <select value={move.type} onChange={(e) => updateMove(move.id, 'type', e.target.value)} style={{ flex: 1, padding: '6px', background: combinedColors[move.type] || 'var(--panel-alt)', color: move.type ? 'white' : 'var(--text-main)', fontWeight: 'bold', textShadow: move.type ? '1px 1px 1px rgba(0,0,0,0.8)' : 'none', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}>
                    <option value="">Type</option>
                    {combinedTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={move.category} onChange={(e) => updateMove(move.id, 'category', e.target.value as 'Physical'|'Special'|'Status')} style={{ flex: 1, padding: '6px', background: 'var(--panel-alt)', color: 'var(--text-main)', fontWeight: 'bold', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}>
                    <option value="Physical">Physical</option>
                    <option value="Special">Special</option>
                    <option value="Status">Support</option>
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--panel-alt)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', width: '35px' }}>ACC:</span>
                    <select value={move.acc1} onChange={(e) => updateMove(move.id, 'acc1', e.target.value)} style={{ flex: 1, minWidth: 0, padding: '4px', border: '1px solid var(--border)', borderRadius: '3px', background: 'var(--input-bg)', color: 'var(--text-main)' }}>
                        {Object.values(CombatStat).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                        <option value="will">WILL</option>
                    </select>
                    <span style={{ fontWeight: 'bold' }}>+</span>
                    <select value={move.acc2} onChange={(e) => updateMove(move.id, 'acc2', e.target.value)} style={{ flex: 1, minWidth: 0, padding: '4px', border: '1px solid var(--border)', borderRadius: '3px', background: 'var(--input-bg)', color: 'var(--text-main)' }}>
                        <option value="none">-- None --</option>
                        {Object.values(Skill).map(s => (
                            <option key={s} value={s}>{skills[s]?.customName || s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                        {extraCategories.length > 0 && extraCategories.map(cat => (
                            <optgroup key={cat.id} label={cat.name || 'EXTRA'}>
                                {cat.skills.map(sk => <option key={sk.id} value={sk.id}>{sk.name || 'Unnamed'}</option>)}
                            </optgroup>
                        ))}
                    </select>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--panel-alt)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', width: '35px' }}>DMG:</span>
                    <NumberSpinner value={move.power} onChange={(val) => updateMove(move.id, 'power', val)} />
                    <span style={{ fontWeight: 'bold', marginLeft: 'auto' }}>+</span>
                    <select value={move.dmg1} onChange={(e) => updateMove(move.id, 'dmg1', e.target.value)} style={{ flex: 1, minWidth: 0, padding: '4px', border: '1px solid var(--border)', borderRadius: '3px', background: 'var(--input-bg)', color: 'var(--text-main)' }}>
                        <option value="">-</option>
                        {Object.values(CombatStat).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)', minWidth: '20px', textAlign: 'center' }}>{dmgTotal}</span>
                    <button type="button" onClick={() => onTarget(move)} className="action-button action-button--red" style={{ padding: '6px 14px' }} title="Roll Damage">💥 Roll Dmg</button>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button type="button" onClick={() => moveUpMove(move.id)} className="action-button action-button--sort" style={{ height: '32px', width: '36px', fontSize: '1rem' }}>▲</button>
                    <button type="button" onClick={() => moveDownMove(move.id)} className="action-button action-button--sort" style={{ height: '32px', width: '36px', fontSize: '1rem' }}>▼</button>
                    <button type="button" onClick={() => onDelete(move.id)} className="action-button action-button--red" style={{ height: '32px', padding: '0 12px', marginLeft: '4px' }}>X</button>
                </div>
            </div>
            
            {editModalOpen && <MoveEditModal moveId={move.id} onClose={() => setEditModalOpen(false)} />}
        </div>
    );
}