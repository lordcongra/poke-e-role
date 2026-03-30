// src/components/TargetingModal.tsx
import { useState, useEffect } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import type { MoveData } from '../store/storeTypes';
import { useCharacterStore } from '../store/useCharacterStore';
import { STATS_META_ID } from '../utils/graphicsManager';

interface TargetingModalProps {
    move: MoveData;
    baseDamage: number;
    onClose: () => void;
    onRoll: (baseDmg: number, isCrit: boolean, isSE: boolean, reduction: number) => void;
}

export function TargetingModal({ move, baseDamage, onClose, onRoll }: TargetingModalProps) {
    const [reduction, setReduction] = useState(0);
    const [isCrit, setIsCrit] = useState(false);
    const [isSE, setIsSE] = useState(false);
    const [targets, setTargets] = useState<{name: string, def: number}[]>([]);

    const ruleset = useCharacterStore(state => state.identity.ruleset);
    
    // AUDIT FIX: Safely handles both new string maps and legacy JSON mappings by checking the start of the string!
    const isPhysicalMove = String(move.category).startsWith('Phys');

    useEffect(() => {
        if (OBR.isAvailable) {
            OBR.scene.items.getItems().then(items => {
                const availableTargets: {name: string, def: number}[] = [];
                
                items.forEach(item => {
                    if (item.metadata[STATS_META_ID] && item.metadata["com.pretty-initiative/metadata"]) {
                        const meta = item.metadata[STATS_META_ID] as Record<string, unknown>;
                        const name = String(meta.nickname || meta.species || item.name);
                        
                        const vit = (Number(meta['vit-base']) || 2) + (Number(meta['vit-rank']) || 0) + (Number(meta['vit-buff']) || 0) - (Number(meta['vit-debuff']) || 0);
                        const ins = (Number(meta['ins-base']) || 1) + (Number(meta['ins-rank']) || 0) + (Number(meta['ins-buff']) || 0) - (Number(meta['ins-debuff']) || 0);
                        
                        const defBuff = Number(meta['defBuff'] ?? meta['def-buff']) || 0;
                        const defDebuff = Number(meta['defDebuff'] ?? meta['def-debuff']) || 0;
                        const sdefBuff = Number(meta['sdefBuff'] ?? meta['spd-buff']) || 0;
                        const sdefDebuff = Number(meta['sdefDebuff'] ?? meta['spd-debuff']) || 0;
                        
                        const def = vit + defBuff - defDebuff;
                        let spd = ins + sdefBuff - sdefDebuff;
                        
                        if (ruleset === 'tabletop') spd = vit + sdefBuff - sdefDebuff;
                        
                        const targetDef = isPhysicalMove ? def : spd;
                        availableTargets.push({ name, def: Math.max(1, targetDef) });
                    }
                });
                
                setTargets(availableTargets);
            });
        }
    }, [isPhysicalMove, ruleset]);

    const handleConfirm = () => {
        onRoll(baseDamage, isCrit, isSE, reduction);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '280px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '2px solid var(--primary)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                    🎯 Select Target
                </h3>

                <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Enemy Token:</label>
                    <select 
                        onChange={(e) => { if (e.target.value !== 'manual') setReduction(Number(e.target.value)); }}
                        style={{ width: '100%', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.85rem', marginTop: '2px', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                    >
                        <option value="manual">-- Manual Entry --</option>
                        {targets.map((t, i) => (
                            <option key={i} value={t.def}>{t.name} ({isPhysicalMove ? 'DEF' : 'SPD'}: {t.def})</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                        <span>{isPhysicalMove ? 'Defense' : 'Special Defense'}</span> Reduction:
                    </label>
                    <input
                        type="number"
                        value={reduction}
                        onChange={e => setReduction(Number(e.target.value) || 0)}
                        min="0"
                        style={{ width: '100%', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.85rem', marginTop: '2px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* AUDIT FIX: Corrected justifyContent spelling! */}
                <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', color: '#d32f2f' }}>
                        <input type="checkbox" checked={isCrit} onChange={e => setIsCrit(e.target.checked)} style={{ cursor: 'pointer', transform: 'scale(1.1)' }} />
                        Critical Hit?
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', color: '#1976d2' }}>
                        <input type="checkbox" checked={isSE} onChange={e => setIsSE(e.target.checked)} style={{ cursor: 'pointer', transform: 'scale(1.1)' }} />
                        Super Effective?
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <button type="button" className="action-button action-button--dark" style={{ flex: 1, padding: '6px' }} onClick={onClose}>Cancel</button>
                    <button type="button" className="action-button action-button--red" style={{ flex: 1, padding: '6px' }} onClick={handleConfirm}>💥 Roll Damage</button>
                </div>
            </div>
        </div>
    );
}