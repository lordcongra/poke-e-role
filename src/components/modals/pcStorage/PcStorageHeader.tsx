import React, { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { CampaignProfile, TrainerRoster, PcBox } from '../../../types/pcStorageTypes';
import { hasUnbackedData, storageAdapter, BACKUP_STATUS_EVENT } from '../../../utils/sync/storageAdapter';
import { PcPromptModal } from './PcPromptModal';
import { PcDeleteConfirmModal } from './PcDeleteConfirmModal';
import { CampaignEditModal } from './CampaignEditModal';
import { PcBoxNavigator } from './PcBoxNavigator';
import { isCampaignRoomActive } from '../../../utils/pc/pcCampaignTrainerOps';
import './PcStorageHeader.css';
import {
    Plus,
    Trash2,
    Edit2,
    CloudUpload,
    CloudDownload,
    Download,
    Users,
    FolderKanban,
    Lock,
    Globe,
    X,
    HelpCircle,
    RefreshCw
} from 'lucide-react';

interface PcStorageHeaderProps {
    campaigns: Record<string, CampaignProfile>;
    activeCampaignId: string;
    onSwitchCampaign: (id: string) => void;
    onAddCampaign: (name: string, options?: { isPrivate?: boolean; isRoomActive?: boolean }) => void;
    onEditCampaign?: (
        campaignId: string,
        updates: { name?: string; isPrivate?: boolean; isRoomActive?: boolean }
    ) => void;
    onDeleteCampaign?: (id: string) => void;
    isGm?: boolean;
    activeRoomCampaignId?: string;
    activeRoomCampaignName?: string;
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
    onEditCampaign,
    onDeleteCampaign,
    isGm,
    activeRoomCampaignId,
    activeRoomCampaignName,
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
    const [hasUnbackedChanges, setHasUnbackedChanges] = useState(false);

    useEffect(() => {
        const checkBackupStatus = async () => {
            try {
                const chars = await storageAdapter.getLocalCharacters();
                const flds = await storageAdapter.getFolders();
                setHasUnbackedChanges(hasUnbackedData(chars.length, flds.length));
            } catch {}
        };

        checkBackupStatus();
        window.addEventListener(BACKUP_STATUS_EVENT, checkBackupStatus);
        window.addEventListener('pkr-local-data-changed', checkBackupStatus);

        return () => {
            window.removeEventListener(BACKUP_STATUS_EVENT, checkBackupStatus);
            window.removeEventListener('pkr-local-data-changed', checkBackupStatus);
        };
    }, []);

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
    const [campaignModalMode, setCampaignModalMode] = useState<'create' | 'edit' | null>(null);

    const activeCampaign = campaigns[activeCampaignId];
    const isActiveRoom = isCampaignRoomActive(activeCampaign, activeRoomCampaignId, activeRoomCampaignName);

    const currentBox = boxes[activeBoxIndex] || boxes[0];

    const activeTrainerPartyCount = (activeTrainer?.party || []).filter(Boolean).length;
    const activeTrainerBoxes = activeTrainer?.boxes && activeTrainer.boxes.length > 0 ? activeTrainer.boxes : boxes;
    let activeTrainerStoredCount = 0;
    for (const b of activeTrainerBoxes) {
        for (const s of b.slots || []) {
            if (s) activeTrainerStoredCount++;
        }
    }

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
                            {Object.values(campaigns).map((c) => {
                                const isRoom = isCampaignRoomActive(c, activeRoomCampaignId, activeRoomCampaignName);
                                const prefix = c.isPrivate ? '🔒 ' : isRoom ? '🌐 ' : '';
                                const suffix = isRoom ? ' (Room Active)' : c.isPrivate ? ' (Private)' : '';
                                return (
                                    <option key={c.id} value={c.id}>
                                        {prefix}
                                        {c.name}
                                        {suffix}
                                    </option>
                                );
                            })}
                        </select>
                        {activeCampaign?.isPrivate && (
                            <span
                                className="pc-header__campaign-badge pc-header__campaign-badge--private"
                                title="Private Folder: Encounters & prep (isolated from players)"
                            >
                                <Lock size={10} /> Private
                            </span>
                        )}
                        {!activeCampaign?.isPrivate && isActiveRoom && (
                            <span
                                className="pc-header__campaign-badge pc-header__campaign-badge--room"
                                title="Active Room Campaign: Connected players sync here"
                            >
                                <Globe size={10} /> Room Active
                            </span>
                        )}
                        <button
                            type="button"
                            className="pc-header__mini-btn"
                            onClick={() => setCampaignModalMode('edit')}
                            title="Edit active campaign (rename, privacy, room active)"
                            aria-label="Edit active campaign"
                        >
                            <Edit2 size={13} />
                        </button>
                        <button
                            type="button"
                            className="pc-header__mini-btn"
                            onClick={() => setCampaignModalMode('create')}
                            title="Create a new campaign"
                            aria-label="Create a new campaign"
                        >
                            <Plus size={13} />
                        </button>
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
                    <div className="pc-header__backup-wrapper">
                        <button
                            type="button"
                            className={`action-button action-button--dark pc-header__cloud-btn ${
                                hasUnbackedChanges ? 'pc-header__cloud-btn--unbacked' : ''
                            }`}
                            onClick={onUploadCloud}
                            title={
                                hasUnbackedChanges
                                    ? 'Unbacked changes detected! Backup your PC storage and character sheets now.'
                                    : OBR.isAvailable
                                      ? 'Backup PC Storage (Cloud Scene Asset, Open Scene Sync, or JSON)'
                                      : 'Download JSON backup of PC storage'
                            }
                        >
                            {OBR.isAvailable ? <CloudUpload size={14} /> : <Download size={14} />} Backup
                            {hasUnbackedChanges && (
                                <span className="pc-header__backup-badge" title="Unbacked changes" />
                            )}
                        </button>
                        {hasUnbackedChanges && (
                            <span
                                className="pc-header__backup-reminder-text text-subtext"
                                title="New or unbacked Pokémon changes present"
                            >
                                Backup recommended
                            </span>
                        )}
                    </div>
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
                            <RefreshCw size={13} /> Sync
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
            <PcBoxNavigator
                boxes={boxes}
                activeBoxIndex={activeBoxIndex}
                currentBox={currentBox}
                onSelectBox={onSelectBox}
                onAddBox={onAddBox}
                onRenameBox={onRenameBox}
                onSetBoxTheme={onSetBoxTheme}
            />

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

            {/* Campaign Edit / Create Modal */}
            {campaignModalMode && (
                <CampaignEditModal
                    mode={campaignModalMode}
                    campaign={campaignModalMode === 'edit' ? activeCampaign : undefined}
                    allCampaigns={campaigns}
                    isGm={Boolean(isGm)}
                    isInRoom={OBR.isAvailable}
                    activeRoomCampaignId={activeRoomCampaignId}
                    activeRoomCampaignName={activeRoomCampaignName}
                    onSave={(data) => {
                        const opts = { isPrivate: data.isPrivate, isRoomActive: data.isRoomActive };
                        if (campaignModalMode === 'create') {
                            onAddCampaign(data.name, opts);
                        } else if (onEditCampaign && activeCampaign) {
                            onEditCampaign(activeCampaign.id, { name: data.name, ...opts });
                        }
                        setCampaignModalMode(null);
                    }}
                    onDelete={onDeleteCampaign ? (id) => onDeleteCampaign(id) : undefined}
                    onClose={() => setCampaignModalMode(null)}
                />
            )}
        </header>
    );
};
