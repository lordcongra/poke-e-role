import { useState } from 'react';
import { useBattleOrganizer } from './useBattleOrganizer';
import { BattlefieldPitch } from './BattlefieldPitch';
import { RemainingRoundsBoxes } from './RemainingRoundsBoxes';
import { CombatantRow } from './CombatantRow';
import {
    X,
    RefreshCw,
    Plus,
    Copy,
    FastForward,
    Trash2,
    Printer,
    Sparkles,
    Shield,
    RotateCcw,
    Layers,
    MapPin,
    CloudSun,
    Mountain,
    HelpCircle,
    ArrowUpDown
} from 'lucide-react';
import './BattleOrganizerModal.css';

interface BattleOrganizerModalProps {
    onClose: () => void;
    onPrint?: () => void;
}

export function BattleOrganizerModal({ onClose, onPrint }: BattleOrganizerModalProps) {
    const {
        battlefield,
        rounds,
        currentRound,
        activeRoundIndex,
        pullFromInitiative,
        syncToSheets,
        addRound,
        duplicateRound,
        deleteRound,
        setActiveRoundIndex,
        advanceRound,
        addCombatant,
        updateCombatant,
        deleteCombatant,
        rollCombatantInitiative,
        sortCombatantsByInitiative,
        updateBattlefield,
        updateBattlefieldWeather,
        updateBattlefieldTerrain,
        updateBattlefieldOther,
        updatePlayerSide,
        updateFoeSide,
        updateEndOfRoundEffects,
        clearAll
    } = useBattleOrganizer();

    const [showHelp, setShowHelp] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [confirmDeleteRoundIdx, setConfirmDeleteRoundIdx] = useState<number | null>(null);

    const handlePrintClick = () => {
        if (onPrint) {
            onPrint();
        } else {
            window.print();
        }
    };

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
        const fields = [...battlefield.playerSide.forceFields] as [typeof battlefield.playerSide.forceFields[0], typeof battlefield.playerSide.forceFields[1]];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        updatePlayerSide('forceFields', fields);
    };

    const handleFoeForceFieldChange = (idx: 0 | 1, text: string) => {
        const fields = [...battlefield.foeSide.forceFields] as [typeof battlefield.foeSide.forceFields[0], typeof battlefield.foeSide.forceFields[1]];
        const prevRounds = fields[idx].remainingRounds;
        let newRounds = prevRounds;
        if (text.trim() && prevRounds === 0) newRounds = 4;
        else if (!text.trim() && prevRounds > 0) newRounds = 0;
        fields[idx] = { name: text, remainingRounds: newRounds };
        updateFoeSide('forceFields', fields);
    };

    return (
        <div className="bo-modal__overlay">
            <div className="bo-modal__content">
                {/* Modal Top Header */}
                <div className="bo-modal__header">
                    <div className="bo-modal__header-left">
                        <span className="bo-modal__icon">
                            <Layers size={22} color="var(--primary)" />
                        </span>
                        <h2 className="bo-modal__title text-title-primary">
                            Battle Organizer Sheet
                        </h2>
                    </div>

                    <div className="bo-modal__header-actions">
                        <button
                            type="button"
                            className="action-button action-button--primary bo-header-btn"
                            onClick={pullFromInitiative}
                            title="Pull combatants, items, and statuses from Initiative Order"
                        >
                            <Sparkles size={14} /> Pull from Initiative
                        </button>

                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={syncToSheets}
                            title="Sync action counters and reactions back to token sheets"
                        >
                            <RefreshCw size={14} /> Sync to Sheets
                        </button>

                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={handlePrintClick}
                            title="Print or export Battle Record to PDF"
                        >
                            <Printer size={14} /> Print PDF
                        </button>

                        <button
                            type="button"
                            className="action-button action-button--dark bo-header-btn"
                            onClick={() => setShowHelp(!showHelp)}
                            title="Help & Info"
                        >
                            <HelpCircle size={14} />
                        </button>

                        <button
                            type="button"
                            className="action-button action-button--ghost bo-header-close"
                            onClick={onClose}
                            title="Close Battle Organizer"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Optional Help Banner */}
                {showHelp && (
                    <div className="bo-help-banner">
                        <div className="bo-help-banner__content text-subtext">
                            <strong>Battle Organizer Tips:</strong>
                            <ul>
                                <li>Click <strong>Pull from Initiative</strong> to automatically populate all combatants, active held items, statuses, and rolled initiatives.</li>
                                <li>Use the <strong>Remaining Rounds</strong> boxes (1-4) on Weathers, Terrains, and Force Fields. When you click <strong>Advance / End Round</strong>, all active timers automatically decrement by 1.</li>
                                <li>Click <strong>✓</strong> on an action slot to mark it completed/used, or <strong>✗</strong> for clash/evade/failed.</li>
                                <li>You can replicate rounds any number of times with <strong>Add Round</strong> or <strong>Duplicate Round</strong>.</li>
                            </ul>
                        </div>
                        <button
                            type="button"
                            className="action-button action-button--ghost bo-help-close"
                            onClick={() => setShowHelp(false)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Modal Scrollable Body */}
                <div className="bo-modal__body">
                    {/* ========================================= */}
                    {/* CARD 1: BATTLEFIELD                       */}
                    {/* ========================================= */}
                    <div className="bo-section-card bo-section-card--battlefield">
                        {/* Header Pill */}
                        <div className="bo-pill-header bo-pill-header--center">
                            <span className="bo-pill-header__text text-theme-header">Battlefield</span>
                        </div>

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
                                        placeholder="e.g. Grassy Terrain, Electric Terrain"
                                    />
                                    <RemainingRoundsBoxes
                                        value={battlefield.terrain.remainingRounds}
                                        onChange={(val) => updateBattlefieldTerrain('remainingRounds', val)}
                                        title="Terrain Remaining Rounds"
                                    />
                                </div>
                            </div>

                            {/* Other Global Effect */}
                            <div className="bo-effect-card">
                                <div className="bo-effect-card__header">
                                    <span className="bo-field-label text-label">Other</span>
                                    <span className="bo-rounds-label text-subtext">Remaining Rounds</span>
                                </div>
                                <div className="bo-effect-card__body">
                                    <input
                                        type="text"
                                        className="bo-input bo-input--underline text-label"
                                        value={battlefield.other.name}
                                        onChange={(e) => handleOtherChange(e.target.value)}
                                        placeholder="e.g. Gravity, Trick Room, Mud Sport"
                                    />
                                    <RemainingRoundsBoxes
                                        value={battlefield.other.remainingRounds}
                                        onChange={(val) => updateBattlefieldOther('remainingRounds', val)}
                                        title="Other Global Effect Remaining Rounds"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dual-Side Stadium Row: Player's Side | Pitch Visual | Foe's Side */}
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
                                                const fields = [...battlefield.playerSide.forceFields] as [typeof battlefield.playerSide.forceFields[0], typeof battlefield.playerSide.forceFields[1]];
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
                                            placeholder="e.g. Aurora Veil, Tailwind"
                                        />
                                        <RemainingRoundsBoxes
                                            value={battlefield.playerSide.forceFields[1].remainingRounds}
                                            onChange={(val) => {
                                                const fields = [...battlefield.playerSide.forceFields] as [typeof battlefield.playerSide.forceFields[0], typeof battlefield.playerSide.forceFields[1]];
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
                                <h3 className="bo-side-title bo-side-title--foe text-title-primary">
                                    Foe's Side
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
                                            value={battlefield.foeSide.forceFields[0].name}
                                            onChange={(e) => handleFoeForceFieldChange(0, e.target.value)}
                                            placeholder="e.g. Reflect, Light Screen"
                                        />
                                        <RemainingRoundsBoxes
                                            value={battlefield.foeSide.forceFields[0].remainingRounds}
                                            onChange={(val) => {
                                                const fields = [...battlefield.foeSide.forceFields] as [typeof battlefield.foeSide.forceFields[0], typeof battlefield.foeSide.forceFields[1]];
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
                                                const fields = [...battlefield.foeSide.forceFields] as [typeof battlefield.foeSide.forceFields[0], typeof battlefield.foeSide.forceFields[1]];
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
                    </div>

                    {/* ========================================= */}
                    {/* CARD 2: REPLICABLE ROUND SECTIONS         */}
                    {/* ========================================= */}
                    <div className="bo-section-card bo-section-card--round">
                        {/* Round Navigation Bar */}
                        <div className="bo-round-nav-bar">
                            <div className="bo-round-tabs">
                                {rounds.map((r, idx) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={`bo-round-tab ${idx === activeRoundIndex ? 'bo-round-tab--active' : ''}`}
                                        onClick={() => setActiveRoundIndex(idx)}
                                    >
                                        Round {r.roundNumber || idx + 1}
                                    </button>
                                ))}
                            </div>

                            <div className="bo-round-actions">
                                <button
                                    type="button"
                                    className="action-button action-button--primary bo-round-btn"
                                    onClick={advanceRound}
                                    title="End current round, decrement battlefield timers, and advance to next round"
                                >
                                    <FastForward size={14} /> End Round & Advance
                                </button>

                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-round-btn"
                                    onClick={addRound}
                                    title="Add a new blank round"
                                >
                                    <Plus size={14} /> New Round
                                </button>

                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-round-btn"
                                    onClick={() => duplicateRound(activeRoundIndex)}
                                    title="Duplicate current round and all its combatants"
                                >
                                    <Copy size={14} /> Replicate Round
                                </button>

                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-round-btn"
                                    onClick={sortCombatantsByInitiative}
                                    title="Sort combatants descending by initiative score"
                                >
                                    <ArrowUpDown size={14} /> Sort Init
                                </button>

                                {rounds.length > 1 && (
                                    confirmDeleteRoundIdx === activeRoundIndex ? (
                                        <div className="bo-confirm-delete-round-inline">
                                            <span className="bo-confirm-delete-text text-subtext">Delete?</span>
                                            <button
                                                type="button"
                                                className="action-button action-button--dark bo-round-btn-mini"
                                                onClick={() => setConfirmDeleteRoundIdx(null)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="action-button action-button--red bo-round-btn-mini"
                                                onClick={() => {
                                                    deleteRound(activeRoundIndex);
                                                    setConfirmDeleteRoundIdx(null);
                                                }}
                                            >
                                                Confirm
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="action-button action-button--dark bo-round-btn bo-round-btn--danger"
                                            onClick={() => setConfirmDeleteRoundIdx(activeRoundIndex)}
                                            title="Delete this round"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Round Header Pill */}
                        <div className="bo-pill-header bo-pill-header--round">
                            <span className="bo-pill-header__text text-theme-header">
                                Round
                            </span>
                            <input
                                type="number"
                                className="bo-round-number-input text-value-highlight"
                                value={currentRound?.roundNumber || activeRoundIndex + 1}
                                onChange={(e) => {
                                    const num = parseInt(e.target.value, 10) || 1;
                                    currentRound.roundNumber = num;
                                }}
                                min={1}
                            />
                        </div>

                        {/* Combatants Table */}
                        <div className="bo-table-wrapper">
                            <table className="bo-table">
                                <thead>
                                    <tr className="bo-table-header text-theme-header">
                                        <th className="bo-th bo-th--init">Initiative Order</th>
                                        <th className="bo-th bo-th--combatant">Combatant</th>
                                        <th className="bo-th bo-th--item">Held Item</th>
                                        <th className="bo-th bo-th--status">Status</th>
                                        <th className="bo-th bo-th--actions">Action Counter (1 - 5)</th>
                                        <th className="bo-th bo-th--tools">Tools</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRound?.combatants.map((combatant, cIdx) => (
                                        <CombatantRow
                                            key={combatant.id}
                                            combatant={combatant}
                                            index={cIdx}
                                            onUpdate={updateCombatant}
                                            onDelete={deleteCombatant}
                                            onRollInitiative={rollCombatantInitiative}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Add Combatant Button */}
                        <div className="bo-add-combatant-row">
                            <button
                                type="button"
                                className="action-button action-button--secondary bo-add-combatant-btn"
                                onClick={addCombatant}
                            >
                                <Plus size={16} /> Add Combatant Row
                            </button>
                        </div>

                        {/* End of the Round Effects */}
                        <div className="bo-end-effects-row">
                            <label className="bo-field-label text-label">
                                End of the Round Effects:
                            </label>
                            <input
                                type="text"
                                className="bo-input bo-input--underline text-label"
                                value={currentRound?.endOfRoundEffects || ''}
                                onChange={(e) => updateEndOfRoundEffects(e.target.value)}
                                placeholder="e.g. Sandstorm damage, Leftovers recovery, Burn ticks, Speed Boost activation"
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="bo-modal__footer">
                    <div className="bo-modal__footer-left">
                        {confirmClear ? (
                            <div className="bo-confirm-clear">
                                <span className="text-subtext">Clear entire Battle Organizer?</span>
                                <button
                                    type="button"
                                    className="action-button action-button--dark bo-footer-btn"
                                    onClick={() => setConfirmClear(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="action-button action-button--red bo-footer-btn"
                                    onClick={() => {
                                        clearAll();
                                        setConfirmClear(false);
                                    }}
                                >
                                    Confirm Reset
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="action-button action-button--dark bo-footer-btn"
                                onClick={() => setConfirmClear(true)}
                                title="Reset all battlefield and round data"
                            >
                                <RotateCcw size={14} /> Reset Sheet
                            </button>
                        )}
                    </div>

                    <div className="bo-modal__footer-right">
                        <button
                            type="button"
                            className="action-button action-button--dark bo-footer-btn"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
