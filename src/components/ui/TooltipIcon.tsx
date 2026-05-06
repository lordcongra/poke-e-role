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
            ?
        </span>
    );
}
