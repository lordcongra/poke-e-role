import './UI.css';

export function TooltipIcon({ onClick }: { onClick: () => void }) {
    return (
        <span onClick={onClick} className="tooltip-icon">
            ?
        </span>
    );
}
