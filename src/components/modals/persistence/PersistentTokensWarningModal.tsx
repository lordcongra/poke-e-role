import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, X } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import './PersistentTokensWarningModal.css';

export const PERSISTENCE_NEVER_SHOW_KEY = 'pkr_never_show_persistence_warning';
export const PERSISTENCE_SESSION_DISMISS_PREFIX = 'pkr_session_dismiss_persistence_';

interface PersistentTokensWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    contextScope: 'initial' | 'pc';
}

export const PersistentTokensWarningModal: React.FC<PersistentTokensWarningModalProps> = ({
    isOpen,
    onClose,
    contextScope
}) => {
    const role = useCharacterStore((state) => state.role);
    const [step, setStep] = useState<'warning' | 'confirm'>('warning');

    if (!isOpen || role !== 'GM') return null;

    const handleDismissSession = () => {
        try {
            sessionStorage.setItem(`${PERSISTENCE_SESSION_DISMISS_PREFIX}${contextScope}`, 'true');
        } catch {
            // sessionStorage unavailable
        }
        setStep('warning');
        onClose();
    };

    const handleConfirmNeverShowAgain = () => {
        try {
            localStorage.setItem(PERSISTENCE_NEVER_SHOW_KEY, 'true');
        } catch {
            // localStorage unavailable
        }
        setStep('warning');
        onClose();
    };

    const handleClose = () => {
        setStep('warning');
        onClose();
    };

    return (
        <div className="modal-backdrop persistence-warning-backdrop" onClick={handleClose}>
            <div className="modal-container persistence-warning-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header persistence-warning-modal__header">
                    <div className="persistence-warning-modal__title-group">
                        <AlertTriangle size={22} className="persistence-warning-modal__icon-danger" />
                        <h3 className="modal-title text-title-primary">
                            {step === 'warning'
                                ? 'GM Notice: "Persistent Tokens" Conflict'
                                : "Confirm: Don't Show Again"}
                        </h3>
                    </div>
                    <button
                        type="button"
                        className="persistence-warning-modal__close-btn"
                        onClick={handleClose}
                        title="Close Warning"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className="persistence-warning-modal__body">
                    {step === 'warning' ? (
                        <>
                            <div className="persistence-warning-modal__alert-box">
                                <AlertTriangle size={20} className="persistence-warning-modal__alert-icon" />
                                <div>
                                    <strong>Notice for Game Masters:</strong>
                                    <div style={{ marginTop: '4px' }}>
                                        If you have the third-party <strong>Persistent Tokens</strong> extension enabled
                                        in this room, it can cause bugs with Pokémon stats and items in Pokérole.
                                    </div>
                                </div>
                            </div>

                            <p className="text-subtext">
                                <strong>Pokérole already saves tokens automatically:</strong>
                                <br />
                                When you put Pokémon into the in-game PC Storage or on a Trainer&apos;s team, Pokérole
                                saves all their stats, moves, and accessories between maps on its own. You do not need
                                another extension to save your tokens.
                            </p>

                            <p className="text-subtext">
                                <strong>What goes wrong if both are used:</strong>
                                <br />
                                The &apos;Persistent Tokens&apos; extension saves tokens by matching their picture. If a
                                Pokémon is saved in both Persistent Tokens and the PC Storage, Persistent Tokens can
                                accidentally replace your Pokémon with an old version—reverting current HP, wiping stat
                                changes, and creating duplicate stacked hats or accessories.
                            </p>

                            <p className="text-subtext" style={{ fontStyle: 'italic', opacity: 0.9 }}>
                                <strong>Note:</strong> If you never plan to use the Pokérole PC Storage at all, you can
                                safely keep Persistent Tokens turned on.
                            </p>

                            <div className="persistence-warning-modal__action-box">
                                <ShieldAlert size={20} className="persistence-warning-modal__shield-icon" />
                                <div>
                                    <strong>Recommended Action:</strong>
                                    <div style={{ marginTop: '4px' }}>
                                        To keep your Pokémon safe, please open your{' '}
                                        <strong>Owlbear Rodeo Extensions</strong> menu and{' '}
                                        <strong>turn off (or remove) Persistent Tokens</strong>.
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="persistence-warning-modal__confirm-box">
                            <AlertTriangle size={22} className="persistence-warning-modal__alert-icon" />
                            <div>
                                <strong>Are you sure you never want to see this again?</strong>
                                <p className="text-subtext" style={{ marginTop: '8px' }}>
                                    Please make sure you have either <strong>turned off Persistent Tokens</strong> in
                                    your Owlbear Rodeo extensions menu, or that you{' '}
                                    <strong>do not use the Pokérole PC Storage</strong>.
                                </p>
                                <p className="text-subtext" style={{ marginTop: '8px' }}>
                                    If both are kept active at the same time, your Pokémon stats and items may still get
                                    overwritten without any warning.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="modal-footer persistence-warning-modal__footer">
                    {step === 'warning' ? (
                        <>
                            <button
                                type="button"
                                className="action-button action-button--dark persistence-warning-modal__btn"
                                onClick={() => setStep('confirm')}
                            >
                                Never Show Me This Again
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--secondary persistence-warning-modal__btn"
                                onClick={handleDismissSession}
                            >
                                Remind Me Next Session
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--theme persistence-warning-modal__btn"
                                onClick={handleClose}
                            >
                                <CheckCircle size={14} />
                                Understood, I&apos;ll Check
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="action-button action-button--secondary persistence-warning-modal__btn"
                                onClick={() => setStep('warning')}
                            >
                                Back / Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red persistence-warning-modal__btn"
                                onClick={handleConfirmNeverShowAgain}
                            >
                                <CheckCircle size={14} />I Understand - Never Show Again
                            </button>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
};
