import React from 'react';
import { ChevronDown, MapPin, CloudSun, Mountain, Sparkles, Eye, EyeOff } from 'lucide-react';
import { BattlefieldPitch } from './BattlefieldPitch';
import { BattlefieldEffectCard } from './BattlefieldEffectCard';
import { BattlefieldSidePanel } from './BattlefieldSidePanel';
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
    renderRollLog
}: BattlefieldSectionProps) {
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
                            aria-label={
                                battlefield.broadcastToPlayers ? 'Broadcast to players' : 'Hidden from players'
                            }
                        >
                            {battlefield.broadcastToPlayers ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span>{battlefield.broadcastToPlayers ? 'Live to Players' : 'GM Only'}</span>
                        </button>
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
                            <div className="bo-effects-grid">
                                <BattlefieldEffectCard
                                    title="Weather"
                                    icon={<CloudSun size={14} />}
                                    value={battlefield.weather.name}
                                    remainingRounds={battlefield.weather.remainingRounds}
                                    onChangeName={(val) => updateBattlefieldWeather('name', val)}
                                    onChangeRounds={(val) => updateBattlefieldWeather('remainingRounds', val)}
                                    extraEffects={battlefield.extraWeathers}
                                    onChangeExtras={(extras) => updateBattlefield('extraWeathers', extras)}
                                    category="weather"
                                    placeholder="e.g. Rain, Sun, Hail..."
                                />

                                <BattlefieldEffectCard
                                    title="Terrain"
                                    icon={<Mountain size={14} />}
                                    value={battlefield.terrain.name}
                                    remainingRounds={battlefield.terrain.remainingRounds}
                                    onChangeName={(val) => updateBattlefieldTerrain('name', val)}
                                    onChangeRounds={(val) => updateBattlefieldTerrain('remainingRounds', val)}
                                    extraEffects={battlefield.extraTerrains}
                                    onChangeExtras={(extras) => updateBattlefield('extraTerrains', extras)}
                                    category="terrain"
                                    placeholder="e.g. Electric Terrain, Grassy Terrain..."
                                />

                                <BattlefieldEffectCard
                                    title="Other"
                                    icon={<Sparkles size={14} />}
                                    value={battlefield.other.name}
                                    remainingRounds={battlefield.other.remainingRounds}
                                    onChangeName={(val) => updateBattlefieldOther('name', val)}
                                    onChangeRounds={(val) => updateBattlefieldOther('remainingRounds', val)}
                                    extraEffects={battlefield.extraOther}
                                    onChangeExtras={(extras) => updateBattlefield('extraOther', extras)}
                                    category="other"
                                    placeholder="e.g. Trick Room, Gravity..."
                                />
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
        </div>
    );
}
