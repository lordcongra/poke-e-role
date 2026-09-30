import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import './PcPromptModal.css';

interface PcPromptModalProps {
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    onConfirm: (val: string) => void;
    onClose: () => void;
}

export const PcPromptModal: React.FC<PcPromptModalProps> = ({
    title,
    description,
    placeholder = 'Enter name...',
    defaultValue = '',
    confirmText = 'Confirm',
    onConfirm,
    onClose
}) => {
    const [value, setValue] = useState(defaultValue);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) {
            onConfirm(trimmed);
            onClose();
        }
    };

    return (
        <div className="modal-backdrop pc-prompt-backdrop" onClick={onClose}>
            <div className="modal-container pc-prompt-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header pc-prompt-modal__header">
                    <h3 className="modal-title text-title-primary">{title}</h3>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="pc-prompt-modal__body">
                    {description && <p className="pc-prompt-modal__desc text-subtext">{description}</p>}

                    <input
                        type="text"
                        className="pc-prompt-modal__input text-label"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') onClose();
                        }}
                    />

                    <footer className="modal-footer pc-prompt-modal__footer">
                        <button type="button" className="action-button action-button--dark" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="action-button action-button--theme" disabled={!value.trim()}>
                            <Check size={14} /> {confirmText}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};
