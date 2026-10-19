import { useState, useEffect, type ChangeEvent } from 'react';
import { XCircle, Swords } from 'lucide-react';
import type { MoveData } from '../../../store/storeTypes';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { parseCombatTags } from '../../../utils/tagParser/index';
import { getWeatherDamageBonus } from '../../../utils/combat/combatUtils';
import { TooltipIcon } from '../../ui/TooltipIcon';
import {
    type TargetOption,
    type MultiTargetSelection,
    type MultiTargetRowData,
    loadAvailableTargets,
    detectMoveTargetingType,
    getMaxTargetsForRank,
    calculateDefaultEffectiveness,
    calculateTargetDefAndFactors,
    initializeMultiTargetRows
} from './targetingModalUtils';
import { TargetingModalHeader, type TargetingMode } from './TargetingModalHeader';
import { SingleTargetSection } from './SingleTargetSection';
import { MultiTargetSection } from './MultiTargetSection';
import { TargetingModalOverrideSection } from './TargetingModalOverrideSection';
import { TargetingInfoModal } from './TargetingInfoModal';
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
    onMultiRoll?: (
        baseDmg: number,
        isCrit: boolean,
        selections: MultiTargetSelection[],
        override: { active: boolean; type: 'dice' | 'flat' | 'dice-ignore'; value: number },
        fieldFactors?: string[]
    ) => void;
}

