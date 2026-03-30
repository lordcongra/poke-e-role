// src/components/TrackerSection.tsx
import { useState } from 'react';
import OBR from "@owlbear-rodeo/sdk";
import { useCharacterStore } from '../store/useCharacterStore';
import { NumberSpinner } from './NumberSpinner';
import { CombatStat, Skill } from '../types/enums';
import { rollGeneric, rollDicePlus, parseCombatTags } from '../utils/combatUtils';

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#555', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '10px', cursor: 'pointer', marginLeft: '4px', fontWeight: 'bold' }}>?</span>
);

export function TrackerSection() {
    const trackers = useCharacterStore(state => state.trackers);
    const updateTracker = useCharacterStore(state => state.updateTracker);
    const resetRound = useCharacterStore(state => state.resetRound);
    const longRest = useCharacterStore(state => state.longRest);
    
    const painEnabled = useCharacterStore(state => state.identity.pain) === 'Enabled';
    const will = useCharacterStore(state => state.will);
    const updateWill = useCharacterStore(state => state.updateWill);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [maneuver, setManeuver] = useState('none');
    const [showClashModal, setShowClashModal] = useState(false); 
    const [showRestModal, setShowRestModal] = useState(false); 
    
    const [chancesModalOpen, setChancesModalOpen] = useState(false);
    const [chancesToRoll, setChancesToRoll] = useState(1);
    
    const [tooltipInfo, setTooltipInfo] = useState<{title: string, desc: string} | null>(null);

    const handleWillSpend = (cost: number, action: () => void) => {
        if (will.willCurr >= cost) {
            updateWill('willCurr', will.willCurr - cost);
            action();
        } else {
            if (OBR.isAvailable) OBR.notification.show("Not enough Will points!", "WARNING");
        }
    };

    const handleFateSpend = () => {
        if (trackers.chances > 0) {
            if (OBR.isAvailable) OBR.notification.show("Cannot use Pushing Fate in the same round as Take Your Chances!", "WARNING");
            return;
        }
        handleWillSpend(1, () => updateTracker('fate', trackers.fate + 1));
    };

    const handleChanceSpend = () => {
        if (trackers.fate > 0) {
            if (OBR.isAvailable) OBR.notification.show("Cannot use Take Your Chances in the same round as Pushing Fate!", "WARNING");
            return;
        }
        handleWillSpend(1, () => updateTracker('chances', trackers.chances + 1));
    };

    const openChancesModal = () => {
        if (trackers.chances <= 0) {
            if (OBR.isAvailable) OBR.notification.show("No Take Your Chances stacks! Spend Willpower first.", "WARNING");
            return;
        }
        setChancesToRoll(trackers.chances);
        setChancesModalOpen(true);
    };

    const confirmChancesRoll = () => {
        const finalRoll = Math.min(chancesToRoll, trackers.chances);
        if (finalRoll > 0) {
            const state = useCharacterStore.getState();
            const nickname = state.identity.nickname || state.identity.species || "Someone";
            rollDicePlus(`${finalRoll}d6>3`, `🍀 ${nickname} used Take Your Chances to reroll ${finalRoll} failed dice!`);
        }
        setChancesModalOpen(false);
    };

    const handleEvadeRoll = () => {
        const s = useCharacterStore.getState();
        const itemBuffs = parseCombatTags(s.inventory, s.extraCategories);
        const dexTotal = Math.max(1, s.stats[CombatStat.DEX].base + s.stats[CombatStat.DEX].rank + s.stats[CombatStat.DEX].buff - s.stats[CombatStat.DEX].debuff + (itemBuffs.stats.dex || 0));
        const evadeTotal = s.skills[Skill.EVASION].base + s.skills[Skill.EVASION].buff + (itemBuffs.skills.evasion || 0);
        rollGeneric("Evasion", dexTotal + evadeTotal, "dex", true, false, true);
    };

    const handleClashRoll = (isPhysical: boolean) => {
        setShowClashModal(false);
        const s = useCharacterStore.getState();
        const itemBuffs = parseCombatTags(s.inventory, s.extraCategories);
        const stat = isPhysical ? CombatStat.STR : CombatStat.SPE;
        const statTotal = Math.max(1, s.stats[stat].base + s.stats[stat].rank + s.stats[stat].buff - s.stats[stat].debuff + (itemBuffs.stats[stat] || 0));
        const clashTotal = s.skills[Skill.CLASH].base + s.skills[Skill.CLASH].buff + (itemBuffs.skills.clash || 0);
        rollGeneric(isPhysical ? "Physical Clash" : "Special Clash", statTotal + clashTotal, stat, false, true, true);
    };

    const rollManeuver = () => {
        if (maneuver === 'none') return;
        
        const s = useCharacterStore.getState();
        const itemBuffs = parseCombatTags(s.inventory, s.extraCategories);
        
        const getStat = (stat: CombatStat) => Math.max(1, s.stats[stat].base + s.stats[stat].rank + s.stats[stat].buff - s.stats[stat].debuff + (itemBuffs.stats[stat] || 0));
        const getSkill = (skill: Skill) => s.skills[skill].base + s.skills[skill].buff + (itemBuffs.skills[skill] || 0);
        const getSoc = (stat: 'cle') => Math.max(1, s.socials[stat].base + s.socials[stat].rank + s.socials[stat].buff - s.socials[stat].debuff + (itemBuffs.stats[stat] || 0));

        if (maneuver === 'ambush') rollGeneric("Ambush", getStat(CombatStat.DEX) + getSkill(Skill.STEALTH), "dex", false, false, true);
        else if (maneuver === 'cover') rollGeneric("Cover an Ally", 3 + getStat(CombatStat.INS), "will", false, false, true);
        else if (maneuver === 'grapple') rollGeneric("Grapple", getStat(CombatStat.STR) + getSkill(Skill.BRAWL), "str", false, false, true);
        else if (maneuver === 'run') rollGeneric("Run Away", getStat(CombatStat.DEX) + getSkill(Skill.ATHLETIC), "dex", false, false, true);
        else if (maneuver === 'stabilize') rollGeneric("Stabilize Ally", getSoc('cle') + getSkill(Skill.MEDICINE), "cle", false, false, true);
        else if (maneuver === 'struggle') rollGeneric("Struggle (Accuracy)", getStat(CombatStat.DEX) + getSkill(Skill.BRAWL), "dex", false, false, true);
    };

    return (
        <div className="tracker-section" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: '6px' }}>
                <button type="button" className={`collapse-btn panel-toggle-btn ${isCollapsed ? 'is-collapsed' : ''}`} style={{ position: 'absolute', left: 0 }} onClick={() => setIsCollapsed(!isCollapsed)}>▼</button>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.85rem' }}>ROUND TRACKER</span>
            </div>
            
            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 10px', fontSize: '0.75rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <span style={{ fontWeight: 'bold' }}>Act</span><TooltipIcon onClick={() => setTooltipInfo({ title: "Actions", desc: "Actions taken this round."})} />: 
                            <NumberSpinner value={trackers.actions} onChange={(v) => updateTracker('actions', Math.max(0, Math.min(5, v)))} min={0} max={5} />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button type="button" onClick={handleEvadeRoll} className="action-button action-button--dark" style={{ padding: '2px 6px', whiteSpace: 'nowrap' }}>🎲 Evade</button>
                                <input type="checkbox" checked={trackers.evade} onChange={(e) => updateTracker('evade', e.target.checked)} className="sheet-save" style={{ cursor: 'pointer', transform: 'scale(1.1)' }} />
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button type="button" onClick={() => setShowClashModal(true)} className="action-button action-button--dark" style={{ padding: '2px 6px', whiteSpace: 'nowrap' }}>🎲 Clash</button>
                                <input type="checkbox" checked={trackers.clash} onChange={(e) => updateTracker('clash', e.target.checked)} className="sheet-save" style={{ cursor: 'pointer', transform: 'scale(1.1)' }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.75rem' }}>
                        <span style={{ fontWeight: 'bold' }}>Take your Chances</span><TooltipIcon onClick={() => setTooltipInfo({ title: "Take Your Chances", desc: "Reroll failed dice. Max uses equals the number of Willpower spent."})} />: 
                        <NumberSpinner value={trackers.chances} onChange={(v) => updateTracker('chances', v)} min={0} />
                        <button type="button" onClick={openChancesModal} className="action-button action-button--dark" style={{ padding: '2px 8px' }}>🎲 Roll</button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <select value={maneuver} onChange={(e) => setManeuver(e.target.value)} style={{ padding: '2px', fontFamily: 'inherit', border: '1px solid var(--border)', fontSize: '0.75rem', flex: 1, minWidth: 0, background: 'var(--panel-bg)', color: 'var(--text-main)', borderRadius: '3px' }}>
                            <option value="none">-- Maneuver --</option>
                            <option value="ambush">Ambush (Dex+Stl)</option>
                            <option value="cover">Cover Ally (Will)</option>
                            <option value="grapple">Grapple (Str+Bwl)</option>
                            <option value="run">Run (Dex+Ath)</option>
                            <option value="stabilize">Stabilize (Cle+Med)</option>
                            <option value="struggle">Struggle (Accuracy)</option>
                        </select>
                        <button type="button" onClick={rollManeuver} className="action-button action-button--dark" style={{ flex: '0 0 32px', padding: '2px 0', textAlign: 'center' }}>🎲</button>
                        <button type="button" onClick={resetRound} className="action-button action-button--red" style={{ flex: '0 0 80px', width: '80px', textAlign: 'center', padding: '4px 0', boxSizing: 'border-box', whiteSpace: 'nowrap' }}>🔄 Reset</button>
                        <button type="button" onClick={() => setShowRestModal(true)} className="action-button action-button--dark" style={{ background: '#2E7D32', borderColor: '#2E7D32', flex: '0 0 80px', width: '80px', textAlign: 'center', padding: '4px 0', boxSizing: 'border-box', whiteSpace: 'nowrap' }} title="Fully heal HP/Will and clear statuses">🏕️ Rest</button>
                    </div>
                    
                    <div className="mobile-stack" style={{ display: 'flex', gap: '4px', justifyContent: 'space-between', alignItems: 'stretch', marginTop: '8px' }}>
                        {painEnabled && (
                            <button type="button" onClick={() => handleWillSpend(1, () => updateTracker('ignoredPain', trackers.ignoredPain + 1))} className="action-button action-button--dark" style={{ flex: '1 1 0%', fontSize: '0.65rem', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' }} title="Power Through the Pain: Ignore 1 Pain Penalization for the rest of the Scene (-1 Will)">Ignore Pain Penalties</button>
                        )}
                        <button type="button" onClick={handleFateSpend} className="action-button action-button--dark" style={{ flex: '1 1 0%', fontSize: '0.65rem', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' }} title="Pushing Fate: Get 1 automatic un-removable success on a single roll (-1 Will). (Does not stack with Take Your Chances)">Pushing Fate</button>
                        <button type="button" onClick={handleChanceSpend} className="action-button action-button--dark" style={{ flex: '1 1 0%', fontSize: '0.65rem', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', whiteSpace: 'nowrap' }} title="Take Your Chances: Re-roll 1 unsuccessful die from all Action Rolls of the Round (-1 Will). (Does not stack with Pushing Fate)">Take Your Chances</button>
                    </div>
                </div>
            )}

            {chancesModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '280px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '2px solid var(--primary)' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px', textAlign: 'center' }}>🍀 Take Your Chances</h3>
                        <p style={{ fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px', color: 'var(--text-muted)' }}>How many failed dice are you rerolling? <br/>(You have {trackers.chances} stack(s) active this round)</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            <NumberSpinner value={chancesToRoll} onChange={(v) => setChancesToRoll(Math.max(1, Math.min(trackers.chances, v)))} min={1} max={trackers.chances} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <button type="button" onClick={() => setChancesModalOpen(false)} className="action-button action-button--dark" style={{ flex: 1, padding: '6px' }}>Cancel</button>
                            <button type="button" onClick={confirmChancesRoll} className="action-button action-button--red" style={{ flex: 1, padding: '6px' }}>🎲 Reroll</button>
                        </div>
                    </div>
                </div>
            )}

            {showClashModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '260px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '2px solid var(--primary)' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--primary)', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px', textAlign: 'center' }}>⚔️ Select Clash Type</h3>
                        <p style={{ fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px', color: 'var(--text-muted)' }}>Which attribute are you using to Clash?</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button type="button" onClick={() => handleClashRoll(true)} className="action-button action-button--dark" style={{ background: '#E65100', borderColor: '#E65100', padding: '8px', fontSize: '0.9rem' }}>💪 Physical (STR)</button>
                            <button type="button" onClick={() => handleClashRoll(false)} className="action-button action-button--dark" style={{ background: '#1565C0', borderColor: '#1565C0', padding: '8px', fontSize: '0.9rem' }}>✨ Special (SPE)</button>
                            <button type="button" onClick={() => setShowClashModal(false)} className="action-button action-button--dark" style={{ padding: '6px', marginTop: '4px' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showRestModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '15px', borderRadius: '8px', width: '280px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '2px solid #2E7D32' }}>
                        <h3 style={{ marginTop: 0, color: '#2E7D32', fontSize: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: '4px', textAlign: 'center' }}>🏕️ Take a Long Rest?</h3>
                        <p style={{ fontSize: '0.85rem', textAlign: 'center', marginBottom: '15px', color: 'var(--text-muted)' }}>This will fully heal HP and Will, clear all Status Conditions, and reset Ignored Pain.</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <button type="button" onClick={() => setShowRestModal(false)} className="action-button action-button--dark" style={{ flex: 1, padding: '6px' }}>Cancel</button>
                            <button type="button" onClick={() => { longRest(); setShowRestModal(false); }} className="action-button" style={{ background: '#2E7D32', color: 'white', flex: 1, padding: '6px' }}>🏕️ Rest</button>
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