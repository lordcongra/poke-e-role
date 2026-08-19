import { HelpCircle } from 'lucide-react';
import './UI.css';

export function TooltipIcon({ onClick }: { onClick: () => void }) {
    return (
        <span
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className="tooltip-icon"
        >
            <HelpCircle size={14} />
        </span>
    );
}
