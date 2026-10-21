import { useState, useMemo, useEffect } from 'react';
import {
    ShieldCheck,
    Search,
    X,
    XCircle,
    Copy,
    Megaphone,
    Check,
    ChevronDown,
    ChevronRight,
    BookOpen,
    Swords,
    CloudRain,
    Target,
    Info,
    ChevronsUpDown,
    Link2,
    Sparkles,
    UserCheck,
    Zap,
    Award
} from 'lucide-react';
import { GM_CHEAT_ITEMS, type GmCheatItem } from '../../../data/gmScreenData';
import { GmPokemonLookup } from './GmPokemonLookup';
import { GmScreenCardContent } from './GmScreenCardContent';
import { GmScreenCreditsModal } from './GmScreenCreditsModal';
import { broadcastGmCheatItem } from './gmScreenBroadcastUtils';
import { filterAndScoreCheatItems, getCheatItemTabCounts } from './gmScreenFilterUtils';
import { getBaseShareUrl } from '../../../utils/common/helper';
import { DiscordIcon } from '../../ui/DiscordIcon';
import './GmScreenModal.css';

interface GmScreenModalProps {
    onClose: () => void;
    initialTab?: string;
}

type TabCategory = 'all' | 'rules' | 'trainer' | 'maneuvers' | 'environment' | 'progression' | 'lookup' | 'homebrew';

