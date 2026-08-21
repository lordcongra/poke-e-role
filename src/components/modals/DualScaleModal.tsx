import { useState, useEffect } from 'react';
import { Scale, CheckCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import './DualScaleModal.css';

export function DualScaleModal() {
    const pendingDualScale = useCharacterStore((state) => state.pendingDualScale);
    const resolveDualScale = useCharacterStore((state) => state.resolveDualScale);

    const [selectedAcc1, setSelectedAcc1] = useState<string | undefined>();
    const [selectedAcc2, setSelectedAcc2] = useState<string | undefined>();
    const [selectedDmg1, setSelectedDmg1] = useState<string | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<'Physical' | 'Special' | 'Status' | undefined>();

    useEffect(() => {
        if (pendingDualScale) {
            setSelectedAcc1(pendingDualScale.acc1Options ? pendingDualScale.acc1Options[0] : undefined);
            setSelectedAcc2(pendingDualScale.acc2Options ? pendingDualScale.acc2Options[0] : undefined);
            setSelectedDmg1(pendingDualScale.dmg1Options ? pendingDualScale.dmg1Options[0] : undefined);
            setSelectedCategory(pendingDualScale.categoryOptions ? pendingDualScale.categoryOptions[0] : undefined);
        }
    }, [pendingDualScale]);

    if (!pendingDualScale) return null;

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
