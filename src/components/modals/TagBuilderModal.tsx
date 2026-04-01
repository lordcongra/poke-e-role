// src/components/TagBuilderModal.tsx
import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';

interface TagBuilderModalProps {
    targetId: string;
    targetType: 'item' | 'move' | 'homebrew_ability' | 'homebrew_move' | 'homebrew_item';
    onClose: () => void;
}

export function TagBuilderModal({ targetId, targetType, onClose }: TagBuilderModalProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);
    const updateMove = useCharacterStore((state) => state.updateMove);
    const updateCustomAbility = useCharacterStore((state) => state.updateCustomAbility);
    const updateCustomMove = useCharacterStore((state) => state.updateCustomMove);
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);

    const inventory = useCharacterStore((state) => state.inventory);
    const moves = useCharacterStore((state) => state.moves);
    const customAbilities = useCharacterStore((state) => state.roomCustomAbilities);
    const customMoves = useCharacterStore((state) => state.roomCustomMoves);
    const customItems = useCharacterStore((state) => state.roomCustomItems);

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);

    // AUDIT FIX: Added 'Physical' and 'Special' to the dynamic list so users can specify category damage!
    const dynamicTypeOptions = [
        'Normal',
        'Fire',
        'Water',
        'Electric',
        'Grass',
        'Ice',
        'Fighting',
        'Poison',
        'Ground',
        'Flying',
        'Psychic',
        'Bug',
        'Rock',
        'Ghost',
        'Dragon',
        'Dark',
        'Steel',
        'Fairy',
        ...roomCustomTypes.map((t) => t.name),
        'Physical',
        'Special',
        'Super Effective'
    ];

    const extraCategories = useCharacterStore((state) => state.extraCategories);

    const [category, setCategory] = useState('stat');
    const [target, setTarget] = useState('Str');
    const [typeOption, setTypeOption] = useState('');
    const [value, setValue] = useState(1);

    const getTargetOptions = () => {
        if (category === 'stat')
            return ['Str', 'Dex', 'Vit', 'Spe', 'Ins', 'Tou', 'Coo', 'Bea', 'Cut', 'Cle', 'Def', 'Spd'];
        if (category === 'skill') {
            const customSkillNames = extraCategories.flatMap((c) => c.skills.map((s) => s.name || 'Unnamed'));
            return [
                'Brawl',
                'Channel',
                'Clash',
                'Evasion',
                'Alert',
                'Athletic',
                'Nature',
                'Stealth',
                'Charm',
                'Etiquette',
                'Intimidate',
                'Perform',
                'Crafts',
                'Lore',
                'Medicine',
                'Magic',
                ...customSkillNames
            ];
        }
        if (category === 'combat') return ['Dmg', 'Acc', 'Init', 'Chance', 'Combo Dmg'];
        if (category === 'matchup') return ['Immune', 'Resist', 'Weak', 'Remove Immunities', 'Remove Immunity'];

        if (category === 'mechanic')
            return ['High Crit', 'Stacking High Crit', 'Ignore Low Acc', 'Recoil', 'Super Effective', 'Powder'];
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
        (category === 'combat' && !['Init', 'Chance', 'Combo Dmg'].includes(target)) ||
        (category === 'matchup' && target !== 'Remove Immunities');
    const showValueInput =
        category === 'stat' ||
        category === 'skill' ||
        category === 'combat' ||
        (category === 'mechanic' && target === 'Ignore Low Acc') ||
        (category === 'move_mechanics' && ['Low Accuracy', 'Set Damage'].includes(target));

    const handleConfirm = () => {
        let tag = '';
        const sign = value >= 0 ? `+${value}` : `${value}`;

        if (category === 'stat' || category === 'skill') {
            tag = `[${target} ${sign}]`;
        } else if (category === 'combat') {
            if (['Init', 'Chance', 'Combo Dmg'].includes(target)) tag = `[${target} ${sign}]`;
            else if (typeOption) tag = `[${target} ${sign}: ${typeOption}]`;
            else tag = `[${target} ${sign}]`;
        } else if (category === 'matchup') {
            if (target === 'Remove Immunities') tag = `[Remove Immunities]`;
            else if (typeOption) tag = `[${target}: ${typeOption}]`;
            else {
                alert('Must select a type for matchups!');
                return;
            }
        } else if (category === 'mechanic') {
            if (target === 'High Crit') tag = `[High Crit]`;
            else if (target === 'Stacking High Crit') tag = `[Stacking High Crit]`;
            else if (target === 'Ignore Low Acc') tag = `[Ignore Low Acc ${Math.abs(value)}]`;
            else if (target === 'Recoil') tag = `[Recoil]`;
            else if (target === 'Super Effective') tag = `[Super Effective]`;
            else if (target === 'Powder') tag = `[Powder]`;
        } else if (category === 'status') {
            tag = `[Status: ${target}]`;
        } else if (category === 'move_mechanics') {
            if (target === 'High Critical') tag = `[High Critical]`;
            else if (target === 'Low Accuracy') tag = `[Low Accuracy ${Math.abs(value)}]`;
            else if (target === 'Never Miss') tag = `[Never Miss]`;
            else if (target === 'Recoil') tag = `[Recoil]`;
            else if (target === 'Successive Actions') tag = `[Successive Actions]`;
            else if (target === 'Set Damage') tag = `[Set Damage ${Math.abs(value)}]`;
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
            } else {
                const item = inventory.find((i) => i.id === targetId);
                if (item) updateInventoryItem(targetId, 'desc', item.desc ? `${item.desc} ${tag}`.trim() : tag);
            }
        }
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 1050,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}
        >
            <div
                style={{
                    background: 'var(--panel-bg)',
                    padding: '15px',
                    borderRadius: '8px',
                    width: '280px',
                    border: '2px solid #C62828',
                    color: 'var(--text-main)'
                }}
            >
                <h3
                    style={{
                        marginTop: 0,
                        color: '#C62828',
                        fontSize: '1.1rem',
                        borderBottom: '1px solid var(--border)',
                        paddingBottom: '4px',
                        textAlign: 'center'
                    }}
                >
                    🏷️ Tag Builder
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <select
                        className="identity-grid__select"
                        style={{ border: '1px solid var(--border)' }}
                        value={category}
                        onChange={(e) => {
                            setCategory(e.target.value);
                            setTarget('');
                        }}
                    >
                        <option value="stat">Stat Modifier</option>
                        <option value="skill">Skill Modifier</option>
                        <option value="combat">Combat Boost</option>
                        <option value="matchup">Matchup</option>
                        <option value="mechanic">Mechanic</option>
                        <option value="status">Status Condition</option>
                        {targetType === 'move' && <option value="move_mechanics">Move Mechanic</option>}
                    </select>

                    <select
                        className="identity-grid__select"
                        style={{ border: '1px solid var(--border)' }}
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
                        <select
                            className="identity-grid__select"
                            style={{ border: '1px solid var(--border)' }}
                            value={typeOption}
                            onChange={(e) => setTypeOption(e.target.value)}
                        >
                            <option value="">-- Any Type --</option>
                            {dynamicTypeOptions.map((t) => (
                                <option key={t} value={t}>
                                    {t}
                                </option>
                            ))}
                        </select>
                    )}

                    {showValueInput && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Value:</span>
                            <input
                                type="number"
                                className="identity-grid__input"
                                style={{ border: '1px solid var(--border)', padding: '2px 4px' }}
                                value={value}
                                onChange={(e) => setValue(Number(e.target.value) || 0)}
                            />
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <button
                        className="action-button action-button--dark"
                        style={{ flex: 1, padding: '6px' }}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="action-button"
                        style={{ background: '#C62828', color: 'white', flex: 1, padding: '6px' }}
                        onClick={handleConfirm}
                    >
                        🏷️ Append Tag
                    </button>
                </div>
            </div>
        </div>
    );
}
