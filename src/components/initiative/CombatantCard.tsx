import { useEffect, useState } from 'react';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { addRollLogEntry } from '../../utils/diceRoller';
import { formatInitiativeDisplay, type Combatant } from '../../utils/initiativeHelpers';
import { X, Dices } from 'lucide-react';
import './CombatantCard.css';

interface CombatantCardProps {
    c: Combatant;
    shape: string;
    isActive: boolean;
    updateInit: (id: string, d6Value: number, baseInitiative: number, forceTiebreaker: number) => void;
    removeInit: (id: string) => void;
}

export function CombatantCard({ c, shape, isActive, updateInit, removeInit }: CombatantCardProps) {
    const totalScore = typeof c.total === 'number' ? c.total : 0;
    const baseInitiativeScore = typeof c.baseInit === 'number' ? c.baseInit : 0;
    const tiebreakerScore = typeof c.tiebreaker === 'number' ? c.tiebreaker : 0;

    const [value, setValue] = useState<string>(
        formatInitiativeDisplay(totalScore, baseInitiativeScore, tiebreakerScore)
    );
    const [baseValue, setBaseValue] = useState<number>(baseInitiativeScore);
    const [resolvedImage, setResolvedImage] = useState<string>('');

    useEffect(() => {
        const currentTotal = typeof c.total === 'number' ? c.total : 0;
        const currentBase = typeof c.baseInit === 'number' ? c.baseInit : 0;
        const currentTie = typeof c.tiebreaker === 'number' ? c.tiebreaker : 0;

        setValue(formatInitiativeDisplay(currentTotal, currentBase, currentTie));
        setBaseValue(currentBase);
    }, [c.total, c.baseInit, c.tiebreaker]);

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
                    console.error('[CombatantCard] Failed to load local image:', error);
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
        if (!isNaN(parsed)) {
            const parsedIntegerTotal = Math.floor(parsed);
            if (parsedIntegerTotal !== totalScore) {
                updateInit(c.id, parsedIntegerTotal - baseValue, baseValue, 0);
            }
        }
    };

    const handleRollSingle = () => {
        const rolledD6 = Math.floor(Math.random() * 6) + 1;
        const total = rolledD6 + baseValue;

        updateInit(c.id, rolledD6, baseValue, 0);

        addRollLogEntry(
            `Initiative Roll for ${c.name}`,
            `Rolled: 1d6 [${rolledD6}] + Base (${baseValue}) = ${total}`,
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
                <X size={12} />
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
                <span className="init-tracker__name text-label" title={c.name}>
                    {c.name}
                </span>

                <div className="init-tracker__controls">
                    <input
                        type="text"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(event) => event.key === 'Enter' && handleSave()}
                        className="init-tracker__input no-spinners text-value-highlight"
                        title={`Total Initiative: ${totalScore} (Base: ${baseValue}${tiebreakerScore > 0 ? `, Tiebreaker: 🎲 ${tiebreakerScore}` : ''})`}
                    />
                    <button
                        type="button"
                        onClick={handleRollSingle}
                        className="init-tracker__roll-btn"
                        title="Roll Initiative (1d6 + Base Init)"
                    >
                        <Dices size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
