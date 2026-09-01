import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { BattleOrganizerState } from '../../types/battleOrganizerTypes';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import './PrintBattleOrganizer.css';

interface PrintBattleOrganizerProps {
    onDone?: () => void;
    stateOverride?: BattleOrganizerState;
}

const STORAGE_KEY = 'pkr_battle_organizer_data';

export function PrintBattleOrganizer({ onDone, stateOverride }: PrintBattleOrganizerProps) {
    const [battleState, setBattleState] = useState<BattleOrganizerState | null>(() => {
        if (stateOverride) return stateOverride;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch {}
        return null;
    });

    const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let loadedState = stateOverride;
        if (!loadedState) {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    loadedState = JSON.parse(raw);
                }
            } catch {}
        }
        if (loadedState) {
            setBattleState(loadedState);
        }

        const resolveAllImages = async () => {
            if (!loadedState) {
                if (isMounted) setIsReady(true);
                return;
            }
            const imgMap: Record<string, string> = {};
            for (const round of loadedState.rounds) {
                for (const c of round.combatants) {
                    if (c.image && !imgMap[c.id]) {
                        if (isStandaloneMode && c.image.startsWith('local-img:')) {
                            try {
                                const url = await imageManager.getImageUrl(c.image);
                                if (url) imgMap[c.id] = url;
                            } catch {}
                        } else if (c.image.startsWith('http') || c.image.startsWith('data:') || c.image.startsWith('blob:')) {
                            imgMap[c.id] = c.image;
                        }
                    }
                }
            }
            if (isMounted) {
                setResolvedImages(imgMap);
                setIsReady(true);
            }
        };

        resolveAllImages();

        return () => {
            isMounted = false;
        };
    }, [stateOverride]);

    useEffect(() => {
        if (isReady) {
            const handleAfterPrint = () => {
                if (onDone) onDone();
            };

            window.addEventListener('afterprint', handleAfterPrint);
            const timer = setTimeout(() => {
                window.print();
            }, 300);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('afterprint', handleAfterPrint);
            };
        }
    }, [isReady, onDone]);

    if (!battleState) return null;

    const { battlefield, rounds } = battleState;

    const renderBoxes = (count: number, max = 4) => {
        return (
            <div className="print-bo-boxes">
                {Array.from({ length: max }, (_, idx) => (
                    <div
                        key={idx}
                        className={`print-bo-box ${idx < count ? 'print-bo-box--filled' : ''}`}
                    >
                        {idx < count ? '✓' : ''}
                    </div>
                ))}
            </div>
        );
    };

    const printContent = (
        <div className="print-bo-wrapper">
            {/* Battlefield Section */}
            <div className="print-bo-card print-bo-card--battlefield">
                <div className="print-bo-card-header-bar">
                    <div className="print-bo-pill-header">
                        <span>Battlefield</span>
                    </div>
                </div>

                <div className="print-bo-location-row">
                    <span className="print-bo-label">Battlefield Location:</span>
                    <span className="print-bo-underline-text">{battlefield.location || '________________________'}</span>
                </div>

                {/* Global Row */}
                <div className="print-bo-global-row">
                    <div className="print-bo-effect-block">
                        <div className="print-bo-effect-header">
                            <span className="print-bo-label">Active Weather</span>
                            <span className="print-bo-sublabel">Remaining Rounds</span>
                        </div>
                        <div className="print-bo-effect-body">
                            <span className="print-bo-underline-text">{battlefield.weather.name || '________________'}</span>
                            {renderBoxes(battlefield.weather.remainingRounds)}
                        </div>
                    </div>

                    <div className="print-bo-effect-block">
                        <div className="print-bo-effect-header">
                            <span className="print-bo-label">Active Terrain</span>
                            <span className="print-bo-sublabel">Remaining Rounds</span>
                        </div>
                        <div className="print-bo-effect-body">
                            <span className="print-bo-underline-text">{battlefield.terrain.name || '________________'}</span>
                            {renderBoxes(battlefield.terrain.remainingRounds)}
                        </div>
                    </div>

                    <div className="print-bo-effect-block">
                        <div className="print-bo-effect-header">
                            <span className="print-bo-label">Other</span>
                            <span className="print-bo-sublabel">Remaining Rounds</span>
                        </div>
                        <div className="print-bo-effect-body">
                            <span className="print-bo-underline-text">{battlefield.other.name || '________________'}</span>
                            {renderBoxes(battlefield.other.remainingRounds)}
                        </div>
                    </div>
                </div>

                {/* Split Stadium Row */}
                <div className="print-bo-stadium-split">
                    {/* Player's Side */}
                    <div className="print-bo-side print-bo-side--player">
                        <h2 className="print-bo-side-title">Player's Side</h2>

                        <div className="print-bo-field-line">
                            <div className="print-bo-field-header">
                                <span className="print-bo-label">Force Field</span>
                                <span className="print-bo-sublabel">Remaining Rounds</span>
                            </div>
                            <div className="print-bo-line-body">
                                <span className="print-bo-underline-text">{battlefield.playerSide.forceFields[0].name || '____________________'}</span>
                                {renderBoxes(battlefield.playerSide.forceFields[0].remainingRounds)}
                            </div>
                            <div className="print-bo-line-body">
                                <span className="print-bo-underline-text">{battlefield.playerSide.forceFields[1].name || '____________________'}</span>
                                {renderBoxes(battlefield.playerSide.forceFields[1].remainingRounds)}
                            </div>
                        </div>

                        <div className="print-bo-subgrid">
                            <div className="print-bo-subitem">
                                <span className="print-bo-label">Entry Hazard</span>
                                <span className="print-bo-underline-text">{battlefield.playerSide.entryHazard || '________________'}</span>
                            </div>
                            <div className="print-bo-subitem">
                                <span className="print-bo-label">Cover</span>
                                <span className="print-bo-underline-text">{battlefield.playerSide.cover || '________________'}</span>
                            </div>
                        </div>

                        <div className="print-bo-subitem" style={{ marginTop: '4px' }}>
                            <span className="print-bo-label">Other</span>
                            <span className="print-bo-underline-text">{battlefield.playerSide.other || '________________'}</span>
                        </div>
                    </div>

                    {/* Center Pitch Graphic */}
                    <div className="print-bo-pitch-center">
                        <svg viewBox="0 0 160 110" className="print-bo-pitch-svg">
                            <rect x="5" y="5" width="150" height="100" rx="14" ry="14" fill="#f0f0f0" stroke="#000" strokeWidth="2" />
                            <rect x="5" y="5" width="75" height="100" fill="#e8f5e9" stroke="#000" strokeWidth="1" />
                            <rect x="80" y="5" width="75" height="100" fill="#ffebee" stroke="#000" strokeWidth="1" />
                            <rect x="5" y="35" width="20" height="40" fill="none" stroke="#000" strokeWidth="1.5" />
                            <rect x="135" y="35" width="20" height="40" fill="none" stroke="#000" strokeWidth="1.5" />
                            <line x1="80" y1="5" x2="80" y2="105" stroke="#000" strokeWidth="2" />
                            <circle cx="80" cy="55" r="16" fill="none" stroke="#000" strokeWidth="2" />
                            <circle cx="80" cy="55" r="8" fill="#fff" stroke="#000" strokeWidth="1.5" />
                            <circle cx="80" cy="55" r="3.5" fill="#000" />
                            <line x1="64" y1="55" x2="96" y2="55" stroke="#000" strokeWidth="1.5" />
                        </svg>

                        <div className="print-bo-targets">
                            <span className="print-bo-targets-label">Number of Targets</span>
                            <div className="print-bo-targets-boxes">
                                <div className="print-bo-target-box">{battlefield.playerTargets || ' '}</div>
                                <div className="print-bo-target-box">{battlefield.foeTargets || ' '}</div>
                            </div>
                        </div>
                    </div>

                    {/* Foe's Side */}
                    <div className="print-bo-side print-bo-side--foe">
                        <h2 className="print-bo-side-title">Foe's Side</h2>

                        <div className="print-bo-field-line">
                            <div className="print-bo-field-header">
                                <span className="print-bo-label">Force Field</span>
                                <span className="print-bo-sublabel">Remaining Rounds</span>
                            </div>
                            <div className="print-bo-line-body">
                                <span className="print-bo-underline-text">{battlefield.foeSide.forceFields[0].name || '____________________'}</span>
                                {renderBoxes(battlefield.foeSide.forceFields[0].remainingRounds)}
                            </div>
                            <div className="print-bo-line-body">
                                <span className="print-bo-underline-text">{battlefield.foeSide.forceFields[1].name || '____________________'}</span>
                                {renderBoxes(battlefield.foeSide.forceFields[1].remainingRounds)}
                            </div>
                        </div>

                        <div className="print-bo-subgrid">
                            <div className="print-bo-subitem">
                                <span className="print-bo-label">Entry Hazard</span>
                                <span className="print-bo-underline-text">{battlefield.foeSide.entryHazard || '________________'}</span>
                            </div>
                            <div className="print-bo-subitem">
                                <span className="print-bo-label">Cover</span>
                                <span className="print-bo-underline-text">{battlefield.foeSide.cover || '________________'}</span>
                            </div>
                        </div>

                        <div className="print-bo-subitem" style={{ marginTop: '4px' }}>
                            <span className="print-bo-label">Other</span>
                            <span className="print-bo-underline-text">{battlefield.foeSide.other || '________________'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rounds Sections - Prints all rounds in the battle tracker */}
            {rounds.map((round) => (
                <div key={round.id} className="print-bo-card print-bo-card--round">
                    <div className="print-bo-card-header-bar">
                        <div className="print-bo-pill-header print-bo-pill-header--round">
                            <span>Round</span>
                            <div className="print-bo-round-box">{round.roundNumber}</div>
                        </div>
                    </div>

                    <table className="print-bo-table">
                        <thead>
                            <tr>
                                <th style={{ width: '6%', textAlign: 'center' }}>Init</th>
                                <th style={{ width: '16%' }}>Combatant</th>
                                <th style={{ width: '14%' }}>Held Item</th>
                                <th style={{ width: '10%' }}>Status</th>
                                <th style={{ width: '54%', textAlign: 'center' }}>Action Counter (1 - 5)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {round.combatants.map((c) => {
                                const imgSrc = resolvedImages[c.id] || (c.image && (c.image.startsWith('http') || c.image.startsWith('data:') || c.image.startsWith('blob:')) ? c.image : '');
                                const statusItems = (c.status || '')
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean);

                                return (
                                    <tr key={c.id}>
                                        <td className="print-bo-cell-underline print-bo-cell-init">{c.initiative || ' '}</td>
                                        <td className="print-bo-cell-underline print-bo-cell-combatant">
                                            <div className="print-bo-combatant-box">
                                                {imgSrc ? (
                                                    <img
                                                        src={imgSrc}
                                                        alt=""
                                                        className="print-bo-combatant-img"
                                                    />
                                                ) : null}
                                                <div className="print-bo-combatant-details">
                                                    <strong className="print-bo-combatant-name">{c.name || ' '}</strong>
                                                    {c.isFainted && <span className="print-bo-fainted-tag">[FAINTED]</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="print-bo-cell-underline print-bo-cell-item">{c.heldItem || ' '}</td>
                                        <td className="print-bo-cell-underline print-bo-cell-status">
                                            <div className="print-bo-status-list">
                                                {statusItems.length > 0 ? (
                                                    statusItems.map((st, sIdx) => (
                                                        <div key={sIdx} className="print-bo-status-item">
                                                            {st}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span>Healthy</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="print-bo-actions-row">
                                                {c.actions.map((act, actIdx) => (
                                                    <div key={actIdx} className="print-bo-action-col">
                                                        <div className="print-bo-action-box">
                                                            <span className="print-bo-action-text">{act.text}</span>
                                                        </div>
                                                        <span className="print-bo-action-indicator">
                                                            <strong style={{ color: act.status === 'success' ? '#2e7d32' : act.status === 'failed' ? '#c62828' : '#888' }}>
                                                                {act.status === 'success' ? '✓' : act.status === 'failed' ? '✗' : '—'}
                                                            </strong>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="print-bo-end-row">
                        <span className="print-bo-label">End of the Round Effects:</span>
                        <span className="print-bo-underline-text">{round.endOfRoundEffects || '________________________________________________'}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    return createPortal(printContent, document.body);
}
