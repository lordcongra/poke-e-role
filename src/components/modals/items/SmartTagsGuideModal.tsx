import { Tag, XCircle } from 'lucide-react';
import './SmartTagsGuideModal.css';

export function SmartTagsGuideModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="tags-guide__overlay">
            <div className="tags-guide__content">
                <h3 className="tags-guide__title modal-title-with-icon text-title-primary">
                    <Tag size={20} /> Smart Tags Guide
                </h3>
                <p className="tags-guide__desc text-subtext">
                    Type these exactly as shown (with brackets) into an equipped item's Name or Notes to automatically
                    apply mechanics. You can use negative numbers to subtract dice!
                </p>
                <ul className="tags-guide__list text-subtext" style={{ color: 'var(--text-main)' }}>
                    <li>
                        <b>Stats/Skills:</b> <code>[Dex -2]</code>, <code>[Brawl +2]</code>, <code>[Def +1]</code>,{' '}
                        <code>[Spd +1]</code>
                    </li>
                    <li>
                        <b>Combat:</b> <code>[Dmg +1]</code>, <code>[Acc -1: Physical]</code>, <code>[Chance +2]</code>
                    </li>
                    <li>
                        <b>Matchups:</b> <code>[Immune: Ground]</code>, <code>[Remove Immunity: Type]</code>,{' '}
                        <code>[Remove Immunities]</code>
                    </li>
                    <li>
                        <b>Mechanics:</b> <code>[High Crit]</code>, <code>[Ignore Low Acc 2]</code>,{' '}
                        <code>[Status: Poison]</code>, <code>[Recoil]</code>, <code>[Ignore Pain: Bug]</code>
                    </li>
                    <li style={{ marginTop: '8px' }}>
                        <b>Conditions:</b> Append <code>@ Half HP</code> to any tag to make it activate only when at 50%
                        health or less! Example: <code>[Dmg +2: Bug @ Half HP]</code>
                    </li>
                    <li style={{ marginTop: '8px' }}>
                        <b>Example ("Hustle" Ability):</b> Add <code>[Low Acc +1: Physical] [Dmg +2: Physical]</code> to
                        lower successes but increase damage on all physical moves!
                    </li>
                </ul>
                <div className="tags-guide__actions">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark tags-guide__btn-close text-theme-header"
                    >
                        <XCircle size={16} /> Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
}