export function TargetingModal({ move, baseDamage, onClose, onRoll, onMultiRoll }: TargetingModalProps) {
    const detectedMode = detectMoveTargetingType(move);
    const [mode, setMode] = useState<TargetingMode>(detectedMode);

    const [selectedTargetId, setSelectedTargetId] = useState<string>('manual');
    const [reduction, setReduction] = useState(0);
    const [effectiveness, setEffectiveness] = useState<number>(0);
    const [appliedFieldFactors, setAppliedFieldFactors] = useState<string[]>([]);
    const [multiTargets, setMultiTargets] = useState<MultiTargetRowData[]>([]);

    const [isCrit, setIsCrit] = useState(false);
    const [targets, setTargets] = useState<TargetOption[]>([]);
    const [overrideType, setOverrideType] = useState<'none' | 'dice' | 'flat' | 'dice-ignore'>('none');
    const [overrideValue, setOverrideValue] = useState<number>(0);
    const [modalConfig, setModalConfig] = useState<{ title: string; content: string } | null>(null);

    const rank = useCharacterStore((s) => s.identity.rank);
    const ruleset = useCharacterStore((s) => s.identity.ruleset);
    const activeTransformation = useCharacterStore((s) => s.identity.activeTransformation);
    const gmOnlyDamageOverride = useCharacterStore((s) => s.identity.gmOnlyDamageOverride);
    const bankedAccDice = useCharacterStore((s) => s.trackers.bankedAccDice);
    const role = useCharacterStore((s) => s.role);
    const activeBattlefield = useCharacterStore((s) => s.activeBattlefield);
    const isNPC = useCharacterStore((s) => s.identity.isNPC);
    const hpCurr = useCharacterStore((s) => s.health.hpCurr);
    const hpMax = useCharacterStore((s) => s.health.hpMax);
    const inventory = useCharacterStore((s) => s.inventory);
    const passives = useCharacterStore((s) => s.passives);
    const extraCategories = useCharacterStore((s) => s.extraCategories);

    const isPhysicalMove = String(move.category).startsWith('Phys');
    const maxTargets = getMaxTargetsForRank(rank);
    const isHalfHp = hpCurr <= Math.floor(hpMax / 2);
    const weatherInfo = getWeatherDamageBonus(move.type, activeBattlefield, isHalfHp, isNPC, useCharacterStore.getState());
    const itemBuffs = parseCombatTags(inventory, extraCategories, move, undefined, passives);
    const critDice = 2 + (itemBuffs.critDmg || 0);
    const bankedDice = (move.id && bankedAccDice[move.id]) || 0;
    const canOverride = isStandaloneMode || role === 'GM' || !gmOnlyDamageOverride;

    useEffect(() => {
        let isMounted = true;
        loadAvailableTargets(isPhysicalMove).then((loadedTargets) => {
            if (!isMounted) return;
            setTargets(loadedTargets);
            setMultiTargets(
                initializeMultiTargetRows(
                    loadedTargets,
                    move.type,
                    isPhysicalMove,
                    activeBattlefield,
                    activeTransformation,
                    detectedMode,
                    maxTargets
                )
            );
        });
        return () => { isMounted = false; };
    }, [isPhysicalMove, ruleset, activeTransformation, activeBattlefield, move.type, detectedMode, maxTargets]);

    const handleTargetSelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedTargetId(val);
        if (val === 'manual') {
            setAppliedFieldFactors([]);
            return;
        }
        const sel = targets.find((t) => t.id === val);
        if (sel) {
            const { targetDef, factors, forceNeutralFlying } = calculateTargetDefAndFactors(sel, isPhysicalMove, activeBattlefield);
            let eff = activeTransformation === 'Terastallize' && sel.isTera ? 1 : calculateDefaultEffectiveness(move.type, sel.types);
            if (forceNeutralFlying && eff > 0) eff = 0;
            setReduction(targetDef);
            setEffectiveness(eff);
            setAppliedFieldFactors(factors);
        }
    };

    const handleToggleTarget = (id: string) => setMultiTargets((p) => p.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));
    const handleToggleEvaded = (id: string) => setMultiTargets((p) => p.map((r) => (r.id === id ? { ...r, isEvaded: !r.isEvaded } : r)));
    const handleChangeEffectiveness = (id: string, val: number) => setMultiTargets((p) => p.map((r) => (r.id === id ? { ...r, effectiveness: val } : r)));
    const handleChangeDef = (id: string, val: number) => setMultiTargets((p) => p.map((r) => (r.id === id ? { ...r, def: val } : r)));

    const handleSelectAllFoes = () => {
        let count = 0;
        setMultiTargets((p) => p.map((r) => (!r.isPlayerSide && count < maxTargets ? (count++, { ...r, selected: true }) : { ...r, selected: false })));
    };
    const handleSelectAll = () => {
        let count = 0;
        setMultiTargets((p) => p.map((r) => (count < maxTargets ? (count++, { ...r, selected: true }) : { ...r, selected: false })));
    };
    const handleClearAll = () => setMultiTargets((p) => p.map((r) => ({ ...r, selected: false })));

    const selectedCount = multiTargets.filter((r) => r.selected).length;
    let rollDisabledReason = '';
    if (mode !== 'single') {
        if (selectedCount === 0) {
            rollDisabledReason = 'Please select at least one combatant to target.';
        } else if (selectedCount > maxTargets) {
            rollDisabledReason = `Target limit exceeded (${selectedCount}/${maxTargets}) for rank ${rank || 'Standard'}.`;
        } else if (mode === 'area' && targets.length >= maxTargets && selectedCount < maxTargets) {
            rollDisabledReason = `Area moves require targeting all combatants in range up to your rank limit (${maxTargets}).`;
        }
    }
    const isRollDisabled = Boolean(rollDisabledReason);

    const handleConfirm = () => {
        if (isRollDisabled) return;
        const override = { active: overrideType !== 'none', type: overrideType === 'none' ? ('dice' as const) : overrideType, value: overrideValue };
        if (mode === 'single') {
            onRoll(baseDamage, isCrit, effectiveness, reduction, override, appliedFieldFactors);
        } else {
            const selections: MultiTargetSelection[] = multiTargets.filter((r) => r.selected).map((r) => ({
                id: r.id, name: r.name, def: r.def, effectiveness: r.effectiveness, isEvaded: r.isEvaded, isPlayerSide: r.isPlayerSide, types: r.types
            }));
            if (onMultiRoll) {
                onMultiRoll(baseDamage, isCrit, selections, override, appliedFieldFactors);
            } else {
                onRoll(baseDamage, isCrit, effectiveness, reduction, override, appliedFieldFactors);
            }
        }
        onClose();
    };

    return (
        <div className="targeting-modal__overlay">
            <div className="targeting-modal__content">
                <TargetingModalHeader
                    move={move}
                    baseDamage={baseDamage}
                    weatherInfo={weatherInfo}
                    bankedDice={bankedDice}
                    mode={mode}
                    onModeChange={setMode}
                    selectedCount={selectedCount}
                    maxTargets={maxTargets}
                    rank={rank || 'Standard'}
                />

                {mode === 'single' ? (
                    <SingleTargetSection
                        targets={targets}
                        isPhysicalMove={isPhysicalMove}
                        selectedTargetId={selectedTargetId}
                        reduction={reduction}
                        effectiveness={effectiveness}
                        appliedFieldFactors={appliedFieldFactors}
                        baseDamage={baseDamage}
                        bankedDice={bankedDice}
                        overrideType={overrideType}
                        seDmgBonus={itemBuffs.seDmg || 0}
                        onTargetSelect={handleTargetSelect}
                        onReductionChange={setReduction}
                        onEffectivenessChange={setEffectiveness}
                    />
                ) : (
                    <MultiTargetSection
                        mode={mode}
                        targets={multiTargets}
                        isPhysicalMove={isPhysicalMove}
                        baseDamage={baseDamage}
                        bankedDice={bankedDice}
                        weatherBonus={weatherInfo.diceBonus}
                        override={{ active: overrideType !== 'none', type: overrideType === 'none' ? 'dice' : overrideType, value: overrideValue }}
                        maxTargets={maxTargets}
                        rank={rank || 'Standard'}
                        onToggleTarget={handleToggleTarget}
                        onToggleEvaded={handleToggleEvaded}
                        onChangeEffectiveness={handleChangeEffectiveness}
                        onChangeDef={handleChangeDef}
                        onSelectAllFoes={handleSelectAllFoes}
                        onSelectAll={handleSelectAll}
                        onClearAll={handleClearAll}
                    />
                )}

                <TargetingModalOverrideSection
                    canOverride={canOverride}
                    overrideType={overrideType}
                    overrideValue={overrideValue}
                    onOverrideTypeChange={setOverrideType}
                    onOverrideValueChange={setOverrideValue}
                    onShowTooltip={setModalConfig}
                />

                <div className="targeting-modal__checkbox-row">
                    <label className="targeting-modal__checkbox-label text-label" style={{ color: 'var(--semantic-danger)' }}>
                        <input type="checkbox" checked={isCrit} onChange={(e) => setIsCrit(e.target.checked)} className="targeting-modal__checkbox" />
                        Critical Hit? (+{critDice} Dice)
                        <TooltipIcon onClick={() => setModalConfig({
                            title: 'Critical Hit Modifiers',
                            content: 'Checking this box strictly applies Critical Hit modifiers to the roll (like triggering the Expert Belt or Sniper ability). It automatically adds the standard +2 Base Dice bonus.'
                        })} />
                    </label>
                </div>

                <div className="targeting-modal__actions">
                    <button type="button" className="action-button action-button--dark targeting-modal__btn text-theme-header" onClick={onClose}>
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        type="button"
                        className={`action-button action-button--red targeting-modal__btn text-theme-header ${isRollDisabled ? 'action-button--disabled' : ''}`}
                        onClick={handleConfirm}
                        disabled={isRollDisabled}
                        title={rollDisabledReason || undefined}
                    >
                        <Swords size={16} /> Roll
                    </button>
                </div>
            </div>

            <TargetingInfoModal config={modalConfig} onClose={() => setModalConfig(null)} />
        </div>
    );
}