export function GmScreenModal({ onClose, initialTab }: GmScreenModalProps) {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<TabCategory>(() => {
        if (initialTab) return initialTab as TabCategory;
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const modalParam = urlParams.get('modal');
            const sectionParam = urlParams.get('section');
            if (modalParam === 'lookup' || modalParam === 'pokemon-lookup') {
                return 'lookup';
            }
            const validTabs: TabCategory[] = [
                'rules',
                'trainer',
                'maneuvers',
                'environment',
                'progression',
                'lookup',
                'homebrew'
            ];
            const legacyAliases: Record<string, TabCategory> = {
                status: 'environment',
                weather: 'environment',
                types: 'environment',
                catching: 'progression',
                training: 'progression',
                balance: 'progression'
            };
            if (sectionParam) {
                if (validTabs.includes(sectionParam as TabCategory)) {
                    return sectionParam as TabCategory;
                }
                if (legacyAliases[sectionParam]) {
                    return legacyAliases[sectionParam];
                }
            }
            const rawHash = window.location.hash.replace(/^#/, '');
            if (rawHash === 'lookup' || rawHash === 'pokemon-lookup') {
                return 'lookup';
            }
            if (rawHash) {
                const matchedItem = GM_CHEAT_ITEMS.find((item: GmCheatItem) => item.id === rawHash);
                if (matchedItem) return matchedItem.category;
            }
        } catch (e) {
            console.warn('[GmScreenModal] Could not parse initial URL tab:', e);
        }
        return 'all';
    });
    // Default collapsed: all cards start closed, except if URL hash targets a card
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
        try {
            const rawHash = window.location.hash.replace(/^#/, '');
            if (rawHash) {
                const matchedItem = GM_CHEAT_ITEMS.find((item: GmCheatItem) => item.id === rawHash);
                if (matchedItem) return { [matchedItem.id]: true };
            }
        } catch (e) {
            console.warn('[GmScreenModal] Could not parse URL deep link for initial expansion:', e);
        }
        return {};
    });
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const [copiedGeneralLink, setCopiedGeneralLink] = useState<boolean>(false);
    const [showCredits, setShowCredits] = useState<boolean>(false);

    useEffect(() => {
        try {
            const rawHash = window.location.hash.replace(/^#/, '');
            if (rawHash) {
                // If hash matches an item ID, scroll into view
                const matchedItem = GM_CHEAT_ITEMS.find((item: GmCheatItem) => item.id === rawHash);
                if (matchedItem) {
                    setTimeout(() => {
                        const el = document.getElementById(`gm-card-${matchedItem.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 200);
                }
            }
        } catch (e) {
            console.warn('[GmScreenModal] Could not parse URL deep link:', e);
        }
    }, []);

    const toggleCard = (id: string) => {
        setExpandedCards((prev) => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const allExpanded = useMemo(() => {
        return GM_CHEAT_ITEMS.length > 0 && GM_CHEAT_ITEMS.every((item: GmCheatItem) => expandedCards[item.id]);
    }, [expandedCards]);

    const toggleAllCards = () => {
        const nextState = !allExpanded;
        const newExpanded: Record<string, boolean> = {};
        GM_CHEAT_ITEMS.forEach((item: GmCheatItem) => {
            newExpanded[item.id] = nextState;
        });
        setExpandedCards(newExpanded);
    };

    const handleCopyDiscord = async (item: GmCheatItem) => {
        try {
            await navigator.clipboard.writeText(item.discordMarkdown);
            setCopiedId(item.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('[GmScreenModal] Failed to copy Discord markdown to clipboard:', error);
        }
    };

    const handleCopyLink = async (item: GmCheatItem) => {
        try {
            const baseUrl = getBaseShareUrl();
            const deepLink = `${baseUrl}?modal=gm-screen&section=${item.category}#${item.id}`;
            await navigator.clipboard.writeText(deepLink);
            setCopiedLinkId(item.id);
            setTimeout(() => setCopiedLinkId(null), 2000);
        } catch (error) {
            console.error('[GmScreenModal] Failed to copy deep link to clipboard:', error);
        }
    };

    const handleCopyGeneralLink = async () => {
        try {
            const baseUrl = getBaseShareUrl();
            const generalLink =
                activeTab !== 'all' ? `${baseUrl}?modal=gm-screen&section=${activeTab}` : `${baseUrl}?modal=gm-screen`;
            await navigator.clipboard.writeText(generalLink);
            setCopiedGeneralLink(true);
            setTimeout(() => setCopiedGeneralLink(false), 2000);
        } catch (error) {
            console.error('[GmScreenModal] Failed to copy general link to clipboard:', error);
        }
    };

    const handleBroadcast = (item: GmCheatItem) => {
        broadcastGmCheatItem(item);
    };

    const filteredItems = useMemo(() => {
        return filterAndScoreCheatItems(GM_CHEAT_ITEMS, searchQuery, activeTab);
    }, [searchQuery, activeTab]);

    const tabCounts = useMemo(() => {
        return getCheatItemTabCounts(GM_CHEAT_ITEMS);
    }, []);

    return (
        <div className="gm-screen-modal__overlay">
            <div className="gm-screen-modal__content">
                <div className="gm-screen-modal__header">
                    <div className="gm-screen-modal__header-left">
                        <h3
                            className="gm-screen-modal__title text-title-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <ShieldCheck size={22} color="var(--primary)" /> GM Screen & Rules Cheat Sheet
                        </h3>
                    </div>
                    <div className="gm-screen-modal__header-actions">
                        <button
                            type="button"
                            className="action-button action-button--dark gm-screen-modal__credits-btn"
                            onClick={() => setShowCredits(true)}
                            title="View credits & acknowledgments across the GM Screen"
                        >
                            <Award size={13} color="var(--primary)" /> Credits
                        </button>
                        <button
                            type="button"
                            className="action-button action-button--dark gm-screen-modal__copy-link-btn"
                            onClick={handleCopyGeneralLink}
                            title="Copy shareable link to this GM Screen"
                        >
                            {copiedGeneralLink ? (
                                <>
                                    <Check size={13} color="var(--primary)" /> Link Copied!
                                </>
                            ) : (
                                <>
                                    <Link2 size={13} /> Copy Link
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="gm-screen-modal__close-btn"
                            title="Close GM Screen"
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <div className="gm-screen-modal__controls">
                    {activeTab !== 'lookup' && (
                        <div className="gm-screen-modal__search-row">
                            <div className="gm-screen-modal__search-wrapper">
                                <Search size={16} className="gm-screen-modal__search-icon" />
                                <input
                                    type="text"
                                    className="gm-screen-modal__search-input text-subtext"
                                    placeholder="Search rules, statuses, weather, tables, actions, catching, PMD, Rangers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        className="gm-screen-modal__search-clear"
                                        onClick={() => setSearchQuery('')}
                                        title="Clear Search"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                className="action-button action-button--dark gm-screen-modal__toggle-all-btn"
                                onClick={toggleAllCards}
                                title={allExpanded ? 'Collapse All Sections' : 'Expand All Sections'}
                            >
                                <ChevronsUpDown size={14} /> {allExpanded ? 'Collapse All' : 'Expand All'}
                            </button>
                        </div>
                    )}

                    <div className="gm-screen-modal__tabs">
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'lookup' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('lookup')}
                        >
                            <Search size={14} /> Lookup Tool
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'all' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            <BookOpen size={14} /> All ({tabCounts.all})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'rules' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('rules')}
                        >
                            <Swords size={14} /> Combat & Rules ({tabCounts.rules})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'trainer' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('trainer')}
                        >
                            <UserCheck size={14} /> Trainer Rules ({tabCounts.trainer})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'maneuvers' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('maneuvers')}
                        >
                            <Zap size={14} /> Maneuvers ({tabCounts.maneuvers})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'environment' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('environment')}
                        >
                            <CloudRain size={14} /> Status & Environment ({tabCounts.environment})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'progression' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('progression')}
                        >
                            <Target size={14} /> Catching & Progression ({tabCounts.progression})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'homebrew' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('homebrew')}
                        >
                            <Sparkles size={14} /> Homebrew ({tabCounts.homebrew})
                        </button>
                    </div>
                </div>

                <div className="gm-screen-modal__body">
                    {activeTab === 'lookup' ? (
                        <GmPokemonLookup />
                    ) : filteredItems.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: 'var(--text-muted)'
                            }}
                        >
                            <Info size={32} style={{ marginBottom: '8px' }} />
                            <p className="text-subtext">No cheat sheet items match "{searchQuery}".</p>
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const isExpanded = !!expandedCards[item.id];
                            const isCopied = copiedId === item.id;

                            return (
                                <div key={item.id} id={`gm-card-${item.id}`} className="gm-screen-modal__card">
                                    <div className="gm-screen-modal__card-header" onClick={() => toggleCard(item.id)}>
                                        <div className="gm-screen-modal__card-title-group">
                                            {isExpanded ? (
                                                <ChevronDown size={18} color="var(--primary)" />
                                            ) : (
                                                <ChevronRight size={18} color="var(--text-muted)" />
                                            )}
                                            <strong className="text-label" style={{ color: 'var(--text-main)' }}>
                                                {item.title}
                                            </strong>
                                            {item.badge && (
                                                <span className="gm-screen-modal__card-badge text-theme-header">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>

                                        <div
                                            className="gm-screen-modal__card-actions"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-screen-modal__action-btn"
                                                onClick={() => handleCopyLink(item)}
                                                title="Copy deep link to this section"
                                            >
                                                {copiedLinkId === item.id ? (
                                                    <>
                                                        <Check size={13} color="var(--primary)" /> Link!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Link2 size={13} /> Link
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-screen-modal__action-btn"
                                                onClick={() => handleCopyDiscord(item)}
                                                title="Copy clean Discord-formatted Markdown to clipboard"
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check size={13} color="var(--primary)" /> Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={13} /> Discord
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="action-button action-button--theme gm-screen-modal__action-btn"
                                                onClick={() => handleBroadcast(item)}
                                                title="Broadcast to Owlbear table / chat / roll log"
                                            >
                                                <Megaphone size={13} /> Broadcast
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="gm-screen-modal__card-body">
                                            <p className="gm-screen-modal__summary-text text-subtext">{item.summary}</p>
                                            <GmScreenCardContent itemId={item.id} />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="gm-screen-modal__footer">
                    <div className="gm-screen-modal__footer-content">
                        <div className="gm-screen-modal__footer-item">
                            <BookOpen size={13} color="var(--primary)" />
                            <span>
                                Find official 3.0 Corebook PDF in <strong>#pokerole-corebook</strong>
                            </span>
                        </div>
                        <span className="gm-screen-modal__footer-divider">•</span>
                        <div className="gm-screen-modal__footer-item">
                            <DiscordIcon size={13} color="var(--primary)" />
                            <span>
                                Questions or suggestions? Contact <strong>@congra</strong> on{' '}
                                <a
                                    href="https://discord.gg/B9VcfYwWCJ"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gm-screen-modal__footer-link"
                                >
                                    Discord
                                </a>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {showCredits && <GmScreenCreditsModal onClose={() => setShowCredits(false)} />}
        </div>
    );
}
