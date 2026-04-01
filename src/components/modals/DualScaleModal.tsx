import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import './DualScaleModal.css';

export function DualScaleModal() {
    const pendingDualScale = useCharacterStore((state) => state.pendingDualScale);
    const resolveDualScale = useCharacterStore((state) => state.resolveDualScale);

    const [selectedAcc1, setSelectedAcc1] = useState<string | undefined>();
    const [selectedAcc2, setSelectedAcc2] = useState<string | undefined>();
    const [selectedDmg1, setSelectedDmg1] = useState<string | undefined>();

    useEffect(() => {
        if (pendingDualScale) {
            setSelectedAcc1(pendingDualScale.acc1Options ? pendingDualScale.acc1Options[0] : undefined);
            setSelectedAcc2(pendingDualScale.acc2Options ? pendingDualScale.acc2Options[0] : undefined);
            setSelectedDmg1(pendingDualScale.dmg1Options ? pendingDualScale.dmg1Options[0] : undefined);
        }
    }, [pendingDualScale]);

    if (!pendingDualScale) return null;

    const handleConfirm = () => {
        resolveDualScale(pendingDualScale.moveId, selectedAcc1, selectedAcc2, selectedDmg1);
    };

    const formatLabel = (val: string) => {
        if (!val || val === 'none') return 'None';
        return val.charAt(0).toUpperCase() + val.slice(1);
    };

    return (
        <div className="dual-scale__overlay">
            <div className="dual-scale__content">
                <h3 className="dual-scale__title">⚖️ Dual-Scaling Move</h3>
                <p className="dual-scale__desc">
                    <b>{pendingDualScale.moveName}</b> has multiple ways it can be rolled. Which stats/skills would you
                    like to use?
                </p>

                {pendingDualScale.acc1Options && (
                    <div className="dual-scale__section">
                        <div className="dual-scale__section-title">Accuracy Attribute:</div>
                        <select
                            className="dual-scale__select"
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
                        <div className="dual-scale__section-title">Accuracy Skill:</div>
                        <select
                            className="dual-scale__select"
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
                        <div className="dual-scale__section-title">Damage Attribute:</div>
                        <select
                            className="dual-scale__select"
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
                    <button type="button" className="action-button dual-scale__btn" onClick={handleConfirm}>
                        Apply Choice
                    </button>
                </div>
            </div>
        </div>
    );
}
