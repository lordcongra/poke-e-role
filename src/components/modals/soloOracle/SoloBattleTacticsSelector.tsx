import { Zap } from 'lucide-react';
import { NumberSpinner } from '@/components/ui/NumberSpinner';
import type { TacticsMode, CustomWeights } from '@/utils/solo/soloBattleOracleUtils';

export interface SoloBattleTacticsSelectorProps {
    tacticsMode: TacticsMode;
    onSelectTacticsMode: (mode: TacticsMode) => void;
    customWeights: CustomWeights;
    onChangeCustomWeights: React.Dispatch<React.SetStateAction<CustomWeights>>;
}

export function SoloBattleTacticsSelector({
    tacticsMode,
    onSelectTacticsMode,
    customWeights,
    onChangeCustomWeights
}: SoloBattleTacticsSelectorProps) {
    return (
        <div className="solo-battle__tactics-section">
            <span className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={15} color="var(--primary)" /> Tactics Mode
            </span>
            <div className="solo-battle__tactics-pills">
                <button
                    type="button"
                    className={`solo-battle__tactics-pill ${tacticsMode === 'equal' ? 'solo-battle__tactics-pill--active' : ''}`}
                    onClick={() => onSelectTacticsMode('equal')}
                    title="Uniform probability across all candidate moves (1/N)"
                >
                    Equal Random
                </button>
                <button
                    type="button"
                    className={`solo-battle__tactics-pill ${tacticsMode === 'aggressive' ? 'solo-battle__tactics-pill--active' : ''}`}
                    onClick={() => onSelectTacticsMode('aggressive')}
                    title="Aggressive tactics: Damaging attacks weighted 3x over support moves"
                >
                    Aggressive (3x Dmg)
                </button>
                <button
                    type="button"
                    className={`solo-battle__tactics-pill ${tacticsMode === 'tactical' ? 'solo-battle__tactics-pill--active' : ''}`}
                    onClick={() => onSelectTacticsMode('tactical')}
                    title="Tactical tactics: Support and status moves weighted 3x over damaging attacks"
                >
                    Tactical (3x Status)
                </button>
                <button
                    type="button"
                    className={`solo-battle__tactics-pill ${tacticsMode === 'wild' ? 'solo-battle__tactics-pill--active' : ''}`}
                    onClick={() => onSelectTacticsMode('wild')}
                    title="Wild Instinct: 1d6 behavior table (Attack, Intimidate, Roar/Hesitate, Desperate Strike)"
                >
                    Wild Instinct (d6)
                </button>
                <button
                    type="button"
                    className={`solo-battle__tactics-pill ${tacticsMode === 'custom' ? 'solo-battle__tactics-pill--active' : ''}`}
                    onClick={() => onSelectTacticsMode('custom')}
                    title="Custom weighting: Set explicit weight multipliers for Damaging vs Support moves"
                >
                    Custom Weights
                </button>
            </div>

            {tacticsMode === 'custom' && (
                <div className="solo-battle__custom-weights-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-subtext">Damaging Weight:</span>
                        <NumberSpinner
                            value={customWeights.damaging}
                            onChange={(val) => onChangeCustomWeights((prev) => ({ ...prev, damaging: val }))}
                            min={0}
                            max={20}
                            compact
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-subtext">Support Weight:</span>
                        <NumberSpinner
                            value={customWeights.support}
                            onChange={(val) => onChangeCustomWeights((prev) => ({ ...prev, support: val }))}
                            min={0}
                            max={20}
                            compact
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
