import { Plus, Minus } from 'lucide-react';

interface RemainingRoundsBoxesProps {
    value: number;
    onChange: (newValue: number) => void;
    maxBoxes?: number;
    title?: string;
}

export function RemainingRoundsBoxes({
    value,
    onChange,
    maxBoxes = 4,
    title = 'Remaining Rounds'
}: RemainingRoundsBoxesProps) {
    const handleBoxClick = (index: number) => {
        const targetValue = index + 1;
        // If clicking the current maximum filled box, decrement by 1 (or toggle off)
        if (value === targetValue) {
            onChange(targetValue - 1);
        } else {
            onChange(targetValue);
        }
    };

    const handleIncrement = () => {
        onChange(value === -1 ? 1 : value + 1);
    };

    const handleDecrement = () => {
        if (value <= 0 || value === -1) return;
        onChange(Math.max(0, value - 1));
    };

    const totalBoxes = value === -1 ? maxBoxes : Math.max(maxBoxes, value);

    return (
        <div className="bo-rounds-boxes" title={`${title}: ${value === -1 ? 'Whole Scene (∞)' : `${value} rounds remaining`}`}>
            <div className="bo-rounds-boxes__row">
                {Array.from({ length: totalBoxes }, (_, index) => {
                    const isFilled = value === -1 || index < value;
                    return (
                        <button
                            key={index}
                            type="button"
                            className={`bo-rounds-boxes__box ${isFilled ? 'bo-rounds-boxes__box--filled' : 'bo-rounds-boxes__box--empty'}`}
                            onClick={() => handleBoxClick(index)}
                            title={value === -1 ? `Set to ${index + 1} remaining rounds` : `Set to ${index + 1} remaining round${index > 0 ? 's' : ''}`}
                            aria-label={`Round slot ${index + 1} ${isFilled ? 'active' : 'inactive'}`}
                        >
                            {value === -1 ? (
                                <span className="bo-rounds-boxes__check">∞</span>
                            ) : isFilled ? (
                                <span className="bo-rounds-boxes__check">✓</span>
                            ) : (
                                <span className="bo-rounds-boxes__num">{index + 1}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="bo-rounds-boxes__controls">
                <button
                    type="button"
                    className="bo-rounds-boxes__btn"
                    onClick={handleDecrement}
                    disabled={value <= 0 || value === -1}
                    title="Decrease remaining rounds (-1)"
                    aria-label="Decrease rounds"
                >
                    <Minus size={10} />
                </button>
                <span
                    className={`bo-rounds-boxes__count ${value > 0 || value === -1 ? 'bo-rounds-boxes__count--active' : 'bo-rounds-boxes__count--zero'}`}
                >
                    {value === -1 ? 'Scene' : value}
                </span>
                <button
                    type="button"
                    className="bo-rounds-boxes__btn"
                    onClick={handleIncrement}
                    title="Increase remaining rounds (+1)"
                    aria-label="Increase rounds"
                >
                    <Plus size={10} />
                </button>
            </div>
        </div>
    );
}
