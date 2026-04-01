import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { MoveData } from '../../store/storeTypes';
import { CombatStat } from '../../types/enums';
import { loadGithubTree, ALL_MOVES } from '../../utils/api';
import {
    calculateBaseDamage,
    executeDamageRoll,
    rollDicePlus,
    parseCombatTags,
    getAbilityText
} from '../../utils/combatUtils';
import { TargetingModal } from '../modals/TargetingModal';
import { MoveCard } from './MoveCard';
import { MoveRow } from './MoveRow';
import { CollapsingSection } from '../ui/CollapsingSection';
import { GlobalModifiersModal } from '../modals/GlobalModifiersModal';
import { MovesTableModifiers } from './MovesTableModifiers';
import { MovesTableLearnset } from './MovesTableLearnset';
import { DualScaleModal } from '../modals/DualScaleModal';
import './MovesTable.css';

export function MovesTable() {
    const role = useCharacterStore((state) => state.role);
    const moves = useCharacterStore((state) => state.moves);
    const addMove = useCharacterStore((state) => state.addMove);
    const removeMove = useCharacterStore((state) => state.removeMove);
    const trackers = useCharacterStore((state) => state.trackers);
    const updateTracker = useCharacterStore((state) => state.updateTracker);
    const learnset = useCharacterStore((state) => state.identity.learnset);

    const skills = useCharacterStore((state) => state.skills);
    const extraCategories = useCharacterStore((state) => state.extraCategories);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const ability = useCharacterStore((state) => state.identity.ability);
    const painEnabled = useCharacterStore((state) => state.identity.pain) === 'Enabled';

    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);

    const [targetingMove, setTargetingMove] = useState<MoveData | null>(null);
    const [deleteMoveId, setDeleteMoveId] = useState<string | null>(null);
    const [moveList, setMoveList] = useState<string[]>([]);

    const [showModifiersModal, setShowModifiersModal] = useState(false);
    const [tooltipInfo, setTooltipInfo] = useState<{ title: string; description: string } | null>(null);

    useEffect(() => {
        loadGithubTree().then(() => setMoveList([...ALL_MOVES]));
    }, []);

    const state = useCharacterStore.getState();
    const abilityText = getAbilityText(ability, customAbilities);
    const itemBuffs = parseCombatTags(state.inventory, extraCategories, undefined, abilityText);

    const insightStatistic = state.stats[CombatStat.INS];
    const maxMoves =
        3 +
        Math.max(
            1,
            insightStatistic.base +
                insightStatistic.rank +
                insightStatistic.buff -
                insightStatistic.debuff +
                (itemBuffs.stats.ins || 0)
        );

    const handleTargetClick = (move: MoveData) => {
        if (move.category === 'Status') {
            alert(`${move.name || 'This'} is a Support move (No Damage).`);
            return;
        }

        const moveDescription = (move.desc || '').toLowerCase();
        const setDamageMatch = moveDescription.match(/set damage\s*(\d+)?/i);
        if (setDamageMatch || moveDescription.includes('set damage')) {
            const damageValue = setDamageMatch && setDamageMatch[1] ? setDamageMatch[1] : move.power;
            const currentState = useCharacterStore.getState();
            const nickname = currentState.identity.nickname || currentState.identity.species || 'Someone';
            rollDicePlus(
                `0d6+${damageValue}`,
                `💥 ${nickname} used ${move.name || 'a Move'}! (Deals exactly ${damageValue} Set Damage, ignores defenses)`
            );
            return;
        }

        setTargetingMove(move);
    };

    const handleExecuteDamage = (baseDamage: number, isCrit: boolean, isSuperEffective: boolean, reduction: number) => {
        if (targetingMove) {
            executeDamageRoll(
                targetingMove,
                useCharacterStore.getState(),
                baseDamage,
                isCrit,
                isSuperEffective,
                reduction
            );
        }
        setTargetingMove(null);
    };

    const handleGlobalChanceRoll = () => {
        const currentState = useCharacterStore.getState();
        const abilityTxt = getAbilityText(currentState.identity.ability, currentState.roomCustomAbilities);
        const parsedItems = parseCombatTags(
            currentState.inventory,
            currentState.extraCategories,
            undefined,
            abilityTxt
        );
        const totalChance = trackers.globalChance + parsedItems.chance;

        if (totalChance <= 0) return;

        const nickname = currentState.identity.nickname || currentState.identity.species || 'Someone';
        const tags = parsedItems.chance > 0 ? ` [ Item Bonus +${parsedItems.chance} ]` : '';
        rollDicePlus(`${totalChance}d6>5`, `🍀 ${nickname} rolled a Chance Roll!${tags}`, 'chance');
    };

    const headerElements = (
        <MovesTableModifiers
            maxMoves={maxMoves}
            trackers={trackers}
            updateTracker={updateTracker}
            handleGlobalChanceRoll={handleGlobalChanceRoll}
            painEnabled={painEnabled}
            setTooltipInfo={setTooltipInfo}
            setShowModifiersModal={setShowModifiersModal}
        />
    );

    return (
        <div className="sheet-container">
            <datalist id="move-list">
                {[
                    ...moveList,
                    ...roomCustomMoves.filter((move) => role === 'GM' || !move.gmOnly).map((move) => move.name)
                ].map((moveName) => (
                    <option key={moveName} value={moveName} />
                ))}
            </datalist>

            <CollapsingSection title="MOVES" headerElements={headerElements}>
                <div className="desktop-only-flex table-responsive-wrapper">
                    <table className="data-table moves-table__table">
                        <thead>
                            <tr className="moves-table__header-row">
                                <th className="moves-table__th-checkbox" title="Used this round?">
                                    ✔
                                </th>
                                <th className="moves-table__th-acc">Acc</th>
                                <th>Name</th>
                                <th>Pool (Acc)</th>
                                <th>Type</th>
                                <th>Cat.</th>
                                <th>Damage</th>
                                <th className="moves-table__th-dmg">Dmg</th>
                                <th className="moves-table__th-sort">Sort</th>
                                <th className="moves-table__th-del">Del</th>
                            </tr>
                        </thead>
                        <tbody>
                            {moves.map((move) => (
                                <MoveRow
                                    key={move.id}
                                    move={move}
                                    skills={skills}
                                    extraCategories={extraCategories}
                                    onTarget={handleTargetClick}
                                    onDelete={setDeleteMoveId}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mobile-only-flex moves-table__mobile-card-container">
                    {moves.map((move) => (
                        <MoveCard
                            key={move.id}
                            move={move}
                            skills={skills}
                            extraCategories={extraCategories}
                            onTarget={handleTargetClick}
                            onDelete={setDeleteMoveId}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addMove}
                    className="action-button action-button--red action-button--full-width"
                >
                    + Add Move Slot
                </button>

                <MovesTableLearnset learnset={learnset} />
            </CollapsingSection>

            {showModifiersModal && (
                <GlobalModifiersModal
                    onClose={() => setShowModifiersModal(false)}
                    setTooltipInfo={setTooltipInfo}
                    handleGlobalChanceRoll={handleGlobalChanceRoll}
                />
            )}

            {targetingMove && (
                <TargetingModal
                    move={targetingMove}
                    baseDamage={calculateBaseDamage(targetingMove, useCharacterStore.getState())}
                    onClose={() => setTargetingMove(null)}
                    onRoll={handleExecuteDamage}
                />
            )}

            {deleteMoveId && (
                <div className="moves-table__modal-overlay">
                    <div className="moves-table__modal-content">
                        <h3 className="moves-table__modal-title">⚠️ Confirm Deletion</h3>
                        <p className="moves-table__modal-text">Are you sure you want to delete this Move?</p>
                        <div className="moves-table__modal-actions">
                            <button
                                type="button"
                                className="action-button action-button--dark moves-table__modal-btn"
                                onClick={() => setDeleteMoveId(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="action-button action-button--red moves-table__modal-btn"
                                onClick={() => {
                                    removeMove(deleteMoveId);
                                    setDeleteMoveId(null);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tooltipInfo && (
                <div className="moves-table__modal-overlay">
                    <div className="moves-table__modal-content moves-table__modal-content--tooltip">
                        <h3 className="moves-table__modal-title moves-table__modal-title--tooltip">
                            {tooltipInfo.title}
                        </h3>
                        <p className="moves-table__modal-text moves-table__modal-text--tooltip">
                            {tooltipInfo.description}
                        </p>
                        <div className="moves-table__modal-actions moves-table__modal-actions--center">
                            <button
                                type="button"
                                className="action-button action-button--dark moves-table__modal-btn--full"
                                onClick={() => setTooltipInfo(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DualScaleModal />
        </div>
    );
}
