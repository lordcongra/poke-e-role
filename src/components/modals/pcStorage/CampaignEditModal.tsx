import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, FolderKanban, Users, Lock, Globe, AlertTriangle } from 'lucide-react';
import type { CampaignProfile } from '../../../types/pcStorageTypes';
import { isCampaignRoomActive } from '../../../utils/pc/pcCampaignTrainerOps';
import './CampaignEditModal.css';

export interface CampaignEditModalProps {
    mode: 'create' | 'edit';
    campaign?: CampaignProfile;
    allCampaigns: Record<string, CampaignProfile>;
    isGm: boolean;
    isInRoom: boolean;
    activeRoomCampaignId?: string;
    activeRoomCampaignName?: string;
    onSave: (data: { name: string; isPrivate: boolean; isRoomActive: boolean }) => void;
    onDelete?: (campaignId: string) => void;
    onClose: () => void;
}

export const CampaignEditModal: React.FC<CampaignEditModalProps> = ({
    mode,
    campaign,
    allCampaigns,
    isGm,
    isInRoom,
    activeRoomCampaignId,
    activeRoomCampaignName,
    onSave,
    onDelete,
    onClose
}) => {
    const isInitiallyRoomActive = campaign
        ? isCampaignRoomActive(campaign, activeRoomCampaignId, activeRoomCampaignName)
        : false;

    const [name, setName] = useState(campaign?.name || '');
    const [isPrivate, setIsPrivate] = useState<boolean>(campaign?.isPrivate || false);
    const [isRoomActive, setIsRoomActive] = useState<boolean>(isInitiallyRoomActive);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (campaign) {
            setName(campaign.name);
            setIsPrivate(Boolean(campaign.isPrivate));
            setIsRoomActive(isCampaignRoomActive(campaign, activeRoomCampaignId, activeRoomCampaignName));
        } else {
            setName('');
            setIsPrivate(false);
            setIsRoomActive(false);
        }
        setShowDeleteConfirm(false);
    }, [campaign, activeRoomCampaignId, activeRoomCampaignName]);

    // If made private, room active must be false
    const handleSetPrivate = (val: boolean) => {
        setIsPrivate(val);
        if (val) {
            setIsRoomActive(false);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onSave({
            name: trimmed,
            isPrivate,
            isRoomActive: isPrivate ? false : isRoomActive
        });
        onClose();
    };

    const handleConfirmDelete = () => {
        if (campaign && onDelete) {
            onDelete(campaign.id);
            onClose();
        }
    };

    const canDelete = mode === 'edit' && Object.keys(allCampaigns).length > 1;

    return (
        <div className="modal-backdrop campaign-edit-backdrop" onClick={onClose}>
            <div className="modal-container campaign-edit-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header campaign-edit-modal__header">
                    <div className="campaign-edit-modal__title-row">
                        <FolderKanban size={18} className="campaign-edit-modal__header-icon" />
                        <h3 className="modal-title text-title-primary">
                            {mode === 'create' ? 'Create New Campaign' : `Edit Campaign: ${campaign?.name}`}
                        </h3>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="campaign-edit-modal__body">
                    {/* Campaign Name Field */}
                    <div className="campaign-edit-field">
                        <label className="campaign-edit-field__label text-label" htmlFor="campaign-name-input">
                            Campaign Name
                        </label>
                        <input
                            id="campaign-name-input"
                            type="text"
                            className="campaign-edit-field__input text-label"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Hoenn League, Kanto S2, Boss Vault"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </div>

                    {/* Public vs Private Selector Cards */}
                    <div className="campaign-edit-field">
                        <label className="campaign-edit-field__label text-label">Campaign Type & Visibility</label>
                        <div className="campaign-edit-type-grid">
                            <button
                                type="button"
                                className={`campaign-type-card ${!isPrivate ? 'campaign-type-card--selected' : ''}`}
                                onClick={() => handleSetPrivate(false)}
                            >
                                <div className="campaign-type-card__header">
                                    <Users
                                        size={16}
                                        className="campaign-type-card__icon campaign-type-card__icon--public"
                                    />
                                    <strong className="campaign-type-card__title">Public Campaign</strong>
                                    {!isPrivate && (
                                        <span className="campaign-type-card__check">
                                            <Check size={12} />
                                        </span>
                                    )}
                                </div>
                                <p className="campaign-type-card__desc text-subtext">
                                    Syncs with players. Can be designated as the room&apos;s active adventure.
                                </p>
                            </button>

                            <button
                                type="button"
                                className={`campaign-type-card ${isPrivate ? 'campaign-type-card--selected' : ''}`}
                                onClick={() => handleSetPrivate(true)}
                            >
                                <div className="campaign-type-card__header">
                                    <Lock
                                        size={16}
                                        className="campaign-type-card__icon campaign-type-card__icon--private"
                                    />
                                    <strong className="campaign-type-card__title">Private Folder</strong>
                                    {isPrivate && (
                                        <span className="campaign-type-card__check">
                                            <Check size={12} />
                                        </span>
                                    )}
                                </div>
                                <p className="campaign-type-card__desc text-subtext">
                                    Encounter vault, bosses, or prep. Players never sync here and won&apos;t be
                                    affected.
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* Active Room Campaign Designation (GM in Room) */}
                    {isGm && isInRoom && (
                        <div
                            className={`campaign-edit-room-toggle ${
                                isPrivate ? 'campaign-edit-room-toggle--disabled' : ''
                            } ${isRoomActive ? 'campaign-edit-room-toggle--active' : ''}`}
                        >
                            <label className="campaign-edit-room-toggle__label">
                                <input
                                    type="checkbox"
                                    className="campaign-edit-room-toggle__checkbox"
                                    checked={isRoomActive}
                                    disabled={isPrivate}
                                    onChange={(e) => setIsRoomActive(e.target.checked)}
                                />
                                <div className="campaign-edit-room-toggle__text">
                                    <div className="campaign-edit-room-toggle__title">
                                        <Globe size={14} />
                                        <span>Set as Active Campaign for this Owlbear Room</span>
                                        {isRoomActive && (
                                            <span className="campaign-edit-badge--active">Room Active</span>
                                        )}
                                    </div>
                                    <p className="campaign-edit-room-toggle__desc text-subtext">
                                        {isPrivate
                                            ? 'Private folders cannot be designated as the active room campaign.'
                                            : 'When players join this room, their client will automatically switch to this adventure.'}
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Safe Delete Section (Edit Mode) */}
                    {mode === 'edit' && (
                        <div className="campaign-edit-danger-zone">
                            {showDeleteConfirm ? (
                                <div className="campaign-delete-confirm-box">
                                    <div className="campaign-delete-confirm-box__warning">
                                        <AlertTriangle size={16} className="campaign-delete-confirm-box__icon" />
                                        <div className="text-subtext">
                                            Delete <strong>&quot;{campaign?.name}&quot;</strong>? All boxes and trainer
                                            rosters inside will be permanently removed.
                                        </div>
                                    </div>
                                    <div className="campaign-delete-confirm-box__actions">
                                        <button
                                            type="button"
                                            className="action-button action-button--dark"
                                            onClick={() => setShowDeleteConfirm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="action-button action-button--danger"
                                            onClick={handleConfirmDelete}
                                        >
                                            <Trash2 size={13} /> Confirm Delete
                                        </button>
                                    </div>
                                </div>
                            ) : canDelete ? (
                                <button
                                    type="button"
                                    className="campaign-delete-trigger-btn"
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <Trash2 size={13} /> Delete this campaign
                                </button>
                            ) : (
                                <span className="text-subtext campaign-delete-disabled-note">
                                    At least one campaign must remain in PC storage.
                                </span>
                            )}
                        </div>
                    )}

                    <footer className="modal-footer campaign-edit-modal__footer">
                        <button type="button" className="action-button action-button--dark" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="action-button action-button--theme" disabled={!name.trim()}>
                            <Check size={14} /> {mode === 'create' ? 'Create Campaign' : 'Save Changes'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
