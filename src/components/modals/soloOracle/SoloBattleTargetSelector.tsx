import { useState, useMemo } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Activity, Heart, Sparkles, Brain, Search, X, Check } from 'lucide-react';
import { NumberSpinner } from '@/components/ui/NumberSpinner';
import type { BattleTargetInfo } from '@/utils/solo/soloBattleOracleUtils';

export interface SoloBattleTargetSelectorProps {
    targetType: 'sheet' | 'token' | 'custom';
    onSelectTargetType: (t: 'sheet' | 'token' | 'custom') => void;
    sceneTokens: BattleTargetInfo[];
    selectedTokenId: string;
    onSelectTokenId: (id: string) => void;
    customName: string;
    onChangeCustomName: (name: string) => void;
    customMovesText: string;
    onChangeCustomMovesText: (moves: string) => void;
    customInsight: number;
    onChangeCustomInsight: (insight: number) => void;
    activeTarget: BattleTargetInfo;
}

export function SoloBattleTargetSelector({
    targetType,
    onSelectTargetType,
    sceneTokens,
    selectedTokenId,
    onSelectTokenId,
    customName,
    onChangeCustomName,
    customMovesText,
    onChangeCustomMovesText,
    customInsight,
    onChangeCustomInsight,
    activeTarget
}: SoloBattleTargetSelectorProps) {
    const [tokenSearch, setTokenSearch] = useState('');

    const filteredTokens = useMemo(() => {
        const query = tokenSearch.trim().toLowerCase();
        if (!query) return sceneTokens;
        return sceneTokens.filter((t) => t.name.toLowerCase().includes(query));
    }, [sceneTokens, tokenSearch]);

    return (
        <div className="solo-battle__target-section">
            <div className="solo-battle__target-header">
                <span className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={15} color="var(--primary)" /> Target Pokémon
                </span>
                <div className="solo-battle__target-toggles">
                    <button
                        type="button"
                        className={`action-button ${targetType === 'sheet' ? 'action-button--theme' : 'action-button--dark'} solo-battle__toggle-btn`}
                        onClick={() => onSelectTargetType('sheet')}
                    >
                        Active Sheet
                    </button>
                    {OBR.isAvailable && (
                        <button
                            type="button"
                            className={`action-button ${targetType === 'token' ? 'action-button--theme' : 'action-button--dark'} solo-battle__toggle-btn`}
                            onClick={() => onSelectTargetType('token')}
                        >
                            Scene Tokens ({sceneTokens.length})
                        </button>
                    )}
                    <button
                        type="button"
                        className={`action-button ${targetType === 'custom' ? 'action-button--theme' : 'action-button--dark'} solo-battle__toggle-btn`}
                        onClick={() => onSelectTargetType('custom')}
                    >
                        Custom
                    </button>
                </div>
            </div>

            {targetType === 'token' && OBR.isAvailable && (
                <div className="solo-battle__token-select-wrap">
                    <div className="solo-battle__token-search-bar">
                        <Search size={14} className="solo-battle__token-search-icon" />
                        <input
                            type="text"
                            className="solo-battle__token-search-input text-label"
                            placeholder="Search scene tokens..."
                            value={tokenSearch}
                            onChange={(e) => setTokenSearch(e.target.value)}
                        />
                        {tokenSearch && (
                            <button
                                type="button"
                                className="solo-battle__token-search-clear"
                                onClick={() => setTokenSearch('')}
                                title="Clear search"
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="solo-battle__token-list">
                        {sceneTokens.length === 0 ? (
                            <div className="solo-battle__token-empty text-subtext">
                                No character tokens found on scene
                            </div>
                        ) : filteredTokens.length === 0 ? (
                            <div className="solo-battle__token-empty text-subtext">
                                No tokens match &quot;{tokenSearch}&quot;
                            </div>
                        ) : (
                            filteredTokens.map((t) => {
                                const isSelected = t.id === selectedTokenId;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        className={`solo-battle__token-item ${isSelected ? 'solo-battle__token-item--selected' : ''}`}
                                        onClick={() => onSelectTokenId(t.id)}
                                    >
                                        <div className="solo-battle__token-item-info">
                                            <span className="solo-battle__token-item-name text-label">{t.name}</span>
                                            <span className="solo-battle__token-item-meta text-subtext">
                                                HP: {t.hpCurr}/{t.hpMax} • Moves: {t.moves.length}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span className="solo-battle__token-item-check" title="Selected Target">
                                                <Check size={14} color="var(--primary)" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {targetType === 'custom' && (
                <div className="solo-battle__custom-inputs">
                    <input
                        type="text"
                        className="solo-fate__question-input"
                        placeholder="Pokémon Name (e.g. Wild Rattata)"
                        value={customName}
                        onChange={(e) => onChangeCustomName(e.target.value)}
                    />
                    <input
                        type="text"
                        className="solo-fate__question-input"
                        placeholder="Moves (comma-separated, e.g. Tackle, Bite, Tail Whip)"
                        value={customMovesText}
                        onChange={(e) => onChangeCustomMovesText(e.target.value)}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-subtext">Insight:</span>
                        <NumberSpinner value={customInsight} onChange={onChangeCustomInsight} min={1} max={5} compact />
                    </div>
                </div>
            )}

            {/* Target Status Bar */}
            <div className="solo-battle__target-bar">
                <span className="solo-battle__target-name text-title-primary">{activeTarget.name}</span>
                <div className="solo-battle__target-badges">
                    <span className="solo-battle__stat-chip" title="Current / Maximum Hit Points">
                        <Heart size={13} color="var(--semantic-danger, #ff5555)" />
                        {activeTarget.hpCurr} / {activeTarget.hpMax}
                    </span>
                    <span className="solo-battle__stat-chip" title="Current / Maximum Willpower">
                        <Sparkles size={13} color="#f59e0b" />
                        {activeTarget.willCurr} / {activeTarget.willMax}
                    </span>
                    <span className="solo-battle__stat-chip" title="Insight (Controls active move limit: 3 + Insight)">
                        <Brain size={13} color="var(--primary)" />
                        Ins {activeTarget.insight} (Standard Limit: {3 + activeTarget.insight})
                    </span>
                </div>
            </div>
        </div>
    );
}
