import { useCharacterStore } from '../../store/useCharacterStore';
import { CollapsingSection } from '../ui/CollapsingSection';
import { TrainerBadgeRow } from './TrainerBadgeRow';
import './TrainerBadges.css';

export function TrainerBadges() {
    const badges = useCharacterStore(state => state.identity.badges) || [];
    const setIdentity = useCharacterStore(state => state.setIdentity);

    const addBadge = () => {
        setIdentity('badges', [...badges, { id: crypto.randomUUID(), name: '', emoji: '🏅' }]);
    };

    const removeBadge = (id: string) => {
        setIdentity('badges', badges.filter(b => b.id !== id));
    };

    const updateBadge = (id: string, field: 'name' | 'emoji', value: string) => {
        setIdentity('badges', badges.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const headerElements = (
        <div className="trainer-badges__count">
            Total: {badges.length}
        </div>
    );

    return (
        <CollapsingSection title="BADGES & ACHIEVEMENTS" headerElements={headerElements} className="sheet-panel">
            <div className="trainer-badges__list">
                {badges.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px' }}>
                        No badges collected yet.
                    </div>
                ) : (
                    badges.map(badge => (
                        <TrainerBadgeRow
                            key={badge.id}
                            badge={badge}
                            onUpdate={(field, value) => updateBadge(badge.id, field, value)}
                            onRemove={() => removeBadge(badge.id)}
                        />
                    ))
                )}
            </div>
            <button type="button" onClick={addBadge} className="action-button action-button--dark trainer-badges__add-btn">
                + Add Badge
            </button>
        </CollapsingSection>
    );
}