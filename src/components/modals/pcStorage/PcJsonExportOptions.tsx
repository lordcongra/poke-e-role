import React from 'react';
import type { PcStorageData, CampaignProfile, TrainerRoster } from '../../../types/pcStorageTypes';
import { Database, FolderKanban, Users, Box as BoxIcon, CheckSquare, ShieldCheck, Briefcase } from 'lucide-react';

interface PcJsonExportOptionsProps {
    pcData: PcStorageData;
    activeCampaign: CampaignProfile;
    trainer?: TrainerRoster;
    scope: 'all' | 'custom';
    setScope: (scope: 'all' | 'custom') => void;
    selectedCampaignIds: string[];
    setSelectedCampaignIds: (ids: string[]) => void;
    selectedTrainerProfileIds: string[];
    setSelectedTrainerProfileIds: (ids: string[]) => void;
    selectedTrainerPartyIds: string[];
    setSelectedTrainerPartyIds: (ids: string[]) => void;
    selectedTrainerBoxIds: string[];
    setSelectedTrainerBoxIds: (ids: string[]) => void;
    selectedBoxIndices: number[];
    setSelectedBoxIndices: (indices: number[]) => void;
    includeCampaignBoxes: boolean;
    setIncludeCampaignBoxes: (val: boolean) => void;
}

