import { useState } from 'react';
import { Tag, XCircle } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { CombatStat, SocialStat, Skill } from '../../types/enums';
import { POKEMON_TYPES } from '../../data/constants';
import './TagBuilderModal.css';

interface TagBuilderModalProps {
    targetId: string;
    targetType:
        | 'item'
        | 'move'
        | 'homebrew_ability'
        | 'homebrew_move'
        | 'homebrew_item'
        | 'homebrew_form'
        | 'homebrew_status';
    onClose: () => void;
}

export function TagBuilderModal({ targetId, targetType, onClose }: TagBuilderModalProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const updateMove = useCharacterStore((state) => state.updateMove);
    const updateCustomAbility = useCharacterStore((state) => state.updateCustomAbility);
    const updateCustomMove = useCharacterStore((state) => state.updateCustomMove);
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);
    const updateCustomForm = useCharacterStore((state) => state.updateCustomForm);
    const updateCustomStatus = useCharacterStore((state) => state.updateCustomStatus);

    const inventory = useCharacterStore((state) => state.inventory);
    const moves = useCharacterStore((state) => state.moves);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const customMoves = useCharacterStore((state) => state.roomCustomMoves);
    const customItems = useCharacterStore((state) => state.roomCustomItems);
    const customForms = useCharacterStore((state) => state.roomCustomForms);
    const customStatuses = useCharacterStore((state) => state.roomCustomStatuses);

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [category, setCategory] = useState('stat');
    const [target, setTarget] = useState('Str');

    // Split Dropdown States
    const [reqGroup, setReqGroup] = useState<'none' | 'type' | 'category' | 'modifier' | 'misc'>('none');
    const [typeOption, setTypeOption] = useState('');

    const [value, setValue] = useState<number>(1);
    const [value2, setValue2] = useState<number>(6); // Specifically used for the limit variable

    const formatEnum = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

    const TYPES = [...POKEMON_TYPES.filter((t) => t !== ''), ...roomCustomTypes.map((t) => t.name)];

    const CATEGORIES = ['Physical', 'Special'];

    const MISC = ['Super Effective'];

    const MODIFIERS = [
        'Charge Move',
        'Copy Move',
        'Force Field',
        'Basic Heal',
        'Complete Heal',
        'Minor Heal',
        'High Critical',
        'Low Accuracy',
        'Bite Move',
        'Cutter Move',
        'Fist Move',
        'Projectile Move',
        'Wind Move',
        'Never Miss',
        'Must Recharge',
        'Ongoing Damage',
        'Out of Range',
        'Powder Move',
        'Rampage',
        'Ranged Move',
        'Reaction',
        'Late Reaction',
        'Recoil',
        'Set Damage',
        'Sound Move',
        'Shield Move',
        'Successive Actions',
        'Double Action',
        'Triple Action',
        'Switcher Move',
        'Unique Move'
    ];

    const getTargetOptions = () => {
        if (category === 'stat') {
            return [
                ...Object.values(CombatStat).map(formatEnum),
                ...Object.values(SocialStat).map(formatEnum),
                'Def',
                'Spd'
            ];
        }
        if (category === 'skill') {
            const customSkillNames = extraCategories.flatMap((c) => c.skills.map((s) => s.name || 'Unnamed'));
            return [...Object.values(Skill).map(formatEnum), ...customSkillNames];
        }
        if (category === 'combat')
            return ['Dmg', 'Acc', 'Init', 'Chance', 'Combo Dmg', 'First Hit Dmg', 'First Hit Acc'];
        if (category === 'matchup') return ['Immune', 'Resist', 'Weak', 'Remove Immunities', 'Remove Immunity'];

        if (category === 'mechanic')
            return [
                'High Crit',
                'Stacking High Crit',
                'Ignore Low Acc',
                'Recoil',
                'Super Effective',
                'Powder',
                'Gain Temp HP',
                'Temp HP on Hit',
                'Temp HP % Dmg',
                'Acc [X]s Add Dmg Limit [Y]'
            ];

        if (category === 'turn_based')
            return [
                'Deal Damage End of Round',
                'Reduce Will End of Round',
                'Heal Round End',
                'Restore Will Round End',
                'Lose Action(s)',
                'No Reactions',
                'Extra Reaction(s)'
            ];

        if (category === 'status')
            return [
                '1st Degree Burn',
                '2nd Degree Burn',
                '3rd Degree Burn',
                'Poison',
                'Badly Poisoned',
                'Paralysis',
                'Sleep',
                'Frozen Solid',
                'Confusion',
                'In Love',
                'Flinch'
            ];
        if (category === 'move_mechanics')
            return [
                'High Critical',
                'Low Accuracy',
                'Never Miss',
                'Recoil',
                'Successive Actions',
                'Set Damage',
                'Powder'
            ];
        return [];
    };

    const showTypeSelect =
        (category === 'combat' &&
            !['Init', 'Chance', 'Combo Dmg', 'First Hit Dmg', 'First Hit Acc'].includes(target)) ||
        (category === 'matchup' && target !== 'Remove Immunities');

    const showValueInput =
        category === 'stat' ||
        category === 'skill' ||
        category === 'combat' ||
        (category === 'mechanic' &&
            [
                'Ignore Low Acc',
                'Gain Temp HP',
                'Temp HP on Hit',
                'Temp HP % Dmg',
                'Acc [X]s Add Dmg Limit [Y]'
            ].includes(target)) ||
        (category === 'turn_based' && target !== 'No Reactions') ||
        (category === 'move_mechanics' && ['Low Accuracy', 'Set Damage'].includes(target));

    const handleConfirm = () => {
        let tag = '';

        const numValue = Number(value) || 0;
        const numValue2 = Number(value2) || 0;
        const sign = numValue >= 0 ? `+${numValue}` : `${numValue}`;

        if (category === 'stat' || category === 'skill') {
            tag = `[${target} ${sign}]`;
        } else if (category === 'combat') {
            if (['Init', 'Chance', 'Combo Dmg', 'First Hit Dmg', 'First Hit Acc'].includes(target))
                tag = `[${target} ${sign}]`;
            else if (typeOption) tag = `[${target} ${sign}: ${typeOption}]`;
            else tag = `[${target} ${sign}]`;
        } else if (category === 'matchup') {
            if (target === 'Remove Immunities') tag = `[Remove Immunities]`;
            else if (typeOption) tag = `[${target}: ${typeOption}]`;
            else {
                alert('Must select a target type for matchups!');
                return;
            }
        } else if (category === 'mechanic') {
            if (target === 'High Crit') tag = `[High Crit]`;
            else if (target === 'Stacking High Crit') tag = `[Stacking High Crit]`;
            else if (target === 'Ignore Low Acc') tag = `[Ignore Low Acc ${Math.abs(numValue)}]`;
            else if (target === 'Recoil') tag = `[Recoil]`;
            else if (target === 'Super Effective') tag = `[Super Effective]`;
            else if (target === 'Powder') tag = `[Powder]`;
            else if (target === 'Gain Temp HP') tag = `[Gain Temp HP ${Math.abs(numValue)}]`;
            else if (target === 'Temp HP on Hit') tag = `[Temp HP +${Math.abs(numValue)} on Hit]`;
            else if (target === 'Temp HP % Dmg') tag = `[Temp HP ${Math.abs(numValue)}% Dmg]`;
            else if (target === 'Acc [X]s Add Dmg Limit [Y]')
                tag = `[Acc ${Math.abs(numValue)}s Add Dmg Limit ${Math.abs(numValue2)}]`;
        } else if (category === 'turn_based') {
            if (target === 'Deal Damage End of Round') tag = `[Deal ${Math.abs(numValue)} Damage at End of Round]`;
            else if (target === 'Reduce Will End of Round')
                tag = `[Reduce Will by ${Math.abs(numValue)} at End of Round]`;
            else if (target === 'Heal Round End') tag = `[Heal ${Math.abs(numValue)} Round End]`;
            else if (target === 'Restore Will Round End') tag = `[Restore ${Math.abs(numValue)} Will Round End]`;
            else if (target === 'Lose Action(s)') tag = `[Lose ${Math.abs(numValue)} Action]`;
            else if (target === 'No Reactions') tag = `[No Reactions]`;
            else if (target === 'Extra Reaction(s)') tag = `[${Math.abs(numValue)} Extra Reactions Per Turn]`;
        } else if (category === 'status') {
            tag = `[Status: ${target}]`;
        } else if (category === 'move_mechanics') {
            if (target === 'High Critical') tag = `[High Critical]`;
            else if (target === 'Low Accuracy') tag = `[Low Accuracy ${Math.abs(numValue)}]`;
            else if (target === 'Never Miss') tag = `[Never Miss]`;
            else if (target === 'Recoil') tag = `[Recoil]`;
            else if (target === 'Successive Actions') tag = `[Successive Actions]`;
            else if (target === 'Set Damage') tag = `[Set Damage ${Math.abs(numValue)}]`;
            else if (target === 'Powder') tag = `[Powder]`;
        }

        if (tag) {
            if (targetType === 'move') {
                const move = moves.find((m) => m.id === targetId);
                if (move) updateMove(targetId, 'desc', move.desc ? `${move.desc} ${tag}`.trim() : tag);
            } else if (targetType === 'homebrew_move') {
                const hbMove = customMoves.find((m) => m.id === targetId);
                if (hbMove) updateCustomMove(targetId, 'desc', hbMove.desc ? `${hbMove.desc} ${tag}`.trim() : tag);
            } else if (targetType === 'homebrew_ability') {
                const hbAbility = customAbilities.find((a) => a.id === targetId);
                if (hbAbility)
                    updateCustomAbility(
                        targetId,
                        'effect',
                        hbAbility.effect ? `${hbAbility.effect} ${tag}`.trim() : tag
                    );
            } else if (targetType === 'homebrew_item') {
                const hbItem = customItems.find((i) => i.id === targetId);
                if (hbItem)
                    updateCustomItem(
                        targetId,
                        'description',
                        hbItem.description ? `${hbItem.description} ${tag}`.trim() : tag
                    );
            } else if (targetType === 'homebrew_form') {
                const hbForm = customForms.find((f) => f.id === targetId);
                if (hbForm) updateCustomForm(targetId, 'tags', hbForm.tags ? `${hbForm.tags} ${tag}`.trim() : tag);
            } else if (targetType === 'homebrew_status') {
                const hbStatus = customStatuses.find((s) => s.id === targetId);
                if (hbStatus)
                    updateCustomStatus(
                        targetId,
                        'effects',
                        hbStatus.effects ? `${hbStatus.effects} ${tag}`.trim() : tag
                    );
            } else {
                const item = inventory.find((i) => i.id === targetId);
                if (item) updateInventoryItem(targetId, 'desc', item.desc ? `${item.desc} ${tag}`.trim() : tag);
            }
        }
        onClose();
    };

    return (
        <div className="tag-builder__overlay">
            <div className="tag-builder__content">
                <h3 className="tag-builder__title modal-title-with-icon text-title-primary">
                    <Tag size={20} /> Tag Builder
                </h3>

                <div className="tag-builder__form-group">
                    <select
                        className="identity-grid__select tag-builder__select text-label"
                        style={{ color: 'var(--text-main)' }}
                        value={category}
                        onChange={(e) => {
                            const newCat = e.target.value;
                            setCategory(newCat);
                            setTarget('');
                            setTypeOption('');
                            if (newCat === 'matchup') setReqGroup('type');
                            else setReqGroup('none');
                        }}
                    >
                        <option value="stat">Stat Modifier</option>
                        <option value="skill">Skill Modifier</option>
                        <option value="combat">Combat Boost</option>
                        <option value="matchup">Matchup</option>
                        <option value="mechanic">Mechanic</option>
                        <option value="turn_based">Turn-Based / Actions</option>
                        <option value="status">Status Condition</option>
                        {targetType === 'move' && <option value="move_mechanics">Move Mechanic</option>}
                    </select>

                    <select
                        className="identity-grid__select tag-builder__select text-label"
                        style={{ color: 'var(--text-main)' }}
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                    >
                        <option value="">-- Select --</option>
                        {getTargetOptions().map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </select>

                    {showTypeSelect && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <select
                                className="identity-grid__select tag-builder__select text-label"
                                style={{
                                    color: 'var(--text-main)',
                                    flex: reqGroup === 'none' ? 'none' : 1,
                                    width: reqGroup === 'none' ? '100%' : 'auto',
                                    marginTop: 0
                                }}
                                value={reqGroup}
                                onChange={(e) => {
                                    setReqGroup(e.target.value as any);
                                    setTypeOption('');
                                }}
                            >
                                {category !== 'matchup' && <option value="none">-- No Requirement --</option>}
                                <option value="type">Pokemon Type</option>
                                <option value="modifier">Move Keyword</option>
                                <option value="category">Damage Category</option>
                                <option value="misc">Miscellaneous</option>
                            </select>

                            {reqGroup !== 'none' && (
                                <select
                                    className="identity-grid__select tag-builder__select text-label"
                                    style={{ color: 'var(--text-main)', flex: 1, marginTop: 0 }}
                                    value={typeOption}
                                    onChange={(e) => setTypeOption(e.target.value)}
                                >
                                    <option value="">-- Select Target --</option>
                                    {reqGroup === 'type' &&
                                        TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    {reqGroup === 'modifier' &&
                                        MODIFIERS.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    {reqGroup === 'category' &&
                                        CATEGORIES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    {reqGroup === 'misc' &&
                                        MISC.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                </select>
                            )}
                        </div>
                    )}

                    {showValueInput && (
                        <div className="tag-builder__value-row">
                            <span className="text-label">Value:</span>
                            <input
                                type="number"
                                className="identity-grid__input tag-builder__value-input text-label"
                                style={{ color: 'var(--text-main)' }}
                                value={value}
                                onChange={(e) => setValue(Number(e.target.value) || 0)}
                            />
                            {target === 'Acc [X]s Add Dmg Limit [Y]' && (
                                <>
                                    <span className="text-label" style={{ marginLeft: '10px' }}>
                                        Limit:
                                    </span>
                                    <input
                                        type="number"
                                        className="identity-grid__input tag-builder__value-input text-label"
                                        style={{ color: 'var(--text-main)' }}
                                        value={value2}
                                        onChange={(e) => setValue2(Number(e.target.value) || 0)}
                                    />
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="tag-builder__actions">
                    <button
                        className="action-button action-button--dark tag-builder__btn-cancel text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                    <button
                        className="action-button action-button--theme tag-builder__btn-confirm text-theme-header"
                        onClick={handleConfirm}
                    >
                        <Tag size={16} /> Append Tag
                    </button>
                </div>
            </div>
        </div>
    );
}
