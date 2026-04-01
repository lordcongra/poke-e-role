import './SmartTagsGuideModal.css';

export function SmartTagsGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="tags-guide__overlay">
            <div className="tags-guide__content">
                <h3 className="tags-guide__title">🏷️ Smart Tags Guide</h3>
                <p className="tags-guide__desc">
                    Type these exactly as shown (with brackets) into an equipped item's Name or Notes to automatically
                    apply mechanics.
                </p>
                <ul className="tags-guide__list">
                    <li>
                        <b>Stats/Skills:</b> <code>[Dex -2]</code>, <code>[Brawl +2]</code>, <code>[Def +1]</code>,{' '}
                        <code>[Spd +1]</code>
                    </li>
                    <li>
                        <b>Combat:</b> <code>[Dmg +1]</code>, <code>[Dmg +1: Physical]</code>, <code>[Acc +1]</code>,{' '}
                        <code>[Chance +2]</code>
                    </li>
                    <li>
                        <b>Matchups:</b> <code>[Immune: Ground]</code>, <code>[Remove Immunity: Type]</code>,{' '}
                        <code>[Remove Immunities]</code>
                    </li>
                    <li>
                        <b>Mechanics:</b> <code>[High Crit]</code>, <code>[Ignore Low Acc 2]</code>,{' '}
                        <code>[Status: Poison]</code>, <code>[Recoil]</code>
                    </li>
                </ul>
                <div className="tags-guide__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tags-guide__btn-close"
                    >
                        Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
}
