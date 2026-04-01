import { useCharacterStore } from '../../store/useCharacterStore';

interface IdentityTogglesProps {
    onOpenTrackerSettings: () => void;
    onOpenRules: () => void;
}

export function IdentityToggles({ onOpenTrackerSettings, onOpenRules }: IdentityTogglesProps) {
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
                    ⭕ Trackers
                </label>
                <button
                    type="button"
                    onClick={onOpenTrackerSettings}
                    className="action-button identity-header__settings-btn"
                >
                    ⚙️
                </button>
            </div>

            {role === 'GM' && (
                <div className="identity-header__toggle-box identity-header__toggle-box--orange">
                    <button type="button" onClick={onOpenRules} className="identity-header__rules-btn">
                        📜 Rules
                    </button>
                </div>
            )}

            <div
                className="identity-header__toggle-box identity-header__toggle-box--primary"
                style={{ display: role === 'GM' ? 'flex' : 'none' }}
            >
                <label className="identity-header__toggle-label">
                    <input
                        type="checkbox"
                        checked={identityStore.isNPC}
                        onChange={(event) => setIdentity('isNPC', event.target.checked)}
                    />{' '}
                    🔒 NPC
                </label>
            </div>
        </div>
    );
}
