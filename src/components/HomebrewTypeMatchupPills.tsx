import './HomebrewTypes.css';

interface HomebrewTypeMatchupPillsProps {
    items: string[];
    onRemove: (item: string) => void;
    canEdit: boolean;
}

export function HomebrewTypeMatchupPills({ items, onRemove, canEdit }: HomebrewTypeMatchupPillsProps) {
    if (items.length === 0) return null;

    return (
        <div className="homebrew-types__pill-container">
            {items.map((item) => (
                <span
                    key={item}
                    onClick={() => canEdit && onRemove(item)}
                    className={`homebrew-types__pill ${canEdit ? 'homebrew-types__pill--editable' : ''}`}
                    title={canEdit ? 'Click to remove' : ''}
                >
                    {item} {canEdit && 'x'}
                </span>
            ))}
        </div>
    );
}
