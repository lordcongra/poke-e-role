import { useCharacterStore } from '../../store/useCharacterStore';
import { LayoutList, Settings, Lock } from 'lucide-react';

interface IdentityTogglesProps {
    onOpenTrackerSettings: () => void;
}

export function IdentityToggles({ onOpenTrackerSettings }: IdentityTogglesProps) {
    const identityStore = useCharacterStore((state) => state.identity);
    const setIdentity = useCharacterStore((state) => state.setIdentity);
    const role = useCharacterStore((state) => state.role);

    return (
        <div className="identity-header__toggles">
            <div className="identity-header__toggle-box identity-header__toggle-box--blue">
                <label className="identity-header__toggle-label">
                    <input
                        type="checkbox"
                        checked={identityStore.showTrackers ?? true}
                        onChange={(event) => setIdentity('showTrackers', event.target.checked)}
                    />{' '}
                    <LayoutList size={14} style={{ marginLeft: '4px', marginRight: '4px' }} /> Trackers
                </label>
                <button
                    type="button"
                    onClick={onOpenTrackerSettings}
                    className="action-button identity-header__settings-btn"
                    title="Tracker Settings"
                >
                    <Settings size={14} />
                </button>
            </div>

            {role === 'GM' && (
                <div className="identity-header__toggle-box identity-header__toggle-box--primary">
                    <label className="identity-header__toggle-label">
                        <input
                            type="checkbox"
                            checked={identityStore.isNPC}
                            onChange={(event) => setIdentity('isNPC', event.target.checked)}
                        />{' '}
                        <Lock size={14} style={{ marginLeft: '4px', marginRight: '4px' }} /> NPC
                    </label>
                </div>
            )}
        </div>
    );
}
