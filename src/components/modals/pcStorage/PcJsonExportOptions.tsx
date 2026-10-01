import React from 'react';
import type { PcStorageData, CampaignProfile, TrainerRoster } from '../../../types/pcStorageTypes';
import { Database, FolderKanban, Users, Box as BoxIcon, CheckSquare } from 'lucide-react';

interface PcJsonExportOptionsProps {
    pcData: PcStorageData;
    activeCampaign: CampaignProfile;
    trainer?: TrainerRoster;
    scope: 'all' | 'custom';
    setScope: (scope: 'all' | 'custom') => void;
    selectedCampaignIds: string[];
    setSelectedCampaignIds: (ids: string[]) => void;
    selectedTrainerIds: string[];
    setSelectedTrainerIds: (ids: string[]) => void;
    selectedBoxIndices: number[];
    setSelectedBoxIndices: (indices: number[]) => void;
}

export const PcJsonExportOptions: React.FC<PcJsonExportOptionsProps> = ({
    pcData,
    activeCampaign,
    trainer,
    scope,
    setScope,
    selectedCampaignIds,
    setSelectedCampaignIds,
    selectedTrainerIds,
    setSelectedTrainerIds,
    selectedBoxIndices,
    setSelectedBoxIndices
}) => {
    const allCampaigns = Object.values(pcData.campaigns);
    const trainers = Object.values(activeCampaign.trainers);
    const effectiveBoxes = trainer?.boxes && trainer.boxes.length > 0 ? trainer.boxes : activeCampaign.boxes;

    const toggleCampaign = (cId: string) => {
        if (selectedCampaignIds.includes(cId)) {
            if (selectedCampaignIds.length > 1) {
                setSelectedCampaignIds(selectedCampaignIds.filter((id) => id !== cId));
            }
        } else {
            setSelectedCampaignIds([...selectedCampaignIds, cId]);
        }
    };

    const toggleTrainer = (tId: string) => {
        if (selectedTrainerIds.includes(tId)) {
            setSelectedTrainerIds(selectedTrainerIds.filter((id) => id !== tId));
        } else {
            setSelectedTrainerIds([...selectedTrainerIds, tId]);
        }
    };

    const toggleBox = (index: number) => {
        if (selectedBoxIndices.includes(index)) {
            setSelectedBoxIndices(selectedBoxIndices.filter((idx) => idx !== index));
        } else {
            setSelectedBoxIndices([...selectedBoxIndices, index]);
        }
    };

    const toggleAllBoxes = () => {
        if (selectedBoxIndices.length === effectiveBoxes.length) {
            setSelectedBoxIndices([]);
        } else {
            setSelectedBoxIndices(effectiveBoxes.map((_, i) => i));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Scope Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    type="button"
                    className={`action-button ${scope === 'all' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                    onClick={() => setScope('all')}
                >
                    <Database size={13} /> Mass-Save: Everything
                </button>
                <button
                    type="button"
                    className={`action-button ${scope === 'custom' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                    onClick={() => setScope('custom')}
                >
                    <CheckSquare size={13} /> Custom Selection
                </button>
            </div>

            {scope === 'all' ? (
                <div
                    style={{
                        padding: '10px 12px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '6px',
                        lineHeight: '1.45'
                    }}
                    className="text-subtext"
                >
                    Exports every campaign ({allCampaigns.length}), all trainer parties, every PC storage box, and all{' '}
                    {Object.keys(pcData.pokemonSummaries).length} Pokémon records into a single complete JSON backup
                    file.
                </div>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '12px',
                        background: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    {/* Campaigns Checkboxes if multiple exist */}
                    {allCampaigns.length > 1 && (
                        <div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginBottom: '6px'
                                }}
                                className="text-label"
                            >
                                <FolderKanban size={13} /> Campaigns to Include:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {allCampaigns.map((c) => (
                                    <label
                                        key={c.id}
                                        className="text-subtext"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCampaignIds.includes(c.id)}
                                            onChange={() => toggleCampaign(c.id)}
                                        />
                                        <span>{c.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trainers Checkboxes */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '6px'
                            }}
                            className="text-label"
                        >
                            <Users size={13} /> Trainers ({activeCampaign.name}):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {trainers.map((t) => {
                                const partyCount = (t.party || []).filter(Boolean).length;
                                const boxCount = (t.boxes || []).reduce(
                                    (acc, b) => acc + (b.slots || []).filter(Boolean).length,
                                    0
                                );
                                return (
                                    <label
                                        key={t.id}
                                        className="text-subtext"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedTrainerIds.includes(t.id)}
                                            onChange={() => toggleTrainer(t.id)}
                                        />
                                        <span>
                                            {t.name} ({partyCount} on belt
                                            {boxCount > 0 ? `, ${boxCount} in PC` : ''})
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-Box Checkboxes */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '6px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="text-label">
                                <BoxIcon size={13} /> PC Storage Boxes ({trainer?.name || activeCampaign.name}) (
                                {selectedBoxIndices.length}/{effectiveBoxes.length}):
                            </div>
                            <button
                                type="button"
                                className="action-button action-button--ghost"
                                style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                                onClick={toggleAllBoxes}
                            >
                                {selectedBoxIndices.length === effectiveBoxes.length ? 'Clear All' : 'Select All'}
                            </button>
                        </div>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                gap: '6px'
                            }}
                        >
                            {effectiveBoxes.map((b, idx) => {
                                const count = (b.slots || []).filter(Boolean).length;
                                const isChecked = selectedBoxIndices.includes(idx);
                                return (
                                    <label
                                        key={idx}
                                        className="text-subtext"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            background: isChecked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                                            border: isChecked
                                                ? '1px solid var(--primary, #3b82f6)'
                                                : '1px solid transparent',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <input type="checkbox" checked={isChecked} onChange={() => toggleBox(idx)} />
                                        <span
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {b.name || `Box ${idx + 1}`} ({count})
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
