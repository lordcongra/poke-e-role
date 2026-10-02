import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface PcBackupWarningBannerProps {
    onDismiss: () => void;
}

export const PcBackupWarningBanner: React.FC<PcBackupWarningBannerProps> = ({ onDismiss }) => {
    return (
        <div className="pc-modal__backup-warning">
            <AlertTriangle size={15} className="pc-modal__warning-icon" />
            <span className="pc-modal__warning-text text-subtext">
                <strong>New Feature:</strong> PC Storage has undergone aggressive testing, but edge cases may still
                exist that could delete data. Please back up your data before trying it out, and back up frequently
                after!
            </span>
            <button
                type="button"
                className="pc-modal__warning-close"
                onClick={onDismiss}
                title="Dismiss backup reminder"
                aria-label="Dismiss backup reminder"
            >
                <X size={14} />
            </button>
        </div>
    );
};
