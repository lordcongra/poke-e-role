// src/components/NumberSpinner.tsx

interface NumberSpinnerProps {
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
}

export function NumberSpinner({ value, onChange, min = 0, max = 9999 }: NumberSpinnerProps) {
    return (
        <div className="number-spinner">
            <button 
                type="button" 
                className="number-spinner__button" 
                onClick={() => onChange(Math.max(min, value - 1))}
            >
                -
            </button>
            
            <input 
                type="number" 
                className="number-spinner__input no-spinners" 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value) || 0)} 
            />
            
            <button 
                type="button" 
                className="number-spinner__button" 
                onClick={() => onChange(Math.min(max, value + 1))}
            >
                +
            </button>
        </div>
    );
}