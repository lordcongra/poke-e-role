import React, { useState, useEffect, useRef } from 'react';
import { User, Archive, X, Plus } from 'lucide-react';
import './PcNewProfileModal.css';

interface PcNewProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, profileType: 'trainer' | 'storage') => void;
}

export const PcNewProfileModal: React.FC<PcNewProfileModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [profileType, setProfileType] = useState<'trainer' | 'storage'>('trainer');
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setProfileType('trainer');
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onCreate(trimmed, profileType);
        onClose();
    };

    return (
        <div className="pc-new-profile-backdrop" onClick={onClose}>
            <div className="pc-new-profile-modal" onClick={(e) => e.stopPropagation()}>
                <div className="pc-new-profile-header">
                    <h3 className="pc-new-profile-title">
                        <Plus size={18} color="var(--primary)" /> Create New Profile
                    </h3>
                    <button
                        type="button"
                        className="pc-new-profile-close-btn"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="pc-new-profile-body">
                    <p className="pc-new-profile-description">
                        Select what kind of profile you would like to add to this campaign:
                    </p>

                    <div className="pc-new-profile-types">
                        <button
                            type="button"
                            className={`pc-new-profile-type-card ${
                                profileType === 'trainer' ? 'pc-new-profile-type-card--selected' : ''
                            }`}
                            onClick={() => {
                                setProfileType('trainer');
                                inputRef.current?.focus();
                            }}
                        >
                            <div className="pc-new-profile-type-header">
                                <User size={16} color="var(--primary)" />
                                <span>Trainer Profile</span>
                            </div>
                            <p className="pc-new-profile-type-desc">
                                Personal belt party (6 slots) & private PC boxes. Can link to an Owlbear Rodeo trainer
                                token.
                            </p>
                        </button>

                        <button
                            type="button"
                            className={`pc-new-profile-type-card ${
                                profileType === 'storage' ? 'pc-new-profile-type-card--selected' : ''
                            }`}
                            onClick={() => {
                                setProfileType('storage');
                                inputRef.current?.focus();
                            }}
                        >
                            <div className="pc-new-profile-type-header">
                                <Archive size={16} color="#eab308" />
                                <span>PMD / Team Storage</span>
                            </div>
                            <p className="pc-new-profile-type-desc">
                                Team inventory & party (6 slots) without requiring a trainer character. Ideal for PMD
                                teams.
                            </p>
                        </button>
                    </div>

                    <div className="pc-new-profile-input-group">
                        <label className="pc-new-profile-label" htmlFor="new-profile-name-input">
                            Profile Name
                        </label>
                        <input
                            id="new-profile-name-input"
                            ref={inputRef}
                            type="text"
                            className="pc-new-profile-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={
                                profileType === 'trainer'
                                    ? 'e.g. Red, Blue, Ash, Cynthia'
                                    : 'e.g. Team Poképals, Guild Depot, Camp Storage'
                            }
                            autoComplete="off"
                        />
                    </div>

                    <div className="pc-new-profile-footer">
                        <button type="button" className="action-button action-button--dark" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="action-button action-button--theme" disabled={!name.trim()}>
                            Create Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
