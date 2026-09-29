import { NumberSpinner } from '../ui/NumberSpinner';
import { Shield, Sparkles, AlertTriangle, XCircle, Trash2 } from 'lucide-react';

interface DerivedBoardTempModalsProps {
    showAddTempModal: boolean;
    setShowAddTempModal: (show: boolean) => void;
    newTempHp: number;
    setNewTempHp: (val: number) => void;
    showTempConfirm: boolean;
    setShowTempConfirm: (show: boolean) => void;
    showAddTempWillModal: boolean;
    setShowAddTempWillModal: (show: boolean) => void;
    newTempWill: number;
    setNewTempWill: (val: number) => void;
    showTempWillConfirm: boolean;
    setShowTempWillConfirm: (show: boolean) => void;
    onApplyTempHp: (amount: number) => void;
    onClearTempHp: () => void;
    onApplyTempWill: (amount: number) => void;
    onClearTempWill: () => void;
}

export function DerivedBoardTempModals({
    showAddTempModal,
    setShowAddTempModal,
    newTempHp,
    setNewTempHp,
    showTempConfirm,
    setShowTempConfirm,
    showAddTempWillModal,
    setShowAddTempWillModal,
    newTempWill,
    setNewTempWill,
    showTempWillConfirm,
    setShowTempWillConfirm,
    onApplyTempHp,
    onClearTempHp,
    onApplyTempWill,
    onClearTempWill
}: DerivedBoardTempModalsProps) {
    return (
        <>
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
                                onClick={() => onApplyTempHp(newTempHp)}
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
                                onClick={onClearTempHp}
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
                                onClick={() => onApplyTempWill(newTempWill)}
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
                                onClick={onClearTempWill}
                            >
                                <Trash2 size={16} /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
