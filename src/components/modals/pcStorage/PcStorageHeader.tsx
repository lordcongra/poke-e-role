import React, { useState } from 'react';
import type { CampaignProfile, TrainerRoster, PcBox } from '../../../types/pcStorageTypes';
import { PcPromptModal } from './PcPromptModal';
import './PcStorageHeader.css';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Edit2,
    Palette,
    CloudUpload,
    CloudDownload,
    Users,
    FolderKanban,
    X,
    Check
} from 'lucide-react';

interface PcStorageHeaderProps {
    campaigns: Record<string, CampaignProfile>;
    activeCampaignId: string;
    onSwitchCampaign: (id: string) => void;
    onAddCampaign: (name: string) => void;
    activeTrainer: TrainerRoster;
    trainers: Record<string, TrainerRoster>;
    onSwitchTrainer: (id: string) => void;
    onAddTrainer: (name: string) => void;
    boxes: PcBox[];
    activeBoxIndex: number;
    onSelectBox: (index: number) => void;
    onAddBox: () => void;
    onRenameBox: (index: number, name: string) => void;
    onSetBoxTheme: (index: number, color: string) => void;
    onUploadCloud: () => void;
    onDownloadCloud: () => void;
    onClose: () => void;
}

export const PcStorageHeader: React.FC<PcStorageHeaderProps> = ({
    campaigns,
    activeCampaignId,
    onSwitchCampaign,
    onAddCampaign,
    activeTrainer,
    trainers,
    onSwitchTrainer,
    onAddTrainer,
    boxes,
    activeBoxIndex,
    onSelectBox,
    onAddBox,
    onRenameBox,
    onSetBoxTheme,
    onUploadCloud,
    onDownloadCloud,
    onClose
}) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [promptConfig, setPromptConfig] = useState<{
        type: 'campaign' | 'trainer';
        title: string;
        description: string;
        placeholder: string;
    } | null>(null);

    const currentBox = boxes[activeBoxIndex] || boxes[0];
    const canGoPrev = activeBoxIndex > 0;
    const canGoNext = activeBoxIndex < boxes.length - 1;

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
                    </div>

                    {/* Trainer Switcher */}
                    <div className="pc-header__dropdown-item" title="Switch active trainer profile">
                        <Users size={15} className="pc-header__selector-icon" />
                        <select
                            className="pc-header__select"
                            value={activeTrainer?.id || ''}
                            onChange={(e) => onSwitchTrainer(e.target.value)}
                        >
                            {Object.values(trainers).map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
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
                    </div>
                </div>

                <div className="pc-header__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark pc-header__cloud-btn"
                        onClick={onUploadCloud}
                        title="Upload current box to Owlbear Rodeo Cloud Storage"
                    >
                        <CloudUpload size={14} /> Cloud Backup
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--dark pc-header__cloud-btn"
                        onClick={onDownloadCloud}
                        title="Download or import box from Owlbear Rodeo Cloud Storage"
                    >
                        <CloudDownload size={14} /> Cloud Import
                    </button>
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
        </header>
    );
};
