import React from 'react';
import { ChevronDown, MapPin, CloudSun, Mountain, Sparkles, Eye, EyeOff, Info } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { isStandaloneMode } from '@/utils/sync/storageAdapter';
import { BattlefieldPitch } from './BattlefieldPitch';
import { BattlefieldEffectCard } from './BattlefieldEffectCard';
import { BattlefieldSidePanel } from './BattlefieldSidePanel';
import { GrassyTerrainSideModal, type GrassySideChoice } from './GrassyTerrainSideModal';
import { applyForceFieldToSide, removeForceFieldFromSide } from './battlefieldPresetUtils';
import type {
    BattlefieldData,
    BattleOrganizerTimerEffect,
    RollLogLayoutMode
} from '../../../types/battleOrganizerTypes';
import './BattlefieldSection.css';

export interface BattlefieldSectionProps {
    battlefield: BattlefieldData;
    isBattlefieldOpen: boolean;
    onToggleBattlefieldOpen: () => void;
    updateBattlefield: <K extends keyof BattlefieldData>(key: K, value: BattlefieldData[K]) => void;
    updateBattlefieldWeather: <K extends keyof BattleOrganizerTimerEffect>(
        key: K,
        value: BattleOrganizerTimerEffect[K]
    ) => void;
    updateBattlefieldTerrain: <K extends keyof BattleOrganizerTimerEffect>(
        key: K,
        value: BattleOrganizerTimerEffect[K]
    ) => void;
    updateBattlefieldOther: <K extends keyof BattleOrganizerTimerEffect>(
        key: K,
        value: BattleOrganizerTimerEffect[K]
    ) => void;
    updatePlayerSide: <K extends keyof BattlefieldData['playerSide']>(
        key: K,
        value: BattlefieldData['playerSide'][K]
    ) => void;
    updateFoeSide: <K extends keyof BattlefieldData['foeSide']>(key: K, value: BattlefieldData['foeSide'][K]) => void;
    rollLogMode?: RollLogLayoutMode;
    renderRollLog?: (mode: RollLogLayoutMode) => React.ReactNode;
    isGM?: boolean;
}

