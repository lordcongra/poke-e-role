import { useState, useEffect } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomForm } from '../../store/storeTypes';
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

    const [localName, setLocalName] = useState(form.name);
    const [localDescription, setLocalDescription] = useState(form.description);
    const [localGrantedMove, setLocalGrantedMove] = useState(form.grantedMove || '');
    const [localTags, setLocalTags] = useState(form.tags || '');
    const [localGmOnly, setLocalGmOnly] = useState(form.gmOnly || false);

    const [isCollapsed, setIsCollapsed] = useState(!form.name.includes('New'));
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        setLocalName(form.name);
        setLocalDescription(form.description);
        setLocalGrantedMove(form.grantedMove || '');
        setLocalTags(form.tags || '');
        setLocalGmOnly(form.gmOnly || false);
    }, [form]);

    const toggleSetting = (field: keyof CustomForm, currentValue: boolean) => {
        if (!canEdit) return;
        updateCustomForm(form.id, field, !currentValue as never);
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
                                <input type="checkbox" disabled={!canEdit} checked={form.swapMoves} onChange={() => toggleSetting('swapMoves', form.swapMoves)} />
                                Swap Move-Set
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.swapTyping} onChange={() => toggleSetting('swapTyping', form.swapTyping)} />
                                Swap Typing
                            </label>
                        </div>

                        <div className="homebrew-form-card__settings-column">
                            <span className="homebrew-form-card__settings-header">Transform Effects</span>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.clearStatuses} onChange={() => toggleSetting('clearStatuses', form.clearStatuses)} />
                                Clear Status Conditions
                            </label>
                            <label className={`homebrew-form-card__checkbox-label ${cursorClass}`}>
                                <input type="checkbox" disabled={!canEdit} checked={form.clearDebuffs} onChange={() => toggleSetting('clearDebuffs', form.clearDebuffs)} />
                                Clear Stat Debuffs
                            </label>
                            
                            <div className="homebrew-form-card__temp-hp-row">
                                <span className="homebrew-form-card__temp-hp-label">Temp HP Shield:</span>
                                <NumberSpinner value={form.tempHp} onChange={(val) => canEdit && updateCustomForm(form.id, 'tempHp', val)} disabled={!canEdit} />
                            </div>
                        </div>
                    </div>

                    <div className="homebrew-form-card__inputs-row">
                        <input
                            type="text"
                            value={localGrantedMove}
                            onChange={(event) => canEdit && setLocalGrantedMove(event.target.value)}
                            onBlur={() => canEdit && localGrantedMove !== form.grantedMove && updateCustomForm(form.id, 'grantedMove', localGrantedMove)}
                            placeholder="Granted Move (e.g. Tera Blast)"
                            disabled={!canEdit}
                            className="homebrew-card__name-input"
                        />
                        <input
                            type="text"
                            value={localTags}
                            onChange={(event) => canEdit && setLocalTags(event.target.value)}
                            onBlur={() => canEdit && localTags !== form.tags && updateCustomForm(form.id, 'tags', localTags)}
                            placeholder="Passive Tags (e.g. [Str +2] [High Crit])"
                            disabled={!canEdit}
                            className="homebrew-card__name-input"
                        />
                    </div>
                </>
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