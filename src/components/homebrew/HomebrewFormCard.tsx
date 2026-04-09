import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomForm } from '../../store/storeTypes';
import { ALL_MOVES } from '../../utils/api';
import { TagBuilderModal } from '../modals/TagBuilderModal';
import { NumberSpinner } from '../ui/NumberSpinner';
import './Homebrew.css';
import './HomebrewFormCard.css';

interface HomebrewFormCardProps {
    form: CustomForm;
    role: string;
    canEdit: boolean;
    onRemove: () => void;
}

export function HomebrewFormCard({ form, role, canEdit, onRemove }: HomebrewFormCardProps) {
    const updateCustomForm = useCharacterStore((state) => state.updateCustomForm);
    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);

    const [localName, setLocalName] = useState(form.name);
    const [localDescription, setLocalDescription] = useState(form.description);
    const [localTags, setLocalTags] = useState(form.tags || '');
    const [localGmOnly, setLocalGmOnly] = useState(form.gmOnly || false);

    const [newMoveInput, setNewMoveInput] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(!form.name.includes('New'));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showTagBuilder, setShowTagBuilder] = useState(false);

    const moveOptions = Array.from(new Set([...ALL_MOVES, ...roomCustomMoves.map(m => m.name)])).sort();

    useEffect(() => {
        setLocalName(form.name);
        setLocalDescription(form.description);
        setLocalTags(form.tags || '');
        setLocalGmOnly(form.gmOnly || false);
    }, [form]);

    const toggleSetting = (field: keyof CustomForm, currentValue: boolean) => {
        if (!canEdit) return;
        const newValue = !currentValue;
        updateCustomForm(form.id, field, newValue as never);

        // Enforce Mutual Exclusivity
        if (field === 'swapBuffs' && newValue) updateCustomForm(form.id, 'wipeBuffs', false as never);
        if (field === 'wipeBuffs' && newValue) updateCustomForm(form.id, 'swapBuffs', false as never);
        if (field === 'swapDebuffs' && newValue) updateCustomForm(form.id, 'wipeDebuffs', false as never);
        if (field === 'wipeDebuffs' && newValue) updateCustomForm(form.id, 'swapDebuffs', false as never);
        if (field === 'swapStatuses' && newValue) updateCustomForm(form.id, 'wipeStatuses', false as never);
        if (field === 'wipeStatuses' && newValue) updateCustomForm(form.id, 'swapStatuses', false as never);
    };

    const handleAddMove = () => {
        if (!canEdit || !newMoveInput.trim()) return;
        const updatedMoves = [...(form.grantedMoves || []), newMoveInput.trim()];
        updateCustomForm(form.id, 'grantedMoves', updatedMoves);
        setNewMoveInput('');
    };

    const handleRemoveMove = (moveToRemove: string) => {
        if (!canEdit) return;
        const updatedMoves = (form.grantedMoves || []).filter(m => m !== moveToRemove);
        updateCustomForm(form.id, 'grantedMoves', updatedMoves);
    };

    const cursorClass = canEdit ? 'homebrew-form-card__checkbox-label--enabled' : 'homebrew-form-card__checkbox-label--disabled';

    return (
        <div className="homebrew-card">
            <div className="homebrew-card__header">
                <button
                    type="button"
                    className={`collapse-btn ${isCollapsed ? 'is-collapsed' : ''}`}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    ▼
                </button>
                <input
                    type="text"
                    value={localName}
                    onChange={(event) => canEdit && setLocalName(event.target.value)}
                    onBlur={() => canEdit && localName !== form.name && updateCustomForm(form.id, 'name', localName)}
                    placeholder="Form Name (e.g. Mega Mewtwo X)"
                    disabled={!canEdit}
                    className="homebrew-card__name-input"
                />
                {role === 'GM' && (
                    <label className="homebrew-card__gm-label">
                        <input
                            type="checkbox"
                            checked={localGmOnly}
                            onChange={(event) => {
                                setLocalGmOnly(event.target.checked);
                                updateCustomForm(form.id, 'gmOnly', event.target.checked);
                            }}
                        />
                        GM Only
                    </label>
                )}
                {canEdit && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="action-button action-button--red homebrew-card__btn"
                    >
                        Delete
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <>
                    <textarea
                        value={localDescription}
                        onChange={(event) => canEdit && setLocalDescription(event.target.value)}
                        onBlur={() =>
                            canEdit &&
                            localDescription !== form.description &&
                            updateCustomForm(form.id, 'description', localDescription)
                        }
                        placeholder="Form Description / Flavor Text"
                        disabled={!canEdit}
                        className="homebrew-card__textarea homebrew-card__textarea--small"
                    />

                    <div className="homebrew-form-card__settings-grid">
                        <div className="homebrew-form-card__settings-column">
                            <span className="homebrew-form-card__settings-header">Data Swaps (Blank Slates)</span>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapBaseStats} onChange={() => toggleSetting('swapBaseStats', form.swapBaseStats)} />
                                Swap Base Stats
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapStatLimits} onChange={() => toggleSetting('swapStatLimits', form.swapStatLimits)} />
                                Swap Stat Limits
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapStatRanks} onChange={() => toggleSetting('swapStatRanks', form.swapStatRanks)} />
                                Swap Stat Ranks
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapSkills} onChange={() => toggleSetting('swapSkills', form.swapSkills)} />
                                Swap Skills
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapAbilities} onChange={() => toggleSetting('swapAbilities', form.swapAbilities)} />
                                Swap Abilities
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapMoves} onChange={() => toggleSetting('swapMoves', form.swapMoves)} />
                                Swap Move-Set
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapTyping} onChange={() => toggleSetting('swapTyping', form.swapTyping)} />
                                Swap Typing
                            </label>
                        </div>

                        <div className="homebrew-form-card__settings-column">
                            <span className="homebrew-form-card__settings-header">Buffs, Debuffs, Status</span>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} title="Temporarily clears buffs. Original buffs will return when reverting.">
                                <input type="checkbox" disabled={!canEdit} checked={form.swapBuffs} onChange={() => toggleSetting('swapBuffs', form.swapBuffs)} />
                                Swap Buffs (Restore on Revert)
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} title="Temporarily clears debuffs. Original debuffs will return when reverting.">
                                <input type="checkbox" disabled={!canEdit} checked={form.swapDebuffs} onChange={() => toggleSetting('swapDebuffs', form.swapDebuffs)} />
                                Swap Debuffs (Restore on Revert)
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} title="Temporarily clears statuses. Original statuses will return when reverting.">
                                <input type="checkbox" disabled={!canEdit} checked={form.swapStatuses} onChange={() => toggleSetting('swapStatuses', form.swapStatuses)} />
                                Swap Statuses (Restore on Revert)
                            </label>
                            
                            <hr style={{width: '100%', borderColor: 'var(--border)', margin: '2px 0'}}/>
                            
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} style={{color: '#c62828'}}>
                                <input type="checkbox" disabled={!canEdit} checked={form.wipeBuffs} onChange={() => toggleSetting('wipeBuffs', form.wipeBuffs)} />
                                Wipe Buffs (Permanent)
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} style={{color: '#c62828'}}>
                                <input type="checkbox" disabled={!canEdit} checked={form.wipeDebuffs} onChange={() => toggleSetting('wipeDebuffs', form.wipeDebuffs)} />
                                Wipe Debuffs (Permanent)
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} style={{color: '#c62828'}}>
                                <input type="checkbox" disabled={!canEdit} checked={form.wipeStatuses} onChange={() => toggleSetting('wipeStatuses', form.wipeStatuses)} />
                                Wipe Statuses (Permanent)
                            </label>
                        </div>
                        
                        <div className="homebrew-form-card__settings-column">
                            <span className="homebrew-form-card__settings-header">Transform Effects</span>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} title="Stores a distinct HP pool. Reverting will load whatever HP you had prior to transforming.">
                                <input type="checkbox" disabled={!canEdit} checked={form.restoreHp} onChange={() => toggleSetting('restoreHp', form.restoreHp)} />
                                Maintain Distinct HP Pool
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`} title="Stores a distinct Will pool. Reverting will load whatever Will you had prior to transforming.">
                                <input type="checkbox" disabled={!canEdit} checked={form.restoreWill} onChange={() => toggleSetting('restoreWill', form.restoreWill)} />
                                Maintain Distinct Will Pool
                            </label>
                            
                            <hr style={{width: '100%', borderColor: 'var(--border)', margin: '2px 0'}}/>

                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.healHp} onChange={() => toggleSetting('healHp', form.healHp)} />
                                Heal HP to Max on Transform
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.healWill} onChange={() => toggleSetting('healWill', form.healWill)} />
                                Heal Will to Max on Transform
                            </label>
                            
                            <div className="homebrew-form-card__temp-hp-row" style={{marginTop: '8px'}}>
                                <span className="homebrew-form-card__temp-hp-label">Temp HP Shield:</span>
                                <NumberSpinner value={form.tempHp} onChange={(val) => canEdit && updateCustomForm(form.id, 'tempHp', val)} disabled={!canEdit} />
                            </div>
                        </div>
                    </div>

                    <div className="homebrew-form-card__moves-section">
                        <span className="homebrew-form-card__settings-header">Granted Moves</span>
                        <div className="homebrew-form-card__inputs-row">
                            <input
                                list={`moves-list-${form.id}`}
                                type="text"
                                value={newMoveInput}
                                onChange={(e) => setNewMoveInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddMove()}
                                placeholder="Add a move (e.g. Tera Blast)"
                                disabled={!canEdit}
                                className="homebrew-card__name-input"
                            />
                            <datalist id={`moves-list-${form.id}`}>
                                {moveOptions.map(m => <option key={m} value={m} />)}
                            </datalist>
                            {canEdit && (
                                <button type="button" className="action-button action-button--dark" onClick={handleAddMove}>
                                    Add
                                </button>
                            )}
                        </div>
                        <div className="homebrew-form-card__pills-container">
                            {(form.grantedMoves || []).map((move, i) => (
                                <span key={i} className="homebrew-form-card__pill">
                                    {move} 
                                    {canEdit && (
                                        <button className="homebrew-form-card__pill-delete" onClick={() => handleRemoveMove(move)}>x</button>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="homebrew-form-card__moves-section" style={{ marginTop: '8px' }}>
                        <span className="homebrew-form-card__settings-header">Passive Tags</span>
                        <div className="homebrew-form-card__inputs-row">
                            <input
                                type="text"
                                value={localTags}
                                onChange={(event) => canEdit && setLocalTags(event.target.value)}
                                onBlur={() => canEdit && localTags !== form.tags && updateCustomForm(form.id, 'tags', localTags)}
                                placeholder="Passive Tags (e.g. [Str +2] [High Crit])"
                                disabled={!canEdit}
                                className="homebrew-card__name-input"
                            />
                            {canEdit && (
                                <button type="button" className="action-button action-button--dark" onClick={() => setShowTagBuilder(true)}>
                                    🏷️ Builder
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            {showTagBuilder && (
                <TagBuilderModal
                    targetId={form.id}
                    targetType="homebrew_form"
                    onClose={() => setShowTagBuilder(false)}
                />
            )}

            {showDeleteConfirm && (
                <div className="homebrew-confirm__overlay">
                    <div className="homebrew-confirm__content">
                        <h3 className="homebrew-confirm__title">⚠️ Confirm Deletion</h3>
                        <p className="homebrew-confirm__text">Are you sure you want to delete this Custom Form?</p>
                        <div className="homebrew-confirm__actions">
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                className="action-button action-button--dark homebrew-confirm__btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onRemove}
                                className="action-button action-button--red homebrew-confirm__btn"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}