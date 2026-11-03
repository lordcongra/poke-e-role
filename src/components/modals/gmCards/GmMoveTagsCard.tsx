import React, { useState, useMemo } from 'react';
import {
    Megaphone,
    Search,
    X,
    BatteryCharging,
    Flame,
    RefreshCw,
    Star,
    Ghost,
    ShieldAlert,
    Ruler,
    Sparkles,
    Music,
    ShieldCheck,
    Zap,
    ArrowLeftRight,
    Shield,
    Heart,
    AlertCircle,
    Ban,
    Clock,
    Target
} from 'lucide-react';
import {
    MOVE_TAGS_DATA,
    formatMoveTagBroadcast,
    type MoveTagEntry
} from '../../../data/gmScreenData';
import { broadcastInfo } from '../../../utils/combat/diceRoller';

interface GmMoveTagsCardProps {
    onBroadcastTag?: (tag: MoveTagEntry) => void;
}

type CategoryFilter = 'all' | 'action-economy' | 'combat-damage' | 'defensive-field' | 'archetypes' | 'durations';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'action-economy', label: 'Action Economy' },
    { key: 'combat-damage', label: 'Combat & Damage' },
    { key: 'defensive-field', label: 'Defensive & Field' },
    { key: 'archetypes', label: 'Archetypes' },
    { key: 'durations', label: 'Durations' }
];

function getBadgeIcon(iconName: string, size = 18, color = 'var(--primary)') {
    switch (iconName) {
        case 'BatteryCharging':
        case 'BatteryWarning':
            return <BatteryCharging size={size} color={color} />;
        case 'Flame':
        case 'Angry':
            return <Flame size={size} color={color} />;
        case 'RefreshCw':
        case 'Disc':
            return <RefreshCw size={size} color={color} />;
        case 'Star':
            return <Star size={size} color={color} />;
        case 'Ghost':
        case 'EyeOff':
            return <Ghost size={size} color={color} />;
        case 'ShieldAlert':
            return <ShieldAlert size={size} color={color} />;
        case 'Ruler':
            return <Ruler size={size} color={color} />;
        case 'Sparkles':
            return <Sparkles size={size} color={color} />;
        case 'Music':
            return <Music size={size} color={color} />;
        case 'ShieldCheck':
            return <ShieldCheck size={size} color={color} />;
        case 'Zap':
            return <Zap size={size} color={color} />;
        case 'ArrowLeftRight':
            return <ArrowLeftRight size={size} color={color} />;
        case 'Shield':
            return <Shield size={size} color={color} />;
        case 'Heart':
            return <Heart size={size} color={color} />;
        case 'AlertCircle':
            return <AlertCircle size={size} color={color} />;
        case 'Ban':
            return <Ban size={size} color={color} />;
        case 'Clock':
            return <Clock size={size} color={color} />;
        case 'Target':
            return <Target size={size} color={color} />;
        default:
            return <Sparkles size={size} color={color} />;
    }
}

export const GmMoveTagsCard: React.FC<GmMoveTagsCardProps> = ({ onBroadcastTag }) => {
    const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const handleBroadcast = (tag: MoveTagEntry) => {
        if (onBroadcastTag) {
            onBroadcastTag(tag);
        } else {
            broadcastInfo(`GM Screen: ${tag.name}`, formatMoveTagBroadcast(tag));
        }
    };

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: MOVE_TAGS_DATA.length };
        for (const tag of MOVE_TAGS_DATA) {
            counts[tag.category] = (counts[tag.category] || 0) + 1;
        }
        return counts;
    }, []);

    const filteredTags = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return MOVE_TAGS_DATA.filter((tag) => {
            const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
            if (!matchesCategory) return false;

            if (!query) return true;

            const inName = tag.name.toLowerCase().includes(query);
            const inSummary = tag.summary.toLowerCase().includes(query);
            const inRules = tag.rules.some((r) => r.toLowerCase().includes(query));
            const inCatLabel = tag.categoryLabel.toLowerCase().includes(query);

            return inName || inSummary || inRules || inCatLabel;
        });
    }, [selectedCategory, searchQuery]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Top Toolbar: Search + Category Filter Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Search
                        size={15}
                        style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }}
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search move tags, rules, mechanics..."
                        style={{
                            width: '100%',
                            padding: '7px 32px 7px 32px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px'
                            }}
                            title="Clear search"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div
                    style={{
                        display: 'flex',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '2px',
                        scrollbarWidth: 'thin'
                    }}
                >
                    {CATEGORIES.map((cat) => {
                        const count = categoryCounts[cat.key] ?? 0;
                        const isActive = selectedCategory === cat.key;
                        return (
                            <button
                                key={cat.key}
                                type="button"
                                onClick={() => setSelectedCategory(cat.key)}
                                style={{
                                    backgroundColor: isActive ? 'var(--primary)' : 'var(--panel-alt)',
                                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                                    border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                                    borderRadius: '20px',
                                    padding: '4px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span>{cat.label}</span>
                                <span
                                    style={{
                                        fontSize: '0.7rem',
                                        opacity: isActive ? 0.9 : 0.6,
                                        padding: '0 4px',
                                        borderRadius: '10px',
                                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--row-even)'
                                    }}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Results count banner if filtering */}
            {(selectedCategory !== 'all' || searchQuery.trim() !== '') && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-sub)', padding: '0 2px' }}>
                    Showing {filteredTags.length} of {MOVE_TAGS_DATA.length} Move Tags
                </div>
            )}

            {/* Tags List */}
            {filteredTags.length === 0 ? (
                <div
                    style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--panel-alt)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        fontSize: '0.85rem'
                    }}
                >
                    No move tags match your filter criteria.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredTags.map((tag) => {
                        const tagColor = tag.badgeColor || 'var(--primary)';
                        return (
                            <div
                                key={tag.id}
                                style={{
                                    padding: '12px 14px',
                                    backgroundColor: 'var(--panel-alt)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}
                            >
                                {/* Tag Header */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {getBadgeIcon(tag.badgeIcon, 18, tagColor)}
                                        <strong style={{ color: tagColor, fontSize: '0.96rem' }}>
                                            {tag.name}
                                        </strong>
                                        <span
                                            style={{
                                                fontSize: '0.72rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                backgroundColor: 'var(--row-even)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-sub)',
                                                fontWeight: 600
                                            }}
                                        >
                                            {tag.categoryLabel}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="action-button action-button--dark gm-card-item-broadcast-btn"
                                        onClick={() => handleBroadcast(tag)}
                                        title={`Broadcast ${tag.name}`}
                                    >
                                        <Megaphone size={12} /> Broadcast
                                    </button>
                                </div>

                                {/* Summary */}
                                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-sub)', lineHeight: '1.4' }}>
                                    {tag.summary}
                                </p>

                                {/* Rules Checklist */}
                                <ul
                                    style={{
                                        margin: '2px 0 0 0',
                                        paddingLeft: '20px',
                                        fontSize: '0.82rem',
                                        color: 'var(--text-main)',
                                        lineHeight: '1.45',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}
                                >
                                    {tag.rules.map((rule, idx) => (
                                        <li key={idx}>{rule}</li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
