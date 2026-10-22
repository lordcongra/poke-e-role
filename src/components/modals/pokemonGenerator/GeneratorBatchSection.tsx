import { Link2, Sliders, Copy, FilePlus, ImagePlus, AlertTriangle } from 'lucide-react';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';

export interface GeneratorBatchSectionProps {
    batchCount: number;
    setBatchCount: (count: number) => void;
    syncPresets: boolean;
    setSyncPresets: (sync: boolean) => void;
    activeSlotIndex: number;
    setActiveSlotIndex: (index: number) => void;
    onCopyPresetToAll: () => void;
    destination: 'new' | 'overwrite';
    setDestination: (dest: 'new' | 'overwrite') => void;
    activeTokenId?: string | null;
}

export function GeneratorBatchSection({
    batchCount,
    setBatchCount,
    syncPresets,
    setSyncPresets,
    activeSlotIndex,
    setActiveSlotIndex,
    onCopyPresetToAll,
    destination,
    setDestination,
    activeTokenId
}: GeneratorBatchSectionProps) {
    return (
        <div className="generator-modal__batch-panel">
            {/* Batch Count & Destination Row */}
            <div className="generator-modal__batch-header-row">
                <div className="generator-modal__batch-count-group">
                    <span className="generator-modal__destination-title text-title-primary">
                        Quantity:
                    </span>
                    <div className="generator-modal__count-selector">
                        {[1, 2, 3, 4, 5, 6].map((count) => (
                            <button
                                key={count}
                                type="button"
                                className={`generator-modal__count-btn ${batchCount === count ? 'active' : ''}`}
                                onClick={() => {
                                    setBatchCount(count);
                                    if (count > 1 && destination === 'overwrite') setDestination('new');
                                }}
                            >
                                {count}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="generator-modal__destination-group">
                    <span className="generator-modal__destination-title text-title-primary">
                        {isStandaloneMode ? 'Destination:' : 'Target:'}
                    </span>
                    <div className="generator-modal__destination-buttons">
                        <button
                            type="button"
                            className={`action-button generator-modal__dest-btn ${
                                destination === 'new' ? 'action-button--theme' : 'action-button--dark'
                            }`}
                            onClick={() => setDestination('new')}
                        >
                            {isStandaloneMode ? (
                                <>
                                    <FilePlus size={14} />{' '}
                                    {batchCount > 1 ? `${batchCount} New Sheets` : 'New Sheet'}
                                </>
                            ) : (
                                <>
                                    <ImagePlus size={14} />{' '}
                                    {batchCount > 1 ? `${batchCount} New Tokens` : 'New Token'}
                                </>
                            )}
                        </button>
                        {activeTokenId && batchCount === 1 && (
                            <button
                                type="button"
                                className={`action-button generator-modal__dest-btn ${
                                    destination === 'overwrite' ? 'action-button--red' : 'action-button--dark'
                                }`}
                                onClick={() => setDestination('overwrite')}
                                title={
                                    isStandaloneMode
                                        ? 'Overwrite currently open sheet'
                                        : 'Overwrite currently selected token'
                                }
                            >
                                <AlertTriangle size={14} />{' '}
                                {isStandaloneMode ? 'Overwrite Sheet' : 'Overwrite Token'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* If Batch > 1, show Preset Sync / Tinkering toggle & Slot Tabs */}
            {batchCount > 1 && (
                <div className="generator-modal__batch-tabs-wrap">
                    <div className="generator-modal__mode-toggle">
                        <button
                            type="button"
                            className={`action-button ${syncPresets ? 'action-button--theme' : 'action-button--dark'}`}
                            style={{
                                flex: 1,
                                padding: '5px 8px',
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                            onClick={() => setSyncPresets(true)}
                        >
                            <Link2 size={13} /> Synced Presets (Shared by All)
                        </button>
                        <button
                            type="button"
                            className={`action-button ${!syncPresets ? 'action-button--theme' : 'action-button--dark'}`}
                            style={{
                                flex: 1,
                                padding: '5px 8px',
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                            onClick={() => setSyncPresets(false)}
                        >
                            <Sliders size={13} /> Individual Tinkering (Per-Slot)
                        </button>
                    </div>

                    {!syncPresets && (
                        <div className="generator-modal__slot-bar">
                            <div className="generator-modal__slot-tabs">
                                {Array.from({ length: batchCount }, (_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`generator-modal__slot-tab-btn ${
                                            activeSlotIndex === i ? 'active' : ''
                                        }`}
                                        onClick={() => setActiveSlotIndex(i)}
                                    >
                                        Pokémon #{i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{
                                    padding: '3px 8px',
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    whiteSpace: 'nowrap'
                                }}
                                onClick={onCopyPresetToAll}
                                title="Copy this Pokémon's settings to all other slots"
                            >
                                <Copy size={12} /> Copy to All
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
