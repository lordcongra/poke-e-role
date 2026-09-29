import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, Skill } from '../../types/enums';
import { rollDicePlus } from '../../utils/combat/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import { NumberSpinner } from '../ui/NumberSpinner';
import { Dices, XCircle } from 'lucide-react';
import { ResourceBox } from '../ui/ResourceBox';
import { TooltipIcon } from '../ui/TooltipIcon';
import { StatusBox } from '../board/StatusBox';
import { TimerBox } from './TimerBox';
import { DerivedBoardTempModals } from './DerivedBoardTempModals';
import OBR from '@owlbear-rodeo/sdk';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import {
    parseCombatTags,
    getAbilityText,
    calculateStatTotal,
    calculateSkillTotal,
    calculateDefTotal,
    calculateSDefTotal,
    calculateBaseInitiative,
    getRankBonusStats
} from '../../utils/combat/combatUtils';
import './DerivedBoard.css';

export function DerivedBoard() {
    const mode = useCharacterStore((state) => state.identity.mode);
    const ability = useCharacterStore((state) => state.identity.ability);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    useCharacterStore((state) => state.identity.abilityActive);
    useCharacterStore((state) => state.identity.abilityTags);
    useCharacterStore((state) => state.identity.rank);

    const health = useCharacterStore((state) => state.health);
    const will = useCharacterStore((state) => state.will);
    const updateHealth = useCharacterStore((state) => state.updateHealth);
    const updateWill = useCharacterStore((state) => state.updateWill);

    useCharacterStore((state) => state.stats);
    useCharacterStore((state) => state.skills);

    const derived = useCharacterStore((state) => state.derived);
    const setDerived = useCharacterStore((state) => state.setDerived);

    const inventory = useCharacterStore((state) => state.inventory);
    const passives = useCharacterStore((state) => state.passives);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const isHpLocked = useCharacterStore((state) => state.identity.hpLocked ?? true);
    const isWillLocked = useCharacterStore((state) => state.identity.willLocked ?? true);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);
    const gmOnlyAttributeLock = useCharacterStore((state) => state.identity.gmOnlyAttributeLock ?? true);

    const handleToggleHpLock = () => {
        if (isHpLocked) {
            if (!isStandaloneMode && role !== 'GM' && gmOnlyAttributeLock) {
                const msg = 'Your GM must unlock this sheet for you or enable users to unlock sheets in Room Rules.';
                if (OBR.isAvailable) {
                    OBR.notification.show(msg, 'WARNING');
                } else {
                    alert(msg);
                }
                return;
            }
            setIdentity('hpLocked', false);
        } else {
            setIdentity('hpLocked', true);
        }
    };

    const handleToggleWillLock = () => {
        if (isWillLocked) {
            if (!isStandaloneMode && role !== 'GM' && gmOnlyAttributeLock) {
                const msg = 'Your GM must unlock this sheet for you or enable users to unlock sheets in Room Rules.';
                if (OBR.isAvailable) {
                    OBR.notification.show(msg, 'WARNING');
                } else {
                    alert(msg);
                }
                return;
            }
            setIdentity('willLocked', false);
        } else {
            setIdentity('willLocked', true);
        }
    };

    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    const [showAddTempModal, setShowAddTempModal] = useState(false);
    const [newTempHp, setNewTempHp] = useState(0);
    const [showTempConfirm, setShowTempConfirm] = useState(false);

    const [showAddTempWillModal, setShowAddTempWillModal] = useState(false);
    const [newTempWill, setNewTempWill] = useState(0);
    const [showTempWillConfirm, setShowTempWillConfirm] = useState(false);

    const abilityText = getAbilityText(ability, customAbilities);
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText, passives);
    const fullState = useCharacterStore.getState();

    const dexTotal = calculateStatTotal(CombatStat.DEX, fullState, inventoryModifiers);
    const strTotal = calculateStatTotal(CombatStat.STR, fullState, inventoryModifiers);
    const speTotal = calculateStatTotal(CombatStat.SPE, fullState, inventoryModifiers);

    const defTotal = calculateDefTotal(fullState, inventoryModifiers);
    const sdefTotal = calculateSDefTotal(fullState, inventoryModifiers);
    const initiative = calculateBaseInitiative(fullState, inventoryModifiers);

    const rankSkillBonus = getRankBonusStats(fullState.identity.rank).skillDice;
    const clashPhysical = strTotal + calculateSkillTotal(Skill.CLASH, fullState, inventoryModifiers) + rankSkillBonus;
    const clashSpecial = speTotal + calculateSkillTotal(Skill.CLASH, fullState, inventoryModifiers) + rankSkillBonus;

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
                            isBaseLocked={isHpLocked}
                            onToggleBaseLock={handleToggleHpLock}
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
                            isBaseLocked={isWillLocked}
                            onToggleBaseLock={handleToggleWillLock}
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
                    <div className="health-section__box derived-board__box derived-board__box--primary-border">
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

                    <div className="health-section__box derived-board__box derived-board__box--primary-border">
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
                        <div className="health-section__box derived-board__box derived-board__box--large derived-board__box--secondary-border">
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
                                    <Dices size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="health-section__box derived-board__box derived-board__box--secondary-border">
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
                                {dexTotal +
                                    calculateSkillTotal(Skill.EVASION, fullState, inventoryModifiers) +
                                    rankSkillBonus}
                            </div>
                        </div>

                        {mode === 'Pokémon' && (
                            <>
                                <div className="health-section__box derived-board__box derived-board__box--secondary-border">
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
                                <div className="health-section__box derived-board__box derived-board__box--secondary-border">
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
                            <div className="health-section__box derived-board__box derived-board__box--secondary-border">
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
                            <div className="health-section__box derived-board__box derived-board__box--secondary-border">
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

            {/* Temporary HP and Will Modals */}
            <DerivedBoardTempModals
                showAddTempModal={showAddTempModal}
                setShowAddTempModal={setShowAddTempModal}
                newTempHp={newTempHp}
                setNewTempHp={setNewTempHp}
                showTempConfirm={showTempConfirm}
                setShowTempConfirm={setShowTempConfirm}
                showAddTempWillModal={showAddTempWillModal}
                setShowAddTempWillModal={setShowAddTempWillModal}
                newTempWill={newTempWill}
                setNewTempWill={setNewTempWill}
                showTempWillConfirm={showTempWillConfirm}
                setShowTempWillConfirm={setShowTempWillConfirm}
                onApplyTempHp={(val) => {
                    updateHealth('temporaryHitPointsMax', val);
                    updateHealth('temporaryHitPoints', val);
                    setShowAddTempModal(false);
                }}
                onClearTempHp={() => {
                    updateHealth('temporaryHitPoints', 0);
                    updateHealth('temporaryHitPointsMax', 0);
                    setShowTempConfirm(false);
                }}
                onApplyTempWill={(val) => {
                    updateWill('temporaryWillMax', val);
                    updateWill('temporaryWill', val);
                    setShowAddTempWillModal(false);
                }}
                onClearTempWill={() => {
                    updateWill('temporaryWill', 0);
                    updateWill('temporaryWillMax', 0);
                    setShowTempWillConfirm(false);
                }}
            />
        </CollapsingSection>
    );
}
