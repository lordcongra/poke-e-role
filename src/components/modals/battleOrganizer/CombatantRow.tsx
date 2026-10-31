import { useState, useEffect } from 'react';
import type { CombatantRowData, ActionStatus, ActionCritType } from '../../../types/battleOrganizerTypes';
import { isStandaloneMode } from '../../../utils/sync/storageAdapter';
import { imageManager } from '../../../utils/graphics/imageManager';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { STATUS_OPTIONS } from '../../../data/constants';
import { Dices } from 'lucide-react';
import { addRollLogEntry } from '../../../utils/combat/diceRoller';
import { adjustCombatantHp, adjustCombatantWill, toggleCombatantFainted } from './battleOrganizerUtils';
import { CombatantActionSlots } from './CombatantActionSlots';
import { CombatantStatusCell } from './CombatantStatusCell';
import { CombatantRowTools } from './CombatantRowTools';
import { CombatantAvatarStack } from './CombatantAvatarStack';
import './CombatantRow.css';

interface CombatantRowProps {
    combatant: CombatantRowData;
    index: number;
    showCriticalMarks?: boolean;
    onUpdate: (updated: CombatantRowData) => void;
    onDelete: (id: string) => void;
    onRollInitiative?: (id: string) => void;
    onOpenSheet?: (combatant: CombatantRowData) => void;
    onAdjustHp?: (id: string, delta: number) => void;
    onAdjustWill?: (id: string, delta: number) => void;
}

