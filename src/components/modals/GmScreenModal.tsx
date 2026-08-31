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
    FlaskConical,
    CloudRain,
    Target,
    Award,
    Shield,
    Heart,
    Info,
    ChevronsUpDown,
    Link2
} from 'lucide-react';
import {
    GM_CHEAT_ITEMS,
    GM_SCREEN_CREDITS,
    type GmCheatItem,
    type StatusEffectData,
    type HoldingBackOption,
    type ReactionRuleExample,
    type WILL_SPENDING,
    type COMBAT_FLOW_STEPS,
    type WEATHER_CONDITIONS_DATA,
    type ENVIRONMENTAL_HAZARDS_DATA,
    type TRAINER_ACTIONS_TABLE,
    type COVER_TABLE,
    type HEALING_TABLE
} from '../../data/gmScreenData';
import { GmCombatCards } from './gmCards/GmCombatCards';
import { GmStatusCards } from './gmCards/GmStatusCards';
import { GmReferenceCards } from './gmCards/GmReferenceCards';
import { GmScreenCatchCalculator } from './GmScreenCatchCalculator';
import { GmScreenTypeMatrix } from './GmScreenTypeMatrix';
import { broadcastInfo } from '../../utils/diceRoller';
import './GmScreenModal.css';

interface GmScreenModalProps {
    onClose: () => void;
    initialTab?: string;
}

type TabCategory = 'all' | 'rules' | 'status' | 'weather' | 'catching' | 'training' | 'balance' | 'types';

