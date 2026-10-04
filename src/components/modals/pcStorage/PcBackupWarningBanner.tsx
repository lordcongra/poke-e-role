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
                <strong>New Feature:</strong> PC Storage has undergone aggressive bug-testing, but edge cases may still
                occur that could cause unexpected behavior or data loss. If you encounter any bugs, please report them
                using the <strong>Report Bug</strong> button in Table Tools &amp; Settings! Additionally, unless you are
                actively wanting to bug test, please do not try to push the limits of the sheet without first backing up
                your tokens, as stability cannot be guaranteed under extreme stress.
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
