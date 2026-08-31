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
    Link2,
    Sparkles,
    Layers,
    Pill
} from 'lucide-react';
import {
    GM_CHEAT_ITEMS,
    GM_SCREEN_CREDITS,
    DIFFICULTY_TABLE,
    WILL_SPENDING,
    COMBAT_FLOW_STEPS,
    MOVE_RESOLUTION_STEPS,
    HOLDING_BACK_OPTIONS,
    REACTION_RULES_EXAMPLES,
    REACTION_CORE_RULES,
    STATUS_CATEGORIES_DATA,
    STATUS_RULES_INFO,
    TRAINER_ACTIONS_TABLE,
    COVER_TABLE,
    HEALING_TABLE,
    RANK_SUMMARY_TABLE,
    STATUS_EFFECTS_DATA,
    WEATHER_CONDITIONS_DATA,
    ENVIRONMENTAL_HAZARDS_DATA,
    BATTLE_TP_TABLE,
    RANK_UP_TP_TABLE,
    LEARN_MOVES_TP_TABLE,
    ENCOUNTER_BALANCE_TABLE,
    type GmCheatItem,
    type StatusEffectData,
    type HoldingBackOption,
    type ReactionRuleExample
} from '../../data/gmScreenData';
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
        const text = `Reactions & Late Reactions Core Rules:\n${REACTION_CORE_RULES.map((r) => `• ${r.title}: ${r.desc}`).join('\n')}`;
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
        switch (itemId) {
            case 'skills-and-attributes':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Attributes</th>
                                    <th>Fight</th>
                                    <th>Survival</th>
                                    <th>Social</th>
                                    <th>Knowledge</th>
                                    <th>Social Attributes</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <strong>Strength</strong>
                                    </td>
                                    <td>Brawl</td>
                                    <td>Alert</td>
                                    <td>Charm</td>
                                    <td>Crafts</td>
                                    <td>Tough</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Dexterity</strong>
                                    </td>
                                    <td>Throw (Human*)</td>
                                    <td>Athletic</td>
                                    <td>Empathy</td>
                                    <td>Lore</td>
                                    <td>Cool</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Vitality</strong>
                                    </td>
                                    <td>Weapons (Human*)</td>
                                    <td>Nature</td>
                                    <td>Etiquette</td>
                                    <td>Medicine</td>
                                    <td>Clever</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Special</strong>
                                    </td>
                                    <td>Evasion</td>
                                    <td>Stealth</td>
                                    <td>Intimidate</td>
                                    <td>Science</td>
                                    <td>Beauty</td>
                                </tr>
                                <tr>
                                    <td>
                                        <strong>Insight</strong>
                                    </td>
                                    <td>Clash (Pokémon^)</td>
                                    <td>—</td>
                                    <td>Perform</td>
                                    <td>—</td>
                                    <td>Cute</td>
                                </tr>
                                <tr>
                                    <td>—</td>
                                    <td>Channel (Pokémon^)</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                    <td>—</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-subtext" style={{ marginTop: '6px', marginBottom: 0 }}>
                            * Typically a human skill &nbsp;|&nbsp; ^ Typically a Pokémon skill
                        </p>
                    </div>
                );

            case 'successes-required':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Action This Round</th>
                                    <th>Required Successes</th>
                                    <th>Difficulty Level</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DIFFICULTY_TABLE.map((d) => (
                                    <tr key={d.action}>
                                        <td>
                                            <strong>{d.action}</strong>
                                        </td>
                                        <td className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                            {d.successes}
                                        </td>
                                        <td>{d.difficulty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'will-points':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Spending Option</th>
                                        <th>Cost</th>
                                        <th>Mechanical Effect</th>
                                        <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {WILL_SPENDING.map((w) => (
                                        <tr key={w.name}>
                                            <td>
                                                <strong>{w.name}</strong>
                                            </td>
                                            <td>{w.cost}</td>
                                            <td>{w.effect}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                    onClick={() => handleBroadcastWill(w)}
                                                    title={`Broadcast ${w.name} to chat/roll log`}
                                                    aria-label={`Broadcast ${w.name}`}
                                                >
                                                    <Megaphone size={12} /> Broadcast
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div
                            style={{
                                padding: '8px 12px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--primary)',
                                fontSize: '0.8rem',
                                lineHeight: '1.4'
                            }}
                        >
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Important Rules:</span>
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                                <li>
                                    In a single round, you may only use <em>Take Your Chances</em> OR{' '}
                                    <em>Pushing Fate</em>—not both!
                                </li>
                                <li>
                                    Spending all your Will Points in a scene causes the character to faint at the end of
                                    the scene.
                                </li>
                            </ul>
                        </div>
                    </div>
                );

            case 'combat-flow':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {COMBAT_FLOW_STEPS.map((s) => (
                            <div
                                key={s.step}
                                style={{
                                    fontSize: '0.85rem',
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--panel-alt)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}
                                >
                                    <strong style={{ color: 'var(--primary)' }}>
                                        {s.step}. {s.title}
                                    </strong>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => handleBroadcastCombatFlowStep(s)}
                                        title={`Broadcast Step ${s.step} to chat/roll log`}
                                        aria-label={`Broadcast Step ${s.step}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>
                                <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px', color: 'var(--text-main)' }}>
                                    {s.items.map((it, idx) => (
                                        <li key={idx}>{it}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                );

            case 'using-a-move':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {MOVE_RESOLUTION_STEPS.map((s) => (
                            <div
                                key={s.step}
                                style={{
                                    fontSize: '0.85rem',
                                    padding: '8px 10px',
                                    backgroundColor: 'var(--panel-alt)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
                                    Step {s.step}: {s.title}
                                </strong>
                                <p
                                    style={{
                                        margin: '0',
                                        color: 'var(--text-main)',
                                        lineHeight: '1.45',
                                        whiteSpace: 'pre-line'
                                    }}
                                >
                                    {s.desc}
                                </p>
                            </div>
                        ))}

                        <div
                            style={{
                                padding: '10px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                fontSize: '0.82rem',
                                lineHeight: '1.4'
                            }}
                        >
                            <span
                                style={{
                                    color: 'var(--primary)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Sparkles size={15} /> Key Move & Damage Resolution Reminders
                            </span>
                            <ul style={{ margin: '0', paddingLeft: '18px', color: 'var(--text-main)' }}>
                                <li>
                                    <strong>0 Successes Minimum Damage:</strong> Even if you roll <strong>0 successes</strong> on your damage dice pool, a successful hit still deals <strong>1 base damage</strong> (unless the foe has Resistance or Immunity).
                                </li>
                                <li>
                                    <strong>1+ Success Requirement:</strong> You <strong>must</strong> score at least <strong>1 success</strong> on the damage roll for any <strong>Added Effects</strong> on the target to trigger, or for <strong>Super Effective (+1) / Extremely Effective (+2)</strong> weakness damage bonuses to apply.
                                </li>
                                <li>
                                    <strong>Resistance:</strong> Each Resistance subtracts 1 flat damage (reducing 1 base damage down to 0).
                                </li>
                            </ul>
                        </div>
                    </div>
                );

            case 'holding-back-attack':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        <div
                            style={{
                                padding: '10px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--border)',
                                lineHeight: '1.45'
                            }}
                        >
                            <p style={{ margin: '0 0 6px 0', color: 'var(--text-main)', fontStyle: 'italic' }}>
                                “Sometimes it will be more convenient to contain the full force of your Pokémon attacks.”
                            </p>
                            <p style={{ margin: '0', color: 'var(--text-muted)' }}>
                                Give the command to <strong>“Hold Back!”</strong>, <strong>“Restrain yourself!”</strong>, or <strong>“Don’t use full force!”</strong> in order to choose one or a combination of the options below:
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {HOLDING_BACK_OPTIONS.map((opt) => (
                                <div
                                    key={opt.id}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: 'var(--panel-alt)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '3px' }}>
                                            • {opt.title}
                                        </strong>
                                        <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                                            {opt.desc}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => handleBroadcastHoldingBack(opt)}
                                        title={`Broadcast ${opt.title} to chat/roll log`}
                                        aria-label={`Broadcast ${opt.title}`}
                                        style={{ flexShrink: 0, marginTop: '2px' }}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: 'color-mix(in srgb, #F48FB1 12%, var(--panel-bg))',
                                border: '1px dashed #F48FB1',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                                lineHeight: '1.35'
                            }}
                        >
                            <strong style={{ color: '#E91E63' }}>💕 In Love Status Condition (Storyteller Discretion):</strong> When a Pokémon is <strong>In Love</strong>, they are trying to earn their crush’s favor. At the Storyteller’s discretion, this can mean dealing <strong>Half Damage</strong> or enforcing <strong>all Holding Back restrictions</strong> (forfeiting crits & added effects—poisoning your crush or landing crits is a massive red flag!). Pokémon can bypass this by succeeding on a Loyalty or Insight roll (3+ successes) when attacking.
                        </div>
                    </div>
                );

            case 'reactions-late-reactions':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                        {/* Comparison Overview Banner */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: '10px'
                            }}
                        >
                            {/* Reactions Box */}
                            <div
                                style={{
                                    padding: '12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--panel-alt)',
                                    border: '1px solid #00ACC1',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                        style={{
                                            backgroundColor: '#00ACC1',
                                            color: '#FFFFFF',
                                            fontWeight: 'bold',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.78rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        ⬆️ Reaction [1..N]
                                    </span>
                                    <strong style={{ color: '#00ACC1' }}>Resolves BEFORE Action</strong>
                                </div>
                                <p style={{ margin: '0', color: 'var(--text-main)', lineHeight: '1.4', fontSize: '0.82rem' }}>
                                    Almost instantaneous movements used when it is not your turn yet. Higher Reaction numbers resolve <strong>FIRST</strong>.
                                </p>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                    <em>Examples: Quick Attack (⬆️1), Extreme Speed (⬆️2), Sucker Punch (⬆️1).</em>
                                </div>
                            </div>

                            {/* Late Reactions Box */}
                            <div
                                style={{
                                    padding: '12px',
                                    borderRadius: '6px',
                                    backgroundColor: 'var(--panel-alt)',
                                    border: '1px solid #7E57C2',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span
                                        style={{
                                            backgroundColor: '#7E57C2',
                                            color: '#FFFFFF',
                                            fontWeight: 'bold',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.78rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        ⬇️ Late Reaction [1..N]
                                    </span>
                                    <strong style={{ color: '#7E57C2' }}>Resolves AFTER Action</strong>
                                </div>
                                <p style={{ margin: '0', color: 'var(--text-main)', lineHeight: '1.4', fontSize: '0.82rem' }}>
                                    Delayed counter-attacks & traps that trigger after taking the hit. Higher Late Reaction numbers resolve <strong>LATER</strong> (Lower numbers resolve first!).
                                </p>
                                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                    <em>Examples: Avalanche (⬇️4), Dragon Tail (⬇️6), Counter (⬇️5), Revenge (⬇️4).</em>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Timing Rules & Examples */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                                Resolution Chains & Battle Scenarios:
                            </strong>

                            {REACTION_RULES_EXAMPLES.map((ex) => (
                                <div
                                    key={ex.id}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        backgroundColor: 'var(--panel-alt)',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                                            {ex.title}
                                        </strong>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() => handleBroadcastReactionExample(ex)}
                                            title="Broadcast scenario to chat/roll log"
                                            aria-label={`Broadcast ${ex.title}`}
                                        >
                                            <Megaphone size={12} /> Broadcast
                                        </button>
                                    </div>

                                    <div style={{ color: 'var(--text-main)', fontSize: '0.8rem', fontStyle: 'italic', lineHeight: '1.35' }}>
                                        “{ex.scenario}”
                                    </div>

                                    {/* Resolution Flow Badges */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            flexWrap: 'wrap',
                                            padding: '6px 10px',
                                            backgroundColor: 'var(--panel-bg)',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border)'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                            Order:
                                        </span>
                                        {ex.orderSteps.map((step, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    fontSize: '0.76rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor:
                                                        idx === 0
                                                            ? 'color-mix(in srgb, var(--primary) 20%, var(--panel-alt))'
                                                            : 'var(--panel-alt)',
                                                    border: idx === 0 ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                    color: idx === 0 ? 'var(--primary)' : 'var(--text-main)',
                                                    fontWeight: idx === 0 ? 'bold' : 'normal'
                                                }}
                                            >
                                                {step}
                                            </span>
                                        ))}
                                    </div>

                                    <p style={{ margin: '0', fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                        {ex.explanation}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Core Rules Checklist */}
                        <div
                            style={{
                                padding: '12px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                                <strong style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                                    Key Tactical Rules & Limitations
                                </strong>
                                <button
                                    type="button"
                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                    onClick={handleBroadcastReactionCoreRules}
                                    title="Broadcast Core Reaction Rules to chat/roll log"
                                    aria-label="Broadcast Core Reaction Rules"
                                >
                                    <Megaphone size={12} /> Broadcast Rules
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' }}>
                                {REACTION_CORE_RULES.map((r, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            padding: '8px 10px',
                                            backgroundColor: 'var(--panel-bg)',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '3px'
                                        }}
                                    >
                                        <strong style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>
                                            • {r.title}
                                        </strong>
                                        <span style={{ fontSize: '0.76rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                            {r.desc}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'pain-penalties':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                        <div>
                            <strong style={{ color: 'var(--primary)' }}>Pain Penalty Thresholds:</strong>
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                                <li>
                                    <strong>&le; Half Total HP:</strong> Suffer 1st Pain Penalty (-1 success on all
                                    Action Rolls).
                                </li>
                                <li>
                                    <strong>1 HP:</strong> Suffer 2nd Pain Penalty (-1 additional success on all Action
                                    Rolls, total -2).
                                </li>
                                <li>
                                    <strong>Power Through the Pain:</strong> Pay <strong>1 Will Point</strong> to ignore
                                    one Pain Penalty for the rest of the scene.
                                </li>
                            </ul>
                        </div>
                    </div>
                );

            case 'lethal-damage':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        <div
                            style={{
                                padding: '10px 12px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--panel-alt)',
                                border: '1px solid var(--semantic-danger)',
                                lineHeight: '1.45'
                            }}
                        >
                            <span
                                style={{
                                    color: 'var(--semantic-danger)',
                                    fontWeight: 'bold',
                                    display: 'block',
                                    marginBottom: '4px'
                                }}
                            >
                                Lethal Damage Rules (Optional):
                            </span>
                            <ul style={{ margin: '0', paddingLeft: '20px' }}>
                                <li>
                                    <strong>Trigger:</strong> If you or a Pokémon fall unconscious and keep receiving
                                    damage, that damage becomes <strong>Lethal Damage</strong>. Some Pokémon can also
                                    learn devastating moves that deal Lethal Damage directly when used with lethal
                                    intent.
                                </li>
                                <li>
                                    <strong>Risk of Death:</strong> If you suffer Lethal Damage equal to your{' '}
                                    <strong>Total HP</strong>, your character is at risk of dying.{' '}
                                    <strong>1 more Damage and the character dies.</strong>
                                </li>
                                <li>
                                    <strong>Unattended Worsening:</strong> If a character suffers 1+ lethal damage and
                                    is left unattended, they will suffer{' '}
                                    <strong>another lethal damage every hour</strong> until their body can’t hold any
                                    longer.
                                </li>
                                <li>
                                    <strong>Twice as Costly to Heal:</strong>
                                    <ul style={{ margin: '2px 0 0 0', paddingLeft: '16px' }}>
                                        <li>
                                             <strong>Potions:</strong> Requires <strong>2 Potion Units</strong> to heal 1
                                            point of Lethal Damage (instead of 1).
                                        </li>
                                        <li>
                                            <strong>Natural Recovery:</strong> If stabilized or with medical care, heals{' '}
                                            <strong>1 lethal damage every 16 hours</strong> (instead of 8 hours).
                                        </li>
                                    </ul>
                                </li>
                                <li>
                                    <strong>Setting Note:</strong> Lethal Damage is <strong>banned</strong> from
                                    official League matches. However, ruthless Trainers or wild Pokémon will give no
                                    mercy.
                                </li>
                            </ul>
                        </div>
                    </div>
                );

            case 'trainer-actions':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Trainer Action</th>
                                    <th>In a Trainer Area</th>
                                    <th>In the Fray</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {TRAINER_ACTIONS_TABLE.map((t) => (
                                    <tr key={t.action}>
                                        <td>
                                            <strong>{t.action}</strong>
                                        </td>
                                        <td>{t.trainerArea}</td>
                                        <td>{t.inFray}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => handleBroadcastTrainerAction(t)}
                                                title={`Broadcast ${t.action} to chat/roll log`}
                                                aria-label={`Broadcast ${t.action}`}
                                            >
                                                <Megaphone size={12} /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'cover-mechanics':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Body Coverage</th>
                                    <th>Bonus Def / Sp.Def vs Attacks</th>
                                    <th>Takes Added Effects</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COVER_TABLE.map((c) => (
                                    <tr key={c.coverage}>
                                        <td>
                                            <strong>{c.coverage}</strong>
                                        </td>
                                        <td className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                            {c.defBonus}
                                        </td>
                                        <td>{c.addedEffects}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => handleBroadcastCover(c)}
                                                title={`Broadcast ${c.coverage} to chat/roll log`}
                                                aria-label={`Broadcast ${c.coverage}`}
                                            >
                                                <Megaphone size={12} /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'healing-rates':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Damage Type</th>
                                    <th>Natural Healing Over Time</th>
                                    <th>Potion Units Required</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {HEALING_TABLE.map((h) => (
                                    <tr key={h.damageType}>
                                        <td>
                                            <strong>{h.damageType}</strong>
                                        </td>
                                        <td>{h.natural}</td>
                                        <td>{h.potion}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => handleBroadcastHealing(h)}
                                                title={`Broadcast ${h.damageType} to chat/roll log`}
                                                aria-label={`Broadcast ${h.damageType}`}
                                            >
                                                <Megaphone size={12} /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'status-effects-all':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Status Categories & Rules Banner */}
                        <div className="status-rules-box">
                            <div className="status-rules-box__header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Layers size={16} color="var(--primary)" />
                                    <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>
                                        Status Ailments & Conditions Categories
                                    </strong>
                                </div>
                                <button
                                    type="button"
                                    className="action-button action-button--dark gm-card-item-broadcast-btn"
                                    onClick={handleBroadcastStatusRules}
                                    title="Broadcast Status Categories & Rules to chat/roll log"
                                    aria-label="Broadcast Status Categories & Rules"
                                >
                                    <Megaphone size={12} /> Broadcast Rules
                                </button>
                            </div>

                            <div className="status-categories-grid">
                                {STATUS_CATEGORIES_DATA.map((cat) => (
                                    <div key={cat.category} className="status-category-card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <span
                                                className={`status-category-pill status-category-pill--${cat.category.toLowerCase()}`}
                                                style={{ color: cat.color }}
                                            >
                                                {cat.title}
                                            </span>
                                        </div>
                                        <p className="text-subtext" style={{ margin: '0 0 4px 0', fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.35' }}>
                                            {cat.desc}
                                        </p>
                                        <span className="text-subtext" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            <em>Examples: {cat.examples}</em>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="status-rules-box__notes">
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                    <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>
                                        <strong>Status Stacking:</strong> {STATUS_RULES_INFO.stacking}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                    <Pill size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span>
                                        <strong>Curing Multiple Conditions:</strong> {STATUS_RULES_INFO.curing}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Individual Status Grid */}
                        <div className="status-grid">
                            {STATUS_EFFECTS_DATA.map((s) => (
                                <div key={s.id} className="status-card">
                                    <div className="status-card__header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                                            <span
                                                className="status-card__badge"
                                                style={{ backgroundColor: s.color, color: s.textColor }}
                                            >
                                                {s.name}
                                            </span>
                                            <span
                                                className={`status-category-pill status-category-pill--${s.categoryType.toLowerCase()}`}
                                                style={{ fontSize: '0.68rem', padding: '1px 6px' }}
                                                title={`Category: ${s.categoryType}`}
                                            >
                                                {s.categoryType}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="action-button action-button--dark gm-card-item-broadcast-btn"
                                            onClick={() => handleBroadcastStatus(s)}
                                            title={`Broadcast ${s.name} to chat/roll log`}
                                            aria-label={`Broadcast ${s.name}`}
                                        >
                                            <Megaphone size={12} /> Broadcast
                                        </button>
                                    </div>
                                    <div className="status-card__text">
                                        <strong>Effect:</strong> {s.effect}
                                    </div>
                                    {s.id === 'status-in-love' && (
                                        <div
                                            style={{
                                                padding: '6px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: 'color-mix(in srgb, #F48FB1 15%, var(--panel-bg))',
                                                border: '1px dashed #F48FB1',
                                                fontSize: '0.74rem',
                                                color: 'var(--text-main)',
                                                lineHeight: '1.35',
                                                marginTop: '2px'
                                            }}
                                        >
                                            <strong>💕 Storyteller Note:</strong> Being <em>In Love</em> means trying to earn their crush’s favor. At the GM’s discretion, they deal <strong>Half Damage</strong> or apply <strong>all Holding Back options</strong> (no crits, no poison/added effects—poisoning your crush is a massive red flag!). Refer to the <strong>“Holding Back an Attack”</strong> section for details.
                                        </div>
                                    )}
                                    <div className="status-card__text">
                                        <strong>Resist:</strong> {s.resist}
                                    </div>
                                    <div className="status-card__text" style={{ color: 'var(--text-muted)' }}>
                                        <strong>Duration:</strong> {s.duration}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'weather-conditions-all':
                return (
                    <div className="weather-grid">
                        {WEATHER_CONDITIONS_DATA.map((w) => (
                            <div key={w.id} className="weather-card">
                                <div className="weather-card__header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                                        <span className="weather-card__title" style={{ color: w.color }}>
                                            {w.name}
                                        </span>
                                        <span className="gm-screen-modal__card-badge">{w.badge}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => handleBroadcastWeather(w)}
                                        title={`Broadcast ${w.name} Weather to chat/roll log`}
                                        aria-label={`Broadcast ${w.name}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>
                                <ul className="weather-card__list">
                                    {w.effects.map((e, idx) => (
                                        <li key={idx}>{e}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                );

            case 'environmental-hazards-all':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Hazard / Condition</th>
                                    <th>Battlefield Effect</th>
                                    <th style={{ width: '90px', textAlign: 'center' }}>Send</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ENVIRONMENTAL_HAZARDS_DATA.map((h) => (
                                    <tr key={h.id}>
                                        <td>
                                            <strong>{h.name}</strong>
                                        </td>
                                        <td>{h.effect}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark gm-card-item-broadcast-btn"
                                                onClick={() => handleBroadcastHazard(h)}
                                                title={`Broadcast ${h.name} to chat/roll log`}
                                                aria-label={`Broadcast ${h.name}`}
                                            >
                                                <Megaphone size={12} /> Broadcast
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'catching-mechanics':
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

            case 'training-points-guide':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Circumstance After Battle</th>
                                        <th>TP Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {BATTLE_TP_TABLE.map((b) => (
                                        <tr key={b.circumstance}>
                                            <td>{b.circumstance}</td>
                                            <td className="text-value-highlight" style={{ color: 'var(--primary)' }}>
                                                {b.tp}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>TP to Next Rank</th>
                                        <th>Retraining Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {RANK_UP_TP_TABLE.map((r) => (
                                        <tr key={r.rank}>
                                            <td>
                                                <strong>{r.rank}</strong>
                                            </td>
                                            <td>{r.tpNextRank}</td>
                                            <td>{r.retraining}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="gm-table-wrapper">
                            <table className="gm-table">
                                <thead>
                                    <tr>
                                        <th>Pokémon Stage</th>
                                        <th>Current Rank Move</th>
                                        <th>Prior Rank Move</th>
                                        <th>Pre-Evo Move</th>
                                        <th>TM</th>
                                        <th>Overrank Move</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LEARN_MOVES_TP_TABLE.map((l) => (
                                        <tr key={l.stage}>
                                            <td>
                                                <strong>{l.stage}</strong>
                                            </td>
                                            <td>{l.currentRank}</td>
                                            <td>{l.priorRank}</td>
                                            <td>{l.preEvo}</td>
                                            <td>{l.tm}</td>
                                            <td>{l.overrank}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            case 'rank-summary-table':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Max Targets</th>
                                    <th>Skill Max</th>
                                    <th>Attribute Points</th>
                                    <th>Skill Points</th>
                                    <th>All Foes Target Max</th>
                                </tr>
                            </thead>
                            <tbody>
                                {RANK_SUMMARY_TABLE.map((r) => (
                                    <tr key={r.rank}>
                                        <td>
                                            <strong>{r.rank}</strong>
                                        </td>
                                        <td>{r.maxTargets}</td>
                                        <td>{r.skillMax}</td>
                                        <td>{r.attrPoints}</td>
                                        <td>{r.skillPoints}</td>
                                        <td>{r.allFoesMax}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            case 'encounter-balancing-chart':
                return (
                    <div className="gm-table-wrapper">
                        <table className="gm-table">
                            <thead>
                                <tr>
                                    <th>Foe Receives Damage</th>
                                    <th>Lower Rank</th>
                                    <th>Same Rank</th>
                                    <th>One Rank Higher</th>
                                    <th>Two + Ranks Higher</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ENCOUNTER_BALANCE_TABLE.map((e) => {
                                    const renderDiff = (diff: string) => {
                                        const slug = diff.toLowerCase().replace(/\+/g, '').replace(/\s+/g, '-');
                                        return <span className={`diff-pill diff-pill--${slug}`}>{diff}</span>;
                                    };
                                    return (
                                        <tr key={e.effectiveness}>
                                            <td>
                                                <strong>{e.effectiveness}</strong>
                                            </td>
                                            <td>{renderDiff(e.lower)}</td>
                                            <td>{renderDiff(e.same)}</td>
                                            <td>{renderDiff(e.oneHigher)}</td>
                                            <td>{renderDiff(e.twoHigher)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );

            case 'type-matchup-chart':
                return <GmScreenTypeMatrix />;

            default:
                return null;
        }
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
                                                <span className="gm-screen-modal__card-badge">{item.badge}</span>
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
