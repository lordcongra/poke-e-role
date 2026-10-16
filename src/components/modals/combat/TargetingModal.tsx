import { useState, useEffect } from 'react';
import { Target, XCircle, Swords } from 'lucide-react';
import type { MoveData } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { parseCombatTags } from '../../../utils/tagParser/index';
import { getEffectsByCategory } from '../../../utils/combat/fieldEffectsData';
import { getWeatherDamageBonus } from '../../../utils/combat/combatUtils';
import { TooltipIcon } from '../../ui/TooltipIcon';
import { type TargetOption, loadAvailableTargets } from './targetingModalUtils';
import './TargetingModal.css';

interface TargetingModalProps {
    move: MoveData;
    baseDamage: number;
    onClose: () => void;
    onRoll: (
        baseDmg: number,
        isCrit: boolean,
        effectiveness: number,
        reduction: number,
        override: { active: boolean; type: 'dice' | 'flat' | 'dice-ignore'; value: number },
        fieldFactors?: string[]
    ) => void;
}

export function TargetingModal({ move, baseDamage, onClose, onRoll }: TargetingModalProps) {
    const [reduction, setReduction] = useState(0);
    const [isCrit, setIsCrit] = useState(false);
    const [effectiveness, setEffectiveness] = useState<number>(0);
    const [targets, setTargets] = useState<TargetOption[]>([]);
    const [appliedFieldFactors, setAppliedFieldFactors] = useState<string[]>([]);

    // Override States
    const [overrideType, setOverrideType] = useState<'none' | 'dice' | 'flat' | 'dice-ignore'>('none');
    const [overrideValue, setOverrideValue] = useState<number>(0);
    const [modalConfig, setModalConfig] = useState<{ title: string; content: string } | null>(null);

    const ruleset = useCharacterStore((state) => state.identity.ruleset);
    const activeTransformation = useCharacterStore((state) => state.identity.activeTransformation);
    const gmOnlyDamageOverride = useCharacterStore((state) => state.identity.gmOnlyDamageOverride);
    const bankedAccDice = useCharacterStore((state) => state.trackers.bankedAccDice);
    const role = useCharacterStore((state) => state.role);
    const isPhysicalMove = String(move.category).startsWith('Phys');

    const activeBattlefield = useCharacterStore((state) => state.activeBattlefield);
    const isNPC = useCharacterStore((state) => state.identity.isNPC);
    const hpCurr = useCharacterStore((state) => state.health.hpCurr);
    const hpMax = useCharacterStore((state) => state.health.hpMax);
    const isHalfHp = hpCurr <= Math.floor(hpMax / 2);
    const fullState = useCharacterStore.getState();
    const weatherInfo = getWeatherDamageBonus(
        move.type,
        activeBattlefield,
        isHalfHp,
        isNPC,
        fullState
    );

    const inventory = useCharacterStore((state) => state.inventory);
    const passives = useCharacterStore((state) => state.passives);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const itemBuffs = parseCombatTags(inventory, extraCategories, move, undefined, passives);
    const critDice = 2 + (itemBuffs.critDmg || 0);

    const bankedDice = (move.id && bankedAccDice[move.id]) || 0;
    const canOverride = isStandaloneMode || role === 'GM' || !gmOnlyDamageOverride;

    useEffect(() => {
        let isMounted = true;

        loadAvailableTargets(isPhysicalMove).then((loadedTargets) => {
            if (isMounted) {
                setTargets(loadedTargets);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [isPhysicalMove, ruleset]);

    const handleConfirm = () => {
        onRoll(
            baseDamage,
            isCrit,
            effectiveness,
            reduction,
            {
                active: overrideType !== 'none',
                // Fallback to 'dice' to satisfy the strict interface constraint when override is not active.
                type: overrideType === 'none' ? 'dice' : overrideType,
                value: overrideValue
            },
            appliedFieldFactors
        );
    };

    const handleTargetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === 'manual') {
            setAppliedFieldFactors([]);
            return;
        }

        const selectedTarget = targets.find((t) => t.id === val);
        if (selectedTarget) {
            let targetReduction = selectedTarget.def;
            const factors: string[] = [];

            // Automatically check SE if both combatants are Terastallized!
            let currentEff = effectiveness;
            if (activeTransformation === 'Terastallize' && selectedTarget.isTera) {
                currentEff = 1;
                setEffectiveness(1);
            }

            // Inspect activeBattlefield for weather and side force fields
            const activeBattlefield = useCharacterStore.getState().activeBattlefield;
            if (activeBattlefield) {
                const activeWeathers = getEffectsByCategory(activeBattlefield, 'weather');
                const isSandstorm = activeWeathers.some((w) => (w.name || '').trim().toLowerCase().includes('sand'));
                const isSnowy = activeWeathers.some((w) => {
                    const c = (w.name || '').trim().toLowerCase();
                    return (c.includes('snow') || c === 'snowy') && !c.includes('hail');
                });
                const isStrongWinds = activeWeathers.some((w) => {
                    const c = (w.name || '').trim().toLowerCase();
                    return c.includes('strong winds') || c.includes('delta stream');
                });

                if (isSandstorm && selectedTarget.types.includes('rock') && !isPhysicalMove) {
                    targetReduction += 1;
                    factors.push('Sandstorm (+1 Sp.Def)');
                }
                if (isSnowy && selectedTarget.types.includes('ice') && isPhysicalMove) {
                    targetReduction += 1;
                    factors.push('Snowy (+1 Def)');
                }
                if (isStrongWinds && selectedTarget.types.includes('flying') && currentEff > 0) {
                    setEffectiveness(0);
                    factors.push('Strong Winds (Neutral SE damage to Flying)');
                }

                const targetSide = selectedTarget.isPlayerSide
                    ? activeBattlefield.playerSide
                    : activeBattlefield.foeSide;

                if (targetSide) {
                    const allForceFields = [...(targetSide.forceFields || []), ...(targetSide.extraForceFields || [])];
                    const activeFields = allForceFields.filter(
                        (ff) => ff?.name?.trim() && (ff.remainingRounds > 0 || ff.remainingRounds === -1)
                    );

                    const hasReflect = activeFields.some((ff) => ff.name.toLowerCase().includes('reflect'));
                    const hasLightScreen = activeFields.some((ff) => ff.name.toLowerCase().includes('light screen'));
                    const hasAuroraVeil = activeFields.some((ff) => ff.name.toLowerCase().includes('aurora veil'));

                    if (hasReflect && isPhysicalMove) {
                        targetReduction += 1;
                        factors.push('Reflect (-1 Dmg)');
                    }
                    if (hasLightScreen && !isPhysicalMove) {
                        targetReduction += 1;
                        factors.push('Light Screen (-1 Dmg)');
                    }
                    if (hasAuroraVeil) {
                        targetReduction += 1;
                        factors.push('Aurora Veil (-1 Dmg)');
                    }
                }
            }

            setReduction(targetReduction);
            setAppliedFieldFactors(factors);
        }
    };

    return (
        <div className="targeting-modal__overlay">
            <div className="targeting-modal__content">
                <h3 className="targeting-modal__title modal-title-with-icon text-title-primary">
                    <Target size={20} /> Roll Damage
                </h3>

                <div
                    className="targeting-modal__sub-header text-subtext"
                    style={{
                        marginBottom: '14px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}
                >
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
                            (+{weatherInfo.diceBonus} {weatherInfo.tag.split(' ')[0]})
                        </span>
                    )}
                    {bankedDice > 0 && (
                        <span className="text-value-highlight" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            (+{bankedDice} Banked)
                        </span>
                    )}
                </div>

                <div className="targeting-modal__form-group">
                    <label className="targeting-modal__label text-label">Enemy Token:</label>
                    <select
                        onChange={handleTargetSelect}
                        className="targeting-modal__select text-label"
                        style={{ color: 'var(--text-main)' }}
                        defaultValue="manual"
                    >
                        <option value="manual">-- Manual Entry --</option>
                        {targets.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({isPhysicalMove ? 'DEF' : 'SPD'}: {t.def})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="targeting-modal__form-group targeting-modal__form-group--large">
                    <label className="targeting-modal__label text-label">
                        <span>{isPhysicalMove ? 'Defense' : 'Special Defense'}</span> Reduction:
                    </label>
                    <input
                        type="number"
                        value={reduction}
                        onChange={(e) => setReduction(Number(e.target.value) || 0)}
                        min="0"
                        className="targeting-modal__input text-value-highlight"
                    />
                    {appliedFieldFactors.length > 0 && (
                        <div
                            style={{ fontSize: '0.76rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}
                        >
                            Active Force Field Reduction: {appliedFieldFactors.join(', ')}
                        </div>
                    )}
                    {reduction > 0 && baseDamage + bankedDice - reduction <= 0 && overrideType === 'none' && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <em>
                                Defenses reduce pool to 0 — <strong>Minimum 1 Die</strong> will still be rolled.
                            </em>
                        </div>
                    )}
                </div>

                <div className="targeting-modal__form-group">
                    <label className="targeting-modal__label text-label">Effectiveness:</label>
                    <select
                        className="targeting-modal__select text-label"
                        style={{ color: 'var(--text-main)' }}
                        value={effectiveness}
                        onChange={(e) => setEffectiveness(Number(e.target.value))}
                    >
                        <option value={2}>
                            4x Super Effective (+2 Dmg{itemBuffs.seDmg > 0 ? `, +${itemBuffs.seDmg} SE Dice` : ''})
                        </option>
                        <option value={1}>
                            2x Super Effective (+1 Dmg{itemBuffs.seDmg > 0 ? `, +${itemBuffs.seDmg} SE Dice` : ''})
                        </option>
                        <option value={0}>1x Normal Effectiveness</option>
                        <option value={-1}>0.5x Not Very Effective (-1 Dmg)</option>
                        <option value={-2}>0.25x Not Very Effective (-2 Dmg)</option>
                    </select>
                </div>

                {canOverride && (
                    <div className="targeting-modal__override-box">
                        <label
                            className="targeting-modal__label text-label"
                            style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
                        >
                            Damage Override{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setModalConfig({
                                        title: 'Damage Override Modes',
                                        content:
                                            "Dice Pool (Vs Def): Sets the base dice rolled against the target's Defense.\n\nDice Pool (Ignore Def): Sets the base dice rolled but completely ignores the target's Defense reduction.\n\nTrue Damage (Flat): Bypasses rolling entirely and inflicts exact, flat damage directly onto the target."
                                    })
                                }
                            />
                        </label>
                        <div className="targeting-modal__override-row">
                            <select
                                className="targeting-modal__select text-label"
                                style={{ color: 'var(--text-main)', flex: 2 }}
                                value={overrideType}
                                onChange={(e) =>
                                    setOverrideType(e.target.value as 'none' | 'dice' | 'flat' | 'dice-ignore')
                                }
                            >
                                <option value="none">Disabled</option>
                                <option value="dice">Dice Pool (Vs Def)</option>
                                <option value="dice-ignore">Dice Pool (Ignore Def)</option>
                                <option value="flat">True Damage (Flat)</option>
                            </select>
                            {overrideType !== 'none' && (
                                <input
                                    type="number"
                                    value={overrideValue}
                                    onChange={(e) => setOverrideValue(Number(e.target.value) || 0)}
                                    className="targeting-modal__input text-value-highlight"
                                    style={{ flex: 1, marginTop: '2px' }}
                                />
                            )}
                        </div>
                    </div>
                )}

                <div className="targeting-modal__checkbox-row">
                    <label
                        className="targeting-modal__checkbox-label text-label"
                        style={{ color: 'var(--semantic-danger)', display: 'flex', gap: '6px', alignItems: 'center' }}
                    >
                        <input
                            type="checkbox"
                            checked={isCrit}
                            onChange={(e) => setIsCrit(e.target.checked)}
                            className="targeting-modal__checkbox"
                        />
                        Critical Hit? (+{critDice} Dice)
                        <TooltipIcon
                            onClick={() =>
                                setModalConfig({
                                    title: 'Critical Hit Modifiers',
                                    content:
                                        'Checking this box strictly applies Critical Hit modifiers to the roll (like triggering the Expert Belt or Sniper ability). It automatically adds the standard +2 Base Dice bonus.'
                                })
                            }
                        />
                    </label>
                </div>

                <div className="targeting-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark targeting-modal__btn text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className="action-button action-button--red targeting-modal__btn text-theme-header"
                        onClick={handleConfirm}
                    >
                        <Swords size={16} /> Roll
                    </button>
                </div>
            </div>

            {/* Nested Tooltip Popup */}
            {modalConfig && (
                <div className="targeting-info__overlay">
                    <div className="targeting-info__content">
                        <h3 className="targeting-info__title text-title-primary">{modalConfig.title}</h3>
                        <hr className="targeting-info__divider" />
                        <div
                            className="targeting-info__text text-subtext"
                            style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}
                        >
                            {modalConfig.content}
                        </div>
                        <div className="targeting-info__actions">
                            <button
                                type="button"
                                className="action-button action-button--dark targeting-modal__btn text-theme-header"
                                onClick={() => setModalConfig(null)}
                            >
                                <XCircle size={18} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
