import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, Skill } from '../../types/enums';
import { ResourceBox } from '../ui/ResourceBox';
import { NumberSpinner } from '../ui/NumberSpinner';
import { parseCombatTags, getAbilityText, rollDicePlus } from '../../utils/combatUtils';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TooltipIcon } from '../ui/TooltipIcon';
import { StatusBox } from '../board/StatusBox';
import { TimerBox } from './TimerBox';
import './DerivedBoard.css';

export function DerivedBoard() {
    const ruleset = useCharacterStore((state) => state.identity.ruleset);
    const mode = useCharacterStore((state) => state.identity.mode);
    const ability = useCharacterStore((state) => state.identity.ability);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);

    const health = useCharacterStore((state) => state.health);
    const will = useCharacterStore((state) => state.will);
    const updateHealth = useCharacterStore((state) => state.updateHealth);
    const updateWill = useCharacterStore((state) => state.updateWill);

    const stats = useCharacterStore((state) => state.stats);
    const skills = useCharacterStore((state) => state.skills);
    const derived = useCharacterStore((state) => state.derived);
    const setDerived = useCharacterStore((state) => state.setDerived);

    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);

    // HP Modals
    const [showAddTempModal, setShowAddTempModal] = useState(false);
    const [newTempHp, setNewTempHp] = useState(0);
    const [showTempConfirm, setShowTempConfirm] = useState(false);

    // Will Modals
    const [showAddTempWillModal, setShowAddTempWillModal] = useState(false);
    const [newTempWill, setNewTempWill] = useState(0);
    const [showTempWillConfirm, setShowTempWillConfirm] = useState(false);

    const abilityText = getAbilityText(ability, customAbilities);
    const inventoryModifiers = parseCombatTags(inventory, extraCategories, undefined, abilityText);

    const vitTotal = Math.max(
        1,
        stats[CombatStat.VIT].base +
            stats[CombatStat.VIT].rank +
            stats[CombatStat.VIT].buff -
            stats[CombatStat.VIT].debuff +
            (inventoryModifiers.stats.vit || 0)
    );
    const insTotal = Math.max(
        1,
        stats[CombatStat.INS].base +
            stats[CombatStat.INS].rank +
            stats[CombatStat.INS].buff -
            stats[CombatStat.INS].debuff +
            (inventoryModifiers.stats.ins || 0)
    );
    const dexTotal = Math.max(
        1,
        stats[CombatStat.DEX].base +
            stats[CombatStat.DEX].rank +
            stats[CombatStat.DEX].buff -
            stats[CombatStat.DEX].debuff +
            (inventoryModifiers.stats.dex || 0)
    );
    const strTotal = Math.max(
        1,
        stats[CombatStat.STR].base +
            stats[CombatStat.STR].rank +
            stats[CombatStat.STR].buff -
            stats[CombatStat.STR].debuff +
            (inventoryModifiers.stats.str || 0)
    );
    const speTotal = Math.max(
        1,
        stats[CombatStat.SPE].base +
            stats[CombatStat.SPE].rank +
            stats[CombatStat.SPE].buff -
            stats[CombatStat.SPE].debuff +
            (inventoryModifiers.stats.spe || 0)
    );

    const defTotal = Math.max(1, vitTotal + derived.defBuff - derived.defDebuff + inventoryModifiers.def);
    let sdefBase = insTotal;
    if (ruleset === 'tabletop') sdefBase = vitTotal;
    const sdefTotal = Math.max(1, sdefBase + derived.sdefBuff - derived.sdefDebuff + inventoryModifiers.spd);

    const alertTotal = skills[Skill.ALERT].base + skills[Skill.ALERT].buff + (inventoryModifiers.skills.alert || 0);
    const initiative = dexTotal + alertTotal + inventoryModifiers.init;

    const clashPhysical =
        strTotal + skills[Skill.CLASH].base + skills[Skill.CLASH].buff + (inventoryModifiers.skills.clash || 0);
    const clashSpecial =
        speTotal + skills[Skill.CLASH].base + skills[Skill.CLASH].buff + (inventoryModifiers.skills.clash || 0);

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
                    <div className="sheet-panel health-section__box derived-board__box">
                        <div className="derived-board__box-header derived-board__box-header--primary">DEFENSE</div>
                        <div className="derived-board__box-content">
                            <span className="derived-board__total-text">
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

                    <div className="sheet-panel health-section__box derived-board__box">
                        <div className="derived-board__box-header derived-board__box-header--primary">
                            SPEC. DEFENSE
                        </div>
                        <div className="derived-board__box-content">
                            <span className="derived-board__total-text">
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
                    <div className="sheet-panel health-section__box derived-board__box derived-board__box--large">
                        <div className="derived-board__box-header derived-board__box-header--dark derived-board__box-header--small">
                            INITIATIVE{' '}
                            <TooltipIcon
                                onClick={() =>
                                    setTooltipInfo({ title: 'Initiative', desc: 'Initiative: Dexterity + Alert' })
                                }
                            />
                        </div>
                        <div className="derived-board__box-content derived-board__box-content--dark-text">
                            1d6 + {initiative}
                            <button
                                className="action-button action-button--dark derived-board__roll-btn"
                                onClick={() => rollDicePlus(`1d6+${initiative}`, 'Initiative', 'init')}
                            >
                                🎲
                            </button>
                        </div>
                    </div>
                    <div className="sheet-panel health-section__box derived-board__box">
                        <div className="derived-board__box-header derived-board__box-header--dark derived-board__box-header--small">
                            EVADE{' '}
                            <TooltipIcon
                                onClick={() => setTooltipInfo({ title: 'Evade', desc: 'Evade: Dexterity + Evasion' })}
                            />
                        </div>
                        <div className="derived-board__box-content derived-board__box-content--dark-text">
                            {dexTotal +
                                skills[Skill.EVASION].base +
                                skills[Skill.EVASION].buff +
                                (inventoryModifiers.skills.evasion || 0)}
                        </div>
                    </div>

                    {mode === 'Pokémon' && (
                        <>
                            <div className="sheet-panel health-section__box derived-board__box">
                                <div className="derived-board__box-header derived-board__box-header--dark derived-board__box-header--small">
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
                                <div className="derived-board__box-content derived-board__box-content--dark-text">
                                    {clashPhysical}
                                </div>
                            </div>
                            <div className="sheet-panel health-section__box derived-board__box">
                                <div className="derived-board__box-header derived-board__box-header--dark derived-board__box-header--small">
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
                                <div className="derived-board__box-content derived-board__box-content--dark-text">
                                    {clashSpecial}
                                </div>
                            </div>
                            <div className="sheet-panel health-section__box derived-board__box derived-board__box--yellow-border">
                                <div className="derived-board__box-header derived-board__box-header--yellow derived-board__box-header--small">
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
                            <div className="sheet-panel health-section__box derived-board__box derived-board__box--purple-border">
                                <div className="derived-board__box-header derived-board__box-header--purple derived-board__box-header--small">
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
                        </>
                    )}
                </div>
            </div>

            {tooltipInfo && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content">
                        <h3 className="derived-board__modal-title">{tooltipInfo.title}</h3>
                        <p className="derived-board__modal-desc">{tooltipInfo.desc}</p>
                        <div className="derived-board__modal-btn-container">
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddTempModal && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content">
                        <h3 className="derived-board__modal-title" style={{ color: '#c326df', borderColor: '#c326df' }}>
                            🛡️ Set Temporary HP
                        </h3>
                        <p className="derived-board__modal-desc">
                            Enter the amount of Temporary HP to grant. This will replace any existing shield.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            <NumberSpinner value={newTempHp} onChange={setNewTempHp} min={0} max={999} />
                        </div>
                        <div className="derived-board__modal-btn-container" style={{ gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn"
                                onClick={() => setShowAddTempModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button derived-board__modal-btn"
                                style={{ backgroundColor: '#c326df', color: 'white' }}
                                onClick={() => {
                                    updateHealth('temporaryHitPointsMax', newTempHp);
                                    updateHealth('temporaryHitPoints', newTempHp);
                                    setShowAddTempModal(false);
                                }}
                            >
                                Apply Shield
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTempConfirm && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content">
                        <h3 className="derived-board__modal-title" style={{ color: '#c62828', borderColor: '#c62828' }}>
                            ⚠️ Clear Temp HP
                        </h3>
                        <p className="derived-board__modal-desc">
                            Are you sure you want to completely remove your Temporary HP Shield?
                        </p>
                        <div className="derived-board__modal-btn-container" style={{ gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn"
                                onClick={() => setShowTempConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red derived-board__modal-btn"
                                onClick={() => {
                                    updateHealth('temporaryHitPoints', 0);
                                    updateHealth('temporaryHitPointsMax', 0);
                                    setShowTempConfirm(false);
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddTempWillModal && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content">
                        <h3 className="derived-board__modal-title" style={{ color: '#7e57c2', borderColor: '#7e57c2' }}>
                            🌟 Set Temp Willpower
                        </h3>
                        <p className="derived-board__modal-desc">
                            Enter the amount of Temporary Willpower to grant. This will replace any existing Temporary
                            Willpower.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                            <NumberSpinner value={newTempWill} onChange={setNewTempWill} min={0} max={999} />
                        </div>
                        <div className="derived-board__modal-btn-container" style={{ gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn"
                                onClick={() => setShowAddTempWillModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button derived-board__modal-btn"
                                style={{ backgroundColor: '#7e57c2', color: 'white' }}
                                onClick={() => {
                                    updateWill('temporaryWillMax', newTempWill);
                                    updateWill('temporaryWill', newTempWill);
                                    setShowAddTempWillModal(false);
                                }}
                            >
                                Apply Temp Will
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTempWillConfirm && (
                <div className="derived-board__modal-overlay">
                    <div className="derived-board__modal-content">
                        <h3 className="derived-board__modal-title" style={{ color: '#c62828', borderColor: '#c62828' }}>
                            ⚠️ Clear Temp Willpower
                        </h3>
                        <p className="derived-board__modal-desc">
                            Are you sure you want to completely remove your Temporary Willpower?
                        </p>
                        <div className="derived-board__modal-btn-container" style={{ gap: '10px' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark derived-board__modal-btn"
                                onClick={() => setShowTempWillConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red derived-board__modal-btn"
                                onClick={() => {
                                    updateWill('temporaryWill', 0);
                                    updateWill('temporaryWillMax', 0);
                                    setShowTempWillConfirm(false);
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CollapsingSection>
    );
}
