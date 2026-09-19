import { useState } from 'react';
import { Zap, Sliders } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getAbilityBenefitSummary } from '../../data/abilities/knownAbilities';
import { AbilityMenuModal } from './AbilityMenuModal';
import { TagBuilderModal } from '../modals/items/TagBuilderModal';
import './AbilityTrackerControl.css';

export function AbilityTrackerControl() {
    const ability = useCharacterStore((state) => state.identity.ability);
    const abilityActive = useCharacterStore((state) => state.identity.abilityActive ?? true);
    const abilityTags = useCharacterStore((state) => state.identity.abilityTags || '');
    const rank = useCharacterStore((state) => state.identity.rank);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTagBuilderOpen, setIsTagBuilderOpen] = useState(false);

    if (!ability) return null;

    const benefit = getAbilityBenefitSummary(ability, abilityTags, rank);

    return (
        <>
            <div className={`ability-tracker ${abilityActive ? 'ability-tracker--active' : ''}`}>
                <label className="ability-tracker__toggle-wrap text-label">
                    <input
                        type="checkbox"
                        checked={abilityActive}
                        onChange={(e) => setIdentity('abilityActive', e.target.checked)}
                        className="ability-tracker__checkbox"
                        title={abilityActive ? 'Ability is active (click to turn off)' : 'Ability is inactive (click to turn on)'}
                    />
                    <Zap size={14} className="ability-tracker__icon" />
                    <span className="ability-tracker__name">{ability}</span>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {abilityActive && benefit && (
                        <span className="ability-tracker__benefit" title={benefit}>
                            {benefit}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsMenuOpen(true)}
                        className="action-button action-button--dark ability-tracker__btn-menu"
                        title="Open Ability Details and Settings"
                        aria-label="Open Ability Details"
                    >
                        <Sliders size={13} />
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <AbilityMenuModal
                    isOpen={isMenuOpen}
                    onClose={() => setIsMenuOpen(false)}
                    onOpenTagBuilder={() => setIsTagBuilderOpen(true)}
                />
            )}

            {isTagBuilderOpen && (
                <TagBuilderModal
                    targetId="ability"
                    targetType="ability"
                    onClose={() => setIsTagBuilderOpen(false)}
                />
            )}
        </>
    );
}
