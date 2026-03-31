import './GeneratorPreviewModal.css';

interface GeneratorPreviewStatSpinnerProps {
    value: number;
    onChange: (value: number) => void;
}

export function GeneratorPreviewStatSpinner({ value, onChange }: GeneratorPreviewStatSpinnerProps) {
    return (
        <div className="generator-preview-spinner">
            <button type="button" onClick={() => onChange(value - 1)} className="generator-preview-spinner__btn">
                -
            </button>
            <span className="generator-preview-spinner__value">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} className="generator-preview-spinner__btn">
                +
            </button>
        </div>
    );
}
