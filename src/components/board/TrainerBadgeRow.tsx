import type { Badge } from '../../store/storeTypes';
import { Trash2 } from 'lucide-react';
import './TrainerBadges.css';

interface TrainerBadgeRowProps {
    badge: Badge;
    onUpdate: (field: 'name' | 'emoji', value: string) => void;
    onRemove: () => void;
}

export function TrainerBadgeRow({ badge, onUpdate, onRemove }: TrainerBadgeRowProps) {
    return (
        <div className="trainer-badge-row">
            <input
                type="text"
                className="trainer-badge-row__emoji-input"
                value={badge.emoji}
                onChange={(e) => onUpdate('emoji', e.target.value)}
                onFocus={(e) => e.target.select()}
                title="Press Win + . (Windows) or Cmd + Ctrl + Space (Mac) for emojis"
            />

            <input
                type="text"
                className="trainer-badge-row__input text-label"
                placeholder="Badge Name..."
                value={badge.name}
                onChange={(e) => onUpdate('name', e.target.value)}
            />

            <button
                type="button"
                className="action-button action-button--red trainer-badge-row__del-btn"
                onClick={onRemove}
                title="Delete Badge"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}
