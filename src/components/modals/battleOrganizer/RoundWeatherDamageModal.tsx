import { useState, useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { CloudRain, Wind, Snowflake, X, Check, FastForward } from 'lucide-react';
import { isStandaloneMode, storageAdapter } from '../../../utils/sync/storageAdapter';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import './RoundWeatherDamageModal.css';

interface RoundWeatherDamageModalProps {
    isOpen: boolean;
    weatherName: string;
    combatants: CombatantRowData[];
    onApplyDamage: (selectedCombatantIds: string[]) => void;
    onSkip: () => void;
    onClose: () => void;
}

interface CombatantImmunityStatus {
    combatant: CombatantRowData;
    types: string[];
    isImmune: boolean;
    reason: string;
}

export function RoundWeatherDamageModal({
    isOpen,
    weatherName,
    combatants,
    onApplyDamage,
    onSkip,
    onClose
}: RoundWeatherDamageModalProps) {
    const [statuses, setStatuses] = useState<CombatantImmunityStatus[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const isSandstorm = weatherName.toLowerCase().includes('sand');
    const isHail = weatherName.toLowerCase().includes('hail');

    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;

        async function resolveImmunities() {
            // Sort combatants in initiative order (descending)
            const sorted = [...combatants].sort((a, b) => {
                const initA = parseFloat(a.initiative) || 0;
                const initB = parseFloat(b.initiative) || 0;
                return initB - initA;
            });

            // Gather token metadata to extract types
            const tokenTypeMap = new Map<string, string[]>();

            try {
                if (OBR.isAvailable && !isStandaloneMode) {
                    const items = await OBR.scene.items.getItems((i) => i.layer === 'CHARACTER');
                    items.forEach((item) => {
                        const meta = item.metadata as Record<string, unknown>;
                        const pmdMeta = (meta['pokerole-pmd-extension/stats'] || {}) as Record<string, unknown>;
                        const statsMeta = (meta['pokerole-extension/stats'] || {}) as Record<string, unknown>;

                        const type1 = String(meta['type1'] || pmdMeta['type1'] || statsMeta['type1'] || '');
                        const type2 = String(meta['type2'] || pmdMeta['type2'] || statsMeta['type2'] || '');
                        const types = [type1, type2].filter(Boolean);
                        tokenTypeMap.set(item.id, types);
                        if (item.name) tokenTypeMap.set(item.name.toLowerCase().trim(), types);
                    });
                } else {
                    const localChars = await storageAdapter.getLocalCharacters();
                    localChars.forEach((c) => {
                        const meta = c.metadata || {};
                        const type1 = String(meta['type1'] || '');
                        const type2 = String(meta['type2'] || '');
                        const types = [type1, type2].filter(Boolean);
                        tokenTypeMap.set(c.id, types);
                        if (c.name) tokenTypeMap.set(c.name.toLowerCase().trim(), types);
                    });
                }
            } catch (err) {
                console.warn('[RoundWeatherDamageModal] Failed to inspect token types:', err);
            }

            if (isCancelled) return;

            const resolved: CombatantImmunityStatus[] = sorted.map((c) => {
                const types =
                    (c.tokenId && tokenTypeMap.get(c.tokenId)) ||
                    tokenTypeMap.get(c.name.toLowerCase().trim()) ||
                    [];

                const cleanTypes = types.map((t) => t.toLowerCase());

                let isImmune = false;
                let reason = 'Vulnerable (1 Dmg)';

                if (c.isFainted || (c.hpCurr !== undefined && c.hpCurr <= 0)) {
                    isImmune = true;
                    reason = 'Fainted';
                } else if (isSandstorm) {
                    if (
                        cleanTypes.includes('rock') ||
                        cleanTypes.includes('ground') ||
                        cleanTypes.includes('steel')
                    ) {
                        isImmune = true;
                        const match = types.find((t) =>
                            ['rock', 'ground', 'steel'].includes(t.toLowerCase())
                        );
                        reason = `Immune (${match || 'Type'})`;
                    }
                } else if (isHail) {
                    if (cleanTypes.includes('ice')) {
                        isImmune = true;
                        reason = 'Immune (Ice)';
                    }
                }

                return {
                    combatant: c,
                    types,
                    isImmune,
                    reason
                };
            });

            setStatuses(resolved);

            // Pre-select all non-immune combatants
            const preselected = new Set<string>();
            resolved.forEach((item) => {
                if (!item.isImmune) {
                    preselected.add(item.combatant.id);
                }
            });
            setSelectedIds(preselected);
        }

        resolveImmunities();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, combatants, isSandstorm, isHail]);

    if (!isOpen) return null;

    const handleToggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleApply = () => {
        onApplyDamage(Array.from(selectedIds));
    };

    const selectedCount = selectedIds.size;

    return (
        <div className="bo-weather-dmg-modal__overlay" onClick={onClose}>
            <div
                className="bo-weather-dmg-modal__content"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="bo-weather-dmg-title"
            >
                <div className="bo-weather-dmg-modal__header">
                    <h3 id="bo-weather-dmg-title" className="bo-weather-dmg-modal__title">
                        {isSandstorm ? (
                            <Wind size={18} color="#E0C068" />
                        ) : isHail ? (
                            <Snowflake size={18} color="#70A0C0" />
                        ) : (
                            <CloudRain size={18} color="var(--primary)" />
                        )}
                        End of Round: {weatherName} Damage
                    </h3>
                    <button
                        type="button"
                        className="bo-weather-dmg-modal__close-btn"
                        onClick={onClose}
                        title="Cancel"
                        aria-label="Cancel"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="bo-weather-dmg-modal__body">
                    <p className="bo-weather-dmg-modal__desc">
                        {isSandstorm
                            ? 'Sandstorm deals 1 Typeless Damage to all non-Rock, non-Ground, and non-Steel combatants at end of round. Full Body Cover or special abilities prevent this damage.'
                            : isHail
                              ? 'Hail deals 1 Typeless Damage to all non-Ice combatants at end of round. Full Body Cover or special abilities prevent this damage.'
                              : 'Active weather hazard deals 1 damage to affected combatants at end of round.'}
                    </p>

                    <div className="bo-weather-dmg-modal__list">
                        {statuses.map(({ combatant: c, isImmune, reason }) => {
                            const isChecked = selectedIds.has(c.id);
                            return (
                                <div
                                    key={c.id}
                                    className={`bo-weather-dmg-modal__row ${isImmune ? 'is-immune' : ''}`}
                                    onClick={() => handleToggle(c.id)}
                                >
                                    <div className="bo-weather-dmg-modal__left">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggle(c.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bo-weather-dmg-modal__checkbox"
                                        />
                                        {c.image && (
                                            <img
                                                src={c.image}
                                                alt={c.name}
                                                className="bo-weather-dmg-modal__avatar"
                                            />
                                        )}
                                        <span className="bo-weather-dmg-modal__name">{c.name}</span>
                                        <span className="bo-weather-dmg-modal__init-badge">
                                            Init {c.initiative || '0'}
                                        </span>
                                    </div>

                                    <div className="bo-weather-dmg-modal__right">
                                        {c.hpCurr !== undefined && (
                                            <span className="bo-weather-dmg-modal__hp-info">
                                                HP: {c.hpCurr}/{c.hpMax ?? c.hpCurr}
                                            </span>
                                        )}
                                        <span
                                            className={`bo-weather-dmg-modal__status-tag ${
                                                reason === 'Fainted'
                                                    ? 'bo-weather-dmg-modal__status-tag--fainted'
                                                    : isImmune
                                                      ? 'bo-weather-dmg-modal__status-tag--immune'
                                                      : 'bo-weather-dmg-modal__status-tag--vulnerable'
                                            }`}
                                        >
                                            {reason}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bo-weather-dmg-modal__footer">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onSkip}
                        title="Skip applying weather damage and advance to next round"
                    >
                        <FastForward size={14} /> Skip Damage & Advance
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--theme"
                        onClick={handleApply}
                        title="Apply 1 damage to checked combatants and advance round"
                    >
                        <Check size={14} />
                        {selectedCount > 0
                            ? `Apply 1 Damage to Selected (${selectedCount})`
                            : 'Advance Round'}
                    </button>
                </div>
            </div>
        </div>
    );
}
