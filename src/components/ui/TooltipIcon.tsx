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
            style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.5))'
            }}
        >
            <HelpCircle size={14} />
        </span>
    );
}
