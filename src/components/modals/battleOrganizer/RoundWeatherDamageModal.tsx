import { useState, useEffect } from 'react';
import { CloudRain, Wind, Snowflake, Sun, Sprout, Flame, Heart, X, Check, FastForward, Sparkles } from 'lucide-react';
import type { CombatantRowData, BattlefieldData } from '../../../types/battleOrganizerTypes';
import {
    getCombatantCharacterDataMap,
    resolveCombatantRoundTriggers,
    type CombatantRoundTriggerInfo
} from './roundAdvanceTriggerUtils';
import './RoundWeatherDamageModal.css';

export interface RoundWeatherDamageModalProps {
    isOpen: boolean;
    battlefield: BattlefieldData;
    combatants: CombatantRowData[];
    weatherName?: string;
    onApplyDamageAndHeal?: (selectedDamageIds: string[], selectedHealIds: string[]) => void;
    onApplyDamage?: (selectedCombatantIds: string[]) => void;
    onSkip: () => void;
    onClose: () => void;
}

export function RoundWeatherDamageModal({
    isOpen,
    battlefield,
    combatants,
    weatherName = 'Weather',
    onApplyDamageAndHeal,
    onApplyDamage,
    onSkip,
    onClose
}: RoundWeatherDamageModalProps) {
    const [statuses, setStatuses] = useState<CombatantRoundTriggerInfo[]>([]);
    const [selectedDamageIds, setSelectedDamageIds] = useState<Set<string>>(new Set());
    const [selectedHealIds, setSelectedHealIds] = useState<Set<string>>(new Set());

    const isSandstorm = (weatherName || '').toLowerCase().includes('sand');
    const isHail = (weatherName || '').toLowerCase().includes('hail');
    const isSun = (weatherName || '').toLowerCase().includes('sun');
    const isRain = (weatherName || '').toLowerCase().includes('rain');
    const isGrassy = (battlefield?.terrain?.name || '').toLowerCase().includes('grassy');

    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;

        async function resolveAllTriggers() {
            const dataMap = await getCombatantCharacterDataMap();
            if (isCancelled) return;

            const resolved = resolveCombatantRoundTriggers(combatants, battlefield, dataMap);
            setStatuses(resolved);

            // Pre-select non-immune damage targets
            const preselectedDamage = new Set<string>();
            resolved.forEach((item) => {
                if (item.hasDamageTrigger && !item.isDamageImmune) {
                    preselectedDamage.add(item.combatant.id);
                }
            });
            setSelectedDamageIds(preselectedDamage);

            // Pre-select eligible healing targets (not at full HP)
            const preselectedHeal = new Set<string>();
            resolved.forEach((item) => {
                if (
                    item.hasHealingTrigger &&
                    !item.isHealingIneligible &&
                    (item.combatant.hpCurr === undefined ||
                        item.combatant.hpCurr < (item.combatant.hpMax ?? item.combatant.hpCurr))
                ) {
                    preselectedHeal.add(item.combatant.id);
                }
            });
            setSelectedHealIds(preselectedHeal);
        }

        resolveAllTriggers();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, combatants, battlefield]);

    if (!isOpen) return null;

    const handleToggleDamage = (id: string) => {
        setSelectedDamageIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleHeal = (id: string) => {
        setSelectedHealIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleApply = () => {
        if (onApplyDamageAndHeal) {
            onApplyDamageAndHeal(Array.from(selectedDamageIds), Array.from(selectedHealIds));
        } else if (onApplyDamage) {
            onApplyDamage(Array.from(selectedDamageIds));
        }
    };

    const damageStatuses = statuses.filter((s) => s.hasDamageTrigger);
    const healStatuses = statuses.filter((s) => s.hasHealingTrigger);

    const damageCount = selectedDamageIds.size;
    const healCount = selectedHealIds.size;

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
                        ) : isSun ? (
                            <Sun size={18} color="#F08030" />
                        ) : isRain ? (
                            <CloudRain size={18} color="var(--primary)" />
                        ) : isGrassy ? (
                            <Sprout size={18} color="#78C850" />
                        ) : (
                            <Sparkles size={18} color="var(--primary)" />
                        )}
                        End of Round: Battlefield &amp; Weather Effects
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
                        Review active end-of-round damage and healing triggers before advancing to the next round.
                        Checked combatants will receive the corresponding effect.
                    </p>

                    <div className="bo-weather-dmg-modal__list">
                        {/* 1. DAMAGE EFFECTS */}
                        {damageStatuses.length > 0 && (
                            <div className="bo-weather-dmg-modal__section">
                                <div className="bo-weather-dmg-modal__section-header">
                                    <Flame size={14} color="#ef5350" />
                                    <span>Damage Effects (Sandstorm, Hail, Solar Power, Dry Skin)</span>
                                </div>
                                {damageStatuses.map(
                                    ({ combatant: c, isDamageImmune, damageReason, damageImmuneReason }) => {
                                        const isChecked = selectedDamageIds.has(c.id);
                                        return (
                                            <div
                                                key={`dmg-${c.id}`}
                                                className={`bo-weather-dmg-modal__row ${isDamageImmune ? 'is-immune' : ''}`}
                                                onClick={() => handleToggleDamage(c.id)}
                                            >
                                                <div className="bo-weather-dmg-modal__left">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleToggleDamage(c.id)}
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
                                                            damageReason === 'Fainted' || damageImmuneReason === 'Fainted'
                                                                ? 'bo-weather-dmg-modal__status-tag--fainted'
                                                                : isDamageImmune
                                                                  ? 'bo-weather-dmg-modal__status-tag--immune'
                                                                  : 'bo-weather-dmg-modal__status-tag--vulnerable'
                                                        }`}
                                                    >
                                                        {damageReason || damageImmuneReason}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}

                        {/* 2. HEALING EFFECTS */}
                        {healStatuses.length > 0 && (
                            <div className="bo-weather-dmg-modal__section" style={{ marginTop: '8px' }}>
                                <div className="bo-weather-dmg-modal__section-header">
                                    <Heart size={14} color="#81c784" />
                                    <span>Healing Effects (Grassy Terrain, Rain Dish, Ice Body, Dry Skin)</span>
                                </div>
                                {healStatuses.map(
                                    ({ combatant: c, isHealingIneligible, healingReason, healingIneligibleReason }) => {
                                        const isChecked = selectedHealIds.has(c.id);
                                        const isFullHp = healingIneligibleReason === 'Full HP';
                                        return (
                                            <div
                                                key={`heal-${c.id}`}
                                                className={`bo-weather-dmg-modal__row ${
                                                    isHealingIneligible ? 'is-immune' : ''
                                                }`}
                                                onClick={() => handleToggleHeal(c.id)}
                                            >
                                                <div className="bo-weather-dmg-modal__left">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleToggleHeal(c.id)}
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
                                                            isFullHp
                                                                ? 'bo-weather-dmg-modal__status-tag--fullhp'
                                                                : isHealingIneligible
                                                                  ? 'bo-weather-dmg-modal__status-tag--fainted'
                                                                  : 'bo-weather-dmg-modal__status-tag--heal'
                                                        }`}
                                                    >
                                                        {isFullHp ? 'Full HP' : healingReason}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bo-weather-dmg-modal__footer">
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        onClick={onSkip}
                        title="Skip applying effects and advance to next round"
                    >
                        <FastForward size={14} /> Skip Effects &amp; Advance
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--theme"
                        onClick={handleApply}
                        title="Apply checked effects to combatants and advance round"
                    >
                        <Check size={14} />
                        {damageCount > 0 && healCount > 0
                            ? `Apply (${damageCount} Dmg, ${healCount} Heal) & Advance`
                            : damageCount > 0
                              ? `Apply 1 Damage to Selected (${damageCount}) & Advance`
                              : healCount > 0
                                ? `Apply 1 Heal to Selected (${healCount}) & Advance`
                                : 'Advance Round'}
                    </button>
                </div>
            </div>
        </div>
    );
}
