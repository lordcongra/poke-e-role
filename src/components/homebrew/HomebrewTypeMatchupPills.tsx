import { X } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { TYPE_COLORS } from '../../data/constants';
import { getContrastColor } from '../../utils/colorUtils';
import './HomebrewTypes.css';

interface HomebrewTypeMatchupPillsProps {
    items: string[];
    onRemove: (item: string) => void;
    canEdit: boolean;
}

export function HomebrewTypeMatchupPills({ items, onRemove, canEdit }: HomebrewTypeMatchupPillsProps) {
    const customTypes = useCharacterStore((state) => state.roomCustomTypes) || [];
    const ALL_COLORS = { ...TYPE_COLORS, ...Object.fromEntries(customTypes.map((t) => [t.name, t.color])) };

    if (items.length === 0) return null;

    return (
        <div className="homebrew-types__pill-container">
            {items.map((item) => {
                const bgColor = ALL_COLORS[item] || 'var(--dark)';
                const textColor = getContrastColor(bgColor, 0.55);

                return (
                    <span
                        key={item}
                        onClick={() => canEdit && onRemove(item)}
                        className={`homebrew-types__pill text-subtext ${canEdit ? 'homebrew-types__pill--editable' : ''}`}
                        title={canEdit ? 'Click to remove' : ''}
                        style={{
                            background: bgColor,
                            color: textColor,
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        {item} {canEdit && <X size={12} color={textColor} />}
                    </span>
                );
            })}
        </div>
    );
}
