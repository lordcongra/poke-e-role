import { memo, useState, useEffect } from 'react';
import { Tag, Plus, X, Zap, Swords, Shield, Sparkles, Flame, Clock, Check } from 'lucide-react';
import type { ParsedTagPill } from '../modals/items/tagBuilder/tagBuilderLogic';
import './TagPillList.css';

export interface TagPillItem {
    tag: string;
    display?: string;
    raw?: string;
    isMoveKeyword?: boolean;
}

export interface TagPillListProps {
    tags: (string | TagPillItem | ParsedTagPill)[];
    onEditTag?: (tag: string) => void;
    onDeleteTag?: (tag: string, index?: number) => void;
    onAddTag?: () => void;
    addLabel?: string;
    emptyText?: string;
    readOnly?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    style?: React.CSSProperties;
    showAddButton?: boolean;
}

const getTagCategoryIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (
        /\b(str|strength|dex|dexterity|vit|vitality|spe|special|ins|insight|spd|speed|def|defense)\b/i.test(lower) ||
        lower.includes('sp. atk') ||
        lower.includes('sp. def') ||
        lower.includes('tough') ||
        lower.includes('cool') ||
        lower.includes('beauty') ||
        lower.includes('cute') ||
        lower.includes('clever') ||
        lower.includes('hp +') ||
        lower.includes('hp -') ||
        lower.includes('will +') ||
        lower.includes('will -')
    ) {
        return <Zap size={11} className="tag-pill__icon tag-pill__icon--stat" />;
    }
    if (
        lower.includes('dmg') ||
        lower.includes('acc') ||
        lower.includes('crit') ||
        lower.includes('first hit') ||
        lower.includes('combo')
    ) {
        return <Swords size={11} className="tag-pill__icon tag-pill__icon--combat" />;
    }
    if (lower.includes('immune') || lower.includes('resist') || lower.includes('weak')) {
        return <Shield size={11} className="tag-pill__icon tag-pill__icon--matchup" />;
    }
    if (
        lower.includes('status:') ||
        lower.includes('poison') ||
        lower.includes('burn') ||
        lower.includes('paralysis')
    ) {
        return <Sparkles size={11} className="tag-pill__icon tag-pill__icon--status" />;
    }
    if (
        lower.includes('high crit') ||
        lower.includes('low acc') ||
        lower.includes('never miss') ||
        lower.includes('recoil') ||
        lower.includes('successive') ||
        lower.includes('set damage') ||
        lower.includes('powder')
    ) {
        return <Flame size={11} className="tag-pill__icon tag-pill__icon--mechanic" />;
    }
    if (lower.includes('round') || lower.includes('reaction') || lower.includes('action')) {
        return <Clock size={11} className="tag-pill__icon tag-pill__icon--turn" />;
    }
    return <Tag size={11} className="tag-pill__icon tag-pill__icon--default" />;
};

export const TagPillList = memo(function TagPillList({
    tags,
    onEditTag,
    onDeleteTag,
    onAddTag,
    addLabel = 'Tag',
    emptyText,
    readOnly = false,
    size = 'sm',
    className = '',
    style,
    showAddButton = true
}: TagPillListProps) {
    const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);

    // Auto-clear confirmation after 4 seconds of inactivity
    useEffect(() => {
        if (confirmingIndex === null) return;
        const timer = setTimeout(() => {
            setConfirmingIndex(null);
        }, 4000);
        return () => clearTimeout(timer);
    }, [confirmingIndex]);

    // Reset confirming index if tag list shrinks or changes
    useEffect(() => {
        if (confirmingIndex !== null && confirmingIndex >= tags.length) {
            setConfirmingIndex(null);
        }
    }, [tags.length, confirmingIndex]);

    const normalizedTags: TagPillItem[] = tags.map((t) => {
        if (typeof t === 'string') {
            const cleanDisplay = t.startsWith('[') && t.endsWith(']') ? t.slice(1, -1).trim() : t.trim();
            return {
                tag: t,
                display: cleanDisplay,
                raw: t
            };
        }
        return {
            tag: t.tag,
            display: t.display || (t.tag.startsWith('[') && t.tag.endsWith(']') ? t.tag.slice(1, -1).trim() : t.tag),
            raw: t.raw || t.tag,
            isMoveKeyword: t.isMoveKeyword
        };
    });

    // Ensure we don't display a duplicate '+'
    const cleanAddLabel = addLabel !== undefined ? addLabel.replace(/^\+\s*/, '').trim() : 'Tag';

    return (
        <div className={`tag-pill-list tag-pill-list--${size} ${className}`} style={style}>
            {normalizedTags.map((item, idx) => {
                const isClickable = !readOnly && Boolean(onEditTag);
                const hasDelete = !readOnly && Boolean(onDeleteTag);
                const isConfirming = confirmingIndex === idx;

                return (
                    <span
                        key={`${item.tag}-${idx}`}
                        className={`tag-pill ${isClickable && !isConfirming ? 'tag-pill--interactive' : ''} ${
                            item.isMoveKeyword ? 'tag-pill--keyword' : ''
                        } ${isConfirming ? 'tag-pill--confirming' : ''}`}
                        onClick={() => {
                            if (isConfirming) return;
                            if (isClickable && onEditTag) {
                                onEditTag(item.tag);
                            }
                        }}
                        title={
                            isConfirming
                                ? 'Confirm deletion of this tag'
                                : isClickable
                                  ? `Click to edit ${item.tag} in Tag Builder`
                                  : item.tag
                        }
                    >
                        {getTagCategoryIcon(item.display || item.tag)}
                        <span className="tag-pill__label">
                            {isConfirming ? 'Delete tag?' : item.display || item.tag}
                        </span>

                        {hasDelete &&
                            onDeleteTag &&
                            (isConfirming ? (
                                <div className="tag-pill__confirm-actions">
                                    <button
                                        type="button"
                                        className="tag-pill__confirm-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteTag(item.raw || item.tag, idx);
                                            setConfirmingIndex(null);
                                        }}
                                        title={`Confirm delete ${item.display || item.tag}`}
                                        aria-label={`Confirm delete ${item.display || item.tag}`}
                                    >
                                        <Check size={11} />
                                    </button>
                                    <button
                                        type="button"
                                        className="tag-pill__cancel-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmingIndex(null);
                                        }}
                                        title="Cancel"
                                        aria-label="Cancel"
                                    >
                                        <X size={11} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="tag-pill__del-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmingIndex(idx);
                                    }}
                                    title={`Delete ${item.display || item.tag} (requires confirmation)`}
                                    aria-label={`Delete ${item.display || item.tag}`}
                                >
                                    <X size={10} />
                                </button>
                            ))}
                    </span>
                );
            })}

            {normalizedTags.length === 0 && emptyText && (
                <span className="tag-pill-list__empty text-subtext">{emptyText}</span>
            )}

            {!readOnly && showAddButton && onAddTag && (
                <button
                    type="button"
                    className={`tag-pill tag-pill--add ${!cleanAddLabel ? 'tag-pill--add-icon-only' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddTag();
                    }}
                    title="Add a Smart Tag with the Tag Builder"
                >
                    <Plus size={11} />
                    {cleanAddLabel ? <span className="tag-pill__label">{cleanAddLabel}</span> : null}
                </button>
            )}
        </div>
    );
});
