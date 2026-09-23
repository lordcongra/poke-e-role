import { useState, useMemo } from 'react';
import { Megaphone, X, PartyPopper, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { CHANGELOG_DATA, CURRENT_VERSION, getChangelogDiff, type ChangelogHighlight } from '../../../data/changelog';
import { ChangelogDetailModal } from './ChangelogDetailModal';
import './ChangelogModal.css';

interface ChangelogModalProps {
    onClose: () => void;
}

export function ChangelogModal({ onClose }: ChangelogModalProps) {
    // 1. Read previously seen version from localStorage on initial render
    const [lastSeenVersion] = useState<string | null>(() => {
        try {
            return localStorage.getItem('pkr_changelog_seen');
        } catch {
            return null;
        }
    });

    // 2. Compute unseen diff and highlight cards
    const diff = useMemo(() => getChangelogDiff(lastSeenVersion), [lastSeenVersion]);

    // 3. Highlight selected for deep-dive detail popout
    const [selectedHighlight, setSelectedHighlight] = useState<ChangelogHighlight | null>(null);

    // 4. Accordion state: unseen versions default to expanded, older ones collapsed
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(() => {
        const initial = new Set<string>();
        if (diff.unseenVersions.length > 0) {
            diff.unseenVersions.forEach((v) => initial.add(v));
        } else {
            // Default to latest version expanded if user is already up to date
            const latest = CHANGELOG_DATA[0]?.version || CURRENT_VERSION;
            initial.add(latest);
        }
        return initial;
    });

    const toggleVersion = (version: string) => {
        setExpandedVersions((prev) => {
            const next = new Set(prev);
            if (next.has(version)) {
                next.delete(version);
            } else {
                next.add(version);
            }
            return next;
        });
    };

    const allExpanded = expandedVersions.size === CHANGELOG_DATA.length;
    const toggleAll = () => {
        if (allExpanded) {
            setExpandedVersions(new Set());
        } else {
            setExpandedVersions(new Set(CHANGELOG_DATA.map((l) => l.version)));
        }
    };

    return (
        <div className="changelog-modal__overlay">
            <div className="changelog-modal__content">
                <div className="changelog-modal__header">
                    <div>
                        <h3 className="changelog-modal__title text-title-primary">
                            <Megaphone size={20} /> What's New in v{CURRENT_VERSION}
                        </h3>
                        {diff.isCatchUp && diff.catchUpFromVersion && (
                            <p className="changelog-modal__catchup-notice text-subtext">
                                Catching up: <strong>{diff.unseenVersions.length} updates</strong> since your last visit
                                (v{diff.catchUpFromVersion} → v{CURRENT_VERSION})
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="changelog-modal__close-x" title="Close" type="button">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="changelog-modal__body">
                    {/* Top Display Cards / Feature Highlights */}
                    {diff.highlights.length > 0 && (
                        <div className="changelog-modal__highlights-section">
                            <div className="changelog-modal__highlights-header">
                                <h4 className="changelog-modal__highlights-heading text-title-primary">
                                    <Sparkles size={16} className="changelog-modal__sparkle-icon" />
                                    {diff.isCatchUp ? 'New Since Your Last Visit' : 'Feature Highlights'}
                                </h4>
                                <span className="changelog-modal__highlights-hint text-subtext">
                                    Click any card for full details
                                </span>
                            </div>

                            <div className="changelog-modal__cards-grid">
                                {diff.highlights.map((highlight) => {
                                    const Icon = highlight.icon;
                                    const isNewest = highlight.version === CURRENT_VERSION;
                                    return (
                                        <div
                                            key={highlight.id}
                                            className={`changelog-card ${isNewest ? 'changelog-card--newest' : ''}`}
                                            onClick={() => setSelectedHighlight(highlight)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedHighlight(highlight);
                                                }
                                            }}
                                        >
                                            <div className="changelog-card__header">
                                                <div className="changelog-card__icon-box">
                                                    <Icon size={18} />
                                                </div>
                                                <div className="changelog-card__meta">
                                                    {isNewest ? (
                                                        <span className="changelog-card__badge changelog-card__badge--latest">
                                                            <Sparkles size={11} strokeWidth={2.5} /> Latest
                                                        </span>
                                                    ) : (
                                                        <span className="changelog-card__version">
                                                            v{highlight.version}
                                                        </span>
                                                    )}
                                                    {highlight.badge && (
                                                        <span className="changelog-card__badge">{highlight.badge}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <h5 className="changelog-card__title text-title-primary">
                                                {highlight.title}
                                            </h5>
                                            <p className="changelog-card__summary text-subtext">{highlight.summary}</p>
                                            <div className="changelog-card__footer">
                                                <span className="changelog-card__action">Details →</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Collapsible Version Accordions */}
                    <div className="changelog-modal__history-section">
                        <div className="changelog-modal__history-header">
                            <h4 className="changelog-modal__history-heading text-title-primary">
                                Full Version History
                            </h4>
                            <button
                                type="button"
                                className="changelog-modal__toggle-all-btn text-subtext"
                                onClick={toggleAll}
                            >
                                {allExpanded ? 'Collapse All' : 'Expand All'}
                            </button>
                        </div>

                        {CHANGELOG_DATA.map((log) => {
                            const isExpanded = expandedVersions.has(log.version);
                            const isUnseen = diff.unseenVersions.includes(log.version);

                            return (
                                <div
                                    key={log.version}
                                    className={`changelog-modal__version-block ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
                                >
                                    <button
                                        type="button"
                                        className="changelog-modal__version-header-btn"
                                        onClick={() => toggleVersion(log.version)}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className="changelog-modal__version-title-group">
                                            <span className="changelog-modal__chevron">
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </span>
                                            <span className="changelog-modal__version-name text-title-primary">
                                                v{log.version}
                                            </span>
                                            <span className="changelog-modal__date text-subtext">- {log.date}</span>
                                        </div>
                                        {isUnseen && (
                                            <span className="changelog-modal__new-pill">
                                                <Sparkles size={11} strokeWidth={2.5} /> New
                                            </span>
                                        )}
                                    </button>

                                    {isExpanded && (
                                        <div className="changelog-modal__changes">
                                            {log.changes.map((change, idx) => {
                                                if (
                                                    change &&
                                                    typeof change === 'object' &&
                                                    'type' in change &&
                                                    (change.type === 'ul' || change.type === 'div')
                                                ) {
                                                    return <div key={idx}>{change}</div>;
                                                }
                                                if (
                                                    change &&
                                                    typeof change === 'object' &&
                                                    'type' in change &&
                                                    change.type === 'strong'
                                                ) {
                                                    return (
                                                        <div key={idx} className="changelog-modal__section-title">
                                                            {change}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <ul
                                                        key={idx}
                                                        className="changelog-modal__list text-subtext"
                                                        style={{ color: 'var(--text-main)' }}
                                                    >
                                                        <li>{change}</li>
                                                    </ul>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="changelog-modal__archive-note text-subtext">
                            <span>Looking for older version history? </span>
                            <a
                                href="https://github.com/lordcongra/poke-e-role/blob/main/CHANGELOG.md"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="changelog-modal__link"
                            >
                                View v2.x archive on GitHub
                            </a>
                        </div>
                    </div>
                </div>

                <div className="changelog-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark changelog-modal__btn"
                        onClick={onClose}
                    >
                        <PartyPopper size={18} /> Wahoo!
                    </button>
                </div>
            </div>

            {/* Deep-Dive Detail Popout Modal */}
            {selectedHighlight && (
                <ChangelogDetailModal highlight={selectedHighlight} onClose={() => setSelectedHighlight(null)} />
            )}
        </div>
    );
}
