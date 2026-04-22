import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import './DemoRollModal.css';

export function DemoRollModal() {
    const pendingRoll = useCharacterStore((state) => state.identity.pendingDemoRoll);

    const [mode, setMode] = useState<'target' | 'exact'>('target');
    const [targetSuccesses, setTargetSuccesses] = useState(0);
    const [exactDice, setExactDice] = useState('');

    if (!pendingRoll) return null;

    const { notation, numDice, successThreshold, flatMod, resolve } = pendingRoll;

    const handleConfirm = () => {
        if (mode === 'exact') {
            const parsed = exactDice
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));

            if (parsed.length !== numDice) {
                alert(`Please enter exactly ${numDice} numbers separated by commas.`);
                return;
            }
            resolve(parsed);
        } else {
            const dice: number[] = [];
            // Target is the number of raw dice successes we want, ignoring flat modifiers!
            const cappedTarget = Math.min(Math.max(0, targetSuccesses), numDice);

            for (let i = 0; i < cappedTarget; i++) {
                // Generates a passing die (e.g. 4, 5, 6 for threshold 3)
                dice.push(Math.floor(Math.random() * (6 - successThreshold)) + successThreshold + 1);
            }
            for (let i = 0; i < numDice - cappedTarget; i++) {
                // Generates a failing die (e.g. 1, 2, 3 for threshold 3)
                dice.push(Math.floor(Math.random() * successThreshold) + 1);
            }

            // Randomize the order of the array so it looks authentic in 3D!
            resolve(dice.sort(() => Math.random() - 0.5));
        }
    };

    const handleCancel = () => {
        resolve(null); // Passing null aborts the roll sequence safely
    };

    return (
        <div className="demo-roll-modal__overlay">
            <div className="demo-roll-modal__content">
                <h3 className="demo-roll-modal__title">🎬 GM Demo Mode Intercept</h3>
                <p className="demo-roll-modal__desc">
                    Rolling: <strong>{notation}</strong> <br />({numDice} Dice | Threshold: {successThreshold} | Flat
                    Mod: {flatMod > 0 ? `+${flatMod}` : flatMod})
                </p>

                <div className="demo-roll-modal__tabs">
                    <button
                        className={`demo-roll-modal__tab ${mode === 'target' ? 'demo-roll-modal__tab--active' : ''}`}
                        onClick={() => setMode('target')}
                    >
                        Target Successes
                    </button>
                    <button
                        className={`demo-roll-modal__tab ${mode === 'exact' ? 'demo-roll-modal__tab--active' : ''}`}
                        onClick={() => setMode('exact')}
                    >
                        Exact Dice Array
                    </button>
                </div>

                <div className="demo-roll-modal__body">
                    {mode === 'target' ? (
                        <div className="demo-roll-modal__form-group">
                            <label className="demo-roll-modal__label">Desired Raw Dice Successes (Max {numDice})</label>
                            <input
                                type="number"
                                className="demo-roll-modal__input"
                                value={targetSuccesses}
                                onChange={(e) => setTargetSuccesses(parseInt(e.target.value) || 0)}
                                min={0}
                                max={numDice}
                            />
                            <p className="demo-roll-modal__subtext">
                                The flat modifier ({flatMod}) will be mathematically added to your choice during final
                                output!
                            </p>
                        </div>
                    ) : (
                        <div className="demo-roll-modal__form-group">
                            <label className="demo-roll-modal__label">Exact Dice Values (Comma separated)</label>
                            <input
                                type="text"
                                className="demo-roll-modal__input"
                                value={exactDice}
                                onChange={(e) => setExactDice(e.target.value)}
                                placeholder="e.g. 6, 2, 4"
                            />
                            <p className="demo-roll-modal__subtext">You must provide exactly {numDice} numbers.</p>
                        </div>
                    )}
                </div>

                <div className="demo-roll-modal__actions">
                    <button className="action-button action-button--dark demo-roll-modal__btn" onClick={handleCancel}>
                        Cancel Roll
                    </button>
                    <button className="action-button action-button--red demo-roll-modal__btn" onClick={handleConfirm}>
                        Confirm Fake Roll
                    </button>
                </div>
            </div>
        </div>
    );
}
