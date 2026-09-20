import { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Move, CheckCircle, RotateCcw, RefreshCw, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { STATS_META_ID } from '../../../utils/graphicsManager';
import { NumberSpinner } from '../../ui/NumberSpinner';

interface TrackerPlacementModalProps {
    onClose: () => void;
}

export function TrackerPlacementModal({ onClose }: TrackerPlacementModalProps) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);
    const [showSyncConfirm, setShowSyncConfirm] = useState(false);

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

    const handleSyncAllPlacements = async () => {
        if (!OBR.isAvailable) return;
        try {
            const items = await OBR.scene.items.getItems(
                (item) =>
                    item.layer === 'CHARACTER' &&
                    (item.metadata[STATS_META_ID] !== undefined ||
                        item.metadata['pokerole-pmd-extension/stats'] !== undefined)
            );
            const updates: Record<string, unknown> = {
                'hp-offset-x': identityStore.hpOffsetX || 0,
                'hp-offset-y': identityStore.hpOffsetY || 0,
                'will-offset-x': identityStore.willOffsetX || 0,
                'will-offset-y': identityStore.willOffsetY || 0,
                'def-offset-x': identityStore.defOffsetX || 0,
                'def-offset-y': identityStore.defOffsetY || 0,
                'act-offset-x': identityStore.actOffsetX || 0,
                'act-offset-y': identityStore.actOffsetY || 0,
                'eva-offset-x': identityStore.evaOffsetX || 0,
                'eva-offset-y': identityStore.evaOffsetY || 0,
                'cla-offset-x': identityStore.claOffsetX || 0,
                'cla-offset-y': identityStore.claOffsetY || 0
            };

            await OBR.scene.items.updateItems(
                items.map((item) => item.id),
                (itemsToUpdate) => {
                    for (const item of itemsToUpdate) {
                        const targetMetaKey =
                            item.metadata[STATS_META_ID] !== undefined
                                ? STATS_META_ID
                                : item.metadata['pokerole-pmd-extension/stats'] !== undefined
                                  ? 'pokerole-pmd-extension/stats'
                                  : STATS_META_ID;
                        if (!item.metadata[targetMetaKey]) item.metadata[targetMetaKey] = {};
                        Object.assign(item.metadata[targetMetaKey] as Record<string, unknown>, updates);
                    }
                }
            );
            OBR.notification.show(`Synced fine-tune placements to ${items.length} tokens!`, 'SUCCESS');
        } catch (error) {
            console.error('[TrackerPlacementModal] Failed to sync placements:', error);
            OBR.notification.show('Failed to sync placements across tokens.', 'ERROR');
        } finally {
            setShowSyncConfirm(false);
        }
    };

    return (
        <div className="tracker-settings__overlay tracker-settings__overlay--high-z">
            <div className="tracker-settings__content tracker-settings__content--placement">
                <h3 className="tracker-settings__title tracker-settings__title--placement modal-title-with-icon text-title-primary">
                    <Move size={20} /> Fine-Tune Placements
                </h3>

                <div className="tracker-settings__placement-grid">
                    <div className="tracker-settings__placement-header text-subtext">Element</div>
                    <div className="tracker-settings__placement-header tracker-settings__placement-header--center text-subtext">
                        X Shift
                    </div>
                    <div className="tracker-settings__placement-header tracker-settings__placement-header--center text-subtext">
                        Y Shift
                    </div>

                    <span className="text-label">HP Bar</span>
                    <NumberSpinner
                        value={identityStore.hpOffsetX}
                        onChange={(value) => setIdentity('hpOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.hpOffsetY}
                        onChange={(value) => setIdentity('hpOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="text-label">Will Bar</span>
                    <NumberSpinner
                        value={identityStore.willOffsetX}
                        onChange={(value) => setIdentity('willOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.willOffsetY}
                        onChange={(value) => setIdentity('willOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="text-label">Defenses</span>
                    <NumberSpinner
                        value={identityStore.defOffsetX}
                        onChange={(value) => setIdentity('defOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.defOffsetY}
                        onChange={(value) => setIdentity('defOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="text-label">Action Badge</span>
                    <NumberSpinner
                        value={identityStore.actOffsetX}
                        onChange={(value) => setIdentity('actOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.actOffsetY}
                        onChange={(value) => setIdentity('actOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="text-label">Evade Badge</span>
                    <NumberSpinner
                        value={identityStore.evaOffsetX}
                        onChange={(value) => setIdentity('evaOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.evaOffsetY}
                        onChange={(value) => setIdentity('evaOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />

                    <span className="text-label">Clash Badge</span>
                    <NumberSpinner
                        value={identityStore.claOffsetX}
                        onChange={(value) => setIdentity('claOffsetX', value)}
                        min={-9999}
                        max={9999}
                    />
                    <NumberSpinner
                        value={identityStore.claOffsetY}
                        onChange={(value) => setIdentity('claOffsetY', value)}
                        min={-9999}
                        max={9999}
                    />
                </div>

                <div className="tracker-settings__button-row">
                    <button
                        type="button"
                        onClick={resetPlacements}
                        className="action-button action-button--dark tracker-settings__modal-btn text-theme-header"
                    >
                        <RotateCcw size={16} /> Reset
                    </button>
                    {role === 'GM' && (
                        <button
                            type="button"
                            onClick={() => setShowSyncConfirm(true)}
                            className="action-button action-button--theme tracker-settings__modal-btn text-theme-header"
                            title="Sync fine-tune placement offsets across all tokens on the map."
                        >
                            <RefreshCw size={16} /> Sync All
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--theme tracker-settings__modal-btn text-theme-header"
                    >
                        <CheckCircle size={16} /> Done
                    </button>
                </div>
            </div>

            {showSyncConfirm && (
                <div className="tracker-settings__overlay tracker-settings__overlay--high-z">
                    <div className="tracker-settings__content tracker-settings__content--sync">
                        <h3 className="tracker-settings__title tracker-settings__title--sync modal-title-with-icon text-title-primary">
                            <RefreshCw size={20} /> Sync Placements
                        </h3>
                        <p className="tracker-settings__description text-subtext">
                            This will push your current fine-tune placement coordinates to EVERY token on the map. Are
                            you sure?
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
                                onClick={handleSyncAllPlacements}
                            >
                                <CheckCircle size={16} /> Sync All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
