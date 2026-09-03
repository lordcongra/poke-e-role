import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TrainerBadgeRow } from './TrainerBadgeRow';
import { BadgeImageModal } from '../modals/BadgeImageModal';
import { imageManager } from '../../utils/imageManager';
import type { Badge } from '../../store/entityTypes';
import { Plus, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import './TrainerBadges.css';

export function TrainerBadges() {
    const badges = useCharacterStore((state) => state.identity.badges) || [];
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [deleteBadgeId, setDeleteBadgeId] = useState<string | null>(null);
    const [activeImageBadge, setActiveImageBadge] = useState<Badge | null>(null);

    const addBadge = () => {
        setIdentity('badges', [...badges, { id: crypto.randomUUID(), name: '', emoji: '🏅' }]);
    };

    const removeBadge = async (id: string) => {
        const badgeToDelete = badges.find((b) => b.id === id);
        if (badgeToDelete?.imageUrl && badgeToDelete.imageUrl.startsWith('local-img:')) {
            try {
                await imageManager.deleteImage(badgeToDelete.imageUrl);
            } catch (e) {
                console.error('[TrainerBadges] Failed to delete image from IndexedDB:', e);
            }
        }

        setIdentity(
            'badges',
            badges.filter((b) => b.id !== id)
        );
    };

    const updateBadge = (id: string, field: 'name' | 'emoji' | 'imageUrl', value: string) => {
        setIdentity(
            'badges',
            badges.map((b) => (b.id === id ? { ...b, [field]: value } : b))
        );
    };

    const revertBadgeImage = async (id: string) => {
        const targetBadge = badges.find((b) => b.id === id);
        if (targetBadge?.imageUrl && targetBadge.imageUrl.startsWith('local-img:')) {
            try {
                await imageManager.deleteImage(targetBadge.imageUrl);
            } catch (e) {
                console.error('[TrainerBadges] Failed to delete image from IndexedDB:', e);
            }
        }

        setIdentity(
            'badges',
            badges.map((b) => {
                if (b.id !== id) return b;
                const updated = { ...b };
                delete updated.imageUrl;
                return updated;
            })
        );
    };

    const headerElements = <div className="text-subtext">Total: {badges.length}</div>;

    return (
        <CollapsingSection title="BADGES & ACHIEVEMENTS" headerElements={headerElements} className="sheet-panel">
            <div className="trainer-badges__list">
                {badges.length === 0 ? (
                    <div className="trainer-badges__empty text-subtext">No badges collected yet.</div>
                ) : (
                    badges.map((badge) => (
                        <TrainerBadgeRow
                            key={badge.id}
                            badge={badge}
                            onUpdate={(field, value) => updateBadge(badge.id, field, value)}
                            onOpenImageModal={() => setActiveImageBadge(badge)}
                            onRevertImage={() => revertBadgeImage(badge.id)}
                            onRemove={() => setDeleteBadgeId(badge.id)}
                        />
                    ))
                )}
            </div>
            <button
                type="button"
                onClick={addBadge}
                className="action-button action-button--dark trainer-badges__add-btn"
            >
                <Plus size={16} /> Add Badge
            </button>

            {deleteBadgeId && (
                <div className="trainer-badges__modal-overlay">
                    <div className="trainer-badges__modal-content">
                        <h3
                            className="trainer-badges__modal-title text-title-primary"
                            style={{ color: 'var(--semantic-danger)' }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p className="trainer-badges__modal-text text-subtext">
                            Are you sure you want to delete this Badge?
                        </p>
                        <div className="trainer-badges__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark trainer-badges__modal-btn"
                                onClick={() => setDeleteBadgeId(null)}
                            >
                                <XCircle size={16} /> Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red trainer-badges__modal-btn"
                                onClick={() => {
                                    removeBadge(deleteBadgeId);
                                    setDeleteBadgeId(null);
                                }}
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeImageBadge && (
                <BadgeImageModal
                    badge={activeImageBadge}
                    isOpen={Boolean(activeImageBadge)}
                    onClose={() => setActiveImageBadge(null)}
                    onSelectImage={(url) => {
                        updateBadge(activeImageBadge.id, 'imageUrl', url);
                        setActiveImageBadge(null);
                    }}
                    onClearImage={() => {
                        revertBadgeImage(activeImageBadge.id);
                        setActiveImageBadge(null);
                    }}
                />
            )}
        </CollapsingSection>
    );
}
