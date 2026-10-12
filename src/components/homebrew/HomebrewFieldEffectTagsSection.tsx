import { useState } from 'react';
import { Tag, Sparkles, X } from 'lucide-react';
import { parseTagPills } from './homebrewFieldEffectUtils';

interface HomebrewFieldEffectTagsSectionProps {
    tags: string;
    onAddTag: (rawTag: string) => void;
    onRemoveTag: (tagToRemove: string) => void;
    onOpenTagBuilder: () => void;
}

export function HomebrewFieldEffectTagsSection({
    tags,
    onAddTag,
    onRemoveTag,
    onOpenTagBuilder
}: HomebrewFieldEffectTagsSectionProps) {
    const [newTagInput, setNewTagInput] = useState<string>('');

    const tagList = parseTagPills(tags || '');

    const handleDirectAdd = () => {
        if (!newTagInput.trim()) return;
        onAddTag(newTagInput);
        setNewTagInput('');
    };

    return (
        <div className="hb-fe-modal__section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={14} /> Active Combat Tags
                </label>
                <button
                    type="button"
                    className="action-button action-button--secondary"
                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                    onClick={onOpenTagBuilder}
                >
                    <Sparkles size={12} /> Advanced Tag Builder
                </button>
            </div>

            <div className="hb-fe-card__tags-row" style={{ minHeight: '32px' }}>
                {tagList.length === 0 ? (
                    <span className="text-subtext" style={{ fontStyle: 'italic' }}>
                        No combat tags added yet. Pick templates above or use the Advanced Tag Builder.
                    </span>
                ) : (
                    tagList.map((tagStr) => (
                        <span key={tagStr} className="hb-fe-tag-pill">
                            {tagStr}
                            <button
                                type="button"
                                className="hb-fe-tag-pill__remove"
                                onClick={() => onRemoveTag(tagStr)}
                                title="Remove tag"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))
                )}
            </div>

            {/* Direct tag input */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <input
                    type="text"
                    className="bo-input bo-input--underline text-label"
                    placeholder="Type custom tag e.g. [No Reactions]"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleDirectAdd();
                        }
                    }}
                />
                <button
                    type="button"
                    className="action-button action-button--dark"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={handleDirectAdd}
                >
                    Add
                </button>
            </div>
        </div>
    );
}
