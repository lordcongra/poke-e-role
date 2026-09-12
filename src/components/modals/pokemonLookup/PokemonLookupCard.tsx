import { Check, Copy, Link2, Megaphone, ChevronDown, ChevronUp, Sparkles, Zap, Loader2 } from 'lucide-react';
import type { PokemonLookupEntry, PokemonApiResponse } from '../../../utils/apiTypes';
import type { CustomPokemon } from '../../../store/storeTypes';
import { groupMovesByRank } from './pokemonLookupUtils';

export interface PokemonLookupCardProps {
    pokemon: PokemonLookupEntry;
    isExpanded: boolean;
    fullData: PokemonApiResponse | CustomPokemon | undefined;
    isLoadingFull: boolean;
    copiedName: string | null;
    copiedCardLink: string | null;
    allTypeColors: Record<string, string>;
    appliedAbility: string;
    appliedMove: string;
    moveRank: string;
    onToggleExpand: (name: string) => void;
    onCopyDiscord: (pokemon: PokemonLookupEntry) => void;
    onCopyCardLink: (name: string) => void;
    onBroadcast: (pokemon: PokemonLookupEntry) => void;
    onOpenTooltip: (title: string, desc: string) => void;
}

export function PokemonLookupCard({
    pokemon: p,
    isExpanded,
    fullData,
    isLoadingFull,
    copiedName,
    copiedCardLink,
    allTypeColors,
    appliedAbility,
    appliedMove,
    moveRank,
    onToggleExpand,
    onCopyDiscord,
    onCopyCardLink,
    onBroadcast,
    onOpenTooltip
}: PokemonLookupCardProps) {
    // Check if move matches filter
    const matchedMoves =
        appliedMove || moveRank
            ? p.moves.filter(([mName, mRank]) => {
                  const nameMatches = !appliedMove || mName.toLowerCase().includes(appliedMove.toLowerCase());
                  const rankMatches = !moveRank || mRank.toLowerCase() === moveRank.toLowerCase();
                  return nameMatches && rankMatches;
              })
            : [];

    return (
        <div id={`pokemon-card-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`} className="gm-pokemon-lookup__card">
            <div className="gm-pokemon-lookup__card-header">
                <div className="gm-pokemon-lookup__card-identity">
                    <span className="gm-pokemon-lookup__card-dex-id">#{p.dexId}</span>
                    <span className="gm-pokemon-lookup__card-name">{p.name}</span>
                    {p.isCustom && <span className="gm-pokemon-lookup__custom-tag">Homebrew</span>}
                    <div className="gm-pokemon-lookup__card-types">
                        <span
                            className="gm-pokemon-lookup__type-badge"
                            style={{ backgroundColor: allTypeColors[p.type1] || '#888' }}
                        >
                            {p.type1}
                        </span>
                        {p.type2 && (
                            <span
                                className="gm-pokemon-lookup__type-badge"
                                style={{ backgroundColor: allTypeColors[p.type2] || '#888' }}
                            >
                                {p.type2}
                            </span>
                        )}
                    </div>
                </div>

                <div className="gm-pokemon-lookup__card-actions">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onCopyDiscord(p)}
                        title="Copy Discord Markdown summary"
                    >
                        {copiedName === p.name ? (
                            <>
                                <Check size={14} color="#4caf50" /> Copied!
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
                        onClick={() => onCopyCardLink(p.name)}
                        title={`Copy direct link to ${p.name}`}
                    >
                        {copiedCardLink === p.name ? (
                            <>
                                <Check size={14} color="#4caf50" /> Link Copied!
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
                        onClick={() => onBroadcast(p)}
                        title="Broadcast Pokémon summary to Owlbear Rodeo chat"
                    >
                        <Megaphone size={14} /> Broadcast
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={() => onToggleExpand(p.name)}
                        title={isExpanded ? 'Collapse learnset & stats' : 'View full learnset & stats'}
                    >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Hide' : 'Details'}
                    </button>
                </div>
            </div>

            <div className="gm-pokemon-lookup__card-details">
                <div className="gm-pokemon-lookup__abilities-list">
                    <span className="text-label" style={{ marginRight: '4px' }}>
                        Abilities:
                    </span>
                    {p.ability1 && (
                        <span
                            className={`gm-pokemon-lookup__ability-badge ${
                                appliedAbility && p.ability1.toLowerCase().includes(appliedAbility.toLowerCase())
                                    ? 'gm-pokemon-lookup__ability-badge--highlight'
                                    : ''
                            }`}
                        >
                            {p.ability1}
                        </span>
                    )}
                    {p.ability2 && (
                        <span
                            className={`gm-pokemon-lookup__ability-badge ${
                                appliedAbility && p.ability2.toLowerCase().includes(appliedAbility.toLowerCase())
                                    ? 'gm-pokemon-lookup__ability-badge--highlight'
                                    : ''
                            }`}
                        >
                            {p.ability2}
                        </span>
                    )}
                    {p.hiddenAbility && (
                        <span
                            className={`gm-pokemon-lookup__ability-badge gm-pokemon-lookup__ability-badge--hidden ${
                                appliedAbility && p.hiddenAbility.toLowerCase().includes(appliedAbility.toLowerCase())
                                    ? 'gm-pokemon-lookup__ability-badge--highlight'
                                    : ''
                            }`}
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                                onOpenTooltip(
                                    `${p.hiddenAbility} (Hidden Ability - Homebrew)`,
                                    'Hidden Abilities are community homebrew additions in this dataset and are not canon to official Pokerole rules. GM discretion is advised when using them.'
                                )
                            }
                        >
                            <Sparkles size={11} /> {p.hiddenAbility}{' '}
                            <span className="gm-pokemon-lookup__ha-tag">HA</span>
                        </span>
                    )}
                </div>

                {matchedMoves.length > 0 && (
                    <div className="gm-pokemon-lookup__match-pill">
                        <Zap size={13} />
                        {matchedMoves.map(([mName, mRank]) => `${mName} (${mRank})`).join(', ')}
                    </div>
                )}
            </div>

            {/* Expandable Detail Drawer */}
            {isExpanded && (
                <div className="gm-pokemon-lookup__drawer">
                    {isLoadingFull ? (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 0'
                            }}
                        >
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-subtext">Loading full Pokédex entry...</span>
                        </div>
                    ) : (
                        <>
                            {/* Stats Box if fullData available */}
                            {fullData && (
                                <div className="gm-pokemon-lookup__drawer-stats-grid">
                                    <div className="gm-pokemon-lookup__stat-box">
                                        <span className="gm-pokemon-lookup__stat-name">Base HP</span>
                                        <span className="gm-pokemon-lookup__stat-val">{fullData.BaseHP || 0}</span>
                                    </div>
                                    <div className="gm-pokemon-lookup__stat-box">
                                        <span className="gm-pokemon-lookup__stat-name">Strength</span>
                                        <span className="gm-pokemon-lookup__stat-val">{fullData.Strength || 0}</span>
                                    </div>
                                    <div className="gm-pokemon-lookup__stat-box">
                                        <span className="gm-pokemon-lookup__stat-name">Dexterity</span>
                                        <span className="gm-pokemon-lookup__stat-val">{fullData.Dexterity || 0}</span>
                                    </div>
                                    <div className="gm-pokemon-lookup__stat-box">
                                        <span className="gm-pokemon-lookup__stat-name">Vitality</span>
                                        <span className="gm-pokemon-lookup__stat-val">{fullData.Vitality || 0}</span>
                                    </div>
                                    <div className="gm-pokemon-lookup__stat-box">
                                        <span className="gm-pokemon-lookup__stat-name">Special</span>
                                        <span className="gm-pokemon-lookup__stat-val">{fullData.Special || 0}</span>
                                    </div>
                                    <div className="gm-pokemon-lookup__stat-box">
                                        <span className="gm-pokemon-lookup__stat-name">Insight</span>
                                        <span className="gm-pokemon-lookup__stat-val">{fullData.Insight || 0}</span>
                                    </div>
                                </div>
                            )}

                            {/* Full Move Learnset Grouped by Rank */}
                            <div className="gm-pokemon-lookup__drawer-moves">
                                <div className="gm-pokemon-lookup__drawer-moves-title">
                                    Move Learnset ({p.moves.length} Moves)
                                </div>
                                <div className="gm-pokemon-lookup__rank-groups-container">
                                    {groupMovesByRank(p.moves).map(({ rank, moves }) => (
                                        <div
                                            key={`rank-group-${p.name}-${rank}`}
                                            className="gm-pokemon-lookup__rank-group"
                                        >
                                            <div className="gm-pokemon-lookup__rank-group-title text-label">
                                                {rank} ({moves.length})
                                            </div>
                                            <div className="gm-pokemon-lookup__rank-moves-list">
                                                {moves.map((mName, idx) => {
                                                    const isMoveMatch =
                                                        appliedMove &&
                                                        mName.toLowerCase().includes(appliedMove.toLowerCase());
                                                    return (
                                                        <span
                                                            key={`move-${p.name}-${mName}-${idx}`}
                                                            className={`gm-pokemon-lookup__move-pill ${
                                                                isMoveMatch
                                                                    ? 'gm-pokemon-lookup__move-pill--highlight'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {mName}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dex Description if available */}
                            {fullData && fullData.DexDescription && (
                                <div className="gm-pokemon-lookup__drawer-desc">"{fullData.DexDescription}"</div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
