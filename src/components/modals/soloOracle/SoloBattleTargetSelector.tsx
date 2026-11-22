import OBR from '@owlbear-rodeo/sdk';
import { Activity, Heart, Flame, Brain } from 'lucide-react';
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
                    <select
                        className="solo-log__campaign-select"
                        value={selectedTokenId}
                        onChange={(e) => onSelectTokenId(e.target.value)}
                        style={{ width: '100%' }}
                    >
                        {sceneTokens.length === 0 ? (
                            <option value="">No character tokens found on scene</option>
                        ) : (
                            sceneTokens.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} (HP: {t.hpCurr}/{t.hpMax}, Moves: {t.moves.length})
                                </option>
                            ))
                        )}
                    </select>
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
                        <Flame size={13} color="#f59e0b" />
                        {activeTarget.willCurr} / {activeTarget.willMax}
                    </span>
                    <span className="solo-battle__stat-chip" title="Insight (Controls active move limit: 3 + Insight)">
                        <Brain size={13} color="var(--primary)" />
                        Ins {activeTarget.insight} (Limit: {3 + activeTarget.insight})
                    </span>
                </div>
            </div>
        </div>
    );
}
