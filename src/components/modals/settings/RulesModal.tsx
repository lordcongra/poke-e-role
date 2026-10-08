import { useState } from 'react';
import { ScrollText, X, XCircle } from 'lucide-react';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { flushRoomSettingsToOwlbear } from '../../../utils/sync/obr';
import { RulesSectionGeneral } from './rules/RulesSectionGeneral';
import { RulesSectionPermissions } from './rules/RulesSectionPermissions';
import { RulesSectionTokenHud } from './rules/RulesSectionTokenHud';
import { RulesInfoModal } from './rules/RulesInfoModal';
import './RulesModal.css';

interface RulesModalProps {
    onClose: () => void;
}

export function RulesModal({ onClose }: RulesModalProps) {
    const [modalConfig, setModalConfig] = useState<{ title: string; content: string } | null>(null);

    const handleClose = () => {
        if (!isStandaloneMode) {
            flushRoomSettingsToOwlbear().catch((error) => {
                console.error('[RulesModal] Failed to flush pending room settings on close:', error);
            });
        }
        onClose();
    };

    return (
        <div className="rules-modal__overlay">
            <div className="rules-modal__content">
                <div className="rules-modal__header-row">
                    <h3 className="rules-modal__title modal-title-with-icon text-title-primary">
                        <ScrollText size={20} /> Room Rules & Permissions
                    </h3>
                    <button onClick={handleClose} className="rules-modal__close-x" title="Close">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="rules-modal__form-group">
                    <RulesSectionGeneral onOpenInfo={setModalConfig} />
                    <RulesSectionPermissions onOpenInfo={setModalConfig} />
                    <RulesSectionTokenHud onOpenInfo={setModalConfig} />
                </div>

                <button
                    type="button"
                    className="action-button action-button--dark rules-modal__close-btn"
                    onClick={handleClose}
                >
                    <XCircle size={18} /> Close
                </button>
            </div>

            {modalConfig && (
                <RulesInfoModal
                    title={modalConfig.title}
                    content={modalConfig.content}
                    onClose={() => setModalConfig(null)}
                />
            )}
        </div>
    );
}
