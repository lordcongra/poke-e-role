import React, { useState, useMemo } from 'react';
import { Swords, X, Search } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { CORE_MANEUVERS_DATA } from '../../../data/gm/gmManeuversData';
import { getManeuverPools, executeManeuverRoll, broadcastManeuver, type ManeuverPools } from './maneuversModalUtils';
import { parseCombatTags, getAbilityText } from '../../../utils/combat/combatMath';
import { ManeuverCard } from './ManeuverCard';
import { HelpAnotherModal } from './HelpAnotherModal';
import './ManeuversModal.css';

interface ManeuversModalProps {
    onClose: () => void;
}

export const ManeuversModal: React.FC<ManeuversModalProps> = ({ onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedManeuver, setExpandedManeuver] = useState<string | null>(null);
    const [helpDice, setHelpDice] = useState(3);
    const [showHelpAnotherModal, setShowHelpAnotherModal] = useState(false);
    const [consumeActionCounter, setConsumeActionCounter] = useState(true);

    // Targeted selectors
    const activeTransformation = useCharacterStore((s) => s.identity.activeTransformation);
    const abilityName = useCharacterStore((s) => s.identity.ability);
    const customAbilities = useCharacterStore((s) => s.roomCustomAbilities);
    const inventory = useCharacterStore((s) => s.inventory);
    const extraCategories = useCharacterStore((s) => s.extraCategories);
    const passives = useCharacterStore((s) => s.passives);

    const isMaxed = activeTransformation === 'Dynamax' || activeTransformation === 'Gigantamax';
    const abilityText = getAbilityText(abilityName, customAbilities);
    const parsedGlobals = parseCombatTags(inventory, extraCategories, undefined, abilityText, passives);
    const disableReactions = isMaxed || Boolean(parsedGlobals.noReactions);

    // Compute live pools for display
    const pools: ManeuverPools = useMemo(() => {
        return getManeuverPools(useCharacterStore.getState());
    }, []);

    const filteredManeuvers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return CORE_MANEUVERS_DATA;
        return CORE_MANEUVERS_DATA.filter(
            (m) =>
                m.name.toLowerCase().includes(query) ||
                m.accuracy.toLowerCase().includes(query) ||
                m.target.toLowerCase().includes(query) ||
                m.addedEffect.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const handleRoll = async (maneuverId: string, option?: string, extra?: number) => {
        await executeManeuverRoll(maneuverId, useCharacterStore.getState(), option, extra, consumeActionCounter);
    };

    const toggleExpand = (id: string) => {
        setExpandedManeuver((prev) => (prev === id ? null : id));
    };

    return (
        <div className="maneuvers-modal__overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="maneuvers-modal__content" role="dialog" aria-modal="true" aria-labelledby="maneuvers-title">
                {/* Header */}
                <div className="maneuvers-modal__header">
                    <div className="maneuvers-modal__title-group">
                        <h3 id="maneuvers-title" className="maneuvers-modal__title">
                            <Swords size={20} /> Typeless Maneuvers
                        </h3>
                        <p className="maneuvers-modal__subtitle">
                            Universal actions available to Pokémon and Trainers. Maneuvers cost no energy, ignore type
                            matchups, and can only be used once per round.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="maneuvers-modal__close-btn"
                        aria-label="Close Maneuvers Modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="maneuvers-modal__toolbar">
                    <div className="maneuvers-modal__search-wrapper">
                        <Search size={14} className="maneuvers-modal__search-icon" />
                        <input
                            type="text"
                            placeholder="Search maneuvers by name, skill, effect..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="maneuvers-modal__search-input"
                        />
                    </div>
                    <div className="maneuvers-modal__toolbar-actions">
                        <label
                            className="maneuvers-modal__action-counter-toggle"
                            title="When checked, combat maneuvers increment your Action Counter and set target required successes (actions + 1). Uncheck for casual or out-of-combat rolls."
                        >
                            <input
                                type="checkbox"
                                checked={consumeActionCounter}
                                onChange={(e) => setConsumeActionCounter(e.target.checked)}
                            />
                            <span>Action Counter (Combat)</span>
                        </label>
                        <span className="maneuvers-modal__rules-badge">CANNOT Clash nor be Clashed</span>
                    </div>
                </div>

                {/* Maneuvers List */}
                <div className="maneuvers-modal__list">
                    {filteredManeuvers.map((m) => (
                        <ManeuverCard
                            key={m.id}
                            maneuver={m}
                            pools={pools}
                            isExpanded={expandedManeuver === m.id}
                            onToggleExpand={() => toggleExpand(m.id)}
                            reactionBlocked={Boolean(m.reaction) && disableReactions}
                            helpDice={helpDice}
                            onChangeHelpDice={(val) => setHelpDice(Math.max(1, Math.min(6, val)))}
                            onRoll={handleRoll}
                            onOpenHelpAnother={() => setShowHelpAnotherModal(true)}
                            onBroadcast={broadcastManeuver}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="maneuvers-modal__footer">
                    <button
                        type="button"
                        onClick={onClose}
                        className="action-button action-button--dark"
                        style={{ padding: '6px 16px' }}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Help Another Modal */}
            {showHelpAnotherModal && <HelpAnotherModal onClose={() => setShowHelpAnotherModal(false)} />}
        </div>
    );
};
