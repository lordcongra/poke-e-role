import React, { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { CampaignProfile, TrainerRoster, PcBox } from '../../../types/pcStorageTypes';
import { PcPromptModal } from './PcPromptModal';
import { PcDeleteConfirmModal } from './PcDeleteConfirmModal';
import './PcStorageHeader.css';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Edit2,
    Palette,
    CloudUpload,
    CloudDownload,
    Download,
    Users,
    FolderKanban,
    X,
    Check,
    HelpCircle,
    RefreshCw
} from 'lucide-react';

interface PcStorageHeaderProps {
    campaigns: Record<string, CampaignProfile>;
    activeCampaignId: string;
    onSwitchCampaign: (id: string) => void;
    onAddCampaign: (name: string) => void;
    onDeleteCampaign?: (id: string) => void;
    activeTrainer?: TrainerRoster;
    trainers: Record<string, TrainerRoster>;
    onSwitchTrainer: (id: string) => void;
    onAddTrainer: (name: string) => void;
    onDeleteTrainer?: (id: string, options?: { deletePc?: boolean; deleteBelt?: boolean }) => void;
    boxes: PcBox[];
    activeBoxIndex: number;
    onSelectBox: (index: number) => void;
    onAddBox: () => void;
    onRenameBox: (index: number, name: string) => void;
    onSetBoxTheme: (index: number, color: string) => void;
    onUploadCloud: () => void;
    onOpenImport: () => void;
    onSyncPlayers?: () => void;
    onOpenGuide?: () => void;
    onClose: () => void;
}

