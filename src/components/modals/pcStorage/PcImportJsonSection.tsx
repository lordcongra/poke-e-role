import React from 'react';
import type { CampaignProfile, TrainerRoster, PcImportDuplicateMode } from '../../../types/pcStorageTypes';
import {
    FileJson,
    Upload,
    UserCheck,
    UserPlus,
    GitMerge,
    Box,
    Sparkles,
    ArrowRightLeft,
    RefreshCw
} from 'lucide-react';

interface PcImportJsonSectionProps {
    activeCampaign: CampaignProfile;
    effectiveTrainer?: TrainerRoster;
    destination: string;
    setDestination: (dest: string) => void;
    duplicateMode: PcImportDuplicateMode;
    setDuplicateMode: (mode: PcImportDuplicateMode) => void;
    isProcessing: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileSelected: (file: File) => void;
}

export const PcImportJsonSection: React.FC<PcImportJsonSectionProps> = ({
    activeCampaign,
    effectiveTrainer,
    destination,
    setDestination,
    duplicateMode,
    setDuplicateMode,
    isProcessing,
    fileInputRef,
    onFileSelected
}) => {
    const getDestinationExplanation = () => {
        if (destination.startsWith('trainer:')) {
            const tid = destination.replace('trainer:', '');
            const tr = activeCampaign.trainers?.[tid];
            const trName = tr?.name || 'Selected Trainer';
            return {
                title: `Importing into ${trName}`,
                desc: `Pokémon will be loaded directly into ${trName}'s Belt party (first available empty slots) and PC Storage boxes.`,
                icon: <UserCheck size={16} className="pc-import-info-box__icon" />
            };
        }
        if (destination === 'new-trainer') {
            return {
                title: 'Restore as Separate Trainer Profile',
                desc: 'Creates a brand-new Trainer profile from the file with their own full party and boxes. Never touches or overwrites existing trainers.',
                icon: <UserPlus size={16} className="pc-import-info-box__icon" />
            };
        }
        if (destination === 'merge-by-name') {
            return {
                title: 'Auto-Merge by Matching Name',
                desc: "Matches incoming trainers by name (e.g. 'Brendan' -> 'Brendan') and adds missing Pokémon into their storage boxes.",
                icon: <GitMerge size={16} className="pc-import-info-box__icon" />
            };
        }
        return {
            title: 'Import into Campaign Boxes',
            desc: 'Places all incoming Pokémon directly into shared Campaign-level boxes, unassigned to any specific trainer.',
            icon: <Box size={16} className="pc-import-info-box__icon" />
        };
    };

    const getDuplicateModeExplanation = () => {
        if (duplicateMode === 'duplicate-fresh') {
            return {
                title: 'Duplicate as Fresh Pokémon (Recommended)',
                desc: 'Creates brand-new Pokémon copies with fresh IDs and resets previous token/trainer claims. Existing Pokémon on other trainers (like Brendan) are completely untouched. Both trainers keep their own copy of the Pokémon.',
                icon: <Sparkles size={16} className="pc-import-info-box__icon" />
            };
        }
        if (duplicateMode === 'transfer-ownership') {
            return {
                title: 'Transfer Ownership (Move from Previous Trainers)',
                desc: 'Reassigns original Pokémon IDs to this destination. If any of these Pokémon currently belong to another trainer in this campaign, they are transferred/moved out of that trainer roster into the target trainer.',
                icon: <ArrowRightLeft size={16} className="pc-import-info-box__icon" />
            };
        }
        return {
            title: 'Update Existing In-Place (Merge Stats & Moves)',
            desc: 'Keeps original Pokémon IDs and updates their existing sheets in-place with latest HP, stats, and moves from the backup, without moving them between trainers.',
            icon: <RefreshCw size={16} className="pc-import-info-box__icon" />
        };
    };

    const destInfo = getDestinationExplanation();
    const dupInfo = getDuplicateModeExplanation();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 1. Restore Destination */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-label" htmlFor="pc-import-destination-select">
                    Restore Destination:
                </label>
                <select
                    id="pc-import-destination-select"
                    className="pc-import-select text-label"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                >
                    {Object.values(activeCampaign.trainers || {}).map((tr) => (
                        <option key={tr.id} value={`trainer:${tr.id}`}>
                            Import into: {tr.name}
                            {tr.id === effectiveTrainer?.id ? ' (Current View)' : ''}
                        </option>
                    ))}
                    <option value="new-trainer">Restore as Separate Trainer Profile (Never overwrite)</option>
                    <option value="merge-by-name">Auto-Merge by Matching Trainer Name / ID</option>
                    <option value="campaign-boxes">Import directly into Shared Campaign Boxes</option>
                </select>

                <div className="pc-import-info-box">
                    {destInfo.icon}
                    <div className="pc-import-info-box__content">
                        <strong className="text-label" style={{ color: 'var(--text-main)' }}>
                            {destInfo.title}
                        </strong>
                        <span className="text-subtext">{destInfo.desc}</span>
                    </div>
                </div>
            </div>

            {/* 2. Ownership & Duplicate Handling */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="text-label" htmlFor="pc-import-duplicate-select">
                    Ownership & Duplication Mode:
                </label>
                <select
                    id="pc-import-duplicate-select"
                    className="pc-import-select text-label"
                    value={duplicateMode}
                    onChange={(e) => setDuplicateMode(e.target.value as PcImportDuplicateMode)}
                >
                    <option value="duplicate-fresh">
                        Duplicate as New Pokémon (Strip Prior Ownership) - Recommended
                    </option>
                    <option value="transfer-ownership">Transfer Ownership (Move from Previous Trainers)</option>
                    <option value="update-existing">Update Existing In-Place (Merge Stats & Moves)</option>
                </select>

                <div className="pc-import-info-box">
                    {dupInfo.icon}
                    <div className="pc-import-info-box__content">
                        <strong className="text-label" style={{ color: 'var(--text-main)' }}>
                            {dupInfo.title}
                        </strong>
                        <span className="text-subtext">{dupInfo.desc}</span>
                    </div>
                </div>
            </div>

            {/* 3. Drag and drop file restore */}
            <div
                className="pc-import-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) onFileSelected(file);
                }}
            >
                <FileJson size={32} className="pc-import-dropzone__icon" />
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Click or drop a PC Backup JSON file here</div>
                    <div className="text-subtext" style={{ marginTop: '4px' }}>
                        Accepts .json backup files exported from Poké-e-Role
                    </div>
                </div>
                <button
                    type="button"
                    className="action-button action-button--theme"
                    style={{ marginTop: '6px' }}
                    disabled={isProcessing}
                    onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                    }}
                >
                    <Upload size={14} /> Browse Backup File...
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onFileSelected(file);
                        e.target.value = '';
                    }}
                />
            </div>

            <p className="pc-import-card__desc" style={{ textAlign: 'center' }}>
                Restoring from JSON merges new campaigns and Pokémon safely without damaging your existing data.
            </p>
        </div>
    );
};
