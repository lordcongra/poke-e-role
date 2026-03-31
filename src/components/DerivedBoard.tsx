// src/components/DerivedBoard.tsx
import { useState } from 'react';
import { useCharacterStore } from '../store/useCharacterStore';
import { CombatStat, Skill } from '../types/enums';
import { ResourceBox } from './ResourceBox';
import { NumberSpinner } from './NumberSpinner';
import { parseCombatTags, getAbilityText, rollStatus, rollDicePlus } from '../utils/combatUtils';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    Healthy: { bg: '#A5D6A7', text: '#000' },
    '1st Degree Burn': { bg: '#FFCC80', text: '#000' },
    '2nd Degree Burn': { bg: '#FF8A65', text: '#000' },
    '3rd Degree Burn': { bg: '#D32F2F', text: '#FFF' },
    Poison: { bg: '#CE93D8', text: '#000' },
    'Badly Poisoned': { bg: '#8E24AA', text: '#FFF' },
    Paralysis: { bg: '#FFF59D', text: '#000' },
    'Frozen Solid': { bg: '#81D4FA', text: '#000' },
    Sleep: { bg: '#9FA8DA', text: '#000' },
    'In Love': { bg: '#F48FB1', text: '#000' },
    Confusion: { bg: '#80CBC4', text: '#000' },
    Disable: { bg: '#E0E0E0', text: '#000' },
    Flinch: { bg: '#B0BEC5', text: '#000' }
};

const STATUS_RULES: Record<string, string> = {
    Healthy: 'No status effect.',
    '1st Degree Burn':
        'Deal 1 point of damage at the end of each Round. Fire-type Pokémon are immune. Recovery: Dexterity + Athletic (4 successes).',
    '2nd Degree Burn':
        'Deal 2 points of lethal damage** at the end of each Round. Fire-type Pokémon are immune. Recovery: Dexterity + Athletic (6 successes).',
    '3rd Degree Burn':
        'Deal 3 points of lethal damage** at the end of each Round. Increase Damage by 2 each Round that passes. Fire-type Pokémon are immune. Recovery: Dexterity + Athletic (8 successes).',
    Poison: 'Deal 2 points of damage at the end of each Round. Poison and Steel-type Pokémon are immune.',
    'Badly Poisoned':
        'Deal 2 points of lethal damage** at the end of the Round. Increase Damage by 2 each Round that passes. Poison and Steel-type Pokémon are immune.',
    Paralysis:
        'The subject loses 2 points in Dexterity. Electric-type Pokémon are immune. The subject cannot treat this on their own.',
    'Frozen Solid':
        'The subject cannot perform any action as is inside a block of ice. The block has 5 HP with a Def & Sp. Def Score of 2. Ice-type Pokémon are immune.',
    Sleep: 'The subject falls into a deep slumber and cannot perform any action until they wake up. Roll Insight at the start of their turn; wake up after adding up 5 successes. Doing this counts as an action.',
    'In Love':
        'Hold Back against the beloved foe and allies. Roll Loyalty/Insight and score at least 3 successes to attack the beloved foe and allies at full power.',
    Confusion:
        'Removes successes from action rolls based on Rank (Starter to Standard: 1, Advanced to Ace: 2, Master or higher: 3). If action fails, subject is dealt 1 damage. Roll Insight (2 successes) to act normally.',
    Disable: 'Cannot perform a disabled Move. Only one Move can be disabled per subject at a time.',
    Flinch: 'Spends the Action of their next turn without having any effect and cannot use Reactions until their next turn has passed. Only one Flinch can be inflicted per subject each Round.'
};