export const PcJsonExportOptions: React.FC<PcJsonExportOptionsProps> = ({
    pcData,
    activeCampaign,
    trainer,
    scope,
    setScope,
    selectedCampaignIds,
    setSelectedCampaignIds,
    selectedTrainerProfileIds,
    setSelectedTrainerProfileIds,
    selectedTrainerPartyIds,
    setSelectedTrainerPartyIds,
    selectedTrainerBoxIds,
    setSelectedTrainerBoxIds,
    selectedBoxIndices,
    setSelectedBoxIndices,
    includeCampaignBoxes,
    setIncludeCampaignBoxes
}) => {
    const allCampaigns = Object.values(pcData.campaigns);
    const trainers = Object.values(activeCampaign.trainers || {});
    const effectiveBoxes = trainer?.boxes && trainer.boxes.length > 0 ? trainer.boxes : activeCampaign.boxes || [];

    const toggleCampaign = (cId: string) => {
        if (selectedCampaignIds.includes(cId)) {
            if (selectedCampaignIds.length > 1) {
                setSelectedCampaignIds(selectedCampaignIds.filter((id) => id !== cId));
            }
        } else {
            setSelectedCampaignIds([...selectedCampaignIds, cId]);
        }
    };

    const toggleTrainerProfile = (tId: string) => {
        if (selectedTrainerProfileIds.includes(tId)) {
            setSelectedTrainerProfileIds(selectedTrainerProfileIds.filter((id) => id !== tId));
        } else {
            setSelectedTrainerProfileIds([...selectedTrainerProfileIds, tId]);
        }
    };

    const toggleTrainerParty = (tId: string) => {
        if (selectedTrainerPartyIds.includes(tId)) {
            setSelectedTrainerPartyIds(selectedTrainerPartyIds.filter((id) => id !== tId));
        } else {
            setSelectedTrainerPartyIds([...selectedTrainerPartyIds, tId]);
        }
    };

    const toggleTrainerBoxes = (tId: string) => {
        if (selectedTrainerBoxIds.includes(tId)) {
            setSelectedTrainerBoxIds(selectedTrainerBoxIds.filter((id) => id !== tId));
        } else {
            setSelectedTrainerBoxIds([...selectedTrainerBoxIds, tId]);
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

    const selectAllForTrainer = (tId: string) => {
        if (!selectedTrainerProfileIds.includes(tId)) {
            setSelectedTrainerProfileIds([...selectedTrainerProfileIds, tId]);
        }
        if (!selectedTrainerPartyIds.includes(tId)) {
            setSelectedTrainerPartyIds([...selectedTrainerPartyIds, tId]);
        }
        if (!selectedTrainerBoxIds.includes(tId)) {
            setSelectedTrainerBoxIds([...selectedTrainerBoxIds, tId]);
        }
    };

    const deselectAllForTrainer = (tId: string) => {
        setSelectedTrainerProfileIds(selectedTrainerProfileIds.filter((id) => id !== tId));
        setSelectedTrainerPartyIds(selectedTrainerPartyIds.filter((id) => id !== tId));
        setSelectedTrainerBoxIds(selectedTrainerBoxIds.filter((id) => id !== tId));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Scope Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    type="button"
                    className={`action-button ${scope === 'all' ? 'action-button--theme text-theme-header' : 'action-button--dark'}`}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                    onClick={() => setScope('all')}
                >
                    <Database size={13} /> Mass-Save: Everything
                </button>
                <button
                    type="button"
                    className={`action-button ${scope === 'custom' ? 'action-button--theme text-theme-header' : 'action-button--dark'}`}
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
                    Exports every campaign ({allCampaigns.length}), all trainer profiles & belt parties, every PC
                    storage box, and all {Object.keys(pcData.pokemonSummaries).length} Pokémon records into a single
                    complete JSON backup file.
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

                    {/* Granular Trainers & Pokémon Options */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '8px'
                            }}
                            className="text-label"
                        >
                            <Users size={13} /> Trainers & Pokémon ({activeCampaign.name}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {trainers.map((t) => {
                                const partyCount = (t.party || []).filter(Boolean).length;
                                const boxCount = (t.boxes || []).reduce(
                                    (acc, b) => acc + (b.slots || []).filter(Boolean).length,
                                    0
                                );
                                const isProfileOn = selectedTrainerProfileIds.includes(t.id);
                                const isPartyOn = selectedTrainerPartyIds.includes(t.id);
                                const isBoxesOn = selectedTrainerBoxIds.includes(t.id);

                                return (
                                    <div
                                        key={t.id}
                                        style={{
                                            padding: '8px 10px',
                                            background: 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255, 255, 255, 0.06)'
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginBottom: '6px'
                                            }}
                                        >
                                            <span className="text-label" style={{ color: 'var(--primary)' }}>
                                                {t.name}
                                            </span>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--ghost"
                                                    style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                                    onClick={() => selectAllForTrainer(t.id)}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--ghost"
                                                    style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                                    onClick={() => deselectAllForTrainer(t.id)}
                                                >
                                                    None
                                                </button>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                                gap: '6px'
                                            }}
                                        >
                                            <label
                                                className="text-subtext"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Include trainer character sheet stats and profile"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isProfileOn}
                                                    onChange={() => toggleTrainerProfile(t.id)}
                                                />
                                                <ShieldCheck size={12} />
                                                <span>Trainer Sheet</span>
                                            </label>

                                            <label
                                                className="text-subtext"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Include Pokemon on this trainer's active belt party"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isPartyOn}
                                                    onChange={() => toggleTrainerParty(t.id)}
                                                />
                                                <Briefcase size={12} />
                                                <span>Party ({partyCount})</span>
                                            </label>

                                            <label
                                                className="text-subtext"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Include Pokemon stored in this trainer's PC boxes"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isBoxesOn}
                                                    onChange={() => toggleTrainerBoxes(t.id)}
                                                />
                                                <BoxIcon size={12} />
                                                <span>PC Boxes ({boxCount})</span>
                                            </label>
                                        </div>
                                    </div>
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

                    {/* Shared Campaign Boxes Option */}
                    {Array.isArray(activeCampaign.boxes) && activeCampaign.boxes.length > 0 && (
                        <label
                            className="text-subtext"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 8px',
                                background: 'rgba(0, 0, 0, 0.25)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={includeCampaignBoxes}
                                onChange={(e) => setIncludeCampaignBoxes(e.target.checked)}
                            />
                            <span className="text-label" style={{ fontSize: '0.8rem' }}>
                                Include Shared Campaign Boxes (
                                {activeCampaign.boxes.reduce(
                                    (acc, b) => acc + (b.slots || []).filter(Boolean).length,
                                    0
                                )}{' '}
                                Pokémon)
                            </span>
                        </label>
                    )}
                </div>
            )}
        </div>
    );
};
