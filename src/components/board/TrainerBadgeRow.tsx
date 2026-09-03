import { useState, useEffect } from 'react';
import type { Badge } from '../../store/storeTypes';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { imageManager } from '../../utils/imageManager';
import { Trash2, Image as ImageIcon, ImageOff } from 'lucide-react';
import './TrainerBadges.css';

interface TrainerBadgeRowProps {
    badge: Badge;
    onUpdate: (field: 'name' | 'emoji', value: string) => void;
    onOpenImageModal: () => void;
    onRevertImage: () => void;
    onRemove: () => void;
}

export function TrainerBadgeRow({ badge, onUpdate, onOpenImageModal, onRevertImage, onRemove }: TrainerBadgeRowProps) {
    const [resolvedUrl, setResolvedUrl] = useState<string>('');

    useEffect(() => {
        let isMounted = true;

        const resolve = async () => {
            if (!badge.imageUrl) {
                if (isMounted) setResolvedUrl('');
                return;
            }

            if (isStandaloneMode && badge.imageUrl.startsWith('local-img:')) {
                try {
                    const url = await imageManager.getImageUrl(badge.imageUrl);
                    if (isMounted) setResolvedUrl(url || '');
                } catch (error) {
                    console.error('[TrainerBadgeRow] Failed to resolve badge image URL:', error);
                    if (isMounted) setResolvedUrl('');
                }
            } else {
                if (isMounted) setResolvedUrl(badge.imageUrl);
            }
        };

        resolve();

        return () => {
            isMounted = false;
        };
    }, [badge.imageUrl]);

    return (
        <div className="trainer-badge-row">
            {badge.imageUrl ? (
                <>
                    <button
                        type="button"
                        className="trainer-badge-row__thumb-btn"
                        onClick={onOpenImageModal}
                        title="Click to change or manage badge image"
                        aria-label="Change badge image"
                    >
                        {resolvedUrl ? (
                            <img
                                src={resolvedUrl}
                                alt={badge.name || 'Badge'}
                                className="trainer-badge-row__thumb-img"
                            />
                        ) : (
                            <ImageIcon size={16} />
                        )}
                    </button>

                    <button
                        type="button"
                        className="action-button action-button--dark trainer-badge-row__compact-btn"
                        onClick={onRevertImage}
                        title={`Revert to emoji (${badge.emoji || '🏅'})`}
                        aria-label="Revert to emoji"
                    >
                        <ImageOff size={14} />
                    </button>
                </>
            ) : (
                <>
                    <input
                        type="text"
                        className="trainer-badge-row__emoji-input"
                        value={badge.emoji}
                        onChange={(e) => onUpdate('emoji', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        title="Press Win + . (Windows) or Cmd + Ctrl + Space (Mac) for emojis"
                    />

                    <button
                        type="button"
                        className="action-button action-button--dark trainer-badge-row__compact-btn"
                        onClick={onOpenImageModal}
                        title="Set badge image"
                        aria-label="Set badge image"
                    >
                        <ImageIcon size={14} />
                    </button>
                </>
            )}

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
                aria-label="Delete Badge"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}
