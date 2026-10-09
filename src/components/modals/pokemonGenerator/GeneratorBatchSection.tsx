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
    sheetName: string;
    setSheetName: (name: string) => void;
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
    activeTokenId,
    sheetName,
    setSheetName
}: GeneratorBatchSectionProps) {
    return (
        <>
            {/* Batch Count Selector */}
            <div className="generator-modal__batch-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="generator-modal__destination-title text-title-primary">
                        Number of Pokémon to Generate:
                    </span>
                    <span className="text-subtext" style={{ fontSize: '0.8rem' }}>
                        {batchCount === 1 ? 'Single Pokémon' : `Batch of ${batchCount} Pokémon`}
                    </span>
                </div>

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

                {batchCount > 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <div className="generator-modal__mode-toggle">
                            <button
                                type="button"
                                className={`action-button ${syncPresets ? 'action-button--theme' : 'action-button--dark'}`}
                                style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onClick={() => setSyncPresets(true)}
                            >
                                <Link2 size={14} /> Synced Presets (Shared by All)
                            </button>
                            <button
                                type="button"
                                className={`action-button ${!syncPresets ? 'action-button--theme' : 'action-button--dark'}`}
                                style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                                onClick={() => setSyncPresets(false)}
                            >
                                <Sliders size={14} /> Individual Tinkering (Per-Pokémon)
                            </button>
                        </div>

                        {!syncPresets && (
                            <>
                                <div className="generator-modal__slot-tabs">
                                    {Array.from({ length: batchCount }, (_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className={`generator-modal__slot-tab-btn ${activeSlotIndex === i ? 'active' : ''}`}
                                            onClick={() => setActiveSlotIndex(i)}
                                        >
                                            Pokémon #{i + 1}
                                        </button>
                                    ))}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '2px 4px'
                                    }}
                                >
                                    <span className="text-subtext" style={{ fontSize: '0.75rem' }}>
                                        Configuring Pokémon #{activeSlotIndex + 1}
                                    </span>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark"
                                        style={{
                                            padding: '3px 8px',
                                            fontSize: '0.74rem',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}
                                        onClick={onCopyPresetToAll}
                                        title="Copy this Pokémon's settings to all other slots"
                                    >
                                        <Copy size={12} /> Copy Preset to All
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Destination Toggle */}
            <div className="generator-modal__destination-box">
                <span className="generator-modal__destination-title text-title-primary">
                    {isStandaloneMode ? 'Destination Sheet' : 'Destination Target'}
                </span>
                <div className="generator-modal__destination-buttons">
                    <button
                        type="button"
                        className={`action-button generator-modal__dest-btn ${destination === 'new' ? 'action-button--theme' : 'action-button--dark'}`}
                        onClick={() => setDestination('new')}
                    >
                        {isStandaloneMode ? (
                            <>
                                <FilePlus size={15} />{' '}
                                {batchCount > 1 ? `Generate ${batchCount} New Sheets` : 'Generate New Sheet'}
                            </>
                        ) : (
                            <>
                                <ImagePlus size={15} />{' '}
                                {batchCount > 1 ? `Generate ${batchCount} New Tokens` : 'Generate New Token'}
                            </>
                        )}
                    </button>
                    {activeTokenId && batchCount === 1 && (
                        <button
                            type="button"
                            className={`action-button generator-modal__dest-btn ${destination === 'overwrite' ? 'action-button--red' : 'action-button--dark'}`}
                            onClick={() => setDestination('overwrite')}
                            title={
                                isStandaloneMode
                                    ? 'Overwrite currently open sheet'
                                    : 'Overwrite currently selected token'
                            }
                        >
                            <AlertTriangle size={15} />{' '}
                            {isStandaloneMode ? 'Overwrite Current Sheet' : 'Overwrite Selected Token'}
                        </button>
                    )}
                </div>
            </div>

            {/* Optional Sheet / Token Nickname when generating New */}
            {destination === 'new' && (
                <div className="generator-modal__row">
                    <div className="generator-modal__col">
                        <label className="text-label">
                            {isStandaloneMode
                                ? 'Sheet Name / Nickname (Optional):'
                                : 'Token Name / Nickname (Optional):'}
                        </label>
                        <input
                            type="text"
                            className="generator-modal__input text-label"
                            placeholder="e.g. Sparky (Leave blank for Unnamed)"
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value)}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