export function GmScreenModal({ onClose, initialTab }: GmScreenModalProps) {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<TabCategory>((initialTab as TabCategory) || 'all');
    // Default collapsed: all cards start closed
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
    const [copiedGeneralLink, setCopiedGeneralLink] = useState<boolean>(false);

    useEffect(() => {
        try {
            const rawHash = window.location.hash.replace(/^#/, '');
            const urlParams = new URLSearchParams(window.location.search);
            const sectionParam = urlParams.get('section');

            if (sectionParam) {
                const validTabs: TabCategory[] = [
                    'rules',
                    'status',
                    'weather',
                    'catching',
                    'training',
                    'balance',
                    'types'
                ];
                if (validTabs.includes(sectionParam as TabCategory)) {
                    setActiveTab(sectionParam as TabCategory);
                }
            }

            if (rawHash) {
                // If hash matches an item ID, expand it and scroll into view
                const matchedItem = GM_CHEAT_ITEMS.find((item: GmCheatItem) => item.id === rawHash);
                if (matchedItem) {
                    setActiveTab(matchedItem.category);
                    setExpandedCards({ [matchedItem.id]: true });
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

    // Auto-expand cards when search query is typed
    useEffect(() => {
        if (searchQuery.trim()) {
            const newExpanded: Record<string, boolean> = {};
            GM_CHEAT_ITEMS.forEach((item: GmCheatItem) => {
                newExpanded[item.id] = true;
            });
            setExpandedCards(newExpanded);
        }
    }, [searchQuery]);

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

    const getBaseShareUrl = (): string => {
        const origin = window.location.origin;
        let pathname = window.location.pathname;
        // Strip specific html file endings if present (e.g. index.html or initiative-tracker.html)
        pathname = pathname.replace(/\/[^/]+\.html$/, '/');
        if (!pathname.endsWith('/')) {
            pathname += '/';
        }
        return `${origin}${pathname}`;
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
            const generalLink = `${baseUrl}?modal=gm-screen`;
            await navigator.clipboard.writeText(generalLink);
            setCopiedGeneralLink(true);
            setTimeout(() => setCopiedGeneralLink(false), 2000);
        } catch (error) {
            console.error('[GmScreenModal] Failed to copy general link to clipboard:', error);
        }
    };

    const handleBroadcast = (item: GmCheatItem) => {
        broadcastInfo(`GM Screen: ${item.title}`, item.broadcastText);
    };

    const handleBroadcastStatus = (s: StatusEffectData) => {
        const text = `Status: ${s.name} [${s.badge} | Category: ${s.categoryType}]\n• Effect: ${s.effect}\n• Resist / Cure: ${s.resist}\n• Duration: ${s.duration}`;
        broadcastInfo(`Status: ${s.name}`, text);
    };

    const handleBroadcastWeather = (w: (typeof WEATHER_CONDITIONS_DATA)[0]) => {
        const text = `Weather: ${w.name} [${w.badge}]\n${w.effects.map((e) => `• ${e}`).join('\n')}`;
        broadcastInfo(`Weather: ${w.name}`, text);
    };

    const handleBroadcastHazard = (h: (typeof ENVIRONMENTAL_HAZARDS_DATA)[0]) => {
        const text = `Hazard: ${h.name}\n• Effect: ${h.effect}`;
        broadcastInfo(`Hazard: ${h.name}`, text);
    };

    const handleBroadcastHoldingBack = (opt: HoldingBackOption) => {
        const text = `Holding Back an Attack: ${opt.title}\n• ${opt.desc}`;
        broadcastInfo(`Holding Back: ${opt.title}`, text);
    };

    const handleBroadcastStatusRules = () => {
        const text = `Status Ailments & Conditions Categories:\n• Aggravating: Worsens over time if untreated.\n• Fixed: Constant effect; needs treatment/items to heal.\n• Volatile: Temporary; heals naturally or on switch.\n• Stacking: Conditions can stack! Re-inflicting burn/poison bumps degree. Only Full Heal/Restore & Lum Berry cure multiple conditions at once.`;
        broadcastInfo(`Status Rules & Categories`, text);
    };

    const handleBroadcastWill = (w: (typeof WILL_SPENDING)[0]) => {
        const text = `Will Spending: ${w.name} (${w.cost})\n• ${w.effect}`;
        broadcastInfo(`Will: ${w.name}`, text);
    };

    const handleBroadcastTrainerAction = (t: (typeof TRAINER_ACTIONS_TABLE)[0]) => {
        const text = `Trainer Action: ${t.action}\n• In Trainer Area: ${t.trainerArea}\n• In the Fray: ${t.inFray}`;
        broadcastInfo(`Trainer Action: ${t.action}`, text);
    };

    const handleBroadcastCover = (c: (typeof COVER_TABLE)[0]) => {
        const text = `Cover: ${c.coverage}\n• Bonus Def/Sp.Def: ${c.defBonus}\n• Takes Added Effects: ${c.addedEffects}`;
        broadcastInfo(`Cover: ${c.coverage}`, text);
    };

    const handleBroadcastHealing = (h: (typeof HEALING_TABLE)[0]) => {
        const text = `Damage Healing: ${h.damageType}\n• Natural (Rest): ${h.natural}\n• Potion Units: ${h.potion}`;
        broadcastInfo(`Healing: ${h.damageType}`, text);
    };

    const handleBroadcastCombatFlowStep = (s: (typeof COMBAT_FLOW_STEPS)[0]) => {
        const text = `Combat Flow Step ${s.step}: ${s.title}\n${s.items.map((it) => `• ${it}`).join('\n')}`;
        broadcastInfo(`Combat Step ${s.step}: ${s.title}`, text);
    };

    const handleBroadcastReactionExample = (ex: ReactionRuleExample) => {
        const text = `Reaction Resolution (${ex.title}):\n• Scenario: ${ex.scenario}\n• Resolution Order:\n${ex.orderSteps.map((s) => `  ${s}`).join('\n')}\n• Note: ${ex.explanation}`;
        broadcastInfo(`Reactions: ${ex.title}`, text);
    };

    const handleBroadcastReactionCoreRules = () => {
        const text = `Reactions & Late Reactions Core Rules:\n• Action Economy Cost: Rolling any Reaction or Late Reaction consumes 1 of your character’s Actions for the Round, bound to the Multiple Action Difficulty chart.\n• 1 Reaction Per Turn Limit: You can only use ONE reaction per turn.\n• Preemption & Lockout: If a higher reaction number is declared (e.g. ⬆️2 Extreme Speed), you cannot respond with a lower reaction number.\n• Cannot React to a Late Reaction: Standard Reactions (⬆️) CANNOT be used against a Late Reaction (⬇️).\n• Can Late React to a Reaction: You CAN use a Late Reaction (⬇️) to answer a standard Reaction (⬆️).\n• No Reaction Without a Reason: You cannot react unless you are being directly targeted by an incoming action (Defensive support moves like Wide Guard / Cover an Ally can protect teammates).`;
        broadcastInfo(`Reaction Rules & Timing`, text);
    };

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        return GM_CHEAT_ITEMS.filter((item) => {
            const matchesTab = activeTab === 'all' || item.category === activeTab;
            if (!matchesTab) return false;
            if (!query) return true;

            const inTitle = item.title.toLowerCase().includes(query);
            const inSummary = item.summary.toLowerCase().includes(query);
            const inBadge = item.badge?.toLowerCase().includes(query);
            const inKeywords = item.keywords.some((k) => k.toLowerCase().includes(query));
            const inDiscord = item.discordMarkdown.toLowerCase().includes(query);

            return inTitle || inSummary || inBadge || inKeywords || inDiscord;
        });
    }, [searchQuery, activeTab]);

    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {
            all: GM_CHEAT_ITEMS.length,
            rules: 0,
            status: 0,
            weather: 0,
            catching: 0,
            training: 0,
            balance: 0,
            types: 0
        };
        GM_CHEAT_ITEMS.forEach((item) => {
            if (counts[item.category] !== undefined) {
                counts[item.category]++;
            }
        });
        return counts;
    }, []);

    const renderCardContent = (itemId: string) => {
        if (itemId === 'type-matchup-chart') {
            return <GmScreenTypeMatrix />;
        }

        if (itemId === 'catching-mechanics') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <GmScreenCatchCalculator />
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Seal Potency</th>
                                    <th>Wild Condition</th>
                                    <th>Bonus Successes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Pokéball</td>
                                    <td>4 dice</td>
                                    <td>Half HP or lower</td>
                                    <td>+1 Success</td>
                                </tr>
                                <tr>
                                    <td>Greatball</td>
                                    <td>6 dice</td>
                                    <td>At 1 HP</td>
                                    <td>+2 Successes</td>
                                </tr>
                                <tr>
                                    <td>Ultraball</td>
                                    <td>8 dice</td>
                                    <td>Status Ailment</td>
                                    <td>+1 Success / ailment</td>
                                </tr>
                                <tr>
                                    <td>Other / Custom Ball</td>
                                    <td>Custom Seal Power</td>
                                    <td>—</td>
                                    <td>—</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        const combatIds = [
            'skills-and-attributes',
            'successes-required',
            'will-points',
            'combat-flow',
            'using-a-move',
            'holding-back-attack',
            'reactions-late-reactions',
            'pain-penalties',
            'lethal-damage'
        ];
        if (combatIds.includes(itemId)) {
            return (
                <GmCombatCards
                    itemId={itemId}
                    onBroadcastWill={handleBroadcastWill}
                    onBroadcastCombatFlowStep={handleBroadcastCombatFlowStep}
                    onBroadcastHoldingBack={handleBroadcastHoldingBack}
                    onBroadcastReactionExample={handleBroadcastReactionExample}
                    onBroadcastReactionCoreRules={handleBroadcastReactionCoreRules}
                />
            );
        }

        const statusIds = [
            'status-effects-all',
            'weather-conditions-all',
            'environmental-hazards-all'
        ];
        if (statusIds.includes(itemId)) {
            return (
                <GmStatusCards
                    itemId={itemId}
                    onBroadcastStatusRules={handleBroadcastStatusRules}
                    onBroadcastStatus={handleBroadcastStatus}
                    onBroadcastWeather={handleBroadcastWeather}
                    onBroadcastHazard={handleBroadcastHazard}
                />
            );
        }

        const referenceIds = [
            'trainer-actions',
            'cover-mechanics',
            'healing-rates',
            'training-points-guide',
            'rank-summary-table',
            'encounter-balancing-chart'
        ];
        if (referenceIds.includes(itemId)) {
            return (
                <GmReferenceCards
                    itemId={itemId}
                    onBroadcastTrainerAction={handleBroadcastTrainerAction}
                    onBroadcastCover={handleBroadcastCover}
                    onBroadcastHealing={handleBroadcastHealing}
                />
            );
        }

        return null;
    };

    return (
        <div className="gm-screen-modal__overlay">
            <div className="gm-screen-modal__content">
                <div className="gm-screen-modal__header">
                    <div className="gm-screen-modal__header-left">
                        <h3 className="gm-screen-modal__title text-title-primary">
                            <ShieldCheck size={22} /> GM Screen & Rules Cheat Sheet
                        </h3>
                    </div>
                    <div className="gm-screen-modal__header-actions">
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
                    <div className="gm-screen-modal__search-row">
                        <div className="gm-screen-modal__search-wrapper">
                            <Search size={16} className="gm-screen-modal__search-icon" />
                            <input
                                type="text"
                                className="gm-screen-modal__search-input text-subtext"
                                placeholder="Search rules, statuses, weather, tables, actions, catching..."
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

                    <div className="gm-screen-modal__tabs">
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
                            className={`gm-screen-modal__tab-btn ${activeTab === 'status' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('status')}
                        >
                            <FlaskConical size={14} /> Statuses ({tabCounts.status})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'weather' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('weather')}
                        >
                            <CloudRain size={14} /> Weather & Hazards ({tabCounts.weather})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'catching' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('catching')}
                        >
                            <Target size={14} /> Catching ({tabCounts.catching})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'training' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('training')}
                        >
                            <Award size={14} /> Training (TP) ({tabCounts.training})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'balance' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('balance')}
                        >
                            <ShieldCheck size={14} /> Ranks & Balance ({tabCounts.balance})
                        </button>
                        <button
                            type="button"
                            className={`gm-screen-modal__tab-btn ${activeTab === 'types' ? 'gm-screen-modal__tab-btn--active' : ''}`}
                            onClick={() => setActiveTab('types')}
                        >
                            <Shield size={14} /> Type Matchups ({tabCounts.types})
                        </button>
                    </div>
                </div>

                <div className="gm-screen-modal__body">
                    {filteredItems.length === 0 ? (
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
                                                <span className="gm-screen-modal__card-badge text-theme-header">{item.badge}</span>
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
                                            {renderCardContent(item.id)}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="gm-screen-modal__footer">
                    <div className="gm-screen-modal__credit">
                        <Heart size={14} color="var(--primary)" />
                        <span>{GM_SCREEN_CREDITS}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
