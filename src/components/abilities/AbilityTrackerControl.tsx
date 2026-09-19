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
    const abilityBoostActive = useCharacterStore((state) => state.identity.abilityBoostActive ?? false);
    const abilityTags = useCharacterStore((state) => state.identity.abilityTags || '');
    const rank = useCharacterStore((state) => state.identity.rank);
    const hpCurr = useCharacterStore((state) => state.health.hpCurr);
    const hpMax = useCharacterStore((state) => state.health.hpMax);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTagBuilderOpen, setIsTagBuilderOpen] = useState(false);

    if (!ability) return null;

    const isHalfHp = (hpCurr || 0) <= Math.floor(Math.max(1, hpMax || 1) / 2);
    const hasBoostTag = abilityTags.toLowerCase().includes('@ boost');
    const benefit = getAbilityBenefitSummary(ability, abilityTags, rank, isHalfHp, abilityBoostActive);

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
                    {abilityActive && hasBoostTag && (
                        <button
                            type="button"
                            onClick={() => setIdentity('abilityBoostActive', !abilityBoostActive)}
                            className={`action-button ${abilityBoostActive ? 'action-button--theme' : 'action-button--dark'}`}
                            title={abilityBoostActive ? 'Trigger boost is Active (click to turn off)' : 'Trigger boost is Inactive (click to activate)'}
                            style={{ fontSize: '0.72rem', padding: '2px 6px', height: '22px', whiteSpace: 'nowrap' }}
                        >
                            Boost {abilityBoostActive ? 'ON' : 'OFF'}
                        </button>
                    )}

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