export const PcStorageHeader: React.FC<PcStorageHeaderProps> = ({
    campaigns,
    activeCampaignId,
    onSwitchCampaign,
    onAddCampaign,
    onDeleteCampaign,
    activeTrainer,
    trainers,
    onSwitchTrainer,
    onAddTrainer,
    onDeleteTrainer,
    boxes,
    activeBoxIndex,
    onSelectBox,
    onAddBox,
    onRenameBox,
    onSetBoxTheme,
    onUploadCloud,
    onOpenImport,
    onSyncPlayers,
    onOpenGuide,
    onClose
}) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{
        type: 'trainer' | 'campaign';
        id: string;
        name: string;
    } | null>(null);
    const [promptConfig, setPromptConfig] = useState<{
        type: 'campaign' | 'trainer';
        title: string;
        description: string;
        placeholder: string;
    } | null>(null);

    const currentBox = boxes[activeBoxIndex] || boxes[0];
    const canGoPrev = activeBoxIndex > 0;
    const canGoNext = activeBoxIndex < boxes.length - 1;

    const activeTrainerPartyCount = (activeTrainer?.party || []).filter(Boolean).length;
    const activeTrainerBoxes = activeTrainer?.boxes && activeTrainer.boxes.length > 0 ? activeTrainer.boxes : boxes;
    let activeTrainerStoredCount = 0;
    for (const b of activeTrainerBoxes) {
        for (const s of b.slots || []) {
            if (s) activeTrainerStoredCount++;
        }
    }

    const handleStartRename = () => {
        setRenameValue(currentBox.name);
        setIsRenaming(true);
    };

    const handleConfirmRename = () => {
        if (renameValue.trim()) {
            onRenameBox(activeBoxIndex, renameValue.trim());
        }
        setIsRenaming(false);
    };

    return (
        <header className="pc-header">
            {/* Top Row: Meta Switchers (Campaign & Trainer) + Cloud + Close */}
            <div className="pc-header__top-row">
                <div className="pc-header__selector-group">
                    {/* Campaign Switcher */}
                    <div className="pc-header__dropdown-item" title="Switch active campaign">
                        <FolderKanban size={15} className="pc-header__selector-icon" />
                        <select
                            className="pc-header__select"
                            value={activeCampaignId}
                            onChange={(e) => onSwitchCampaign(e.target.value)}
                        >
                            {Object.values(campaigns).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="pc-header__mini-btn"
                            onClick={() =>
                                setPromptConfig({
                                    type: 'campaign',
                                    title: 'Create New Campaign',
                                    description:
                                        'Set up an isolated campaign profile for PC boxes and trainer parties.',
                                    placeholder: 'e.g. Hoenn League, Kanto S2'
                                })
                            }
                            title="Create a new campaign"
                        >
                            <Plus size={13} />
                        </button>
                        {Object.keys(campaigns).length > 1 && onDeleteCampaign && (
                            <button
                                type="button"
                                className="pc-header__mini-btn pc-header__mini-btn--danger"
                                onClick={() => {
                                    const c = campaigns[activeCampaignId];
                                    if (c) {
                                        setDeleteTarget({ type: 'campaign', id: c.id, name: c.name });
                                    }
                                }}
                                title="Delete active campaign"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>

                    {/* Trainer Switcher */}
                    <div className="pc-header__dropdown-item" title="Switch active trainer profile">
                        <Users size={15} className="pc-header__selector-icon" />
                        <select
                            className="pc-header__select"
                            value={activeTrainer?.id || '__none__'}
                            onChange={(e) => onSwitchTrainer(e.target.value)}
                        >
                            {Object.values(trainers).map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                            <option value="__none__">None (PMD / Team Storage)</option>
                        </select>
                        <button
                            type="button"
                            className="pc-header__mini-btn"
                            onClick={() =>
                                setPromptConfig({
                                    type: 'trainer',
                                    title: 'Create New Trainer Profile',
                                    description: 'Add a new trainer with their own 6-slot Pokéball Belt Party.',
                                    placeholder: 'e.g. Red, Blue, Ash, Duo Twin'
                                })
                            }
                            title="Create a new trainer profile"
                        >
                            <Plus size={13} />
                        </button>
                        {Object.keys(trainers).length > 1 && onDeleteTrainer && activeTrainer && (
                            <button
                                type="button"
                                className="pc-header__mini-btn pc-header__mini-btn--danger"
                                onClick={() => {
                                    setDeleteTarget({
                                        type: 'trainer',
                                        id: activeTrainer.id,
                                        name: activeTrainer.name
                                    });
                                }}
                                title="Delete active trainer profile"
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="pc-header__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark pc-header__cloud-btn"
                        onClick={onUploadCloud}
                        title={
                            OBR.isAvailable
                                ? 'Backup PC Storage (Cloud Scene Asset, Open Scene Sync, or JSON)'
                                : 'Download JSON backup of PC storage'
                        }
                    >
                        {OBR.isAvailable ? <CloudUpload size={14} /> : <Download size={14} />} Backup
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--dark pc-header__cloud-btn"
                        onClick={onOpenImport}
                        title="Import Pokémon from Owlbear Cloud Scene Asset, Open Scene, or JSON backup"
                    >
                        <CloudDownload size={14} /> Import
                    </button>
                    {onSyncPlayers && (
                        <button
                            type="button"
                            className="action-button action-button--dark pc-header__cloud-btn"
                            onClick={onSyncPlayers}
                            title="Request connected players in the room to sync their active Belt and PC to the GM"
                        >
                            <RefreshCw size={14} /> Sync Players
                        </button>
                    )}
                    {onOpenGuide && (
                        <button
                            type="button"
                            className="action-button action-button--dark pc-header__cloud-btn"
                            onClick={onOpenGuide}
                            title="Open Pokémon PC & Storage Guide"
                        >
                            <HelpCircle size={14} /> Guide
                        </button>
                    )}
                    <button
                        type="button"
                        className="pc-header__close-btn"
                        onClick={onClose}
                        aria-label="Close Pokémon PC"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Bottom Row: Box Navigator & Theme/Settings */}
            <div className="pc-header__box-nav-row">
                <div className="pc-header__box-nav">
                    <button
                        type="button"
                        className="pc-header__nav-arrow"
                        onClick={() => canGoPrev && onSelectBox(activeBoxIndex - 1)}
                        disabled={!canGoPrev}
                        aria-label="Previous Box"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {isRenaming ? (
                        <div className="pc-header__rename-wrap">
                            <input
                                type="text"
                                className="pc-header__rename-input"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleConfirmRename();
                                    if (e.key === 'Escape') setIsRenaming(false);
                                }}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="pc-header__rename-ok"
                                onClick={handleConfirmRename}
                                aria-label="Confirm Box Rename"
                            >
                                <Check size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="pc-header__box-title-wrap">
                            <select
                                className="pc-header__box-select text-title-primary"
                                value={activeBoxIndex}
                                onChange={(e) => onSelectBox(Number(e.target.value))}
                            >
                                {boxes.map((b, idx) => (
                                    <option key={b.id} value={idx}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="pc-header__icon-btn"
                                onClick={handleStartRename}
                                title="Rename this Box"
                            >
                                <Edit2 size={13} />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        className="pc-header__nav-arrow"
                        onClick={() => canGoNext && onSelectBox(activeBoxIndex + 1)}
                        disabled={!canGoNext}
                        aria-label="Next Box"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="pc-header__box-extra-actions">
                    {/* Direct Native Color Picker (Matching App Themes) */}
                    <label
                        className="pc-header__theme-picker-label"
                        title="Pick Box Color Theme"
                        style={{
                            borderColor: currentBox.themeColor ? `${currentBox.themeColor}88` : undefined,
                            background: currentBox.themeColor ? `${currentBox.themeColor}1a` : undefined
                        }}
                    >
                        <Palette size={14} style={{ color: currentBox.themeColor || 'var(--primary)' }} />
                        <span className="text-subtext">Theme</span>
                        <input
                            type="color"
                            className="pc-header__color-picker-input"
                            value={currentBox.themeColor || '#3b82f6'}
                            onChange={(e) => onSetBoxTheme(activeBoxIndex, e.target.value)}
                        />
                    </label>

                    <button
                        type="button"
                        className="action-button action-button--dark pc-header__new-box-btn"
                        onClick={onAddBox}
                        title="Add a new empty Box"
                    >
                        <Plus size={13} /> New Box
                    </button>
                </div>
            </div>

            {/* In-App Themed Prompt Modal for New Trainer / Campaign */}
            {promptConfig && (
                <PcPromptModal
                    title={promptConfig.title}
                    description={promptConfig.description}
                    placeholder={promptConfig.placeholder}
                    confirmText="Create"
                    onConfirm={(val) => {
                        if (promptConfig.type === 'trainer') {
                            onAddTrainer(val);
                        } else {
                            onAddCampaign(val);
                        }
                    }}
                    onClose={() => setPromptConfig(null)}
                />
            )}

            {/* In-App Double-Confirmation Modal for Deleting Trainer / Campaign */}
            {deleteTarget && (
                <PcDeleteConfirmModal
                    type={deleteTarget.type}
                    name={deleteTarget.name}
                    storedCount={deleteTarget.type === 'trainer' ? activeTrainerStoredCount : undefined}
                    partyCount={deleteTarget.type === 'trainer' ? activeTrainerPartyCount : undefined}
                    onConfirm={(opts) => {
                        if (deleteTarget.type === 'trainer' && onDeleteTrainer) {
                            onDeleteTrainer(deleteTarget.id, opts);
                        } else if (deleteTarget.type === 'campaign' && onDeleteCampaign) {
                            onDeleteCampaign(deleteTarget.id);
                        }
                        setDeleteTarget(null);
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </header>
    );
};
