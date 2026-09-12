import React from 'react';
import { ChevronDown, MapPin, CloudSun, Mountain, Sparkles, Shield } from 'lucide-react';
import { BattlefieldPitch } from './BattlefieldPitch';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import type {
    BattlefieldData,
    BattleOrganizerTimerEffect,
    RollLogLayoutMode
} from '../../../types/battleOrganizerTypes';

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
    const handleWeatherChange = (text: string) => {
        updateBattlefieldWeather('name', text);
        if (text.trim() && battlefield.weather.remainingRounds === 0) {
            updateBattlefieldWeather('remainingRounds', 4);
        } else if (!text.trim() && battlefield.weather.remainingRounds > 0) {
            updateBattlefieldWeather('remainingRounds', 0);
        }
    };

    const handleTerrainChange = (text: string) => {
        updateBattlefieldTerrain('name', text);
        if (text.trim() && battlefield.terrain.remainingRounds === 0) {
            updateBattlefieldTerrain('remainingRounds', 4);
        } else if (!text.trim() && battlefield.terrain.remainingRounds > 0) {
            updateBattlefieldTerrain('remainingRounds', 0);
        }
    };

    const handleOtherChange = (text: string) => {
        updateBattlefieldOther('name', text);
        if (text.trim() && battlefield.other.remainingRounds === 0) {
            updateBattlefieldOther('remainingRounds', 4);
        } else if (!text.trim() && battlefield.other.remainingRounds > 0) {
            updateBattlefieldOther('remainingRounds', 0);
        }
    };

    const handlePlayerForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...battlefield.playerSide.forceFields] as [
            (typeof battlefield.playerSide.forceFields)[0],
            (typeof battlefield.playerSide.forceFields)[1]
        ];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        updatePlayerSide('forceFields', fields);
    };

    const handleFoeForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...battlefield.foeSide.forceFields] as [
            (typeof battlefield.foeSide.forceFields)[0],
            (typeof battlefield.foeSide.forceFields)[1]
        ];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        updateFoeSide('forceFields', fields);
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
                        <ChevronDown
                            size={14}
                            style={{
                                transform: isBattlefieldOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                            }}
                        />
                    </div>

                    {isBattlefieldOpen && (
                        <>
                            {/* Battlefield Location */}
                            <div className="bo-location-row">
                                <label className="bo-field-label text-label">
                                    <MapPin size={14} /> Battlefield Location
                                </label>
                                <input
                                    type="text"
                                    className="bo-input bo-input--underline text-label"
                                    value={battlefield.location}
                                    onChange={(e) => updateBattlefield('location', e.target.value)}
                                    placeholder="e.g. Viridian Forest Clearing / Distortion World"
                                />
                            </div>

                            {/* Global Battlefield Row: Weather, Terrain, Other */}
                            <div className="bo-global-effects-grid">
                                {/* Active Weather */}
                                <div className="bo-effect-card">
                                    <div className="bo-effect-card__header">
                                        <span className="bo-field-label text-label">
                                            <CloudSun size={14} /> Active Weather
                                        </span>
                                        <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                    </div>
                                    <div className="bo-effect-card__body">
                                        <input
                                            type="text"
                                            className="bo-input bo-input--underline text-label"
                                            value={battlefield.weather.name}
                                            onChange={(e) => handleWeatherChange(e.target.value)}
                                            placeholder="e.g. Rain, Harsh Sun, Sandstorm"
                                        />
                                        <RemainingRoundsBoxes
                                            value={battlefield.weather.remainingRounds}
                                            onChange={(val) => updateBattlefieldWeather('remainingRounds', val)}
                                            title="Weather Remaining Rounds"
                                        />
                                    </div>
                                </div>

                                {/* Active Terrain */}
                                <div className="bo-effect-card">
                                    <div className="bo-effect-card__header">
                                        <span className="bo-field-label text-label">
                                            <Mountain size={14} /> Active Terrain
                                        </span>
                                        <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                    </div>
                                    <div className="bo-effect-card__body">
                                        <input
                                            type="text"
                                            className="bo-input bo-input--underline text-label"
                                            value={battlefield.terrain.name}
                                            onChange={(e) => handleTerrainChange(e.target.value)}
                                            placeholder="e.g. Electric Terrain, Grassy Terrain"
                                        />
                                        <RemainingRoundsBoxes
                                            value={battlefield.terrain.remainingRounds}
                                            onChange={(val) => updateBattlefieldTerrain('remainingRounds', val)}
                                            title="Terrain Remaining Rounds"
                                        />
                                    </div>
                                </div>

                                {/* Other Global Battlefield Effect */}
                                <div className="bo-effect-card">
                                    <div className="bo-effect-card__header">
                                        <span className="bo-field-label text-label">
                                            <Sparkles size={14} /> Other
                                        </span>
                                        <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                    </div>
                                    <div className="bo-effect-card__body">
                                        <input
                                            type="text"
                                            className="bo-input bo-input--underline text-label"
                                            value={battlefield.other.name}
                                            onChange={(e) => handleOtherChange(e.target.value)}
                                            placeholder="e.g. Gravity, Trick Room, Ion Deluge"
                                        />
                                        <RemainingRoundsBoxes
                                            value={battlefield.other.remainingRounds}
                                            onChange={(val) => updateBattlefieldOther('remainingRounds', val)}
                                            title="Other Global Remaining Rounds"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Split Stadium Pitch Grid: Player's Side | Pitch | Foe's Side */}
                            <div className="bo-stadium-split-grid">
                                {/* Player's Side */}
                                <div className="bo-side-panel bo-side-panel--player">
                                    <h3 className="bo-side-title bo-side-title--player text-title-primary">
                                        Player's Side
                                    </h3>

                                    {/* Force Fields */}
                                    <div className="bo-field-group">
                                        <div className="bo-field-group__header">
                                            <span className="bo-field-label text-label">
                                                <Shield size={14} /> Force Field
                                            </span>
                                            <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                        </div>
                                        <div className="bo-field-group__row">
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.playerSide.forceFields[0].name}
                                                onChange={(e) => handlePlayerForceFieldChange(0, e.target.value)}
                                                placeholder="e.g. Reflect, Light Screen"
                                            />
                                            <RemainingRoundsBoxes
                                                value={battlefield.playerSide.forceFields[0].remainingRounds}
                                                onChange={(val) => {
                                                    const fields = [...battlefield.playerSide.forceFields] as [
                                                        (typeof battlefield.playerSide.forceFields)[0],
                                                        (typeof battlefield.playerSide.forceFields)[1]
                                                    ];
                                                    fields[0] = { ...fields[0], remainingRounds: val };
                                                    updatePlayerSide('forceFields', fields);
                                                }}
                                                title="Player Force Field 1 Rounds"
                                            />
                                        </div>
                                        <div className="bo-field-group__row">
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.playerSide.forceFields[1].name}
                                                onChange={(e) => handlePlayerForceFieldChange(1, e.target.value)}
                                                placeholder="e.g. Safeguard, Tailwind"
                                            />
                                            <RemainingRoundsBoxes
                                                value={battlefield.playerSide.forceFields[1].remainingRounds}
                                                onChange={(val) => {
                                                    const fields = [...battlefield.playerSide.forceFields] as [
                                                        (typeof battlefield.playerSide.forceFields)[0],
                                                        (typeof battlefield.playerSide.forceFields)[1]
                                                    ];
                                                    fields[1] = { ...fields[1], remainingRounds: val };
                                                    updatePlayerSide('forceFields', fields);
                                                }}
                                                title="Player Force Field 2 Rounds"
                                            />
                                        </div>
                                    </div>

                                    {/* Hazard & Cover subgrid */}
                                    <div className="bo-side-subgrid">
                                        <div className="bo-subfield">
                                            <label className="bo-field-label text-label">Entry Hazard</label>
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.playerSide.entryHazard}
                                                onChange={(e) => updatePlayerSide('entryHazard', e.target.value)}
                                                placeholder="e.g. Stealth Rock, Spikes"
                                            />
                                        </div>
                                        <div className="bo-subfield">
                                            <label className="bo-field-label text-label">Cover</label>
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.playerSide.cover}
                                                onChange={(e) => updatePlayerSide('cover', e.target.value)}
                                                placeholder="e.g. Half Cover (+1 Def)"
                                            />
                                        </div>
                                    </div>

                                    <div className="bo-subfield">
                                        <label className="bo-field-label text-label">Other</label>
                                        <input
                                            type="text"
                                            className="bo-input bo-input--underline text-label"
                                            value={battlefield.playerSide.other}
                                            onChange={(e) => updatePlayerSide('other', e.target.value)}
                                            placeholder="e.g. Cheer, Safeguard"
                                        />
                                    </div>
                                </div>

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

                                {/* Foe's Side */}
                                <div className="bo-side-panel bo-side-panel--foe">
                                    <h3 className="bo-side-title bo-side-title--foe text-title-primary">Foe's Side</h3>

                                    {/* Force Fields */}
                                    <div className="bo-field-group">
                                        <div className="bo-field-group__header">
                                            <span className="bo-field-label text-label">
                                                <Shield size={14} /> Force Field
                                            </span>
                                            <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                        </div>
                                        <div className="bo-field-group__row">
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.foeSide.forceFields[0].name}
                                                onChange={(e) => handleFoeForceFieldChange(0, e.target.value)}
                                                placeholder="e.g. Light Screen, Protect"
                                            />
                                            <RemainingRoundsBoxes
                                                value={battlefield.foeSide.forceFields[0].remainingRounds}
                                                onChange={(val) => {
                                                    const fields = [...battlefield.foeSide.forceFields] as [
                                                        (typeof battlefield.foeSide.forceFields)[0],
                                                        (typeof battlefield.foeSide.forceFields)[1]
                                                    ];
                                                    fields[0] = { ...fields[0], remainingRounds: val };
                                                    updateFoeSide('forceFields', fields);
                                                }}
                                                title="Foe Force Field 1 Rounds"
                                            />
                                        </div>
                                        <div className="bo-field-group__row">
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.foeSide.forceFields[1].name}
                                                onChange={(e) => handleFoeForceFieldChange(1, e.target.value)}
                                                placeholder="e.g. Aurora Veil, Tailwind"
                                            />
                                            <RemainingRoundsBoxes
                                                value={battlefield.foeSide.forceFields[1].remainingRounds}
                                                onChange={(val) => {
                                                    const fields = [...battlefield.foeSide.forceFields] as [
                                                        (typeof battlefield.foeSide.forceFields)[0],
                                                        (typeof battlefield.foeSide.forceFields)[1]
                                                    ];
                                                    fields[1] = { ...fields[1], remainingRounds: val };
                                                    updateFoeSide('forceFields', fields);
                                                }}
                                                title="Foe Force Field 2 Rounds"
                                            />
                                        </div>
                                    </div>

                                    {/* Hazard & Cover subgrid */}
                                    <div className="bo-side-subgrid">
                                        <div className="bo-subfield">
                                            <label className="bo-field-label text-label">Entry Hazard</label>
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.foeSide.entryHazard}
                                                onChange={(e) => updateFoeSide('entryHazard', e.target.value)}
                                                placeholder="e.g. Toxic Spikes, Sticky Web"
                                            />
                                        </div>
                                        <div className="bo-subfield">
                                            <label className="bo-field-label text-label">Cover</label>
                                            <input
                                                type="text"
                                                className="bo-input bo-input--underline text-label"
                                                value={battlefield.foeSide.cover}
                                                onChange={(e) => updateFoeSide('cover', e.target.value)}
                                                placeholder="e.g. Full Cover (+2 Def)"
                                            />
                                        </div>
                                    </div>

                                    <div className="bo-subfield">
                                        <label className="bo-field-label text-label">Other</label>
                                        <input
                                            type="text"
                                            className="bo-input bo-input--underline text-label"
                                            value={battlefield.foeSide.other}
                                            onChange={(e) => updateFoeSide('other', e.target.value)}
                                            placeholder="e.g. Safeguard, Mist"
                                        />
                                    </div>
                                </div>
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
