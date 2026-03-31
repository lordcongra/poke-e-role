// src/components/TrackerSettingsModal.tsx
import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import { STATS_META_ID } from '../utils/graphicsManager';
import { NumberSpinner } from './NumberSpinner';

export function TrackerSettingsModal({ onClose }: { onClose: () => void }) {
    const id = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showSyncConfirm, setShowSyncConfirm] = useState(false);
    const [showPlacementModal, setShowPlacementModal] = useState(false);

    const confirmResetColors = () => {
        setIdentity('colorAct', '#4890fc');
        setIdentity('colorEva', '#c387fc');
        setIdentity('colorCla', '#dfad43');
        setShowResetConfirm(false);
    };

    const resetPlacements = () => {
        setIdentity('hpOffsetX', 0);
        setIdentity('hpOffsetY', 0);
        setIdentity('willOffsetX', 0);
        setIdentity('willOffsetY', 0);
        setIdentity('defOffsetX', 0);
        setIdentity('defOffsetY', 0);
        setIdentity('actOffsetX', 0);
        setIdentity('actOffsetY', 0);
        setIdentity('evaOffsetX', 0);
        setIdentity('evaOffsetY', 0);
        setIdentity('claOffsetX', 0);
        setIdentity('claOffsetY', 0);
    };

    const confirmSyncColors = async () => {
        if (!OBR.isAvailable) return;
        try {
            const items = await OBR.scene.items.getItems(
                (i) => i.layer === 'CHARACTER' && i.metadata[STATS_META_ID] !== undefined
            );
            const updates = { 'color-act': id.colorAct, 'color-eva': id.colorEva, 'color-cla': id.colorCla };
            await OBR.scene.items.updateItems(
                items.map((i) => i.id),
                (itemsToUpdate) => {
                    for (const item of itemsToUpdate) {
                        if (!item.metadata[STATS_META_ID]) item.metadata[STATS_META_ID] = {};
                        Object.assign(item.metadata[STATS_META_ID] as Record<string, unknown>, updates);
                    }
                }
            );
            OBR.notification.show('🎨 Tracker colors synced across all tokens!');
        } catch (e) {
            console.error('Failed to sync colors:', e);
        }
        setShowSyncConfirm(false);
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily: 'sans-serif'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    padding: '15px',
                    borderRadius: '8px',
                    width: '320px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    border: '2px solid var(--primary)',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <h3
                    style={{
                        marginTop: 0,
                        color: 'var(--primary)',
                        fontSize: '1.1rem',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px',
                        textAlign: 'center'
                    }}
                >
                    ⚙️ Tracker Settings
                </h3>
                <p
                    style={{
                        fontSize: '0.8rem',
                        textAlign: 'center',
                        marginBottom: '15px',
                        color: 'var(--text-muted)'
                    }}
                >
                    Customize what this token displays on the map.
                </p>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginBottom: '15px',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        padding: '0 10px'
                    }}
                >
                    <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', alignItems: 'center' }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={id.settingHpBar}
                                onChange={(e) => setIdentity('settingHpBar', e.target.checked)}
                            />{' '}
                            Show HP Bar
                        </label>
                        {role === 'GM' && (
                            <label
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Hide this UI element from Players entirely."
                            >
                                <input
                                    type="checkbox"
                                    checked={id.gmHpBar}
                                    onChange={(e) => setIdentity('gmHpBar', e.target.checked)}
                                />{' '}
                                Hide from Players
                            </label>
                        )}
                    </div>

                    <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', alignItems: 'center' }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={id.settingHpText}
                                onChange={(e) => setIdentity('settingHpText', e.target.checked)}
                            />{' '}
                            Show HP Numbers
                        </label>
                        {role === 'GM' && (
                            <label
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.gmHpText}
                                    onChange={(e) => setIdentity('gmHpText', e.target.checked)}
                                />{' '}
                                Hide from Players
                            </label>
                        )}
                    </div>

                    <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', alignItems: 'center' }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={id.settingWillBar}
                                onChange={(e) => setIdentity('settingWillBar', e.target.checked)}
                            />{' '}
                            Show Will Bar
                        </label>
                        {role === 'GM' && (
                            <label
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.gmWillBar}
                                    onChange={(e) => setIdentity('gmWillBar', e.target.checked)}
                                />{' '}
                                Hide from Players
                            </label>
                        )}
                    </div>

                    <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', alignItems: 'center' }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={id.settingWillText}
                                onChange={(e) => setIdentity('settingWillText', e.target.checked)}
                            />{' '}
                            Show Will Numbers
                        </label>
                        {role === 'GM' && (
                            <label
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.gmWillText}
                                    onChange={(e) => setIdentity('gmWillText', e.target.checked)}
                                />{' '}
                                Hide from Players
                            </label>
                        )}
                    </div>

                    <hr style={{ width: '100%', borderColor: 'var(--border)', margin: '2px 0' }} />

                    <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', alignItems: 'center' }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={id.settingDefBadge}
                                onChange={(e) => setIdentity('settingDefBadge', e.target.checked)}
                            />{' '}
                            Show Defenses
                        </label>
                        {role === 'GM' && (
                            <label
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.gmDefBadge}
                                    onChange={(e) => setIdentity('gmDefBadge', e.target.checked)}
                                />{' '}
                                Hide from Players
                            </label>
                        )}
                    </div>

                    <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '8px', alignItems: 'center' }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={id.settingEcoBadge}
                                onChange={(e) => setIdentity('settingEcoBadge', e.target.checked)}
                            />{' '}
                            Show Actions
                        </label>
                        {role === 'GM' && (
                            <label
                                style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={id.gmEcoBadge}
                                    onChange={(e) => setIdentity('gmEcoBadge', e.target.checked)}
                                />{' '}
                                Hide from Players
                            </label>
                        )}
                    </div>

                    <hr style={{ width: '100%', borderColor: 'var(--border)', margin: '6px 0' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <label
                            style={{
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                color: 'var(--primary)',
                                textAlign: 'center',
                                marginBottom: '4px'
                            }}
                        >
                            Badge Colors
                        </label>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <span style={{ width: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>Action:</span>
                            <input
                                type="color"
                                value={id.colorAct}
                                onChange={(e) => setIdentity('colorAct', e.target.value)}
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    padding: 0,
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Action Badge Color"
                            />
                            <input
                                type="text"
                                value={id.colorAct}
                                onChange={(e) => setIdentity('colorAct', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '4px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.8rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <span style={{ width: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>Evade:</span>
                            <input
                                type="color"
                                value={id.colorEva}
                                onChange={(e) => setIdentity('colorEva', e.target.value)}
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    padding: 0,
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Evade Badge Color"
                            />
                            <input
                                type="text"
                                value={id.colorEva}
                                onChange={(e) => setIdentity('colorEva', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '4px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.8rem',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <span style={{ width: '50px', fontSize: '0.8rem', fontWeight: 'bold' }}>Clash:</span>
                            <input
                                type="color"
                                value={id.colorCla}
                                onChange={(e) => setIdentity('colorCla', e.target.value)}
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    padding: 0,
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Clash Badge Color"
                            />
                            <input
                                type="text"
                                value={id.colorCla}
                                onChange={(e) => setIdentity('colorCla', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '4px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    background: 'var(--input-bg)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.8rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '15px',
                            marginTop: '10px'
                        }}
                    >
                        <label
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            title="Positive numbers push the UI down, Negative numbers pull it up!"
                        >
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Y-Offset:</span>
                            <NumberSpinner
                                value={id.yOffset}
                                onChange={(v) => setIdentity('yOffset', v)}
                                min={-9999}
                                max={9999}
                            />
                        </label>
                        <label
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            title="Positive numbers push the UI right, Negative numbers pull it left!"
                        >
                            <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>X-Offset:</span>
                            <NumberSpinner
                                value={id.xOffset}
                                onChange={(v) => setIdentity('xOffset', v)}
                                min={-9999}
                                max={9999}
                            />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                        <button
                            type="button"
                            onClick={() => setShowResetConfirm(true)}
                            className="action-button action-button--dark"
                            style={{ flex: 1, fontSize: '0.75rem', padding: '6px' }}
                        >
                            Reset Colors
                        </button>
                        {role === 'GM' && (
                            <button
                                type="button"
                                onClick={() => setShowSyncConfirm(true)}
                                className="action-button action-button--dark"
                                style={{
                                    flex: 1,
                                    fontSize: '0.75rem',
                                    padding: '6px',
                                    background: '#1976d2',
                                    borderColor: '#1976d2'
                                }}
                            >
                                🔄 Sync Colors
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        style={{
                            width: '100%',
                            padding: '6px',
                            marginTop: '10px',
                            background: '#8E24AA',
                            borderColor: '#8E24AA'
                        }}
                        onClick={() => setShowPlacementModal(true)}
                    >
                        🎯 Fine-Tune Placements
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        style={{ width: '100%', padding: '6px' }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {showResetConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 1100,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '300px',
                            width: '90%',
                            border: '2px solid #C62828',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#C62828', marginTop: 0, fontSize: '1.1rem' }}>⚠️ Reset Colors</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            Are you sure you want to reset your tracker colors to default?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setShowResetConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={confirmResetColors}
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSyncConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 1100,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '6px',
                            maxWidth: '300px',
                            width: '90%',
                            border: '2px solid #1976d2',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <h3 style={{ color: '#1976d2', marginTop: 0, fontSize: '1.1rem' }}>🔄 Sync Colors</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '20px' }}>
                            This will push your current tracker colors to EVERY token on the map. Are you sure?
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                                onClick={() => setShowSyncConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px', background: '#1976d2', borderColor: '#1976d2' }}
                                onClick={confirmSyncColors}
                            >
                                Sync
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPlacementModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.6)',
                        zIndex: 1100,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '20px',
                            borderRadius: '8px',
                            width: '340px',
                            border: '2px solid #8E24AA',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            color: 'var(--text-main)'
                        }}
                    >
                        <h3
                            style={{
                                color: '#8E24AA',
                                marginTop: 0,
                                fontSize: '1.1rem',
                                textAlign: 'center',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '4px'
                            }}
                        >
                            🎯 Fine-Tune Placements
                        </h3>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 60px 60px',
                                gap: '8px',
                                alignItems: 'center',
                                marginBottom: '15px'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Element
                            </div>
                            <div
                                style={{
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)',
                                    textAlign: 'center'
                                }}
                            >
                                X Shift
                            </div>
                            <div
                                style={{
                                    fontWeight: 'bold',
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)',
                                    textAlign: 'center'
                                }}
                            >
                                Y Shift
                            </div>

                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>HP Bar</span>
                            {/* AUDIT FIX: Allows negative inputs! */}
                            <NumberSpinner
                                value={id.hpOffsetX}
                                onChange={(v) => setIdentity('hpOffsetX', v)}
                                min={-9999}
                                max={9999}
                            />
                            <NumberSpinner
                                value={id.hpOffsetY}
                                onChange={(v) => setIdentity('hpOffsetY', v)}
                                min={-9999}
                                max={9999}
                            />

                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Will Bar</span>
                            <NumberSpinner
                                value={id.willOffsetX}
                                onChange={(v) => setIdentity('willOffsetX', v)}
                                min={-9999}
                                max={9999}
                            />
                            <NumberSpinner
                                value={id.willOffsetY}
                                onChange={(v) => setIdentity('willOffsetY', v)}
                                min={-9999}
                                max={9999}
                            />

                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Defenses</span>
                            <NumberSpinner
                                value={id.defOffsetX}
                                onChange={(v) => setIdentity('defOffsetX', v)}
                                min={-9999}
                                max={9999}
                            />
                            <NumberSpinner
                                value={id.defOffsetY}
                                onChange={(v) => setIdentity('defOffsetY', v)}
                                min={-9999}
                                max={9999}
                            />

                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Action Badge</span>
                            <NumberSpinner
                                value={id.actOffsetX}
                                onChange={(v) => setIdentity('actOffsetX', v)}
                                min={-9999}
                                max={9999}
                            />
                            <NumberSpinner
                                value={id.actOffsetY}
                                onChange={(v) => setIdentity('actOffsetY', v)}
                                min={-9999}
                                max={9999}
                            />

                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Evade Badge</span>
                            <NumberSpinner
                                value={id.evaOffsetX}
                                onChange={(v) => setIdentity('evaOffsetX', v)}
                                min={-9999}
                                max={9999}
                            />
                            <NumberSpinner
                                value={id.evaOffsetY}
                                onChange={(v) => setIdentity('evaOffsetY', v)}
                                min={-9999}
                                max={9999}
                            />

                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Clash Badge</span>
                            <NumberSpinner
                                value={id.claOffsetX}
                                onChange={(v) => setIdentity('claOffsetX', v)}
                                min={-9999}
                                max={9999}
                            />
                            <NumberSpinner
                                value={id.claOffsetY}
                                onChange={(v) => setIdentity('claOffsetY', v)}
                                min={-9999}
                                max={9999}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={resetPlacements}
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px' }}
                            >
                                Reset Placements
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPlacementModal(false)}
                                className="action-button action-button--dark"
                                style={{ flex: 1, padding: '6px', background: '#8E24AA', borderColor: '#8E24AA' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
