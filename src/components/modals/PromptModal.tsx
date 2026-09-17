import React, { useState, useEffect } from 'react';
import { Check, XCircle } from 'lucide-react';
import './PromptModal.css';

export interface PromptModalProps {
    isOpen: boolean;
    title: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    inputType?: 'text' | 'none';
    confirmText?: string;
    cancelText?: string;
    onConfirm: (val: string) => void;
    onCancel: () => void;
}

export function PromptModal({
    isOpen,
    title,
    message,
    defaultValue = '',
    placeholder = '',
    inputType = 'text',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel
}: PromptModalProps) {
    const [inputValue, setInputValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setInputValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(inputValue);
    };

    return (
        <div className="prompt-modal__overlay" onClick={onCancel}>
            <div className="prompt-modal__content" onClick={(e) => e.stopPropagation()}>
                <h3 className="prompt-modal__title text-title-primary">{title}</h3>
                {message && <p className="prompt-modal__desc text-subtext">{message}</p>}

                <form onSubmit={handleSubmit}>
                    {inputType === 'text' && (
                        <input
                            type="text"
                            autoFocus
                            value={inputValue}
                            placeholder={placeholder}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="prompt-modal__input"
                        />
                    )}

                    <div className="prompt-modal__actions">
                        <button
                            type="button"
                            className="action-button action-button--dark prompt-modal__btn"
                            onClick={onCancel}
                        >
                            <XCircle size={15} /> {cancelText}
                        </button>
                        <button type="submit" className="action-button action-button--theme prompt-modal__btn">
                            <Check size={15} /> {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