const STATUS_OPTIONS = [
    'Healthy',
    '1st Degree Burn',
    '2nd Degree Burn',
    '3rd Degree Burn',
    'Poison',
    'Badly Poisoned',
    'Confusion',
    'Disable',
    'Flinch',
    'Frozen Solid',
    'In Love',
    'Paralysis',
    'Sleep',
    'Custom...'
];

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
    <span
        onClick={onClick}
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#555',
            color: 'white',
            borderRadius: '50%',
            width: '14px',
            height: '14px',
            fontSize: '10px',
            cursor: 'pointer',
            marginLeft: '4px',
            fontWeight: 'bold'
        }}
    >
        ?
    </span>
);

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

    const statuses = useCharacterStore((state) => state.statuses);
    const addStatus = useCharacterStore((state) => state.addStatus);
    const updateStatus = useCharacterStore((state) => state.updateStatus);
    const removeStatus = useCharacterStore((state) => state.removeStatus);

    const effects = useCharacterStore((state) => state.effects);
    const addEffect = useCharacterStore((state) => state.addEffect);
    const updateEffect = useCharacterStore((state) => state.updateEffect);
    const removeEffect = useCharacterStore((state) => state.removeEffect);

    const inventory = useCharacterStore((state) => state.inventory);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; desc: string } | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const abilityText = getAbilityText(ability, customAbilities);
    const invMods = parseCombatTags(inventory, extraCategories, undefined, abilityText);

    const vitTotal = Math.max(
        1,
        stats[CombatStat.VIT].base +
            stats[CombatStat.VIT].rank +
            stats[CombatStat.VIT].buff -
            stats[CombatStat.VIT].debuff +
            (invMods.stats.vit || 0)
    );
    const insTotal = Math.max(
        1,
        stats[CombatStat.INS].base +
            stats[CombatStat.INS].rank +
            stats[CombatStat.INS].buff -
            stats[CombatStat.INS].debuff +
            (invMods.stats.ins || 0)
    );
    const dexTotal = Math.max(
        1,
        stats[CombatStat.DEX].base +
            stats[CombatStat.DEX].rank +
            stats[CombatStat.DEX].buff -
            stats[CombatStat.DEX].debuff +
            (invMods.stats.dex || 0)
    );
    const strTotal = Math.max(
        1,
        stats[CombatStat.STR].base +
            stats[CombatStat.STR].rank +
            stats[CombatStat.STR].buff -
            stats[CombatStat.STR].debuff +
            (invMods.stats.str || 0)
    );
    const speTotal = Math.max(
        1,
        stats[CombatStat.SPE].base +
            stats[CombatStat.SPE].rank +
            stats[CombatStat.SPE].buff -
            stats[CombatStat.SPE].debuff +
            (invMods.stats.spe || 0)
    );

    const defTotal = Math.max(1, vitTotal + derived.defBuff - derived.defDebuff + invMods.def);
    let sdefBase = insTotal;
    if (ruleset === 'tabletop') sdefBase = vitTotal;
    const sdefTotal = Math.max(1, sdefBase + derived.sdefBuff - derived.sdefDebuff + invMods.spd);

    const alertTotal = skills[Skill.ALERT].base + skills[Skill.ALERT].buff + (invMods.skills.alert || 0);
    const initiative = dexTotal + alertTotal + invMods.init;

    const clashP = strTotal + skills[Skill.CLASH].base + skills[Skill.CLASH].buff + (invMods.skills.clash || 0);
    const clashS = speTotal + skills[Skill.CLASH].base + skills[Skill.CLASH].buff + (invMods.skills.clash || 0);

    return (
        <div className="sheet-panel" style={{ marginBottom: '15px' }}>
            <div className="sheet-panel__header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                        type="button"
                        className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        ▼
                    </button>
                    INFO
                </span>
            </div>

            {!isCollapsed && (
                <div className="panel-content-wrapper">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className="health-section__row">
                            <div style={{ flex: 1 }}>
                                <ResourceBox
                                    title="HP"
                                    curr={health.hpCurr}
                                    max={health.hpMax}
                                    base={health.hpBase}
                                    color="var(--primary)"
                                    onCurrChange={(v) => updateHealth('hpCurr', v)}
                                    onBaseChange={(v) => updateHealth('hpBase', v)}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <ResourceBox
                                    title="WILL"
                                    curr={will.willCurr}
                                    max={will.willMax}
                                    base={will.willBase}
                                    color="#2196F3"
                                    onCurrChange={(v) => updateWill('willCurr', v)}
                                    onBaseChange={(v) => updateWill('willBase', v)}
                                />
                            </div>

                            <div
                                className="sheet-panel health-section__box"
                                style={{
                                    flex: 1,
                                    padding: '0',
                                    border: '1px solid #7E57C2',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}
                            >
                                <div
                                    style={{
                                        background: '#7E57C2',
                                        color: 'white',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        padding: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ paddingLeft: '4px' }}>
                                        STATUS{' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Status Effects',
                                                    desc: 'Apply a status effect.'
                                                })
                                            }
                                        />
                                    </span>
                                    <button
                                        onClick={addStatus}
                                        className="action-button action-button--dark"
                                        style={{ background: 'transparent', padding: '0 4px', textShadow: 'none' }}
                                    >
                                        + Add
                                    </button>
                                </div>
                                <div
                                    style={{
                                        padding: '4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        overflowY: 'auto',
                                        maxHeight: '80px'
                                    }}
                                >
                                    {statuses.map((s, i) => {
                                        const colors = STATUS_COLORS[s.name] || { bg: '#FFF', text: '#000' };
                                        return (
                                            <div
                                                key={s.id}
                                                style={{ display: 'flex', gap: '2px', alignItems: 'center' }}
                                            >
                                                <select
                                                    className="identity-grid__select"
                                                    style={{
                                                        flex: 1,
                                                        background: colors.bg,
                                                        color: colors.text,
                                                        fontWeight: 'bold',
                                                        fontSize: '0.75rem',
                                                        padding: '2px'
                                                    }}
                                                    value={s.name}
                                                    onChange={(e) => updateStatus(s.id, 'name', e.target.value)}
                                                >
                                                    {STATUS_OPTIONS.map((opt) => (
                                                        <option key={opt} value={opt}>
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>

                                                <TooltipIcon
                                                    onClick={() =>
                                                        setTooltipInfo({
                                                            title: s.name,
                                                            desc: STATUS_RULES[s.name] || 'Custom Effect.'
                                                        })
                                                    }
                                                />

                                                {s.name === 'Custom...' && (
                                                    <input
                                                        type="text"
                                                        style={{
                                                            flex: 1,
                                                            border: '1px solid var(--border)',
                                                            fontSize: '0.75rem',
                                                            padding: '2px',
                                                            background: 'var(--input-bg)',
                                                            color: 'var(--text-main)'
                                                        }}
                                                        value={s.customName}
                                                        onChange={(e) =>
                                                            updateStatus(s.id, 'customName', e.target.value)
                                                        }
                                                        placeholder="Effect"
                                                    />
                                                )}
                                                <input
                                                    type="number"
                                                    style={{
                                                        width: '35px',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '0.75rem',
                                                        textAlign: 'center',
                                                        background: 'var(--input-bg)',
                                                        color: 'var(--text-main)'
                                                    }}
                                                    value={s.rounds}
                                                    onChange={(e) =>
                                                        updateStatus(s.id, 'rounds', Number(e.target.value) || 0)
                                                    }
                                                    title="Successes/Rounds"
                                                />
                                                {s.name !== 'Healthy' && (
                                                    <button
                                                        onClick={() => rollStatus(s, useCharacterStore.getState())}
                                                        className="action-button action-button--dark"
                                                        style={{ padding: '0 4px' }}
                                                    >
                                                        🎲
                                                    </button>
                                                )}
                                                {i > 0 && (
                                                    <button
                                                        onClick={() => removeStatus(s.id)}
                                                        className="action-button action-button--red"
                                                        style={{ padding: '0 4px' }}
                                                    >
                                                        X
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="health-section__row">
                            <div
                                className="sheet-panel health-section__box"
                                style={{ flex: 1, padding: '0', overflow: 'hidden' }}
                            >
                                <div
                                    style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        padding: '4px'
                                    }}
                                >
                                    DEFENSE
                                </div>
                                <div
                                    className="flex-layout--row-center"
                                    style={{
                                        padding: '6px',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: 'var(--panel-alt)'
                                    }}
                                >
                                    <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                        Total: <strong>{defTotal}</strong>
                                    </span>
                                    <span style={{ color: '#4CAF50' }}>+</span>{' '}
                                    <NumberSpinner
                                        value={derived.defBuff}
                                        onChange={(v) => setDerived('defBuff', Number(v) || 0)}
                                        min={0}
                                    />
                                    <span style={{ color: '#F44336' }}>-</span>{' '}
                                    <NumberSpinner
                                        value={derived.defDebuff}
                                        onChange={(v) => setDerived('defDebuff', Number(v) || 0)}
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div
                                className="sheet-panel health-section__box"
                                style={{ flex: 1, padding: '0', overflow: 'hidden' }}
                            >
                                <div
                                    style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        padding: '4px'
                                    }}
                                >
                                    SPEC. DEFENSE
                                </div>
                                <div
                                    className="flex-layout--row-center"
                                    style={{
                                        padding: '6px',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: 'var(--panel-alt)'
                                    }}
                                >
                                    <span style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                        Total: <strong>{sdefTotal}</strong>
                                    </span>
                                    <span style={{ color: '#4CAF50' }}>+</span>{' '}
                                    <NumberSpinner
                                        value={derived.sdefBuff}
                                        onChange={(v) => setDerived('sdefBuff', Number(v) || 0)}
                                        min={0}
                                    />
                                    <span style={{ color: '#F44336' }}>-</span>{' '}
                                    <NumberSpinner
                                        value={derived.sdefDebuff}
                                        onChange={(v) => setDerived('sdefDebuff', Number(v) || 0)}
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div
                                className="sheet-panel health-section__box"
                                style={{
                                    flex: 1,
                                    padding: '0',
                                    border: '1px solid #4FC3F7',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    overflow: 'hidden'
                                }}
                            >
                                <div
                                    style={{
                                        background: '#4FC3F7',
                                        color: 'white',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        padding: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span style={{ paddingLeft: '4px' }}>
                                        TIMERS{' '}
                                        <TooltipIcon
                                            onClick={() =>
                                                setTooltipInfo({
                                                    title: 'Timers',
                                                    desc: 'Tracks any moves or effects that last a number of rounds.'
                                                })
                                            }
                                        />
                                    </span>
                                    <button
                                        onClick={addEffect}
                                        className="action-button action-button--dark"
                                        style={{ background: 'transparent', padding: '0 4px', textShadow: 'none' }}
                                    >
                                        + Add
                                    </button>
                                </div>
                                <div
                                    style={{
                                        padding: '4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        overflowY: 'auto',
                                        maxHeight: '80px'
                                    }}
                                >
                                    {effects.length === 0 ? (
                                        <div
                                            style={{
                                                textAlign: 'center',
                                                color: 'var(--text-muted)',
                                                fontStyle: 'italic',
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            No active effects.
                                        </div>
                                    ) : (
                                        effects.map((e) => (
                                            <div
                                                key={e.id}
                                                style={{
                                                    display: 'flex',
                                                    gap: '4px',
                                                    alignItems: 'center',
                                                    background: 'var(--panel-bg)',
                                                    border: '1px solid var(--border)',
                                                    padding: '2px 4px',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    style={{
                                                        flex: 1,
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: 'var(--text-main)',
                                                        fontSize: '0.75rem',
                                                        minWidth: '60px'
                                                    }}
                                                    value={e.name}
                                                    onChange={(ev) => updateEffect(e.id, 'name', ev.target.value)}
                                                    placeholder="Effect Name"
                                                />
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    Rds:
                                                </span>
                                                <input
                                                    type="number"
                                                    style={{
                                                        width: '35px',
                                                        border: '1px solid var(--border)',
                                                        fontSize: '0.75rem',
                                                        textAlign: 'center',
                                                        background: 'var(--input-bg)',
                                                        color: 'var(--text-main)',
                                                        borderRadius: '3px'
                                                    }}
                                                    value={e.rounds}
                                                    onChange={(ev) =>
                                                        updateEffect(e.id, 'rounds', Number(ev.target.value) || 0)
                                                    }
                                                    min={0}
                                                />
                                                <button
                                                    onClick={() => removeEffect(e.id)}
                                                    className="action-button action-button--red"
                                                    style={{ padding: '0 4px' }}
                                                >
                                                    X
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="health-section__row">
                            <div
                                className="sheet-panel health-section__box"
                                style={{ flex: 1.5, padding: '0', textAlign: 'center', overflow: 'hidden' }}
                            >
                                <div
                                    style={{
                                        background: '#555',
                                        color: 'white',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                        fontWeight: 'bold',
                                        fontSize: '0.75rem',
                                        padding: '4px'
                                    }}
                                >
                                    INITIATIVE{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({
                                                title: 'Initiative',
                                                desc: 'Initiative: Dexterity + Alert'
                                            })
                                        }
                                    />
                                </div>
                                <div
                                    style={{
                                        padding: '6px',
                                        fontWeight: 'bold',
                                        color: 'var(--text-main)',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    1d6 + {initiative}
                                    <button
                                        className="action-button action-button--dark"
                                        style={{ padding: '1px 6px' }}
                                        onClick={() => rollDicePlus(`1d6+${initiative}`, 'Initiative', 'init')}
                                    >
                                        🎲
                                    </button>
                                </div>
                            </div>
                            <div
                                className="sheet-panel health-section__box"
                                style={{ flex: 1, padding: '0', textAlign: 'center', overflow: 'hidden' }}
                            >
                                <div
                                    style={{
                                        background: '#555',
                                        color: 'white',
                                        textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                        fontWeight: 'bold',
                                        fontSize: '0.75rem',
                                        padding: '4px'
                                    }}
                                >
                                    EVADE{' '}
                                    <TooltipIcon
                                        onClick={() =>
                                            setTooltipInfo({ title: 'Evade', desc: 'Evade: Dexterity + Evasion' })
                                        }
                                    />
                                </div>
                                <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                    {dexTotal +
                                        skills[Skill.EVASION].base +
                                        skills[Skill.EVASION].buff +
                                        (invMods.skills.evasion || 0)}
                                </div>
                            </div>

                            {mode === 'Pokémon' && (
                                <>
                                    <div
                                        className="sheet-panel health-section__box"
                                        style={{ flex: 1, padding: '0', textAlign: 'center', overflow: 'hidden' }}
                                    >
                                        <div
                                            style={{
                                                background: '#555',
                                                color: 'white',
                                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem',
                                                padding: '4px'
                                            }}
                                        >
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
                                        <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                            {clashP}
                                        </div>
                                    </div>
                                    <div
                                        className="sheet-panel health-section__box"
                                        style={{ flex: 1, padding: '0', textAlign: 'center', overflow: 'hidden' }}
                                    >
                                        <div
                                            style={{
                                                background: '#555',
                                                color: 'white',
                                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem',
                                                padding: '4px'
                                            }}
                                        >
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
                                        <div style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                            {clashS}
                                        </div>
                                    </div>
                                    <div
                                        className="sheet-panel health-section__box"
                                        style={{
                                            flex: 1,
                                            padding: '0',
                                            textAlign: 'center',
                                            border: '1px solid #FFB300'
                                        }}
                                    >
                                        <div
                                            style={{
                                                background: '#FFB300',
                                                color: 'white',
                                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem',
                                                padding: '4px'
                                            }}
                                        >
                                            HAPPY
                                        </div>
                                        <div
                                            className="flex-layout--row-center"
                                            style={{ padding: '4px', justifyContent: 'center' }}
                                        >
                                            <NumberSpinner
                                                value={derived.happy}
                                                onChange={(v) => setDerived('happy', v)}
                                                min={0}
                                                max={5}
                                            />
                                        </div>
                                    </div>
                                    <div
                                        className="sheet-panel health-section__box"
                                        style={{
                                            flex: 1,
                                            padding: '0',
                                            textAlign: 'center',
                                            border: '1px solid #AB47BC'
                                        }}
                                    >
                                        <div
                                            style={{
                                                background: '#AB47BC',
                                                color: 'white',
                                                textShadow: '1px 1px 1px rgba(0,0,0,0.8)',
                                                fontWeight: 'bold',
                                                fontSize: '0.75rem',
                                                padding: '4px'
                                            }}
                                        >
                                            LOYAL
                                        </div>
                                        <div
                                            className="flex-layout--row-center"
                                            style={{ padding: '4px', justifyContent: 'center' }}
                                        >
                                            <NumberSpinner
                                                value={derived.loyal}
                                                onChange={(v) => setDerived('loyal', v)}
                                                min={0}
                                                max={5}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {tooltipInfo && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 1400,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--panel-bg)',
                            padding: '15px',
                            borderRadius: '8px',
                            width: '280px',
                            border: '2px solid var(--primary)',
                            color: 'var(--text-main)',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                        }}
                    >
                        <h3
                            style={{
                                marginTop: 0,
                                color: 'var(--primary)',
                                fontSize: '1.1rem',
                                borderBottom: '1px solid var(--border)',
                                paddingBottom: '4px',
                                textAlign: 'center'
                            }}
                        >
                            {tooltipInfo.title}
                        </h3>
                        <p
                            style={{
                                fontSize: '0.85rem',
                                marginBottom: '15px',
                                color: 'var(--text-muted)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.4'
                            }}
                        >
                            {tooltipInfo.desc}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                type="button"
                                className="action-button action-button--dark"
                                style={{ width: '100%', padding: '6px' }}
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
