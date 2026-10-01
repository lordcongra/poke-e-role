import React, { useState } from 'react';
import { HelpCircle, X, Shield, Cloud, Smartphone, Sparkles, BookOpen } from 'lucide-react';
import './PcGuideModal.css';

interface PcGuideModalProps {
    boxTheme?: string;
    onClose: () => void;
}

export const PcGuideModal: React.FC<PcGuideModalProps> = ({ boxTheme, onClose }) => {
    const [activeTab, setActiveTab] = useState<'basics' | 'cloud' | 'trainers'>('basics');

    return (
        <div
            className="modal-backdrop pc-guide-modal-backdrop"
            style={
                boxTheme
                    ? ({
                          '--box-theme': boxTheme,
                          '--primary': boxTheme,
                          '--panel-bg': `color-mix(in srgb, ${boxTheme} 12%, var(--base-panel-dark, #1e1e1e))`,
                          '--panel-alt': `color-mix(in srgb, ${boxTheme} 18%, var(--base-panel-alt-dark, #2a2a2a))`,
                          '--border': `color-mix(in srgb, ${boxTheme} 35%, var(--base-border-dark, #383838))`
                      } as React.CSSProperties)
                    : undefined
            }
            onClick={onClose}
        >
            <div className="modal-container pc-guide-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header pc-guide-modal__header">
                    <div className="pc-guide-modal__title-row">
                        <HelpCircle size={20} className="pc-guide-modal__icon" />
                        <div>
                            <h3 className="modal-title text-title-primary">Pokémon PC & Storage Guide</h3>
                            <p className="text-subtext">How to manage your team, recall tokens, and sync across PCs</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="action-button action-button--ghost pc-guide-modal__close-btn"
                        onClick={onClose}
                        aria-label="Close"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Tabs */}
                <div className="pc-guide-modal__tabs">
                    <button
                        type="button"
                        className={`pc-guide-modal__tab ${activeTab === 'basics' ? 'pc-guide-modal__tab--active' : ''}`}
                        onClick={() => setActiveTab('basics')}
                    >
                        <BookOpen size={14} /> Party Belt & PC Boxes
                    </button>
                    <button
                        type="button"
                        className={`pc-guide-modal__tab ${activeTab === 'cloud' ? 'pc-guide-modal__tab--active' : ''}`}
                        onClick={() => setActiveTab('cloud')}
                    >
                        <Cloud size={14} /> Cloud Backup & Multi-PC Sync
                    </button>
                    <button
                        type="button"
                        className={`pc-guide-modal__tab ${activeTab === 'trainers' ? 'pc-guide-modal__tab--active' : ''}`}
                        onClick={() => setActiveTab('trainers')}
                    >
                        <Shield size={14} /> Trainers & Roster
                    </button>
                </div>

                <div className="pc-guide-modal__body text-subtext">
                    {activeTab === 'basics' && (
                        <div className="pc-guide-modal__content-section">
                            <h4 className="text-label pc-guide-modal__heading">
                                <Sparkles size={15} /> 1. The Party Belt (6 Slots)
                            </h4>
                            <p>
                                The dock on the left represents your active Trainer&apos;s Pokéball Belt. Up to 6
                                Pokémon can be carried simultaneously.
                            </p>
                            <ul>
                                <li>
                                    <strong>Send Out:</strong> Click any party slot to deploy that Pokémon right in
                                    front of your Trainer on the battle map.
                                </li>
                                <li>
                                    <strong>Recall:</strong> Click &quot;Recall to Belt&quot; anytime. The token is
                                    removed from the map back into its Pokéball, preserving its current HP, Will, and
                                    status conditions.
                                </li>
                                <li>
                                    <strong>Deposit:</strong> Click any empty belt slot to deposit a Pokémon from the
                                    active map, your PC boxes, or the generator.
                                </li>
                            </ul>

                            <h4 className="text-label pc-guide-modal__heading" style={{ marginTop: '14px' }}>
                                <Smartphone size={15} /> 2. PC Storage Boxes
                            </h4>
                            <p>
                                The 30-slot grid holds your boxed Pokémon. Each Trainer has their own private 8 boxes!
                            </p>
                            <ul>
                                <li>
                                    <strong>Organizing:</strong> Drag &amp; drop or click to swap Pokémon between your
                                    Belt and PC Boxes.
                                </li>
                                <li>
                                    <strong>Customizing:</strong> Rename any box or pick a custom color theme using the
                                    palette icon in the header.
                                </li>
                            </ul>
                        </div>
                    )}

                    {activeTab === 'cloud' && (
                        <div className="pc-guide-modal__content-section">
                            <h4 className="text-label pc-guide-modal__heading">
                                <Cloud size={15} /> Backing Up &amp; Cross-Device Sync
                            </h4>
                            <p>
                                Pokérole stores your team in fast local browser storage (IndexedDB) for offline-ready
                                speed.
                            </p>
                            <div className="pc-guide-modal__callout">
                                <strong>Accessing Owlbear Rodeo from another PC or device?</strong>
                                <br />
                                Because local storage is browser-specific, use <strong>Cloud Backup</strong> or{' '}
                                <strong>JSON Export</strong> to take your Pokémon anywhere!
                            </div>
                            <ol>
                                <li>
                                    <strong>Option 1 (Backup Scene):</strong> Open a scene in Owlbear Rodeo and click{' '}
                                    <strong>Cloud Backup</strong> &rarr; <strong>Update Open Scene</strong>. All Trainer
                                    and Pokémon tokens are placed in an organized grid. Backup scenes are automatically
                                    protected: visiting them syncs your latest team data and restores your PC on new
                                    devices without ghost deletion!
                                </li>
                                <li>
                                    <strong>Option 2 (Local JSON Backup):</strong> In the Cloud Backup modal, select{' '}
                                    <strong>Download JSON File</strong> to save a lightweight <code>.json</code> backup
                                    (~50–200 KB) directly to your computer. Click <strong>Import JSON</strong> on any
                                    computer to restore your team in seconds!
                                </li>
                                <li>
                                    <strong>Option 3 (Cloud Asset):</strong> Choose <strong>Cloud Scene Asset</strong>{' '}
                                    to save a reusable prefab scene into your Owlbear Cloud library.
                                </li>
                            </ol>
                        </div>
                    )}

                    {activeTab === 'trainers' && (
                        <div className="pc-guide-modal__content-section">
                            <h4 className="text-label pc-guide-modal__heading">
                                <Shield size={15} /> Trainer Profiles &amp; Campaigns
                            </h4>
                            <ul>
                                <li>
                                    <strong>Independent Storage:</strong> Each Trainer has their own separate Party Belt
                                    and private PC Boxes. Switching trainers in the header swaps both.
                                </li>
                                <li>
                                    <strong>Claiming Pokémon:</strong> When a player deposits a token, it is claimed by
                                    their player name. Other players cannot accidentally withdraw claimed Pokémon.
                                </li>
                                <li>
                                    <strong>GM Control:</strong> Game Masters can inspect all tokens, review sheet
                                    diffs, and manage campaign rosters from the header dropdowns.
                                </li>
                            </ul>
                        </div>
                    )}
                </div>

                <footer className="modal-footer pc-guide-modal__footer">
                    <button type="button" className="action-button action-button--theme" onClick={onClose}>
                        Got it!
                    </button>
                </footer>
            </div>
        </div>
    );
};
