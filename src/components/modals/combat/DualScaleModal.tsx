import { useState, useMemo } from 'react';
import { Scale, CheckCircle, Check, Target, Swords, Sparkles, Shield } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import type { PendingDualScale, MoveData } from '../../../store/storeTypes';
import {
    calculateBaseAccuracy,
    calculateBaseDamage,
    calculateStatTotal,
    calculateSkillTotal,
    parseCombatTags,
    getAbilityText
} from '../../../utils/combatUtils';
import './DualScaleModal.css';

const ATTRIBUTE_LABELS: Record<string, { short: string; full: string }> = {
    str: { short: 'STR', full: 'Strength' },
    dex: { short: 'DEX', full: 'Dexterity' },
    vit: { short: 'VIT', full: 'Vitality' },
    spe: { short: 'SPE', full: 'Special' },
    ins: { short: 'INS', full: 'Insight' },
    tou: { short: 'TOU', full: 'Tough' },
    coo: { short: 'COO', full: 'Cool' },
    bea: { short: 'BEA', full: 'Beauty' },
    cut: { short: 'CUT', full: 'Cute' },
    cle: { short: 'CLE', full: 'Clever' },
    will: { short: 'WILL', full: 'Will' }
};

interface DualScaleDialogProps {
    pendingDualScale: PendingDualScale;
    resolveDualScale: (
        moveId: string,
        acc1?: string,
        acc2?: string,
        dmg1?: string,
        category?: 'Physical' | 'Special' | 'Status'
    ) => void;
}

