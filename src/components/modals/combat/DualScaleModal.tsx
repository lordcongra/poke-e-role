import { useState } from 'react';
import { Scale, CheckCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { PendingDualScale } from '../../store/storeTypes';
import './DualScaleModal.css';

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
    const [selectedAcc1, setSelectedAcc1] = useState<string | undefined>(pendingDualScale.acc1Options?.[0]);
    const [selectedAcc2, setSelectedAcc2] = useState<string | undefined>(pendingDualScale.acc2Options?.[0]);
    const [selectedDmg1, setSelectedDmg1] = useState<string | undefined>(pendingDualScale.dmg1Options?.[0]);
    const [selectedCategory, setSelectedCategory] = useState<'Physical' | 'Special' | 'Status' | undefined>(
        pendingDualScale.categoryOptions?.[0]
    );

    const handleConfirm = () => {
        resolveDualScale(pendingDualScale.moveId, selectedAcc1, selectedAcc2, selectedDmg1, selectedCategory);
    };

    const formatLabel = (val: string) => {
        if (!val || val === 'none') return 'None';
        return val.charAt(0).toUpperCase() + val.slice(1);
    };

    return (
        <div className="dual-scale__overlay">
            <div className="dual-scale__content">
                <h3 className="dual-scale__title modal-title-with-icon text-title-primary">
                    <Scale size={20} /> Move Options Detected
                </h3>
                <p className="dual-scale__desc text-subtext">
                    <b>{pendingDualScale.moveName}</b> has variable scaling or ambiguous options. Please select how you
                    want to roll it:
                </p>

                {pendingDualScale.categoryOptions && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">Move Category:</div>
                        <select
                            className="dual-scale__select text-label"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as 'Physical' | 'Special' | 'Status')}
                        >
                            {pendingDualScale.categoryOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {pendingDualScale.acc1Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">Accuracy Attribute:</div>
                        <select
                            className="dual-scale__select text-label"
                            value={selectedAcc1}
                            onChange={(e) => setSelectedAcc1(e.target.value)}
                        >
                            {pendingDualScale.acc1Options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {formatLabel(opt).toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {pendingDualScale.acc2Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">Accuracy Skill:</div>
                        <select
                            className="dual-scale__select text-label"
                            value={selectedAcc2}
                            onChange={(e) => setSelectedAcc2(e.target.value)}
                        >
                            {pendingDualScale.acc2Options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {formatLabel(opt)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {pendingDualScale.dmg1Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title text-label">Damage Attribute:</div>
                        <select
                            className="dual-scale__select text-label"
                            value={selectedDmg1}
                            onChange={(e) => setSelectedDmg1(e.target.value)}
                        >
                            {pendingDualScale.dmg1Options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {formatLabel(opt).toUpperCase()}
                                </option>
                            ))}
                        </select>
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
