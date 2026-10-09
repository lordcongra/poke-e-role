import React, { useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import type { CampaignProfile, TrainerRoster, PcBox } from '../../../types/pcStorageTypes';
import { usePcHeaderBackupStatus } from './usePcHeaderBackupStatus';
import { PcPromptModal } from './PcPromptModal';
import { PcDeleteConfirmModal } from './PcDeleteConfirmModal';
import { CampaignEditModal } from './CampaignEditModal';
import { PcBoxNavigator } from './PcBoxNavigator';
import { TrainerOrganizerModal } from './TrainerOrganizerModal';
import { PcNewProfileModal } from './PcNewProfileModal';
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
    RefreshCw,
    SlidersHorizontal
} from 'lucide-react';
import { PcMobileHeaderMenu } from './PcMobileHeaderMenu';

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
    trainerOrder?: string[];
    onReorderTrainers?: (newOrder: string[]) => void;
    onSwitchTrainer: (id: string) => void;
    onAddTrainer: (
        name: string,
        options?: {
            existingCharacterId?: string;
            isLinked?: boolean;
            profileType?: 'trainer' | 'storage';
            playerId?: string;
            playerName?: string;
        }
    ) => void;
    onRenameTrainer?: (id: string, newName: string) => void;
    onDeleteTrainer?: (id: string, options?: { deletePc?: boolean; deleteBelt?: boolean }) => void;
    onAssignTrainer?: (trainerId: string, playerId?: string, playerName?: string) => void;
    boxes: PcBox[];
    activeBoxIndex: number;
    onSelectBox: (index: number) => void;
    onAddBox: () => void;
    onDeleteBox?: (index: number) => void;
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
    trainerOrder,
    onReorderTrainers,
    onSwitchTrainer,
    onAddTrainer,
    onRenameTrainer,
    onDeleteTrainer,
    onAssignTrainer,
    boxes,
    activeBoxIndex,
    onSelectBox,
    onAddBox,
    onDeleteBox,
    onRenameBox,
    onSetBoxTheme,
    onUploadCloud,
    onOpenImport,
    onSyncPlayers,
    onOpenGuide,
    onClose
}) => {
    const hasUnbackedChanges = usePcHeaderBackupStatus();

    const [deleteTarget, setDeleteTarget] = useState<{
        type: 'trainer' | 'campaign' | 'storage';
        id: string;
        name: string;
    } | null>(null);
    const [promptConfig, setPromptConfig] = useState<{
        type: 'campaign' | 'trainer' | 'rename-trainer';
        title: string;
        description: string;
        placeholder: string;
    } | null>(null);
    const [campaignModalMode, setCampaignModalMode] = useState<'create' | 'edit' | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isTrainerOrgOpen, setIsTrainerOrgOpen] = useState(false);
    const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);

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

    const orderedTrainerIds = (trainerOrder || []).filter((id) => trainers[id]);
    const unorderedTrainerIds = Object.keys(trainers).filter((id) => !orderedTrainerIds.includes(id));
    const sortedTrainers = [...orderedTrainerIds, ...unorderedTrainerIds].map((id) => trainers[id]).filter(Boolean);
    const trainerProfiles = sortedTrainers.filter((t) => t.profileType !== 'storage' && !t.id.startsWith('__pmd_'));
    const storageProfiles = sortedTrainers.filter((t) => t.profileType === 'storage' || t.id.startsWith('__pmd_'));

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
                                const suffix = isRoom ? ' (Room Active)' : c.isPrivate ? ' (Private)' : '';
                                return (
                                    <option key={c.id} value={c.id}>
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
                                aria-label="Active Room Campaign: Connected players sync here"
                            >
                                <Globe size={13} />
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
                            {trainerProfiles.length > 0 && (
                                <optgroup label="Trainers">
                                    {trainerProfiles.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {/* INVARIANT: Non-GM players only see their own Personal PMD Storage (__none__). GM sees all connected players' individual storages. */}
                            <optgroup label="PMD / Team Storage">
                                {isGm &&
                                    storageProfiles.map((t) => {
                                        const displayName =
                                            t.playerName && !t.name.toLowerCase().includes(t.playerName.toLowerCase())
                                                ? `${t.playerName} - ${t.name}`
                                                : t.name;
                                        return (
                                            <option key={t.id} value={t.id}>
                                                📦 {displayName}
                                            </option>
                                        );
                                    })}
                                <option value="__none__">
                                    📦{' '}
                                    {activeCampaign?.teamStorageName ||
                                        (isGm && storageProfiles.length > 0
                                            ? 'Campaign Storage (GM)'
                                            : 'Personal PMD Storage')}
                                </option>
                            </optgroup>
                        </select>
                        {onRenameTrainer && (
                            <button
                                type="button"
                                className="pc-header__mini-btn"
                                onClick={() => {
                                    const isStorage = activeTrainer?.profileType === 'storage';
                                    const defaultName = activeCampaign?.teamStorageName || 'None / PMD Storage';
                                    const targetName = activeTrainer ? activeTrainer.name : defaultName;
                                    setPromptConfig({
                                        type: 'rename-trainer',
                                        title: isStorage
                                            ? 'Rename Storage Profile'
                                            : activeTrainer
                                              ? 'Rename Trainer Profile'
                                              : 'Rename Default Storage',
                                        description: `Enter a new name for "${targetName}".`,
                                        placeholder: targetName
                                    });
                                }}
                                title={
                                    activeTrainer?.profileType === 'storage'
                                        ? 'Rename storage profile'
                                        : activeTrainer
                                          ? 'Rename active trainer profile'
                                          : 'Rename default PMD storage'
                                }
                                aria-label="Rename active profile"
                            >
                                <Edit2 size={13} />
                            </button>
                        )}
                        {isGm && onReorderTrainers && trainerProfiles.length > 0 && (
                            <button
                                type="button"
                                className="pc-header__mini-btn"
                                onClick={() => setIsTrainerOrgOpen(true)}
                                title="Organize / Reorder trainer profiles"
                                aria-label="Organize trainer profiles"
                            >
                                <SlidersHorizontal size={13} />
                            </button>
                        )}
                        <button
                            type="button"
                            className="pc-header__mini-btn"
                            onClick={() => setIsNewProfileModalOpen(true)}
                            title="Create a new profile (Trainer or PMD Storage)"
                            aria-label="Create a new profile"
                        >
                            <Plus size={13} />
                        </button>
                        {Object.keys(trainers).length > 1 && onDeleteTrainer && activeTrainer && (
                            <button
                                type="button"
                                className="pc-header__mini-btn pc-header__mini-btn--danger"
                                onClick={() =>
                                    setDeleteTarget({
                                        type: activeTrainer.profileType === 'storage' ? 'storage' : 'trainer',
                                        id: activeTrainer.id,
                                        name: activeTrainer.name
                                    })
                                }
                                title={
                                    activeTrainer.profileType === 'storage'
                                        ? 'Delete active storage profile'
                                        : 'Delete active trainer profile'
                                }
                            >
                                <Trash2 size={13} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="pc-header__actions">
                    {/* Mobile Only: Expanding Tools / Options Menu button */}
                    <button
                        type="button"
                        className={`action-button action-button--dark pc-header__mobile-tools-btn ${
                            isMobileMenuOpen ? 'pc-header__mobile-tools-btn--active' : ''
                        }`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        title="Options & Tools (Send Out Mode, Theme, Backup, Import, Guide)"
                        aria-label="Options & Tools"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <SlidersHorizontal size={14} />
                        <span>Tools</span>
                        {hasUnbackedChanges && <span className="pc-header__backup-badge" title="Unbacked changes" />}
                    </button>

                    <div className="pc-header__backup-wrapper">
                        <button
                            type="button"
                            className={`action-button action-button--dark pc-header__cloud-btn ${hasUnbackedChanges ? 'pc-header__cloud-btn--unbacked' : ''}`}
                            onClick={onUploadCloud}
                            title={
                                hasUnbackedChanges
                                    ? 'Unbacked changes detected! Backup now.'
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

            {/* Mobile Only: Expanding Tools Menu Drawer */}
            {isMobileMenuOpen && (
                <PcMobileHeaderMenu
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                    currentBoxTheme={currentBox.themeColor}
                    activeBoxIndex={activeBoxIndex}
                    onSetBoxTheme={onSetBoxTheme}
                    onUploadCloud={onUploadCloud}
                    onOpenImport={onOpenImport}
                    onSyncPlayers={onSyncPlayers}
                    onOpenGuide={onOpenGuide}
                    hasUnbackedChanges={hasUnbackedChanges}
                    onOpenTrainerOrg={isGm && trainerProfiles.length > 0 ? () => setIsTrainerOrgOpen(true) : undefined}
                />
            )}

            {/* Bottom Row: Box Navigator & Theme/Settings */}
            <PcBoxNavigator
                boxes={boxes}
                activeBoxIndex={activeBoxIndex}
                currentBox={currentBox}
                onSelectBox={onSelectBox}
                onAddBox={onAddBox}
                onDeleteBox={onDeleteBox}
                onRenameBox={onRenameBox}
                onSetBoxTheme={onSetBoxTheme}
            />

            {/* In-App Themed Prompt Modal for New Trainer / Campaign */}
            {promptConfig && (
                <PcPromptModal
                    title={promptConfig.title}
                    description={promptConfig.description}
                    placeholder={promptConfig.placeholder}
                    confirmText={promptConfig.type === 'rename-trainer' ? 'Save' : 'Create'}
                    onConfirm={(val) => {
                        if (promptConfig.type === 'trainer') {
                            onAddTrainer(val);
                        } else if (promptConfig.type === 'rename-trainer') {
                            if (onRenameTrainer) {
                                onRenameTrainer(activeTrainer?.id || '__none__', val);
                            }
                        } else {
                            onAddCampaign(val);
                        }
                    }}
                    onClose={() => setPromptConfig(null)}
                />
            )}

            {/* In-App Double-Confirmation Modal for Deleting Trainer / Storage / Campaign */}
            {deleteTarget && (
                <PcDeleteConfirmModal
                    type={deleteTarget.type}
                    name={deleteTarget.name}
                    storedCount={deleteTarget.type !== 'campaign' ? activeTrainerStoredCount : undefined}
                    partyCount={deleteTarget.type !== 'campaign' ? activeTrainerPartyCount : undefined}
                    onConfirm={(opts) => {
                        if (deleteTarget.type !== 'campaign' && onDeleteTrainer) {
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

            {/* GM Trainer Organizer Modal */}
            {isTrainerOrgOpen && onReorderTrainers && (
                <TrainerOrganizerModal
                    isOpen={isTrainerOrgOpen}
                    onClose={() => setIsTrainerOrgOpen(false)}
                    trainers={trainerProfiles.reduce<Record<string, TrainerRoster>>((acc, t) => {
                        acc[t.id] = t;
                        return acc;
                    }, {})}
                    trainerOrder={trainerOrder}
                    activeTrainerId={activeTrainer?.id}
                    onReorder={onReorderTrainers}
                    onSelectTrainer={onSwitchTrainer}
                    isGm={isGm}
                    onAssignTrainer={onAssignTrainer}
                />
            )}

            {/* Create New Profile Modal (Trainer or PMD Storage) */}
            {isNewProfileModalOpen && (
                <PcNewProfileModal
                    isOpen={isNewProfileModalOpen}
                    onClose={() => setIsNewProfileModalOpen(false)}
                    onCreate={(name, profileType) => {
                        onAddTrainer(name, { profileType });
                    }}
                />
            )}
        </header>
    );
};
