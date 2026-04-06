interface NumberSpinnerProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

export function NumberSpinner({ value, onChange, min = 0, max = 9999, disabled = false }: NumberSpinnerProps) {
    const charLength = Math.max(2, String(value).length);

    return (
        <div
            className="number-spinner"
            style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        >
            <button
                type="button"
                className="number-spinner__button"
                onClick={() => !disabled && onChange(Math.max(min, value - 1))}
                disabled={disabled}
            >
                -
            </button>

            <input
                type="number"
                className="number-spinner__input no-spinners"
                style={{ width: `${charLength + 0.5}ch` }}
                value={value}
                onChange={(e) => !disabled && onChange(parseInt(e.target.value) || 0)}
                disabled={disabled}
            />

            <button
                type="button"
                className="number-spinner__button"
                onClick={() => !disabled && onChange(Math.min(max, value + 1))}
                disabled={disabled}
            >
                +
            </button>
        </div>
    );
}