export function CombatantRow({
    combatant,
    index,
    showCriticalMarks = true,
    onUpdate,
    onDelete,
    onRollInitiative,
    onOpenSheet,
    onAdjustHp,
    onAdjustWill
}: CombatantRowProps) {
    const [resolvedImage, setResolvedImage] = useState<string>('');
    const role = useCharacterStore((state) => state.role);
    const isPlayer = role === 'PLAYER';
    const isLocked = !isStandaloneMode && isPlayer && !!combatant.isNPC;
    const concealHp = !isStandaloneMode && isPlayer && !!(combatant.gmHpText || combatant.gmHpBar);
    const concealWill = !isStandaloneMode && isPlayer && !!(combatant.gmWillText || combatant.gmWillBar);

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
        if (isLocked || !chosen) return;
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
        if (isLocked) return;
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
        if (isLocked) return;
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
        if (isLocked) return;
        onUpdate({
            ...combatant,
            [field]: value
        });
    };

    const handleActionTextChange = (actionIndex: number, text: string) => {
        if (isLocked) return;
        const prevAction = combatant.actions[actionIndex];
        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        newActions[actionIndex] = {
            ...newActions[actionIndex],
            text
        };

        const prevWasEvade = prevAction && /evad|dodge/i.test(prevAction.text.trim());
        const nowIsEvade = /evad|dodge/i.test(text.trim());
        const prevWasClash = prevAction && /clash/i.test(prevAction.text.trim());
        const nowIsClash = /clash/i.test(text.trim());

        let nextEvadeUsed = combatant.evadeUsed;
        let nextClashUsed = combatant.clashUsed;

        if (nowIsEvade) {
            nextEvadeUsed = true;
        } else if (prevWasEvade) {
            const hasOtherEvade = newActions.some((a, idx) => idx !== actionIndex && /evad|dodge/i.test(a.text.trim()));
            if (!hasOtherEvade) nextEvadeUsed = false;
        }

        if (nowIsClash) {
            nextClashUsed = true;
        } else if (prevWasClash) {
            const hasOtherClash = newActions.some((a, idx) => idx !== actionIndex && /clash/i.test(a.text.trim()));
            if (!hasOtherClash) nextClashUsed = false;
        }

        onUpdate({
            ...combatant,
            actions: newActions,
            evadeUsed: nextEvadeUsed,
            clashUsed: nextClashUsed
        });
    };

    const handleActionStatusToggle = (actionIndex: number, targetStatus: ActionStatus) => {
        if (isLocked) return;
        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        const currentStatus = newActions[actionIndex].status;
        const nextStatus: ActionStatus = currentStatus === targetStatus ? 'none' : targetStatus;

        newActions[actionIndex] = {
            ...newActions[actionIndex],
            status: nextStatus,
            critType: 'none'
        };
        handleFieldChange('actions', newActions);
    };

    const handleActionCritToggle = (actionIndex: number, critType: ActionCritType) => {
        if (isLocked) return;
        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        let nextStatus: ActionStatus = newActions[actionIndex].status;
        if (critType === 'crit_hit') {
            nextStatus = 'success';
        } else if (critType === 'crit_fail') {
            nextStatus = 'failed';
        } else if (critType === 'none') {
            nextStatus = 'none';
        }
        newActions[actionIndex] = {
            ...newActions[actionIndex],
            status: nextStatus,
            critType
        };
        handleFieldChange('actions', newActions);
    };

    const handleActionClear = (actionIndex: number) => {
        if (isLocked) return;
        const clearedAction = combatant.actions[actionIndex];
        if (!clearedAction.text && clearedAction.status === 'none' && clearedAction.critType === 'none') return;

        const actionText = clearedAction.text.trim() || `Action ${actionIndex + 1}`;
        const newActions = [...combatant.actions] as CombatantRowData['actions'];
        newActions[actionIndex] = {
            text: '',
            status: 'none',
            critType: 'none',
            rollId: undefined
        };

        const isEvade = /evad|dodge/i.test(clearedAction.text.trim());
        const isClash = /clash/i.test(clearedAction.text.trim());

        const hasOtherEvade = newActions.some((a, idx) => idx !== actionIndex && /evad|dodge/i.test(a.text.trim()));
        const hasOtherClash = newActions.some((a, idx) => idx !== actionIndex && /clash/i.test(a.text.trim()));

        let nextEvadeUsed = combatant.evadeUsed;
        if (isEvade && !hasOtherEvade) {
            nextEvadeUsed = false;
        }

        let nextClashUsed = combatant.clashUsed;
        if (isClash && !hasOtherClash) {
            nextClashUsed = false;
        }

        onUpdate({
            ...combatant,
            actions: newActions,
            evadeUsed: nextEvadeUsed,
            clashUsed: nextClashUsed
        });

        // Notify in roll log that the action was cleared and restored
        const charName = combatant.name.trim() || 'Combatant';
        const reactionMsg =
            isEvade && !hasOtherEvade
                ? ' Evade reaction was reset to available.'
                : isClash && !hasOtherClash
                  ? ' Clash reaction was reset to available.'
                  : '';

        addRollLogEntry(
            `Action Restored: ${charName}`,
            `Action ${actionIndex + 1} (${actionText}) was cleared and restored to the action counter.${reactionMsg}`,
            combatant.image || '',
            charName,
            charName,
            combatant.tokenId
        );
    };

    const handleToggleEvade = () => {
        if (isLocked) return;
        handleFieldChange('evadeUsed', !combatant.evadeUsed);
    };

    const handleToggleClash = () => {
        if (isLocked) return;
        handleFieldChange('clashUsed', !combatant.clashUsed);
    };

    const handleToggleSide = () => {
        if (isLocked) return;
        handleFieldChange('isPlayerSide', !combatant.isPlayerSide);
    };

    const handleToggleFainted = () => {
        if (isLocked) return;
        onUpdate({
            ...combatant,
            ...toggleCombatantFainted(combatant)
        });
    };

    const handleAdjustHp = (delta: number) => {
        if (isLocked || concealHp) return;
        onUpdate({
            ...combatant,
            ...adjustCombatantHp(combatant, delta)
        });
    };

    const handleAdjustWill = (delta: number) => {
        if (isLocked || concealWill) return;
        onUpdate({
            ...combatant,
            ...adjustCombatantWill(combatant, delta)
        });
    };

    const hpMax = combatant.hpMax || 0;
    const hpCurr = combatant.hpCurr ?? 0;
    const hpRatio = hpCurr <= 0 ? 0 : hpMax > 0 ? hpCurr / hpMax : 0;

    let hpThemeClass = 'bo-stat-stepper--hp-green';
    if (combatant.tempHp && combatant.tempHp > 0) {
        hpThemeClass = 'bo-stat-stepper--hp-temp';
    } else if (hpCurr <= 0 || hpRatio <= 0.2) {
        hpThemeClass = 'bo-stat-stepper--hp-red';
    } else if (hpRatio <= 0.5) {
        hpThemeClass = 'bo-stat-stepper--hp-yellow';
    }

    const hpTitle =
        combatant.tempHp && combatant.tempHp > 0
            ? `HP: ${hpCurr} / ${hpMax} (+${combatant.tempHp} Temp)`
            : `HP: ${hpCurr}${hpMax ? ` / ${hpMax}` : ''}`;

    const hasToken = Boolean(combatant.tokenId);

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
                        disabled={isLocked}
                    />
                    {onRollInitiative && (
                        <button
                            type="button"
                            className="bo-mini-btn"
                            onClick={() => onRollInitiative(combatant.id)}
                            title={isLocked ? 'Initiative locked by GM' : 'Roll 1d6 + Base Initiative'}
                            aria-label="Roll initiative"
                            disabled={isLocked}
                        >
                            <Dices size={12} />
                        </button>
                    )}
                </div>
            </td>

            {/* Combatant Name & Avatar with HP/Will Bars */}
            <td className="bo-cell bo-cell--combatant">
                <div className="bo-combatant-info">
                    <button
                        type="button"
                        className={`bo-side-toggle-btn ${combatant.isPlayerSide ? 'bo-side-toggle-btn--player' : 'bo-side-toggle-btn--foe'}`}
                        onClick={handleToggleSide}
                        title={
                            isLocked
                                ? 'Side locked by GM'
                                : `Click to switch side (Current: ${combatant.isPlayerSide ? 'Player' : 'Foe'})`
                        }
                        aria-label="Switch combatant side"
                        disabled={isLocked}
                    >
                        {combatant.isPlayerSide ? 'P' : 'F'}
                    </button>

                    {/* Compact Vertical Stack: HP Mini-Bar -> Avatar -> Will Mini-Bar */}
                    <CombatantAvatarStack
                        combatant={combatant}
                        resolvedImage={resolvedImage}
                        isLocked={isLocked}
                        concealHp={concealHp}
                        concealWill={concealWill}
                        hpThemeClass={hpThemeClass}
                        hpTitle={hpTitle}
                        hasToken={hasToken}
                        onAdjustHp={onAdjustHp}
                        onAdjustWill={onAdjustWill}
                        handleAdjustHp={handleAdjustHp}
                        handleAdjustWill={handleAdjustWill}
                        onOpenSheet={onOpenSheet}
                    />

                    <div className="bo-name-field-wrap">
                        {combatant.activeTransformation && combatant.activeTransformation !== 'None' && (
                            <span
                                className={`bo-form-badge bo-form-badge--${combatant.activeTransformation.toLowerCase()}`}
                                title={`Form: ${combatant.activeTransformation}`}
                            >
                                {combatant.activeTransformation === 'Terastallize'
                                    ? 'TERA'
                                    : combatant.activeTransformation === 'Gigantamax'
                                      ? 'G-MAX'
                                      : combatant.activeTransformation === 'Dynamax'
                                        ? 'D-MAX'
                                        : combatant.activeTransformation.toUpperCase()}
                            </span>
                        )}
                        <input
                            type="text"
                            className="bo-input bo-input--name text-label"
                            value={combatant.name}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Combatant Name"
                            title="Combatant Name"
                            aria-label="Combatant Name"
                            disabled={isLocked}
                        />
                    </div>
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
                    disabled={isLocked}
                />
            </td>

            {/* Status with Multi-row & Autocomplete */}
            <CombatantStatusCell
                combatantId={combatant.id}
                statusList={statusList}
                combinedStatusOptions={combinedStatusOptions}
                isLocked={isLocked}
                onUpdateStatusItem={handleUpdateStatusItem}
                onRemoveStatus={handleRemoveStatus}
                onAddStatus={handleAddStatus}
            />

            {/* 5 Action Counters */}
            <CombatantActionSlots
                actions={combatant.actions}
                combatantName={combatant.name}
                disabled={isLocked}
                showCriticalMarks={showCriticalMarks}
                onActionTextChange={handleActionTextChange}
                onActionStatusToggle={handleActionStatusToggle}
                onActionCritToggle={handleActionCritToggle}
                onActionClear={handleActionClear}
            />

            {/* Quick Reactions, Fainted & Row Actions */}
            <CombatantRowTools
                combatant={combatant}
                isLocked={isLocked}
                hasToken={hasToken}
                onToggleFainted={handleToggleFainted}
                onToggleEvade={handleToggleEvade}
                onToggleClash={handleToggleClash}
                onOpenSheet={onOpenSheet}
                onDelete={onDelete}
            />
        </tr>
    );
}