function DualScaleDialog({ pendingDualScale, resolveDualScale }: DualScaleDialogProps) {
    const fullState = useCharacterStore.getState();
    const inventory = useCharacterStore((state) => state.inventory);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const moves = useCharacterStore((state) => state.moves);

    const move: MoveData = useMemo(() => {
        return (
            moves.find((m) => m.id === pendingDualScale.moveId) || {
                id: pendingDualScale.moveId,
                name: pendingDualScale.moveName,
                active: true,
                type: 'Normal',
                category: 'Physical' as const,
                acc1: 'str',
                acc2: 'brawl',
                dmg1: 'str',
                power: 0,
                desc: '',
                marker: ''
            }
        );
    }, [moves, pendingDualScale.moveId, pendingDualScale.moveName]);

    const abilityText = getAbilityText(ability, customAbilities);
    const itemBuffs = useMemo(
        () => parseCombatTags(inventory, extraCategories, move, abilityText),
        [inventory, extraCategories, move, abilityText]
    );

    const [selectedAcc1, setSelectedAcc1] = useState<string | undefined>(pendingDualScale.acc1Options?.[0]);
    const [selectedAcc2, setSelectedAcc2] = useState<string | undefined>(pendingDualScale.acc2Options?.[0]);
    const [selectedDmg1, setSelectedDmg1] = useState<string | undefined>(pendingDualScale.dmg1Options?.[0]);
    const [selectedCategory, setSelectedCategory] = useState<'Physical' | 'Special' | 'Status' | undefined>(
        pendingDualScale.categoryOptions?.[0]
    );

    const effectiveCategory: 'Physical' | 'Special' | 'Status' = selectedCategory || move.category;

    const handleConfirm = () => {
        resolveDualScale(pendingDualScale.moveId, selectedAcc1, selectedAcc2, selectedDmg1, selectedCategory);
    };

    const formatLabel = (val: string) => {
        if (!val || val === 'none') return 'None';
        return val.charAt(0).toUpperCase() + val.slice(1);
    };

    // Calculate preview for Category
    const getCategoryPreview = (cat: 'Physical' | 'Special' | 'Status') => {
        if (cat === 'Status') {
            return { label: 'Support', desc: 'No Damage' };
        }
        const simulatedMove: MoveData = {
            ...move,
            category: cat,
            dmg1: selectedDmg1 || move.dmg1
        };
        const dmg = calculateBaseDamage(simulatedMove, fullState, itemBuffs);
        return { label: `${dmg} Damage`, desc: `${cat} Attack` };
    };

    // Calculate preview for Accuracy Attribute (acc1)
    const getAcc1Preview = (attrKey: string) => {
        const statVal = calculateStatTotal(attrKey, fullState, itemBuffs);
        const simulatedMove: MoveData = {
            ...move,
            acc1: attrKey,
            acc2: selectedAcc2 || move.acc2,
            category: effectiveCategory
        };
        const totalDice = calculateBaseAccuracy(simulatedMove, fullState, itemBuffs);
        return { statVal, totalDice };
    };

    // Calculate preview for Accuracy Skill (acc2)
    const getAcc2Preview = (skillKey: string) => {
        if (!skillKey || skillKey === 'none') {
            const simulatedMove: MoveData = {
                ...move,
                acc1: selectedAcc1 || move.acc1,
                acc2: 'none',
                category: effectiveCategory
            };
            const totalDice = calculateBaseAccuracy(simulatedMove, fullState, itemBuffs);
            return { skillVal: 0, totalDice };
        }
        const skillVal = calculateSkillTotal(skillKey, fullState, itemBuffs);
        const simulatedMove: MoveData = {
            ...move,
            acc1: selectedAcc1 || move.acc1,
            acc2: skillKey,
            category: effectiveCategory
        };
        const totalDice = calculateBaseAccuracy(simulatedMove, fullState, itemBuffs);
        return { skillVal, totalDice };
    };

    // Calculate preview for Damage Attribute (dmg1)
    const getDmg1Preview = (attrKey: string) => {
        const statVal = calculateStatTotal(attrKey, fullState, itemBuffs);
        if (effectiveCategory === 'Status') {
            return { statVal, totalDamage: 0, text: 'Support' };
        }
        const simulatedMove: MoveData = {
            ...move,
            dmg1: attrKey,
            category: effectiveCategory
        };
        const dmg = calculateBaseDamage(simulatedMove, fullState, itemBuffs);
        return { statVal, totalDamage: dmg, text: `${dmg} Damage` };
    };

    return (
        <div className="dual-scale__overlay" role="dialog" aria-modal="true">
            <div className="dual-scale__content">
                <h3 className="dual-scale__title modal-title-with-icon text-title-primary">
                    <Scale size={20} /> Move Scaling Options
                </h3>
                <p className="dual-scale__desc text-subtext">
                    <b>{pendingDualScale.moveName}</b> has variable scaling. Compare the resulting values below and choose your preferred roll configuration:
                </p>

                {/* Move Category Choice */}
                {pendingDualScale.categoryOptions && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">
                            <Sparkles size={14} /> Move Category:
                        </div>
                        <div className="dual-scale__options-grid">
                            {pendingDualScale.categoryOptions.map((cat) => {
                                const isSelected = selectedCategory === cat;
                                const preview = getCategoryPreview(cat);
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        className={`dual-scale__option-btn ${
                                            isSelected ? 'dual-scale__option-btn--active' : ''
                                        }`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        <div className="dual-scale__option-top">
                                            <span className="dual-scale__option-title">{cat}</span>
                                            {isSelected && <Check size={14} className="dual-scale__option-check" />}
                                        </div>
                                        <div className="dual-scale__option-stats">
                                            <span className="dual-scale__option-result text-value-highlight">
                                                {cat === 'Physical' && <Swords size={12} />}
                                                {cat === 'Special' && <Sparkles size={12} />}
                                                {cat === 'Status' && <Shield size={12} />}
                                                {preview.label}
                                            </span>
                                            <span className="dual-scale__option-subtext text-subtext">
                                                {preview.desc}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Accuracy Attribute Choice (acc1) */}
                {pendingDualScale.acc1Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">
                            <Target size={14} /> Accuracy Attribute:
                        </div>
                        <div className="dual-scale__options-grid">
                            {pendingDualScale.acc1Options.map((opt) => {
                                const isSelected = selectedAcc1 === opt;
                                const preview = getAcc1Preview(opt);
                                const attrInfo = ATTRIBUTE_LABELS[opt.toLowerCase()] || {
                                    short: opt.toUpperCase(),
                                    full: formatLabel(opt)
                                };
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`dual-scale__option-btn ${
                                            isSelected ? 'dual-scale__option-btn--active' : ''
                                        }`}
                                        onClick={() => setSelectedAcc1(opt)}
                                    >
                                        <div className="dual-scale__option-top">
                                            <div className="dual-scale__option-title-group">
                                                <span className="dual-scale__option-title">{attrInfo.short}</span>
                                                <span className="dual-scale__option-subtext text-subtext">
                                                    {attrInfo.full}
                                                </span>
                                            </div>
                                            {isSelected && <Check size={14} className="dual-scale__option-check" />}
                                        </div>
                                        <div className="dual-scale__option-stats">
                                            <span className="dual-scale__option-stat text-subtext">
                                                Stat: <strong>{preview.statVal}</strong>
                                            </span>
                                            <span className="dual-scale__option-result text-value-highlight">
                                                <Target size={12} /> {preview.totalDice} Acc Dice
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Accuracy Skill Choice (acc2) */}
                {pendingDualScale.acc2Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">
                            <Target size={14} /> Accuracy Skill:
                        </div>
                        <div className="dual-scale__options-grid">
                            {pendingDualScale.acc2Options.map((opt) => {
                                const isSelected = selectedAcc2 === opt;
                                const preview = getAcc2Preview(opt);
                                const label = formatLabel(opt);
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`dual-scale__option-btn ${
                                            isSelected ? 'dual-scale__option-btn--active' : ''
                                        }`}
                                        onClick={() => setSelectedAcc2(opt)}
                                    >
                                        <div className="dual-scale__option-top">
                                            <span className="dual-scale__option-title">{label}</span>
                                            {isSelected && <Check size={14} className="dual-scale__option-check" />}
                                        </div>
                                        <div className="dual-scale__option-stats">
                                            <span className="dual-scale__option-stat text-subtext">
                                                {opt === 'none' ? 'No Skill' : <>Skill: <strong>{preview.skillVal}</strong></>}
                                            </span>
                                            <span className="dual-scale__option-result text-value-highlight">
                                                <Target size={12} /> {preview.totalDice} Acc Dice
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Damage Attribute Choice (dmg1) */}
                {pendingDualScale.dmg1Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">
                            <Swords size={14} /> Damage Attribute:
                        </div>
                        <div className="dual-scale__options-grid">
                            {pendingDualScale.dmg1Options.map((opt) => {
                                const isSelected = selectedDmg1 === opt;
                                const preview = getDmg1Preview(opt);
                                const attrInfo = ATTRIBUTE_LABELS[opt.toLowerCase()] || {
                                    short: opt.toUpperCase(),
                                    full: formatLabel(opt)
                                };
                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`dual-scale__option-btn ${
                                            isSelected ? 'dual-scale__option-btn--active' : ''
                                        }`}
                                        onClick={() => setSelectedDmg1(opt)}
                                    >
                                        <div className="dual-scale__option-top">
                                            <div className="dual-scale__option-title-group">
                                                <span className="dual-scale__option-title">{attrInfo.short}</span>
                                                <span className="dual-scale__option-subtext text-subtext">
                                                    {attrInfo.full}
                                                </span>
                                            </div>
                                            {isSelected && <Check size={14} className="dual-scale__option-check" />}
                                        </div>
                                        <div className="dual-scale__option-stats">
                                            <span className="dual-scale__option-stat text-subtext">
                                                Stat: <strong>{preview.statVal}</strong>
                                            </span>
                                            <span className="dual-scale__option-result text-value-highlight">
                                                <Swords size={12} /> {preview.text}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="dual-scale__actions">
                    <button
                        type="button"
                        className="action-button action-button--theme dual-scale__btn"
                        onClick={handleConfirm}
                    >
                        <CheckCircle size={16} /> Apply Choice
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DualScaleModal() {
    const pendingDualScale = useCharacterStore((state) => state.pendingDualScale);
    const resolveDualScale = useCharacterStore((state) => state.resolveDualScale);

    if (!pendingDualScale) return null;

    return (
        <DualScaleDialog
            key={pendingDualScale.moveId}
            pendingDualScale={pendingDualScale}
            resolveDualScale={resolveDualScale}
        />
    );
}
