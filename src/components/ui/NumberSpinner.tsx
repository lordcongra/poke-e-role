import { Minus, Plus } from 'lucide-react';

interface NumberSpinnerProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    compact?: boolean;
    className?: string;
}

export function NumberSpinner({
    value,
    onChange,
    min = 0,
    max = 9999,
    disabled = false,
    compact = false,
    className
}: NumberSpinnerProps) {
    const charLength = Math.max(2, String(value).length);
    const rootClasses = ['number-spinner', compact ? 'number-spinner--compact' : '', className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={rootClasses} style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
            <button
                type="button"
                className="number-spinner__button"
                onClick={(e) => !disabled && onChange(Math.max(min, value - (e.shiftKey ? 10 : 1)))}
                disabled={disabled}
                title="Decrement (Shift+click for -10)"
            >
                <Minus size={compact ? 10 : 14} />
            </button>

            <input
                type="number"
                className="number-spinner__input no-spinners"
                style={{
                    width: compact ? '2ch' : `${charLength + 0.5}ch`,
                    backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                    color: 'var(--text-main)',
                    borderRadius: '2px'
                }}
                value={value}
                onChange={(e) => !disabled && onChange(parseInt(e.target.value) || 0)}
                disabled={disabled}
            />

            <button
                type="button"
                className="number-spinner__button"
                onClick={(e) => !disabled && onChange(Math.min(max, value + (e.shiftKey ? 10 : 1)))}
                disabled={disabled}
                title="Increment (Shift+click for +10)"
            >
                <Plus size={compact ? 10 : 14} />
            </button>
        </div>
    );
}
