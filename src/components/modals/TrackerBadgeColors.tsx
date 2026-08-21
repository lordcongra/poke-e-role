import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { RefreshCw, Move, RotateCcw, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { STATS_META_ID } from '../../utils/graphicsManager';
import { NumberSpinner } from '../ui/NumberSpinner';

interface TrackerBadgeColorsProps {
    onOpenPlacementModal: () => void;
}

export function TrackerBadgeColors({ onOpenPlacementModal }: TrackerBadgeColorsProps) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showSyncConfirm, setShowSyncConfirm] = useState(false);

    const confirmResetColors = () => {
        setIdentity('colorAct', '#4890fc');
        setIdentity('colorEva', '#c387fc');
        setIdentity('colorCla', '#dfad43');
        setShowResetConfirm(false);
    };

    const confirmSyncColors = async () => {
        if (!OBR.isAvailable) return;
        try {
            const items = await OBR.scene.items.getItems(
                (item) => item.layer === 'CHARACTER' && item.metadata[STATS_META_ID] !== undefined
            );
            const updates = {
                'color-act': identityStore.colorAct,
                'color-eva': identityStore.colorEva,
                'color-cla': identityStore.colorCla
            };

            await OBR.scene.items.updateItems(
                items.map((item) => item.id),
                (itemsToUpdate) => {
                    for (const item of itemsToUpdate) {
                        if (!item.metadata[STATS_META_ID]) item.metadata[STATS_META_ID] = {};
                        Object.assign(item.metadata[STATS_META_ID] as Record<string, unknown>, updates);
                    }
                }
            );
            OBR.notification.show('Tracker colors synced across all tokens!', 'SUCCESS');
        } catch (error) {
            console.error('[TrackerBadgeColors] Failed to sync colors:', error);
        }
        setShowSyncConfirm(false);
    };

    return (
        <>
            <div className="tracker-settings__color-group">
                <label className="tracker-settings__subtitle text-title-primary">Badge Colors</label>

                <div className="tracker-settings__color-row">
                    <span className="tracker-settings__color-label text-label">Action:</span>
                    <input
                        type="color"
                        value={identityStore.colorAct}
                        onChange={(event) => setIdentity('colorAct', event.target.value)}
                        className="tracker-settings__color-picker"
                        title="Action Badge Color"
                    />
                    <input
                        type="text"
                        value={identityStore.colorAct}
                        onChange={(event) => setIdentity('colorAct', event.target.value)}
                        className="tracker-settings__color-input text-label"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>

                <div className="tracker-settings__color-row">
                    <span className="tracker-settings__color-label text-label">Evade:</span>
                    <input
                        type="color"
                        value={identityStore.colorEva}
                        onChange={(event) => setIdentity('colorEva', event.target.value)}
                        className="tracker-settings__color-picker"
                        title="Evade Badge Color"
                    />
                    <input
                        type="text"
                        value={identityStore.colorEva}
                        onChange={(event) => setIdentity('colorEva', event.target.value)}
                        className="tracker-settings__color-input text-label"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>

                <div className="tracker-settings__color-row">
                    <span className="tracker-settings__color-label text-label">Clash:</span>
                    <input
                        type="color"
                        value={identityStore.colorCla}
                        onChange={(event) => setIdentity('colorCla', event.target.value)}
                        className="tracker-settings__color-picker"
                        title="Clash Badge Color"
                    />
                    <input
                        type="text"
                        value={identityStore.colorCla}
                        onChange={(event) => setIdentity('colorCla', event.target.value)}
                        className="tracker-settings__color-input text-label"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
            </div>

            <div className="tracker-settings__offset-container">
                <label
                    className="tracker-settings__offset-label"
                    title="Scales the entire HUD up or down! Default is 100%."
                >
                    <span className="text-label">HUD Size (%):</span>
                    <NumberSpinner
                        value={identityStore.trackerScale ?? 100}
                        onChange={(value) => setIdentity('trackerScale', value)}
                        min={10}
                        max={500}
                    />
                </label>
            </div>

            <div className="tracker-settings__offset-container">
                <label
                    className="tracker-settings__offset-label"
                    title="Positive numbers push the UI down, Negative numbers pull it up!"
                >
                    <span className="text-label">Y-Offset:</span>
                    <NumberSpinner
                        value={identityStore.yOffset}
                        onChange={(value) => setIdentity('yOffset', value)}
                        min={-9999}
                        max={9999}
                    />
                </label>
                <label
                    className="tracker-settings__offset-label"
                    title="Positive numbers push the UI right, Negative numbers pull it left!"
                >
                    <span className="text-label">X-Offset:</span>
                    <NumberSpinner
                        value={identityStore.xOffset}
                        onChange={(value) => setIdentity('xOffset', value)}
                        min={-9999}
                        max={9999}
                    />
                </label>
            </div>

            <div className="tracker-settings__button-row">
                <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="action-button action-button--dark tracker-settings__modal-btn text-theme-header"
                >
                    <RotateCcw size={16} /> Reset
                </button>
                {role === 'GM' && (
                    <button
                        type="button"
                        onClick={() => setShowSyncConfirm(true)}
                        className="action-button action-button--theme tracker-settings__modal-btn text-theme-header"
                    >
                        <RefreshCw size={16} /> Sync
                    </button>
                )}
            </div>

            <button
                type="button"
                className="action-button action-button--secondary tracker-settings__btn-placement text-theme-header"
                onClick={onOpenPlacementModal}
            >
                <Move size={16} /> Fine-Tune Placements
            </button>

            {showResetConfirm && (
                <div className="tracker-settings__overlay tracker-settings__overlay--high-z">
                    <div className="tracker-settings__content tracker-settings__content--confirm">
                        <h3
                            className="tracker-settings__title tracker-settings__title--confirm modal-title-with-icon text-title-primary"
                            style={{ color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={20} /> Reset Colors
                        </h3>
                        <p className="tracker-settings__description text-subtext">
                            Are you sure you want to reset your tracker colors to default?
                        </p>
                        <div className="tracker-settings__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark tracker-settings__modal-btn text-theme-header"
                                onClick={() => setShowResetConfirm(false)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red tracker-settings__modal-btn text-theme-header"
                                onClick={confirmResetColors}
                            >
                                <RotateCcw size={16} /> Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSyncConfirm && (
                <div className="tracker-settings__overlay tracker-settings__overlay--high-z">
                    <div className="tracker-settings__content tracker-settings__content--sync">
                        <h3 className="tracker-settings__title tracker-settings__title--sync modal-title-with-icon text-title-primary">
                            <RefreshCw size={20} /> Sync Colors
                        </h3>
                        <p className="tracker-settings__description text-subtext">
                            This will push your current tracker colors to EVERY token on the map. Are you sure?
                        </p>
                        <div className="tracker-settings__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark tracker-settings__modal-btn text-theme-header"
                                onClick={() => setShowSyncConfirm(false)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--theme tracker-settings__modal-btn text-theme-header"
                                onClick={confirmSyncColors}
                            >
                                <CheckCircle size={16} /> Sync
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
