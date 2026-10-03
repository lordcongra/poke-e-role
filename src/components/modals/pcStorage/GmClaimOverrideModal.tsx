import { ShieldAlert, AlertTriangle, ArrowRightLeft, XCircle, Info } from 'lucide-react';
import type { GmClaimConflict } from '../../../utils/pc/pcClaimOverrideOps';
import './GmClaimOverrideModal.css';

interface GmClaimOverrideModalProps {
    conflict: GmClaimConflict;
    onClose: () => void;
    onConfirmForceTransfer: () => void;
    isSubmitting?: boolean;
}

export function GmClaimOverrideModal({
    conflict,
    onClose,
    onConfirmForceTransfer,
    isSubmitting = false
}: GmClaimOverrideModalProps) {
    const { summary, reason } = conflict;
    const name = summary.name || summary.species || 'Pokémon';
    const avatarUrl = summary.tokenImageUrl || undefined;

    return (
        <div className="gm-override-modal__overlay">
            <div className="gm-override-modal__content">
                <div className="gm-override-modal__header">
                    <h3 className="gm-override-modal__title text-title-primary">
                        <ShieldAlert size={20} /> Ownership Conflict
                    </h3>
                    <button
                        onClick={onClose}
                        className="pokedex-modal__close-btn text-subtext"
                        title="Close"
                        type="button"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                <div className="gm-override-modal__body">
                    <div className="gm-override-modal__conflict-card">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={name} className="gm-override-modal__avatar" />
                        ) : (
                            <div
                                className="gm-override-modal__avatar"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <AlertTriangle size={24} color="var(--semantic-danger)" />
                            </div>
                        )}
                        <div className="gm-override-modal__pokemon-info">
                            <span className="gm-override-modal__pokemon-name">{name}</span>
                            <span className="gm-override-modal__pokemon-species text-subtext">{summary.species}</span>
                        </div>
                    </div>

                    <div className="gm-override-modal__reason-box">{reason}</div>

                    <div className="gm-override-modal__tip-box">
                        <div
                            className="gm-override-modal__tip-title"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <Info size={14} /> Sync Tip
                        </div>
                        If you just unlinked this Pokémon from another campaign or trainer, try closing and reopening
                        your PC Storage or refreshing the page first.
                        <br />
                        As Game Master, you can force the transfer to overwrite previous campaign and trainer ownership.
                    </div>
                </div>

                <div className="gm-override-modal__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        disabled={isSubmitting}
                    >
                        <XCircle size={14} /> Leave As-Is
                    </button>
                    <button
                        type="button"
                        onClick={onConfirmForceTransfer}
                        className="action-button action-button--red"
                        disabled={isSubmitting}
                    >
                        <ArrowRightLeft size={14} /> Force Transfer & Claim
                    </button>
                </div>
            </div>
        </div>
    );
}
