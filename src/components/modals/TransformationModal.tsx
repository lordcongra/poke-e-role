import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { POKEMON_TYPES } from '../../data/constants';
import type { TransformationType } from '../../store/storeTypes';
import './TransformationModal.css';

interface TransformationModalProps {
    onClose: () => void;
}

export function TransformationModal({ onClose }: TransformationModalProps) {
    const activeTrans = useCharacterStore((state) => state.identity.activeTransformation);
    const toggleTransformation = useCharacterStore((state) => state.toggleTransformation);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const willCurr = useCharacterStore((state) => state.will.willCurr);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const role = useCharacterStore((state) => state.role);

    const hasAltForm = !!useCharacterStore((state) => state.identity.altFormData);
    const hasMaxForm = !!useCharacterStore((state) => state.identity.maxFormData);

    const cachedTrans = (localStorage.getItem('pokerole-last-trans') as TransformationType) || 'Mega';
    const [selectedTrans, setSelectedTrans] = useState<TransformationType>(
        activeTrans !== 'None' ? activeTrans : cachedTrans
    );

    const [affinity, setAffinity] = useState('Stellar');
    const [autoMaxMoves, setAutoMaxMoves] = useState(true);
    const [clearConfirmType, setClearConfirmType] = useState<'Mega' | 'Max' | null>(null);

    // Tera Blast Configuration State
    const [teraCategory, setTeraCategory] = useState<'Physical' | 'Special'>('Special');
    const [teraAcc1, setTeraAcc1] = useState('dex');
    const [teraAcc2, setTeraAcc2] = useState('channel');
    const [teraDmg1, setTeraDmg1] = useState('spe');

    const allTypes = [
        ...POKEMON_TYPES.filter((t) => t !== ''),
        ...roomCustomTypes.filter((t) => role === 'GM' || !t.gmOnly).map((t) => t.name)
    ];

    const handleSelectTrans = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as TransformationType;
        setSelectedTrans(val);
        localStorage.setItem('pokerole-last-trans', val);
    };

    const handleApply = () => {
        toggleTransformation(selectedTrans, affinity, autoMaxMoves, {
            category: teraCategory,
            acc1: teraAcc1,
            acc2: teraAcc2,
            dmg1: teraDmg1
        });
        onClose();
    };

    const handleRevert = () => {
        toggleTransformation('None');
        onClose();
    };

    const confirmClearMemory = () => {
        if (clearConfirmType === 'Mega') {
            setIdentity('altFormData', '');
            if (OBR.isAvailable) OBR.notification.show('Mega / Custom Form Memory Cleared!', 'SUCCESS');
        } else if (clearConfirmType === 'Max') {
            setIdentity('maxFormData', '');
            if (OBR.isAvailable) OBR.notification.show('Dynamax / Gigantamax Memory Cleared!', 'SUCCESS');
        }
        setClearConfirmType(null);
    };

    const isTransforming = activeTrans === 'None';
    const willCost = selectedTrans === 'Mega' || selectedTrans === 'Terastallize' ? 1 : 0;
    const canAfford = willCurr >= willCost;

    return (
        <div className="transformation-modal__overlay">
            <div className="transformation-modal__content">
                <div className="transformation-modal__header">
                    <h3 className="transformation-modal__title">
                        🧬 {isTransforming ? 'Transform' : 'Manage Transformation'}
                    </h3>
                    <button onClick={onClose} className="transformation-modal__close-btn" title="Close">
                        X
                    </button>
                </div>

                {isTransforming ? (
                    <div className="transformation-modal__section">
                        <label className="transformation-modal__label">Transformation Type:</label>
                        <select
                            value={selectedTrans}
                            onChange={handleSelectTrans}
                            className="transformation-modal__select"
                        >
                            <option value="Mega">Mega Evolution</option>
                            <option value="Dynamax">Dynamax</option>
                            <option value="Gigantamax">Gigantamax</option>
                            <option value="Terastallize">Terastallization</option>
                            <option value="Custom">Custom / Homebrew Form</option>
                        </select>

                        {selectedTrans === 'Terastallize' && (
                            <>
                                <label className="transformation-modal__label">Tera Affinity:</label>
                                <select
                                    value={affinity}
                                    onChange={(e) => setAffinity(e.target.value)}
                                    className="transformation-modal__select"
                                >
                                    {allTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                                
                                <div style={{ marginTop: '10px', padding: '10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--row-odd)' }}>
                                    <label className="transformation-modal__label" style={{ marginBottom: '8px', display: 'block' }}>Configure Tera Blast:</label>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <select value={teraCategory} onChange={(e) => setTeraCategory(e.target.value as any)} className="transformation-modal__select" style={{ flex: 1, padding: '4px' }}>
                                            <option value="Physical">Physical</option>
                                            <option value="Special">Special</option>
                                        </select>
                                        <select value={teraDmg1} onChange={(e) => setTeraDmg1(e.target.value)} className="transformation-modal__select" style={{ flex: 1, padding: '4px' }}>
                                            <option value="str">STR</option>
                                            <option value="spe">SPE</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select value={teraAcc1} onChange={(e) => setTeraAcc1(e.target.value)} className="transformation-modal__select" style={{ flex: 1, padding: '4px' }}>
                                            <option value="dex">DEX</option>
                                            <option value="ins">INS</option>
                                            <option value="str">STR</option>
                                            <option value="spe">SPE</option>
                                        </select>
                                        <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>+</span>
                                        <select value={teraAcc2} onChange={(e) => setTeraAcc2(e.target.value)} className="transformation-modal__select" style={{ flex: 1, padding: '4px' }}>
                                            <option value="channel">Channel</option>
                                            <option value="clash">Clash</option>
                                            <option value="brawl">Brawl</option>
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {(selectedTrans === 'Dynamax' || selectedTrans === 'Gigantamax') && !hasMaxForm && (
                            <label className="transformation-modal__label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '6px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={autoMaxMoves} 
                                    onChange={(e) => setAutoMaxMoves(e.target.checked)} 
                                    style={{ transform: 'scale(1.2)' }}
                                />
                                Auto-Convert to Max Moves?
                            </label>
                        )}

                        <div className="transformation-modal__desc-box">
                            {selectedTrans === 'Mega' && (
                                <>
                                    Backs up your current stats, heals all HP/Will to full, and clears statuses.
                                    {hasAltForm && <div style={{marginTop: '8px', color: 'var(--primary)', fontWeight: 'bold'}}>✨ Saved Mega form detected. Values will be restored!</div>}
                                    <span className="transformation-modal__cost-warning">Costs 1 Willpower.</span>
                                </>
                            )}
                            {selectedTrans === 'Dynamax' && (
                                <>
                                    Grants 6 Temporary HP, triggers a 3-round timer, and prevents Evasion/Clashing.
                                    {hasMaxForm && <div style={{marginTop: '8px', color: 'var(--primary)', fontWeight: 'bold'}}>✨ Saved Max form detected. Values will be restored!</div>}
                                </>
                            )}
                            {selectedTrans === 'Gigantamax' && (
                                <>
                                    Grants 12 Temporary HP, +2 to STR/SPE/DEX/DEF/SPD, triggers a 3-round timer, and prevents Evasion/Clashing.
                                    {hasMaxForm && <div style={{marginTop: '8px', color: 'var(--primary)', fontWeight: 'bold'}}>✨ Saved Max form detected. Values will be restored!</div>}
                                </>
                            )}
                            {selectedTrans === 'Terastallize' && (
                                <>
                                    Replaces your typing with Stellar, applies STAB to your affinity type, and grants bonus damage to your next attack.
                                    <span className="transformation-modal__cost-warning">Costs 1 Willpower.</span>
                                </>
                            )}
                            {selectedTrans === 'Custom' && (
                                <>
                                    Safely backs up your current stats so you can freely edit your sheet for a homebrew form.
                                    {hasAltForm && <div style={{marginTop: '8px', color: 'var(--primary)', fontWeight: 'bold'}}>✨ Saved Custom form detected. Values will be restored!</div>}
                                </>
                            )}
                        </div>

                        {(hasAltForm || hasMaxForm) && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                {hasAltForm && (
                                    <button type="button" className="action-button action-button--dark" style={{flex: 1, fontSize: '0.8rem'}} onClick={() => setClearConfirmType('Mega')}>
                                        🗑️ Clear Mega Save
                                    </button>
                                )}
                                {hasMaxForm && (
                                    <button type="button" className="action-button action-button--dark" style={{flex: 1, fontSize: '0.8rem'}} onClick={() => setClearConfirmType('Max')}>
                                        🗑️ Clear Max Save
                                    </button>
                                )}
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="transformation-modal__section">
                        <div className="transformation-modal__desc-box" style={{ textAlign: 'center' }}>
                            You are currently transformed into your <strong>{activeTrans}</strong> form!
                            <br /><br />
                            Reverting will safely restore your original Base Stats, Typing, Moves, and Skills.
                        </div>
                    </div>
                )}

                <div className="transformation-modal__actions">
                    {isTransforming ? (
                        <>
                            <button
                                type="button"
                                className="action-button action-button--dark transformation-modal__btn"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red transformation-modal__btn"
                                onClick={handleApply}
                                disabled={!canAfford}
                            >
                                ✨ Activate
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="action-button transformation-modal__btn transformation-modal__btn--revert"
                            onClick={handleRevert}
                        >
                            🔄 Revert to Base Form
                        </button>
                    )}
                </div>
            </div>

            {clearConfirmType && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1600, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'var(--panel-bg)', padding: '20px', borderRadius: '8px', border: '2px solid #c62828', maxWidth: '300px', textAlign: 'center' }}>
                        <h3 style={{ color: '#c62828', marginTop: 0 }}>⚠️ Confirm Deletion</h3>
                        <p style={{ fontSize: '0.9rem', marginBottom: '20px' }}>Are you sure you want to delete your {clearConfirmType === 'Mega' ? 'Mega/Custom' : 'Dynamax'} saved data? This cannot be undone.</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="action-button action-button--dark" style={{ flex: 1, padding: '8px' }} onClick={() => setClearConfirmType(null)}>Cancel</button>
                            <button className="action-button action-button--red" style={{ flex: 1, padding: '8px' }} onClick={confirmClearMemory}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}