export function BattlefieldSection({
    battlefield,
    isBattlefieldOpen,
    onToggleBattlefieldOpen,
    updateBattlefield,
    updateBattlefieldWeather,
    updateBattlefieldTerrain,
    updateBattlefieldOther,
    updatePlayerSide,
    updateFoeSide,
    rollLogMode,
    renderRollLog,
    isGM: isGMProp
}: BattlefieldSectionProps) {
    const role = useCharacterStore((state) => state.role);
    const isGM = isGMProp ?? (isStandaloneMode || role === 'GM');
    const [isGrassyModalOpen, setIsGrassyModalOpen] = React.useState(false);

    const handleApplyGrassyTerrain = (sideChoice: GrassySideChoice) => {
        const rounds = 4;
        updateBattlefieldTerrain('name', 'Grassy Terrain');
        updateBattlefieldTerrain('remainingRounds', rounds);

        if (sideChoice === 'player' || sideChoice === 'both') {
            const updated = applyForceFieldToSide(battlefield.playerSide, 'Grassy Terrain', rounds);
            updateBattlefield('playerSide', updated);
        }
        if (sideChoice === 'foe' || sideChoice === 'both') {
            const updated = applyForceFieldToSide(battlefield.foeSide, 'Grassy Terrain', rounds);
            updateBattlefield('foeSide', updated);
        }
    };

    const cleanupGrassyForceFields = () => {
        const hasGrassy = (side: typeof battlefield.playerSide) =>
            side.forceFields.some((f) => f.name.toLowerCase().includes('grassy')) ||
            side.extraForceFields?.some((f) => f.name.toLowerCase().includes('grassy'));

        if (hasGrassy(battlefield.playerSide)) {
            const updated = removeForceFieldFromSide(battlefield.playerSide, 'grassy');
            updateBattlefield('playerSide', updated);
        }
        if (hasGrassy(battlefield.foeSide)) {
            const updated = removeForceFieldFromSide(battlefield.foeSide, 'grassy');
            updateBattlefield('foeSide', updated);
        }
    };

    const handleTerrainNameChange = (val: string) => {
        const prevIsGrassy = (battlefield.terrain?.name || '').toLowerCase().includes('grassy');
        const newIsGrassy = val.toLowerCase().includes('grassy');
        updateBattlefieldTerrain('name', val);
        if (prevIsGrassy && !newIsGrassy) {
            const extraHasGrassy = battlefield.extraTerrains?.some(
                (t) => (t.name || '').toLowerCase().includes('grassy') && (t.remainingRounds > 0 || t.remainingRounds === -1)
            );
            if (!extraHasGrassy) {
                cleanupGrassyForceFields();
            }
        }
    };

    const handleTerrainRoundsChange = (val: number) => {
        updateBattlefieldTerrain('remainingRounds', val);
        if (val === 0 && (battlefield.terrain?.name || '').toLowerCase().includes('grassy')) {
            const extraHasGrassy = battlefield.extraTerrains?.some(
                (t) => (t.name || '').toLowerCase().includes('grassy') && (t.remainingRounds > 0 || t.remainingRounds === -1)
            );
            if (!extraHasGrassy) {
                cleanupGrassyForceFields();
            }
        }
    };

    const handleTerrainExtrasChange = (extras: BattleOrganizerTimerEffect[]) => {
        updateBattlefield('extraTerrains', extras);
        const mainHasGrassy =
            (battlefield.terrain?.name || '').toLowerCase().includes('grassy') &&
            (battlefield.terrain?.remainingRounds > 0 || battlefield.terrain?.remainingRounds === -1);
        const extrasHaveGrassy = extras.some(
            (t) => (t.name || '').toLowerCase().includes('grassy') && (t.remainingRounds > 0 || t.remainingRounds === -1)
        );
        if (!mainHasGrassy && !extrasHaveGrassy) {
            cleanupGrassyForceFields();
        }
    };

    return (
        <div className={rollLogMode === 'battlefield-nested' ? 'bo-battlefield-nest-row' : 'bo-battlefield-wrap'}>
            <div
                className={
                    rollLogMode === 'battlefield-nested' ? 'bo-battlefield-nest-main' : 'bo-battlefield-main-wrap'
                }
            >
                <div
                    className={`bo-section-card bo-section-card--battlefield ${!isBattlefieldOpen ? 'bo-section-card--collapsed' : ''}`}
                >
                    {/* Header Pill */}
                    <div
                        className="bo-pill-header bo-pill-header--center bo-pill-header--toggle"
                        onClick={onToggleBattlefieldOpen}
                        title={isBattlefieldOpen ? 'Click to Collapse Battlefield' : 'Click to Expand Battlefield'}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                onToggleBattlefieldOpen();
                            }
                        }}
                    >
                        <span className="bo-pill-header__text text-theme-header">Battlefield</span>
                        {isGM && (
                            <button
                                type="button"
                                className={`bo-pill-visibility-btn ${battlefield.broadcastToPlayers ? 'is-broadcast' : 'is-hidden'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateBattlefield('broadcastToPlayers', !battlefield.broadcastToPlayers);
                                }}
                                title={
                                    battlefield.broadcastToPlayers
                                        ? 'Visible to players (Click to hide from player sheets)'
                                        : 'Hidden from players (Click to broadcast active weather/terrain/fields to player sheets)'
                                }
                                aria-label={battlefield.broadcastToPlayers ? 'Broadcast to players' : 'Hidden from players'}
                            >
                                {battlefield.broadcastToPlayers ? <Eye size={12} /> : <EyeOff size={12} />}
                                <span>{battlefield.broadcastToPlayers ? 'Live to Players' : 'GM Only'}</span>
                            </button>
                        )}
                        <ChevronDown
                            size={16}
                            className={`bo-pill-header__chevron ${!isBattlefieldOpen ? 'bo-pill-header__chevron--collapsed' : ''}`}
                        />
                    </div>

                    {isBattlefieldOpen && (
                        <>
                            {/* Location Bar */}
                            <div className="bo-field-row bo-field-row--location">
                                <label className="bo-field-label text-label">
                                    <MapPin size={15} /> Location
                                </label>
                                <input
                                    type="text"
                                    className="bo-input bo-input--underline bo-input--large text-title-primary"
                                    value={battlefield.location}
                                    onChange={(e) => updateBattlefield('location', e.target.value)}
                                    placeholder="e.g. Viridian Forest, Mt. Moon..."
                                />
                            </div>

                            {/* Global Effects 3-Column Grid: Weather | Terrain | Other */}
                            <div className="bo-global-effects-grid">
                                <BattlefieldEffectCard
                                    title="Weather"
                                    icon={<CloudSun size={14} />}
                                    value={battlefield.weather?.name ?? ''}
                                    remainingRounds={battlefield.weather?.remainingRounds ?? 0}
                                    onChangeName={(val) => updateBattlefieldWeather('name', val)}
                                    onChangeRounds={(val) => updateBattlefieldWeather('remainingRounds', val)}
                                    extraEffects={battlefield.extraWeathers ?? []}
                                    onChangeExtras={(extras) => updateBattlefield('extraWeathers', extras)}
                                    category="weather"
                                    placeholder="e.g. Rain, Sun, Hail..."
                                />

                                <BattlefieldEffectCard
                                    title="Terrain"
                                    icon={<Mountain size={14} />}
                                    value={battlefield.terrain?.name ?? ''}
                                    remainingRounds={battlefield.terrain?.remainingRounds ?? 0}
                                    onChangeName={handleTerrainNameChange}
                                    onChangeRounds={handleTerrainRoundsChange}
                                    extraEffects={battlefield.extraTerrains ?? []}
                                    onChangeExtras={handleTerrainExtrasChange}
                                    category="terrain"
                                    placeholder="e.g. Electric Terrain, Grassy Terrain..."
                                    onTriggerGrassyModal={() => setIsGrassyModalOpen(true)}
                                />

                                <BattlefieldEffectCard
                                    title="Other"
                                    icon={<Sparkles size={14} />}
                                    value={battlefield.other?.name ?? ''}
                                    remainingRounds={battlefield.other?.remainingRounds ?? 0}
                                    onChangeName={(val) => updateBattlefieldOther('name', val)}
                                    onChangeRounds={(val) => updateBattlefieldOther('remainingRounds', val)}
                                    extraEffects={battlefield.extraOther ?? []}
                                    onChangeExtras={(extras) => updateBattlefield('extraOther', extras)}
                                    category="other"
                                    placeholder="e.g. Trick Room, Gravity..."
                                />
                            </div>

                            {/* Supported Effects Engine Note (Hidden in print) */}
                            <div className="bo-battlefield-hint text-subtext no-print">
                                <Info size={13} className="bo-battlefield-hint__icon" aria-hidden="true" />
                                <span>
                                    Weather, Terrain, and Other chips with a{' '}
                                    <span className="bo-battlefield-hint__badge">highlighted outline</span> are
                                    supported by the Pokérole dice/math engine and auto-apply to sheets.
                                </span>
                            </div>

                            {/* Split Stadium Pitch Grid: Player's Side | Pitch | Foe's Side */}
                            <div className="bo-stadium-split-grid">
                                <BattlefieldSidePanel
                                    side="player"
                                    title="Player's Side"
                                    sideData={battlefield.playerSide}
                                    onUpdateSide={updatePlayerSide}
                                />

                                {/* Center Stadium Graphic */}
                                <div className="bo-center-pitch-panel">
                                    <BattlefieldPitch
                                        highlightedSide={battlefield.highlightedSide}
                                        onHighlightChange={(side) => updateBattlefield('highlightedSide', side)}
                                        playerTargets={battlefield.playerTargets}
                                        foeTargets={battlefield.foeTargets}
                                        onPlayerTargetsChange={(val) => updateBattlefield('playerTargets', val)}
                                        onFoeTargetsChange={(val) => updateBattlefield('foeTargets', val)}
                                    />
                                </div>

                                <BattlefieldSidePanel
                                    side="foe"
                                    title="Foe's Side"
                                    sideData={battlefield.foeSide}
                                    onUpdateSide={updateFoeSide}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            {rollLogMode === 'battlefield-nested' && renderRollLog && (
                <div className="bo-battlefield-nest-sidebar">{renderRollLog('battlefield-nested')}</div>
            )}
            <GrassyTerrainSideModal
                isOpen={isGrassyModalOpen}
                onClose={() => setIsGrassyModalOpen(false)}
                onApply={handleApplyGrassyTerrain}
            />
        </div>
    );
}
