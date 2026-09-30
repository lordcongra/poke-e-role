import React, { useState } from 'react';
import type { SheetReviewPayload, SheetFieldDiff } from '../../../types/pcStorageTypes';
import { GitMerge, Check, X, CheckSquare, Square } from 'lucide-react';
import './PcReviewModal.css';

interface PcReviewModalProps {
    payload: SheetReviewPayload;
    onApply: (diffs: SheetFieldDiff[], notifyPlayer: boolean) => void;
    onClose: () => void;
}

export const PcReviewModal: React.FC<PcReviewModalProps> = ({ payload, onApply, onClose }) => {
    const [diffs, setDiffs] = useState<SheetFieldDiff[]>(payload.diffs);
    const [notifyPlayer, setNotifyPlayer] = useState(false); // Defaulted OFF per user request

    const toggleDiff = (id: string) => {
        setDiffs((prev) => prev.map((d) => (d.id === id ? { ...d, accepted: !d.accepted } : d)));
    };

    const handleSelectAll = (accepted: boolean) => {
        setDiffs((prev) => prev.map((d) => ({ ...d, accepted })));
    };

    const acceptedCount = diffs.filter((d) => d.accepted).length;

    const getCategoryBadgeClass = (category: SheetFieldDiff['category']) => {
        switch (category) {
            case 'stats':
                return 'pc-review-diff__badge--stats';
            case 'moves':
                return 'pc-review-diff__badge--moves';
            case 'items':
                return 'pc-review-diff__badge--items';
            case 'passives':
                return 'pc-review-diff__badge--passives';
            default:
                return 'pc-review-diff__badge--identity';
        }
    };

    return (
        <div className="modal-backdrop pc-review-modal-backdrop">
            <div className="modal-container pc-review-modal">
                <header className="modal-header pc-review-modal__header">
                    <div className="pc-review-modal__title-group">
                        <GitMerge size={20} className="pc-review-modal__icon" />
                        <div>
                            <h2 className="modal-title text-title-primary">Sheet Review: {payload.pokemonName}</h2>
                            <p className="text-subtext">
                                Player <strong>{payload.playerName}</strong> submitted changes. Review and select
                                updates to merge.
                            </p>
                        </div>
                    </div>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close review modal">
                        <X size={18} />
                    </button>
                </header>

                <div className="pc-review-modal__toolbar">
                    <span className="text-subtext">
                        {acceptedCount} of {diffs.length} changes accepted
                    </span>
                    <div className="pc-review-modal__toolbar-actions">
                        <button
                            type="button"
                            className="action-button action-button--dark pc-review-modal__btn-bulk"
                            onClick={() => handleSelectAll(true)}
                        >
                            <CheckSquare size={14} /> Accept All
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark pc-review-modal__btn-bulk"
                            onClick={() => handleSelectAll(false)}
                        >
                            <Square size={14} /> Reject All
                        </button>
                    </div>
                </div>

                <div className="pc-review-modal__body">
                    <div className="pc-review-modal__diff-table">
                        <div className="pc-review-modal__diff-header-row">
                            <span className="pc-review-col--check">Accept</span>
                            <span className="pc-review-col--field">Field</span>
                            <span className="pc-review-col--gm">GM Value (Current)</span>
                            <span className="pc-review-col--player">Player Value (Incoming)</span>
                        </div>

                        {diffs.map((diff) => (
                            <div
                                key={diff.id}
                                className={`pc-review-modal__diff-row ${diff.accepted ? 'pc-review-modal__diff-row--accepted' : 'pc-review-modal__diff-row--rejected'}`}
                                onClick={() => toggleDiff(diff.id)}
                            >
                                <div className="pc-review-col--check">
                                    <input
                                        type="checkbox"
                                        checked={diff.accepted}
                                        onChange={() => toggleDiff(diff.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="pc-review-col--field">
                                    <span className={`pc-review-diff__badge ${getCategoryBadgeClass(diff.category)}`}>
                                        {diff.category}
                                    </span>
                                    <span className="pc-review-diff__label text-label">{diff.label}</span>
                                </div>
                                <div className="pc-review-col--gm">
                                    <span className="pc-review-diff__val pc-review-diff__val--gm">
                                        {String(diff.gmValue)}
                                    </span>
                                </div>
                                <div className="pc-review-col--player">
                                    <span className="pc-review-diff__val pc-review-diff__val--player">
                                        {String(diff.playerValue)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="modal-footer pc-review-modal__footer">
                    <label className="pc-review-modal__notify-toggle text-subtext" title="Notify player upon applying">
                        <input
                            type="checkbox"
                            checked={notifyPlayer}
                            onChange={(e) => setNotifyPlayer(e.target.checked)}
                        />
                        <span>Send update notification to player on merge (defaults off)</span>
                    </label>

                    <div className="pc-review-modal__footer-actions">
                        <button type="button" className="action-button action-button--dark" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--theme"
                            onClick={() => onApply(diffs, notifyPlayer)}
                        >
                            <Check size={14} /> Apply {acceptedCount} Changes
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
