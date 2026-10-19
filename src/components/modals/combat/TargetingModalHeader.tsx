import { Target, Users, Globe, Crosshair } from 'lucide-react';
import type { MoveData } from '../../../store/storeTypes';

export type TargetingMode = 'single' | 'target-all' | 'area';

interface TargetingModalHeaderProps {
    move: MoveData;
    baseDamage: number;
    weatherInfo: { diceBonus: number; tag?: string };
    bankedDice: number;
    mode: TargetingMode;
    onModeChange: (mode: TargetingMode) => void;
    selectedCount: number;
    maxTargets: number;
    rank: string;
}

export function TargetingModalHeader({
    move,
    baseDamage,
    weatherInfo,
    bankedDice,
    mode,
    onModeChange,
    selectedCount,
    maxTargets,
    rank
}: TargetingModalHeaderProps) {
    const isExceeded = selectedCount > maxTargets;

    return (
        <div className="targeting-modal__header-container">
            <h3 className="targeting-modal__title modal-title-with-icon text-title-primary">
                <Target size={20} /> Roll Damage
            </h3>

            <div className="targeting-modal__sub-header text-subtext">
                <span>
                    Move: <strong>{move.name || 'Move'}</strong>
                </span>
                <span>•</span>
                <span>
                    Base Dmg: <strong>{baseDamage}</strong>
                </span>
                {weatherInfo.diceBonus > 0 && (
                    <span
                        className="text-value-highlight"
                        style={{ color: 'var(--primary)', fontWeight: 600 }}
                        title={weatherInfo.tag}
                    >
                        (+{weatherInfo.diceBonus} {weatherInfo.tag?.split(' ')[0]})
                    </span>
                )}
                {bankedDice > 0 && (
                    <span className="text-value-highlight" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        (+{bankedDice} Banked)
                    </span>
                )}
            </div>

            {/* Mode Switcher Pills */}
            <div className="targeting-modal__mode-switcher" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'single'}
                    className={`targeting-modal__mode-pill ${
                        mode === 'single' ? 'targeting-modal__mode-pill--active' : ''
                    }`}
                    onClick={() => onModeChange('single')}
                >
                    <Crosshair size={14} /> Single Target
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'target-all'}
                    className={`targeting-modal__mode-pill ${
                        mode === 'target-all' ? 'targeting-modal__mode-pill--active' : ''
                    }`}
                    onClick={() => onModeChange('target-all')}
                >
                    <Users size={14} /> Target All in Range
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'area'}
                    className={`targeting-modal__mode-pill ${
                        mode === 'area' ? 'targeting-modal__mode-pill--active' : ''
                    }`}
                    onClick={() => onModeChange('area')}
                >
                    <Globe size={14} /> Area
                </button>
            </div>

            {/* Quota Badge for Multi-Target and Area modes */}
            {mode !== 'single' && (
                <div className="targeting-modal__quota-bar">
                    <span
                        className={`targeting-modal__quota-badge ${
                            isExceeded ? 'targeting-modal__quota-badge--warning' : ''
                        }`}
                    >
                        Targets: <strong>{selectedCount}</strong> / <strong>{maxTargets}</strong> (Rank:{' '}
                        {rank || 'Standard'})
                    </span>
                </div>
            )}
        </div>
    );
}
