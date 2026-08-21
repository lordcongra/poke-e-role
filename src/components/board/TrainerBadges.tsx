import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TrainerBadgeRow } from './TrainerBadgeRow';
import { Plus, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import './TrainerBadges.css';

export function TrainerBadges() {
    const badges = useCharacterStore((state) => state.identity.badges) || [];
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [deleteBadgeId, setDeleteBadgeId] = useState<string | null>(null);

    const addBadge = () => {
        setIdentity('badges', [...badges, { id: crypto.randomUUID(), name: '', emoji: '🏅' }]);
    };

    const removeBadge = (id: string) => {
        setIdentity(
            'badges',
            badges.filter((b) => b.id !== id)
        );
    };

    const updateBadge = (id: string, field: 'name' | 'emoji', value: string) => {
        setIdentity(
            'badges',
            badges.map((b) => (b.id === id ? { ...b, [field]: value } : b))
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
        </CollapsingSection>
    );
}
