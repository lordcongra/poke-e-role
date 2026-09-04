import { useState, useEffect } from 'react';
import type { CombatantRowData, ActionStatus } from '../../../types/battleOrganizerTypes';
import { isStandaloneMode } from '../../../utils/storageAdapter';
import { imageManager } from '../../../utils/imageManager';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { STATUS_OPTIONS } from '../../../data/constants';
import { Trash2, Dices, Shield, Swords, User, Skull, X, FileText } from 'lucide-react';

interface CombatantRowProps {
    combatant: CombatantRowData;
    index: number;
    onUpdate: (updated: CombatantRowData) => void;
    onDelete: (id: string) => void;
    onRollInitiative?: (id: string) => void;
    onOpenSheet?: (combatant: CombatantRowData) => void;
}

export function CombatantRow({
    combatant,
    index,
    onUpdate,
    onDelete,
    onRollInitiative,
    onOpenSheet
}: CombatantRowProps) {
    const [resolvedImage, setResolvedImage] = useState<string>('');
    const customStatuses = useCharacterStore((state) => state.roomCustomStatuses || []);

    const combinedStatusOptions = Array.from(
        new Set([
            'Healthy',
            ...STATUS_OPTIONS.filter((s) => s !== 'Healthy'),
            'Fainted',
            ...customStatuses.map((s) => s.name)
        ])
    );

    const rawStatusList = (combatant.status || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const statusList = rawStatusList.length > 0 ? rawStatusList : ['Healthy'];

    const handleAddStatus = (chosen: string) => {
        if (!chosen) return;
        let nextList: string[];
        if (chosen === 'Healthy') {
            nextList = ['Healthy'];
        } else {
            const filtered = statusList.filter((s) => s !== 'Healthy');
            if (!filtered.includes(chosen)) {
                nextList = [...filtered, chosen];
            } else {
                nextList = filtered;
            }
        }
        const newStatusStr = nextList.join(', ');
        const isFainted = nextList.some((s) => s.toLowerCase().includes('faint'));
        onUpdate({
            ...combatant,
            status: newStatusStr,
            isFainted: isFainted || (chosen === 'Fainted' ? true : combatant.isFainted)
        });
    };

    const handleRemoveStatus = (indexToRemove: number) => {
        const nextList = statusList.filter((_, idx) => idx !== indexToRemove);
        const finalStatuses = nextList.length > 0 ? nextList : ['Healthy'];
        const newStatusStr = finalStatuses.join(', ');
        const isFainted = finalStatuses.some((s) => s.toLowerCase().includes('faint'));
        onUpdate({
            ...combatant,
            status: newStatusStr,
            isFainted
        });
    };

    const handleUpdateStatusItem = (indexToUpdate: number, newVal: string) => {
        const nextList = [...statusList];
        nextList[indexToUpdate] = newVal;
        const finalStatuses = nextList.filter((s) => s.trim().length > 0);
        const newStatusStr = (finalStatuses.length > 0 ? finalStatuses : ['Healthy']).join(', ');
        const isFainted = finalStatuses.some((s) => s.toLowerCase().includes('faint'));
        onUpdate({
            ...combatant,
            status: newStatusStr,
            isFainted
        });
    };

    useEffect(() => {
        let isMounted = true;
        const resolveImg = async () => {
            if (!combatant.image) {
                if (isMounted) setResolvedImage('');
                return;
            }
            if (isStandaloneMode && combatant.image.startsWith('local-img:')) {
                try {
                    const url = await imageManager.getImageUrl(combatant.image);
                    if (isMounted) setResolvedImage(url || '');
                } catch {
                    if (isMounted) setResolvedImage('');
                }
            } else {
                if (isMounted) setResolvedImage(combatant.image);
            }
        };
        resolveImg();
        return () => {
            isMounted = false;
        };
    }, [combatant.image]);

    const handleFieldChange = <K extends keyof CombatantRowData>(field: K, value: CombatantRowData[K]) => {
        onUpdate({
            ...combatant,
            [field]: value
        });
    };

    const handleActionTextChange = (actionIndex: number, text: string) => {
        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        newActions[actionIndex] = {
            ...newActions[actionIndex],
            text
        };
        handleFieldChange('actions', newActions);
    };

    const handleActionStatusToggle = (actionIndex: number, targetStatus: ActionStatus) => {
        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        const currentStatus = newActions[actionIndex].status;
        const nextStatus: ActionStatus = currentStatus === targetStatus ? 'none' : targetStatus;

        newActions[actionIndex] = {
            ...newActions[actionIndex],
            status: nextStatus
        };
        handleFieldChange('actions', newActions);
    };

    const handleToggleEvade = () => {
        handleFieldChange('evadeUsed', !combatant.evadeUsed);
    };

    const handleToggleClash = () => {
        handleFieldChange('clashUsed', !combatant.clashUsed);
    };

    const handleToggleSide = () => {
        handleFieldChange('isPlayerSide', !combatant.isPlayerSide);
    };

    const handleToggleFainted = () => {
        const nextFainted = !combatant.isFainted;
        let newStatus = combatant.status || '';
        if (nextFainted) {
            if (!newStatus.trim() || newStatus === 'Healthy') {
                newStatus = 'Fainted';
            } else if (!newStatus.includes('Fainted')) {
                newStatus = `${newStatus}, Fainted`;
            }
        } else {
            newStatus = newStatus
                .replace(/,?\s*Fainted\s*,?/gi, '')
                .replace(/^,\s*|,\s*$/g, '')
                .trim();
            if (!newStatus) newStatus = 'Healthy';
        }
        onUpdate({
            ...combatant,
            isFainted: nextFainted,
            status: newStatus
        });
    };

    return (
        <tr
            className={`bo-combatant-row ${combatant.isPlayerSide ? 'bo-combatant-row--player' : 'bo-combatant-row--foe'} ${combatant.isFainted ? 'bo-combatant-row--fainted' : ''}`}
        >
            {/* Initiative Order */}
            <td className="bo-cell bo-cell--init">
                <div className="bo-init-group">
                    <input
                        type="text"
                        className="bo-input bo-input--init text-value-highlight"
                        value={combatant.initiative}
                        onChange={(e) => handleFieldChange('initiative', e.target.value)}
                        placeholder="Init"
                        title="Initiative Score"
                        aria-label={`Initiative score for row ${index + 1}`}
                    />
                    {onRollInitiative && (
                        <button
                            type="button"
                            className="bo-mini-btn"
                            onClick={() => onRollInitiative(combatant.id)}
                            title="Roll 1d6 + Base Initiative"
                            aria-label="Roll initiative"
                        >
                            <Dices size={12} />
                        </button>
                    )}
                </div>
            </td>

            {/* Combatant Name & Avatar */}
            <td className="bo-cell bo-cell--combatant">
                <div className="bo-combatant-info">
                    <button
                        type="button"
                        className={`bo-side-toggle-btn ${combatant.isPlayerSide ? 'bo-side-toggle-btn--player' : 'bo-side-toggle-btn--foe'}`}
                        onClick={handleToggleSide}
                        title={`Click to switch side (Current: ${combatant.isPlayerSide ? 'Player' : 'Foe'})`}
                        aria-label={`Switch combatant side`}
                    >
                        {combatant.isPlayerSide ? 'P' : 'F'}
                    </button>

                    <div
                        className={`bo-avatar-thumb ${onOpenSheet ? 'bo-avatar-thumb--clickable' : ''}`}
                        onClick={() => onOpenSheet?.(combatant)}
                        title={onOpenSheet ? `Open sheet for ${combatant.name || 'combatant'}` : undefined}
                        role={onOpenSheet ? 'button' : undefined}
                        tabIndex={onOpenSheet ? 0 : undefined}
                        onKeyDown={(e) => {
                            if (onOpenSheet && (e.key === 'Enter' || e.key === ' ')) {
                                onOpenSheet(combatant);
                            }
                        }}
                    >
                        {resolvedImage ? (
                            <img src={resolvedImage} alt={combatant.name} className="bo-avatar-img" />
                        ) : (
                            <User size={14} color="var(--text-muted)" />
                        )}
                    </div>

                    <input
                        type="text"
                        className="bo-input bo-input--name text-label"
                        value={combatant.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        placeholder="Combatant Name"
                        title="Combatant Name"
                        aria-label="Combatant Name"
                    />
                </div>
            </td>

            {/* Held Item */}
            <td className="bo-cell bo-cell--item">
                <input
                    type="text"
                    className="bo-input bo-input--item text-label"
                    value={combatant.heldItem}
                    onChange={(e) => handleFieldChange('heldItem', e.target.value)}
                    placeholder="Held Item..."
                    title="Equipped / Held Items from Combat, Social, or Hand slots"
                    aria-label="Held Item"
                />
            </td>

            {/* Status with Multi-row & Autocomplete */}
            <td className="bo-cell bo-cell--status">
                <div className="bo-status-cell-column">
                    {statusList.map((st, sIdx) => (
                        <div key={sIdx} className="bo-status-item-row">
                            <input
                                type="text"
                                list={`bo-status-list-${combatant.id}`}
                                className="bo-input bo-input--status text-label"
                                value={st}
                                onChange={(e) => handleUpdateStatusItem(sIdx, e.target.value)}
                                placeholder="Status..."
                                title={`Status condition ${sIdx + 1}`}
                                aria-label={`Status ${sIdx + 1}`}
                            />
                            {statusList.length > 1 || (st !== 'Healthy' && st.trim() !== '') ? (
                                <button
                                    type="button"
                                    className="bo-status-item-delete-btn"
                                    onClick={() => handleRemoveStatus(sIdx)}
                                    title={`Clear ${st}`}
                                    aria-label={`Delete ${st}`}
                                >
                                    <X size={10} />
                                </button>
                            ) : null}
                        </div>
                    ))}
                    <div className="bo-status-add-row">
                        <select
                            className="bo-status-quick-dropdown"
                            value=""
                            onChange={(e) => {
                                handleAddStatus(e.target.value);
                            }}
                            title="Add an additional status condition"
                            aria-label="Add status"
                        >
                            <option value="">+ Status...</option>
                            {combinedStatusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                    <datalist id={`bo-status-list-${combatant.id}`}>
                        {combinedStatusOptions.map((opt) => (
                            <option key={opt} value={opt} />
                        ))}
                    </datalist>
                </div>
            </td>

            {/* 5 Action Counters */}
            <td className="bo-cell bo-cell--actions">
                <div className="bo-actions-grid">
                    {combatant.actions.map((act, actIdx) => {
                        const isSuccess = act.status === 'success';
                        const isFailed = act.status === 'failed';

                        return (
                            <div
                                key={actIdx}
                                className={`bo-action-box ${isSuccess ? 'bo-action-box--success' : ''} ${isFailed ? 'bo-action-box--failed' : ''}`}
                            >
                                <input
                                    type="text"
                                    className="bo-action-text-input text-subtext"
                                    value={act.text}
                                    onChange={(e) => handleActionTextChange(actIdx, e.target.value)}
                                    placeholder="Move / Act"
                                    title={`Action ${actIdx + 1} Description / Move`}
                                    aria-label={`Action ${actIdx + 1} for ${combatant.name || 'Combatant'}`}
                                />
                                <div className="bo-action-status-row">
                                    <button
                                        type="button"
                                        className={`bo-status-btn bo-status-btn--check ${isSuccess ? 'bo-status-btn--active-check' : ''}`}
                                        onClick={() => handleActionStatusToggle(actIdx, 'success')}
                                        title={`Mark Action ${actIdx + 1} Used / Success (✓)`}
                                        aria-label={`Action ${actIdx + 1} success`}
                                    >
                                        ✓
                                    </button>
                                    <button
                                        type="button"
                                        className={`bo-status-btn bo-status-btn--cross ${isFailed ? 'bo-status-btn--active-cross' : ''}`}
                                        onClick={() => handleActionStatusToggle(actIdx, 'failed')}
                                        title={`Mark Action ${actIdx + 1} Failed / Clash / Evade / Cancelled (✗)`}
                                        aria-label={`Action ${actIdx + 1} failed`}
                                    >
                                        ✗
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </td>

            {/* Quick Reactions, Fainted & Row Actions */}
            <td className="bo-cell bo-cell--tools">
                <div className="bo-tools-group">
                    <button
                        type="button"
                        className={`bo-reaction-toggle bo-reaction-toggle--faint ${combatant.isFainted ? 'bo-reaction-toggle--active-faint' : ''}`}
                        onClick={handleToggleFainted}
                        title={`Fainted Status: ${combatant.isFainted ? 'Fainted (Click to clear)' : 'Active (Click to mark Fainted)'}`}
                        aria-label="Toggle Fainted"
                    >
                        <Skull size={12} />
                    </button>
                    <button
                        type="button"
                        className={`bo-reaction-toggle ${combatant.evadeUsed ? 'bo-reaction-toggle--active' : ''}`}
                        onClick={handleToggleEvade}
                        title={`Evade Reaction: ${combatant.evadeUsed ? 'Used' : 'Available'}`}
                        aria-label="Toggle Evade Used"
                    >
                        <Shield size={12} />
                    </button>
                    <button
                        type="button"
                        className={`bo-reaction-toggle ${combatant.clashUsed ? 'bo-reaction-toggle--active' : ''}`}
                        onClick={handleToggleClash}
                        title={`Clash Reaction: ${combatant.clashUsed ? 'Used' : 'Available'}`}
                        aria-label="Toggle Clash Used"
                    >
                        <Swords size={12} />
                    </button>
                    {onOpenSheet && (
                        <button
                            type="button"
                            className="bo-reaction-toggle bo-sheet-toggle"
                            onClick={() => onOpenSheet(combatant)}
                            title={`Open Character Sheet for ${combatant.name || 'combatant'}`}
                            aria-label={`Open Character Sheet for ${combatant.name || 'combatant'}`}
                        >
                            <FileText size={12} />
                        </button>
                    )}
                    <button
                        type="button"
                        className="bo-delete-row-btn"
                        onClick={() => onDelete(combatant.id)}
                        title="Remove combatant from round"
                        aria-label="Remove combatant"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
