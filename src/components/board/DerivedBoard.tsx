import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, Skill } from '../../types/enums';
import { rollDicePlus } from '../../utils/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import { NumberSpinner } from '../ui/NumberSpinner';
import { Dices, Shield, AlertTriangle, Sparkles, XCircle, Trash2 } from 'lucide-react';
import { ResourceBox } from '../ui/ResourceBox';
import { TooltipIcon } from '../ui/TooltipIcon';
import { StatusBox } from '../board/StatusBox';
import { TimerBox } from './TimerBox';
import { parseCombatTags, getAbilityText, calculateStatTotal, calculateSkillTotal } from '../../utils/combatUtils';
import './DerivedBoard.css';

const ICON_SHADOW = 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6))';

export function DerivedBoard() {
    const ruleset = useCharacterStore((state) => state.identity.ruleset);
    const mode = useCharacterStore((state) => state.identity.mode);
    const ability = useCharacterStore((state) => state.identity.ability);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);

    const health = useCharacterStore((state) => state.health);
    const will = useCharacterStore((state) => state.will);
    const updateHealth = useCharacterStore((state) => state.updateHealth);
    const updateWill = useCharacterStore((state) => state.updateWill);

    useCharacterStore((state) => state.stats);
    useCharacterStore((state) => state.skills);

    const derived = useCharacterStore((state) => state.derived);
    const setDerived = useCharacterStore((state) => state.setDerived);

    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    const [showAddTempModal, setShowAddTempModal] = useState(false);
    const [newTempHp, setNewTempHp] = useState(0);
    const [showTempConfirm, setShowTempConfirm] = useState(false);

    const [showAddTempWillModal, setShowAddTempWillModal] = useState(false);
    const [newTempWill, setNewTempWill] = useState(0);
    const [showTempWillConfirm, setShowTempWillConfirm] = useState(false);

    const abilityText = getAbilityText(ability, customAbilities);
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText);
    const fullState = useCharacterStore.getState();

    const vitTotal = calculateStatTotal(CombatStat.VIT, fullState, inventoryModifiers);
    const insTotal = calculateStatTotal(CombatStat.INS, fullState, inventoryModifiers);
    const dexTotal = calculateStatTotal(CombatStat.DEX, fullState, inventoryModifiers);
    const strTotal = calculateStatTotal(CombatStat.STR, fullState, inventoryModifiers);
    const speTotal = calculateStatTotal(CombatStat.SPE, fullState, inventoryModifiers);

    const defTotal = Math.max(1, vitTotal + derived.defBuff - derived.defDebuff + inventoryModifiers.def);
    let sdefBase = insTotal;
    if (ruleset === 'tabletop') sdefBase = vitTotal;
    const sdefTotal = Math.max(1, sdefBase + derived.sdefBuff - derived.sdefDebuff + inventoryModifiers.spd);

    const alertTotal = calculateSkillTotal(Skill.ALERT, fullState, inventoryModifiers);
    const initiative = dexTotal + alertTotal + inventoryModifiers.init;

    const clashPhysical = strTotal + calculateSkillTotal(Skill.CLASH, fullState, inventoryModifiers);
    const clashSpecial = speTotal + calculateSkillTotal(Skill.CLASH, fullState, inventoryModifiers);

    return (
        <CollapsingSection title="INFO">
            <div className="derived-board__container">
                <div className="derived-board__health-row">
                    <div className="derived-board__health-box">
                        <ResourceBox
                            title="HP"
                            curr={health.hpCurr}
                            max={health.hpMax}
                            base={health.hpBase}
                            temp={health.temporaryHitPoints}
                            tempMax={health.temporaryHitPointsMax}
                            tempType="hp"
                            color="var(--primary)"
                            onCurrChange={(value: number) => updateHealth('hpCurr', value)}
                            onBaseChange={(value: number) => updateHealth('hpBase', value)}
                            onTempChange={(value: number) => updateHealth('temporaryHitPoints', value)}
                            onClearTemp={() => setShowTempConfirm(true)}
                            onAddTempClick={() => {
                                setNewTempHp(health.temporaryHitPointsMax || 0);
                                setShowAddTempModal(true);
                            }}
                        />
                    </div>
                    <div className="derived-board__health-box">
                        <ResourceBox
                            title="WILL"
                            curr={will.willCurr}
                            max={will.willMax}
                            base={will.willBase}
                            temp={will.temporaryWill}
                            tempMax={will.temporaryWillMax}
                            tempType="will"
                            color="#2196F3"
                            onCurrChange={(value: number) => updateWill('willCurr', value)}
                            onBaseChange={(value: number) => updateWill('willBase', value)}
                            onTempChange={(value: number) => updateWill('temporaryWill', value)}
                            onClearTemp={() => setShowTempWillConfirm(true)}
                            onAddTempClick={() => {
                                setNewTempWill(will.temporaryWillMax || 0);
                                setShowAddTempWillModal(true);
                            }}
                        />
                    </div>
                    <StatusBox />
                </div>

                <div className="derived-board__health-row">
                    <div className="sheet-panel health-section__box derived-board__box derived-board__box--primary-border">
                        <div className="derived-board__box-header theme-header--primary derived-board__box-header--medium">
                            DEFENSE
                        </div>
                        <div className="derived-board__box-content text-label" style={{ color: 'var(--text-main)' }}>
                            <span className="text-subtext" style={{ color: 'var(--text-main)' }}>
                                Total: <strong>{defTotal}</strong>
                            </span>
                            <span className="derived-board__plus">+</span>
                            <NumberSpinner
                                value={derived.defBuff}
                                onChange={(value: number) => setDerived('defBuff', value)}
                                min={0}
                            />
                            <span className="derived-board__minus">-</span>
                            <NumberSpinner
                                value={derived.defDebuff}
                                onChange={(value: number) => setDerived('defDebuff', value)}
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="sheet-panel health-section__box derived-board__box derived-board__box--primary-border">
                        <div className="derived-board__box-header theme-header--primary derived-board__box-header--medium">
                            SPEC. DEFENSE
                        </div>
                        <div className="derived-board__box-content text-label" style={{ color: 'var(--text-main)' }}>
                            <span className="text-subtext" style={{ color: 'var(--text-main)' }}>
                                Total: <strong>{sdefTotal}</strong>
                            </span>
                            <span className="derived-board__plus">+</span>
                            <NumberSpinner
                                value={derived.sdefBuff}
                                onChange={(value: number) => setDerived('sdefBuff', value)}
                                min={0}
                            />
                            <span className="derived-board__minus">-</span>
                            <NumberSpinner
                                value={derived.sdefDebuff}
                                onChange={(value: number) => setDerived('sdefDebuff', value)}
                                min={0}
                            />
                        </div>
                    </div>

                    <TimerBox />
                </div>

                <div className="derived-board__health-row">
                    <div
                        className={`derived-board__group-left ${mode !== 'Pokémon' ? 'derived-board__group-left--full' : ''}`}
                    >
                        <div className="sheet-panel health-section__box derived-board__box derived-board__box--large derived-board__box--secondary-border">
                            <div className="derived-board__box-header theme-header--secondary derived-board__box-header--small">
                                INITIATIVE{' '}
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({ title: 'Initiative', desc: 'Initiative: Dexterity + Alert' })
                                    }
                                />
                            </div>
                            <div
                                className="derived-board__box-content text-label"
                                style={{ color: 'var(--text-main)' }}
                            >
                                1d6 + {initiative}
                                <button
                                    className="action-button action-button--dark derived-board__roll-btn text-theme-header"
                                    onClick={() =>
                                        rollDicePlus(`1d6+${initiative}`, 'Initiative', 'init', String(initiative))
                                    }
                                >
                                    <Dices size={16} style={{ filter: ICON_SHADOW }} />
                                </button>
                            </div>
                        </div>
                        <div className="sheet-panel health-section__box derived-board__box derived-board__box--secondary-border">
                            <div className="derived-board__box-header theme-header--secondary derived-board__box-header--small">
                                EVADE{' '}
                                <TooltipIcon
                                    onClick={() =>
                                        setTooltipInfo({ title: 'Evade', desc: 'Evade: Dexterity + Evasion' })
                                    }
                                />
                            </div>
                            <div
                                className="derived-board__box-content text-label"
                                style={{ color: 'var(--text-main)' }}
                            >
                                {dexTotal + calculateSkillTotal(Skill.EVASION, fullState, inventoryModifiers)}
                            </div>
                        </div>

                        {mode === 'Pokémon' && (
                            <>
                                <div className="sheet-panel health-section__box derived-board__box derived-board__box--secondary-border">
                                    <div className="derived-board__box-header theme-header--secondary derived-board__box-header--small">
                                        CLASH(P){' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Physical Clash',
                                                    desc: 'Physical Clash: Strength + Clash'
                                                })
                                            }
                                        />
                                    </div>
                                    <div
                                        className="derived-board__box-content text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        {clashPhysical}
                                    </div>
                                </div>
                                <div className="sheet-panel health-section__box derived-board__box derived-board__box--secondary-border">
                                    <div className="derived-board__box-header theme-header--secondary derived-board__box-header--small">
                                        CLASH(S){' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Special Clash',
                                                    desc: 'Special Clash: Special + Clash'
                                                })
                                            }
                                        />
                                    </div>
                                    <div
                                        className="derived-board__box-content text-label"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        {clashSpecial}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {mode === 'Pokémon' && (
                        <div className="derived-board__group-right">
                            <div className="sheet-panel health-section__box derived-board__box derived-board__box--secondary-border">
                                <div className="derived-board__box-header theme-header--secondary derived-board__box-header--small">
                                    HAPPY
                                </div>
                                <div className="derived-board__box-content">
                                    <NumberSpinner
                                        value={derived.happy}
                                        onChange={(value: number) => setDerived('happy', value)}
                                        min={0}
                                        max={5}
                                    />
                                </div>
                            </div>
                            <div className="sheet-panel health-section__box derived-board__box derived-board__box--secondary-border">
                                <div className="derived-board__box-header theme-header--secondary derived-board__box-header--small">
                                    LOYAL
                                </div>
                                <div className="derived-board__box-content">
                                    <NumberSpinner
                                        value={derived.loyal}
                                        onChange={(value: number) => setDerived('loyal', value)}
                                        min={0}
                                        max={5}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {tooltipInfo && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content" style={{ color: 'var(--text-main)' }}>
                        <h3 className="derived-board__modal-title text-title-primary">{tooltipInfo.title}</h3>
                        <p className="derived-board__modal-desc text-subtext">{tooltipInfo.desc}</p>
                        <div className="derived-board__modal-btn-container">
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn text-theme-header"
                                onClick={() => setTooltipInfo(null)}
                            >
                                <XCircle size={16} /> Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddTempModal && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content" style={{ color: 'var(--text-main)' }}>
                        <h3 className="derived-board__modal-title derived-board__modal-title--temp-hp text-title-primary">
                            <Shield size={20} /> Set Temporary HP
                        </h3>
                        <p className="derived-board__modal-desc text-subtext">
                            Enter the amount of Temporary HP to grant. This will replace any existing shield.
                        </p>
                        <div className="derived-board__spinner-wrapper">
                            <NumberSpinner value={newTempHp} onChange={setNewTempHp} min={0} max={999} />
                        </div>
                        <div className="derived-board__modal-btn-container derived-board__modal-btn-container--spaced">
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn text-theme-header"
                                onClick={() => setShowAddTempModal(false)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--theme derived-board__modal-btn text-theme-header"
                                onClick={() => {
                                    updateHealth('temporaryHitPointsMax', newTempHp);
                                    updateHealth('temporaryHitPoints', newTempHp);
                                    setShowAddTempModal(false);
                                }}
                            >
                                <Shield size={16} /> Apply Shield
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTempConfirm && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content" style={{ color: 'var(--text-main)' }}>
                        <h3 className="derived-board__modal-title derived-board__modal-title--clear-hp text-title-primary">
                            <AlertTriangle size={20} /> Clear Temp HP
                        </h3>
                        <p className="derived-board__modal-desc text-subtext">
                            Are you sure you want to completely remove your Temporary HP Shield?
                        </p>
                        <div className="derived-board__modal-btn-container derived-board__modal-btn-container--spaced">
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn text-theme-header"
                                onClick={() => setShowTempConfirm(false)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red derived-board__modal-btn text-theme-header"
                                onClick={() => {
                                    updateHealth('temporaryHitPoints', 0);
                                    updateHealth('temporaryHitPointsMax', 0);
                                    setShowTempConfirm(false);
                                }}
                            >
                                <Trash2 size={16} /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddTempWillModal && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content" style={{ color: 'var(--text-main)' }}>
                        <h3 className="derived-board__modal-title derived-board__modal-title--temp-will text-title-primary">
                            <Sparkles size={20} /> Set Temp Willpower
                        </h3>
                        <p className="derived-board__modal-desc text-subtext">
                            Enter the amount of Temporary Willpower to grant. This will replace any existing Temporary
                            Willpower.
                        </p>
                        <div className="derived-board__spinner-wrapper">
                            <NumberSpinner value={newTempWill} onChange={setNewTempWill} min={0} max={999} />
                        </div>
                        <div className="derived-board__modal-btn-container derived-board__modal-btn-container--spaced">
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn text-theme-header"
                                onClick={() => setShowAddTempWillModal(false)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--secondary derived-board__modal-btn text-theme-header"
                                onClick={() => {
                                    updateWill('temporaryWillMax', newTempWill);
                                    updateWill('temporaryWill', newTempWill);
                                    setShowAddTempWillModal(false);
                                }}
                            >
                                <Sparkles size={16} /> Apply Temp Will
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTempWillConfirm && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content" style={{ color: 'var(--text-main)' }}>
                        <h3 className="derived-board__modal-title derived-board__modal-title--clear-will text-title-primary">
                            <AlertTriangle size={20} /> Clear Temp Willpower
                        </h3>
                        <p className="derived-board__modal-desc text-subtext">
                            Are you sure you want to completely remove your Temporary Willpower?
                        </p>
                        <div className="derived-board__modal-btn-container derived-board__modal-btn-container--spaced">
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn text-theme-header"
                                onClick={() => setShowTempWillConfirm(false)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red derived-board__modal-btn text-theme-header"
                                onClick={() => {
                                    updateWill('temporaryWill', 0);
                                    updateWill('temporaryWillMax', 0);
                                    setShowTempWillConfirm(false);
                                }}
                            >
                                <Trash2 size={16} /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsingSection>
    );
}
