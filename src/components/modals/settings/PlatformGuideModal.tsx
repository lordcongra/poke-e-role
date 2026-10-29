import { useState } from 'react';
import { Share2, Laptop, FileJson, Sparkles, X, ShieldCheck } from 'lucide-react';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { CURRENT_VERSION } from '../../../data/changelog';
import { PlatformGuideOwlbearTab } from './platformGuide/PlatformGuideOwlbearTab';
import { PlatformGuideStandaloneTab } from './platformGuide/PlatformGuideStandaloneTab';
import './PlatformGuideModal.css';

interface PlatformGuideModalProps {
    onClose: () => void;
}

export function PlatformGuideModal({ onClose }: PlatformGuideModalProps) {
    const [activeTab, setActiveTab] = useState<'owlbear' | 'standalone'>(() =>
        isStandaloneMode ? 'owlbear' : 'standalone'
    );
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

    const handleCopy = (url: string) => {
        try {
            navigator.clipboard.writeText(url);
            setCopiedUrl(url);
            setTimeout(() => setCopiedUrl(null), 2000);
        } catch (e) {
            console.warn('[PlatformGuideModal] Clipboard write failed:', e);
        }
    };

    return (
        <div
            className="platform-guide-modal__overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="platform-guide-modal__content" role="dialog" aria-labelledby="platform-guide-title">
                {/* Header */}
                <div className="platform-guide-modal__header">
                    <h3 id="platform-guide-title" className="platform-guide-modal__title text-title-primary">
                        <Sparkles size={18} color="var(--primary)" />
                        Platform Guide: Standalone & Owlbear Rodeo
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="platform-guide-modal__badge">v{CURRENT_VERSION}</span>
                        <button
                            type="button"
                            className="platform-guide-modal__close-btn"
                            onClick={onClose}
                            title="Close"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="platform-guide-modal__tabs">
                    <button
                        type="button"
                        className={`platform-guide-modal__tab ${
                            activeTab === 'owlbear' ? 'platform-guide-modal__tab--active' : ''
                        }`}
                        onClick={() => setActiveTab('owlbear')}
                    >
                        <Share2 size={16} /> Owlbear Rodeo VTT Guide
                    </button>
                    <button
                        type="button"
                        className={`platform-guide-modal__tab ${
                            activeTab === 'standalone' ? 'platform-guide-modal__tab--active' : ''
                        }`}
                        onClick={() => setActiveTab('standalone')}
                    >
                        <Laptop size={16} /> Standalone Offline PWA Guide
                    </button>
                </div>

                {/* Body */}
                <div className="platform-guide-modal__body">
                    {/* Cross-Compatibility Banner (Prominent across both views) */}
                    <div className="platform-guide-modal__compat-banner">
                        <FileJson size={24} color="var(--primary)" className="platform-guide-modal__compat-icon" />
                        <div className="platform-guide-modal__compat-content">
                            <h4 className="platform-guide-modal__compat-title">
                                <ShieldCheck size={16} /> 100% Cross-Platform Data Compatibility
                            </h4>
                            <div>
                                Character JSONs and PC Storage master backups are completely interchangeable between the
                                Standalone PWA and Owlbear Rodeo. No conversion or formatting required!
                            </div>
                            <ul className="platform-guide-modal__compat-list">
                                <li>
                                    <strong>Save / Upload JSON:</strong> Click the floppy disk icon in the toolbar to
                                    export any character to a standard JSON file. Click the upload icon on either
                                    platform to immediately hydrate the sheet.
                                </li>
                                <li>
                                    <strong>PC Storage Backups:</strong> Export your entire campaign roster, PC boxes,
                                    and party belt into a single backup file from the PC Storage modal to transfer
                                    everything at once.
                                </li>
                                <li>
                                    <strong>Prep Anywhere, Play Anywhere:</strong> Build trainers, generate Pokémon, or
                                    craft homebrew items offline in Standalone mode, then bring your JSON files straight
                                    to game night on Owlbear Rodeo!
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Active Tab View */}
                    {activeTab === 'owlbear' ? (
                        <PlatformGuideOwlbearTab copiedUrl={copiedUrl} onCopy={handleCopy} />
                    ) : (
                        <PlatformGuideStandaloneTab copiedUrl={copiedUrl} onCopy={handleCopy} />
                    )}
                </div>

                {/* Footer */}
                <div className="platform-guide-modal__footer">
                    <span className="platform-guide-modal__version">
                        Pokérole 3.0 Sheet • Standalone PWA & Owlbear Rodeo
                    </span>
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onClose}
                        style={{ padding: '6px 14px' }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
