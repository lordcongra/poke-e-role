import { useState } from 'react';
import {
    Check,
    Copy,
    Link2,
    Megaphone,
    ChevronDown,
    ChevronUp,
    Search,
    Target,
    Swords,
    BookOpen,
    Tag,
    Loader2
} from 'lucide-react';
import type { MoveLookupCardProps } from './moveLookupTypes';
import { formatAccuracy, formatDamage, formatAttributeName } from './moveLookupUtils';

export function MoveLookupCard({
    move: m,
    isExpanded,
    allTypeColors,
    learnedBy,
    copiedDiscord,
    copiedLink,
    onToggleExpand,
    onCopyDiscord,
    onCopyCardLink,
    onBroadcast,
    onSelectPokemon,
    onFilterPokemonByMove,
    isLoadingLearnedBy,
    onLoadLearnedBy
}: MoveLookupCardProps) {
    const [showLearnedBy, setShowLearnedBy] = useState(false);

    const toggleLearnedBy = () => {
        if (!showLearnedBy && onLoadLearnedBy) {
            onLoadLearnedBy();
        }
        setShowLearnedBy((prev) => !prev);
    };

    const accStr = formatAccuracy(m.accuracy1, m.accuracy2);
    const dmgStr = formatDamage(m.damage1, m.damage2, m.power);

    // Extract active attributes
    const activeAttributes = m.attributes
        ? Object.entries(m.attributes)
              .filter(([, val]) => Boolean(val))
              .map(([k, val]) =>
                  typeof val === 'boolean' ? formatAttributeName(k) : `${formatAttributeName(k)}: ${val}`
              )
        : [];

    const powerBadgeLabel =
        m.category === 'Status' || String(m.power) === '0'
            ? 'Support'
            : String(m.power).toLowerCase().includes('var')
              ? 'Variable'
              : `Power ${m.power}`;

    return (
        <div
            id={`move-card-${m.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            className="gm-pokemon-lookup__card gm-move-lookup__card"
        >
            {/* Header */}
            <div className="gm-pokemon-lookup__card-header">
                <div className="gm-pokemon-lookup__card-identity">
                    <span className="gm-pokemon-lookup__card-name">{m.name}</span>
                    {m.isCustom && <span className="gm-pokemon-lookup__custom-tag">Homebrew</span>}

                    <div className="gm-pokemon-lookup__card-types">
                        <span
                            className="gm-pokemon-lookup__type-badge"
                            style={{ backgroundColor: allTypeColors[m.type] || 'var(--primary)' }}
                        >
                            {m.type}
                        </span>
                        <span className="gm-move-lookup__category-badge text-subtext">{m.category}</span>
                        <span className="gm-move-lookup__power-badge text-value-highlight">{powerBadgeLabel}</span>
                    </div>
                </div>

                <div className="gm-pokemon-lookup__card-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onCopyDiscord(m)}
                        title="Copy Discord Markdown summary"
                    >
                        {copiedDiscord ? (
                            <>
                                <Check size={14} color="var(--primary)" /> Copied!
                            </>
                        ) : (
                            <>
                                <Copy size={14} /> Discord
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onCopyCardLink(m.name)}
                        title={`Copy direct link to ${m.name}`}
                    >
                        {copiedLink ? (
                            <>
                                <Check size={14} color="var(--primary)" /> Link Copied!
                            </>
                        ) : (
                            <>
                                <Link2 size={14} /> Link
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--secondary"
                        onClick={() => onBroadcast(m)}
                        title="Broadcast move to Owlbear Rodeo chat"
                    >
                        <Megaphone size={14} /> Broadcast
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark gm-pokemon-lookup__expand-btn"
                        onClick={() => onToggleExpand(m.name)}
                        title={isExpanded ? 'Collapse move details' : 'Expand move details'}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Quick Stat Bar (Accuracy, Damage, Target) */}
            <div className="gm-move-lookup__stats-bar">
                <div className="gm-move-lookup__stat-item">
                    <span className="gm-move-lookup__stat-label text-label">
                        <Target size={13} /> Accuracy:
                    </span>
                    <span className="gm-move-lookup__stat-value text-value-highlight">{accStr}</span>
                </div>
                <div className="gm-move-lookup__stat-item">
                    <span className="gm-move-lookup__stat-label text-label">
                        <Swords size={13} /> Damage:
                    </span>
                    <span
                        className="gm-move-lookup__stat-value text-value-highlight"
                        style={{ color: 'var(--primary)' }}
                    >
                        {dmgStr}
                    </span>
                </div>
                {m.target && (
                    <div className="gm-move-lookup__stat-item">
                        <span className="gm-move-lookup__stat-label text-label">Target:</span>
                        <span className="gm-move-lookup__stat-value text-subtext">{m.target}</span>
                    </div>
                )}
            </div>

            {/* Attributes Tag Badges */}
            {activeAttributes.length > 0 && (
                <div className="gm-move-lookup__attributes-row">
                    <span className="gm-move-lookup__attr-header text-label">
                        <Tag size={12} /> Tags:
                    </span>
                    {activeAttributes.map((attr) => (
                        <span key={`attr-${attr}`} className="gm-move-lookup__attribute-pill text-subtext">
                            {attr}
                        </span>
                    ))}
                </div>
            )}

            {/* Effect Box */}
            {m.effect && (
                <div className="gm-move-lookup__effect-box">
                    <strong className="text-label" style={{ color: 'var(--text-main)', marginRight: 6 }}>
                        Effect:
                    </strong>
                    <span className="text-subtext">{m.effect}</span>
                </div>
            )}

            {/* Description Flavor Box */}
            {m.description && <div className="gm-move-lookup__desc-box text-subtext">"{m.description}"</div>}

            {/* Expanded Drawer: Pokémon Learnset & Cross-Navigation */}
            {isExpanded && (
                <div className="gm-pokemon-lookup__drawer gm-move-lookup__drawer">
                    <div className="gm-move-lookup__learned-header" onClick={toggleLearnedBy}>
                        <div className="flex-layout--row-center" style={{ gap: 8 }}>
                            <BookOpen size={14} color="var(--primary)" />
                            <span className="text-label">
                                {isLoadingLearnedBy ? 'Loading Pokémon...' : `Learned by ${learnedBy.length} Pokémon`}
                            </span>
                            {onFilterPokemonByMove && (
                                <button
                                    type="button"
                                    className="action-button action-button--dark"
                                    style={{ fontSize: '0.72rem', padding: '2px 8px', gap: 4 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFilterPokemonByMove(m.name);
                                    }}
                                    title={`Filter Pokémon Lookup for species that learn ${m.name}`}
                                >
                                    <Search size={11} /> Filter in Pokédex
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            className="gm-pokemon-lookup__icon-btn"
                            title={showLearnedBy ? 'Hide Pokémon' : 'Show Pokémon'}
                        >
                            {showLearnedBy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    </div>

                    {showLearnedBy && (
                        <div className="gm-move-lookup__learned-content">
                            {isLoadingLearnedBy ? (
                                <div className="flex-layout--row-center" style={{ gap: 6, padding: '8px 0' }}>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span className="text-subtext">Loading Pokémon learnset data...</span>
                                </div>
                            ) : learnedBy.length === 0 ? (
                                <p className="text-subtext" style={{ fontStyle: 'italic', margin: 0 }}>
                                    No standard Pokédex species learn this move directly (TM, Tutor, or Homebrew).
                                </p>
                            ) : (
                                <div className="gm-move-lookup__learned-pills-list">
                                    {learnedBy.map((p) => (
                                        <button
                                            key={`learn-${p.name}-${p.rank}`}
                                            type="button"
                                            className="gm-pokemon-lookup__move-pill gm-move-lookup__poke-pill"
                                            onClick={() => onSelectPokemon && onSelectPokemon(p.name)}
                                            title={`View ${p.name} in Pokémon Lookup`}
                                        >
                                            <span className="gm-move-lookup__poke-pill-name">{p.name}</span>
                                            <span className="gm-move-lookup__poke-pill-rank text-subtext">
                                                ({p.rank})
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
