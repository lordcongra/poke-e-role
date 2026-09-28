import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import OBR from '@owlbear-rodeo/sdk';
import { Bug, Send, Copy, Check, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, X, Loader2 } from 'lucide-react';
import {
    collectDiagnostics,
    submitBugReportToDiscord,
    formatBugReportMarkdown,
    formatActiveSheet,
    type BugReportDiagnostics
} from '../../../utils/bugReportService';
import './BugReportModal.css';

interface BugReportModalProps {
    onClose: () => void;
}

export function BugReportModal({ onClose }: BugReportModalProps) {
    const identity = useCharacterStore((state) => state.identity);
    const role = useCharacterStore((state) => state.role);
    const tokenId = useCharacterStore((state) => state.tokenId);

    const [description, setDescription] = useState('');
    const [reporterDiscord, setReporterDiscord] = useState(() => {
        try {
            return localStorage.getItem('pkr_reporter_discord') || '';
        } catch {
            return '';
        }
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showDiagnostics, setShowDiagnostics] = useState(false);

    // Initial diagnostic snapshot
    const [diagnostics, setDiagnostics] = useState<BugReportDiagnostics>(() =>
        collectDiagnostics({ identity, role, tokenId })
    );

    // Fetch freshest diagnostics and check OBR scene selection if store hasn't populated yet
    useEffect(() => {
        let isCancelled = false;

        async function resolveDiagnostics() {
            const currentStore = useCharacterStore.getState();
            let currentDiag = collectDiagnostics({
                identity: currentStore.identity,
                role: currentStore.role,
                tokenId: currentStore.tokenId
            });

            // If character identity is empty and OBR is available, check selected token on scene
            if (!currentDiag.characterName && !currentDiag.characterSpecies && OBR.isAvailable) {
                try {
                    const selected = await OBR.scene.items.getSelected();
                    if (selected.length > 0 && !isCancelled) {
                        const item = selected[0];
                        const rawMeta =
                            (item.metadata['pokerole-pmd-extension/stats'] as Record<string, unknown>) ||
                            (item.metadata['stats'] as Record<string, unknown>) ||
                            {};
                        const name = (rawMeta['nickname'] as string) || (rawMeta['name'] as string) || item.name || '';
                        const species = (rawMeta['species'] as string) || '';
                        const rank = (rawMeta['rank'] as string) || '';
                        if (name || species) {
                            currentDiag = {
                                ...currentDiag,
                                characterName: name,
                                characterSpecies: species,
                                characterRank: rank,
                                activeTokenId: item.id
                            };
                        }
                    }
                } catch {
                    // Ignore OBR read error
                }
            }

            if (!isCancelled) {
                setDiagnostics(currentDiag);
            }
        }

        resolveDiagnostics();
        return () => {
            isCancelled = true;
        };
    }, [identity, role, tokenId]);

    // Escape key listener to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isSubmitting]);

    const handleCopyMarkdown = async () => {
        try {
            const md = formatBugReportMarkdown({
                description: description || '(No description entered yet)',
                reporterDiscord,
                diagnostics
            });
            await navigator.clipboard.writeText(md);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            console.error('[BugReport] Failed to copy to clipboard:', e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            setSubmitError('Please enter a description of the issue.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            if (reporterDiscord.trim()) {
                try {
                    localStorage.setItem('pkr_reporter_discord', reporterDiscord.trim());
                } catch {
                    // Ignore localStorage failure
                }
            }

            const result = await submitBugReportToDiscord({
                description: description.trim(),
                reporterDiscord: reporterDiscord.trim(),
                diagnostics
            });

            if (result.success) {
                setSubmitSuccess(true);
            } else {
                setSubmitError(
                    result.error ||
                        'Failed to send report to Discord. You can still use "Copy to Clipboard" to message Congra directly.'
                );
            }
        } catch (err: any) {
            setSubmitError(err?.message || 'Unexpected error sending report.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="bug-report-modal__overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    onClose();
                }
            }}
        >
            <div className="bug-report-modal__content" role="dialog" aria-labelledby="bug-report-title">
                {/* Header */}
                <div className="bug-report-modal__header">
                    <h3 id="bug-report-title" className="bug-report-modal__title text-title-primary">
                        <Bug size={18} color="var(--primary)" />
                        Report a Bug / Feedback
                    </h3>
                    <button
                        type="button"
                        className="bug-report-modal__close-btn"
                        onClick={onClose}
                        title="Close"
                        disabled={isSubmitting}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                {submitSuccess ? (
                    <div className="bug-report-modal__body">
                        <div className="bug-report-modal__success-box">
                            <CheckCircle2 size={44} color="#2ecc71" />
                            <h4 className="bug-report-modal__success-title">Report Sent to Discord!</h4>
                            <p className="bug-report-modal__success-desc">
                                Thank you for helping improve the sheet! Your diagnostic details and description have
                                been posted directly to Congra's alert channel.
                            </p>
                            <button
                                type="button"
                                className="bug-report-modal__btn-submit"
                                style={{ marginTop: '8px' }}
                                onClick={onClose}
                            >
                                <Check size={16} /> Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
                        <div className="bug-report-modal__body">
                            <p className="bug-report-modal__desc">
                                Notice a bug or unexpected behavior? Describe what happened below and it will be
                                delivered directly to Congra's Discord alerts channel.
                            </p>

                            {submitError && (
                                <div className="bug-report-modal__error-box">
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                    <span>{submitError}</span>
                                </div>
                            )}

                            {/* Description */}
                            <div className="bug-report-modal__field">
                                <label className="bug-report-modal__label" htmlFor="bug-desc">
                                    <span>
                                        What happened? / Steps to reproduce
                                        <span className="bug-report-modal__req">*</span>{' '}
                                        <span
                                            style={{
                                                fontSize: '0.8em',
                                                fontWeight: 'normal',
                                                color: 'var(--text-muted)'
                                            }}
                                        >
                                            (please be as detailed as possible)
                                        </span>
                                    </span>
                                </label>
                                <textarea
                                    id="bug-desc"
                                    className="bug-report-modal__textarea"
                                    placeholder="e.g. When rolling an attack with X item equipped, the extra dice were not added to the roll log..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isSubmitting}
                                    autoFocus
                                    required
                                />
                            </div>

                            {/* Discord / Contact */}
                            <div className="bug-report-modal__field">
                                <label className="bug-report-modal__label" htmlFor="bug-discord">
                                    <span>Your Discord Username / other contact (optional)</span>
                                </label>
                                <input
                                    id="bug-discord"
                                    type="text"
                                    className="bug-report-modal__input"
                                    placeholder="e.g. @congra or email (so Congra can follow up if needed)"
                                    value={reporterDiscord}
                                    onChange={(e) => setReporterDiscord(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Diagnostics Dropdown */}
                            <div className="bug-report-modal__field">
                                <button
                                    type="button"
                                    className="bug-report-modal__diag-toggle"
                                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                                >
                                    <span>Auto-Collected Diagnostics (v{diagnostics.version})</span>
                                    {showDiagnostics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>

                                {showDiagnostics && (
                                    <div className="bug-report-modal__diag-content">
                                        <div className="bug-report-modal__diag-row">
                                            <span>Sheet Version:</span>
                                            <span className="bug-report-modal__diag-val">v{diagnostics.version}</span>
                                        </div>
                                        <div className="bug-report-modal__diag-row">
                                            <span>Environment:</span>
                                            <span className="bug-report-modal__diag-val">
                                                {diagnostics.environment}
                                            </span>
                                        </div>
                                        <div className="bug-report-modal__diag-row">
                                            <span>Active Sheet:</span>
                                            <span className="bug-report-modal__diag-val">
                                                {formatActiveSheet(diagnostics)}
                                            </span>
                                        </div>
                                        <div className="bug-report-modal__diag-row">
                                            <span>System & Browser:</span>
                                            <span className="bug-report-modal__diag-val">
                                                {diagnostics.browser} on {diagnostics.os}
                                            </span>
                                        </div>
                                        <div className="bug-report-modal__diag-row">
                                            <span>Resolution:</span>
                                            <span className="bug-report-modal__diag-val">{diagnostics.resolution}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="bug-report-modal__footer">
                            <button
                                type="button"
                                className="bug-report-modal__btn-copy"
                                onClick={handleCopyMarkdown}
                                title="Copy pre-formatted report to clipboard"
                            >
                                {copied ? (
                                    <>
                                        <Check size={15} color="#2ecc71" /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={15} /> Copy to Clipboard
                                    </>
                                )}
                            </button>

                            <button
                                type="submit"
                                className="bug-report-modal__btn-submit"
                                disabled={isSubmitting || !description.trim()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="bug-report-modal__spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} /> Send to Discord
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
