import { useEffect, useState } from 'react';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { addRollLogEntry } from '../../utils/diceRoller';
import type { Combatant } from '../../utils/initiativeHelpers';
import './CombatantCard.css';

interface CombatantCardProps {
    c: Combatant;
    shape: string;
    isActive: boolean;
    updateInit: (id: string, d6Value: number, baseInitiative: number, forceDecimal: number) => void;
    removeInit: (id: string) => void;
}

export function CombatantCard({ c, shape, isActive, updateInit, removeInit }: CombatantCardProps) {
    const totalScore = typeof c.total === 'number' ? c.total : 0;
    const baseInitiativeScore = typeof c.baseInit === 'number' ? c.baseInit : 0;

    const [value, setValue] = useState<string>(totalScore.toFixed(2));
    const [baseValue, setBaseValue] = useState<number>(baseInitiativeScore);
    const [resolvedImage, setResolvedImage] = useState<string>('');

    useEffect(() => {
        const currentTotal = typeof c.total === 'number' ? c.total : 0;
        setValue(currentTotal.toFixed(2));
        setBaseValue(typeof c.baseInit === 'number' ? c.baseInit : 0);
    }, [c.total, c.baseInit]);

    useEffect(() => {
        let isMounted = true;

        const resolveImage = async () => {
            if (!c.image) {
                if (isMounted) setResolvedImage('');
                return;
            }
            if (isStandaloneMode && c.image.startsWith('local-img:')) {
                try {
                    const url = await imageManager.getImageUrl(c.image);
                    if (isMounted) setResolvedImage(url || '');
                } catch (error) {
                    if (isMounted) setResolvedImage('');
                }
            } else {
                if (isMounted) setResolvedImage(c.image);
            }
        };

        resolveImage();
        return () => {
            isMounted = false;
        };
    }, [c.image]);

    const handleSave = () => {
        const parsed = parseFloat(value);
        const currentRounded = parseFloat(totalScore.toFixed(2));
        if (!isNaN(parsed) && parsed !== currentRounded) {
            updateInit(c.id, parsed - baseValue, baseValue, 0);
        }
    };

    const handleRollSingle = () => {
        const rolledD6 = Math.floor(Math.random() * 6) + 1;
        const tiebreakerDec = (Math.floor(Math.random() * 99) + 1) / 100;
        const total = rolledD6 + baseValue;

        updateInit(c.id, rolledD6, baseValue, tiebreakerDec);

        addRollLogEntry(
            `⚔️ Initiative Roll for ${c.name}`,
            `Rolled: ${rolledD6} + Base (${baseValue}) = ${total}\nTiebreaker Dec: +${tiebreakerDec}`,
            c.image,
            c.name
        );
    };

    return (
        <div className={`init-tracker__card ${isActive ? 'init-tracker__card--active' : ''}`}>
            <button
                type="button"
                className="init-tracker__card-close"
                onClick={() => removeInit(c.id)}
                title="Remove Combatant"
            >
                ✖
            </button>

            <div className="init-tracker__avatar-container" title={c.name}>
                {resolvedImage && (
                    <img
                        src={resolvedImage}
                        alt={c.name}
                        className={`init-tracker__avatar init-tracker__avatar--${shape}`}
                    />
                )}
            </div>

            <div className="init-tracker__info">
                <span className="init-tracker__name" title={c.name}>
                    {c.name}
                </span>

                <div className="init-tracker__controls">
                    <input
                        type="number"
                        step="0.01"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                        className="init-tracker__input no-spinners"
                        title={`Score (Base Init: ${baseValue})`}
                    />
                    <button
                        type="button"
                        onClick={handleRollSingle}
                        className="init-tracker__roll-btn"
                        title="Roll Initiative (1d6 + Base Init)"
                    >
                        🎲
                    </button>
                </div>
            </div>
        </div>
    );
}
