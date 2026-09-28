import { Tag, X, XCircle, MousePointerClick } from 'lucide-react';
import './SmartTagsGuideModal.css';

export function SmartTagsGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="tags-guide__overlay" onClick={onClose}>
            <div className="tags-guide__content" onClick={(e) => e.stopPropagation()}>
                <div className="tags-guide__header">
                    <h3 className="tags-guide__title text-title-primary">
                        <Tag size={18} /> Smart Tags Guide
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="tags-guide__header-close-btn"
                        title="Close Guide"
                        aria-label="Close Guide"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="tags-guide__body">
                    <p className="tags-guide__desc text-subtext">
                        Smart Tags automate mechanics, bonuses, and calculations across <strong>Passives</strong>,{' '}
                        <strong>Equipped Items</strong>, <strong>Moves</strong>, and <strong>Abilities</strong>.
                    </p>

                    <div className="tags-guide__callout">
                        <div className="tags-guide__callout-title">
                            <MousePointerClick size={14} /> Interactive Tag Pills (No Typing Needed!)
                        </div>
                        <p className="text-subtext tags-guide__callout-text">
                            Tags appear as <strong>clickable pills</strong>. Click any pill to modify its values in the{' '}
                            <strong>Tag Builder</strong>, or click <strong>✕</strong> to delete it with confirmation.
                        </p>
                    </div>

                    <ul className="tags-guide__list text-subtext">
                        <li>
                            <b>Attributes & Skills:</b> <code>[Vit +1]</code>, <code>[Dex -2]</code>,{' '}
                            <code>[Brawl +2]</code>, <code>[Def +1]</code>, <code>[Spd +1]</code>
                        </li>
                        <li>
                            <b>Combat Rolls:</b> <code>[Dmg +1]</code>, <code>[Acc -1: Physical]</code>,{' '}
                            <code>[Crit Dmg +1]</code>, <code>[Chance +2]</code>
                        </li>
                        <li>
                            <b>Type Matchups:</b> <code>[Immune: Ground]</code>, <code>[Resist: Fire]</code>,{' '}
                            <code>[Remove Immunity: Type]</code>
                        </li>
                        <li>
                            <b>Mechanics & HP:</b> <code>[Gain Temp HP 5]</code>, <code>[High Crit]</code>,{' '}
                            <code>[Ignore Low Acc 2]</code>, <code>[Recoil]</code>, <code>[Status: Poison]</code>
                        </li>
                        <li>
                            <b>Conditions:</b> Add <code>@ Half HP</code>, <code>@ Boost</code>, or{' '}
                            <code>@ Stacking Boost</code> (or <code>@ Stacking Boost: 5</code>) to trigger scalable
                            combat bonuses!
                        </li>
                        <li>
                            <b>Move Keywords:</b> Official keywords (<code>High Critical</code>,{' '}
                            <code>Low Accuracy 1</code>, <code>Never Miss</code>) are automatically parsed into
                            interactive pills!
                        </li>
                    </ul>
                </div>

                <div className="tags-guide__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tags-guide__btn-close text-theme-header"
                    >
                        <XCircle size={15} /> Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
}
