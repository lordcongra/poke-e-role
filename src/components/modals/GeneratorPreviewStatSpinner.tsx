import { Minus, Plus } from 'lucide-react';
import './GeneratorPreviewModal.css';

interface GeneratorPreviewStatSpinnerProps {
    value: number;
    onChange: (value: number) => void;
}

export function GeneratorPreviewStatSpinner({ value, onChange }: GeneratorPreviewStatSpinnerProps) {
    return (
        <div className="generator-preview-spinner">
            <button type="button" onClick={() => onChange(value - 1)} className="generator-preview-spinner__btn">
                <Minus size={14} />
            </button>
            <span className="generator-preview-spinner__value">{value}</span>
            <button type="button" onClick={() => onChange(value + 1)} className="generator-preview-spinner__btn">
                <Plus size={14} />
            </button>
        </div>
    );
}
