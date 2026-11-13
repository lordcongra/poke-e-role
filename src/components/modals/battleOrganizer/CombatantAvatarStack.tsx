import React from 'react';
import { Minus, Plus, User } from 'lucide-react';
import type { CombatantRowData } from '../../../types/battleOrganizerTypes';
import { useCharacterStore } from '@/store/useCharacterStore';
import { isCombatantInPc } from '@/utils/combat/targeting/abilityTargetPcResolution';

export interface CombatantAvatarStackProps {
    combatant: CombatantRowData;
    resolvedImage: string;
    isLocked: boolean;
    concealHp: boolean;
    concealWill: boolean;
    hpThemeClass: string;
    hpTitle: string;
    hasToken: boolean;
    onAdjustHp?: (id: string, delta: number) => void;
    onAdjustWill?: (id: string, delta: number) => void;
    handleAdjustHp: (delta: number) => void;
    handleAdjustWill: (delta: number) => void;
    onOpenSheet?: (combatant: CombatantRowData) => void;
}

export const CombatantAvatarStack: React.FC<CombatantAvatarStackProps> = ({
    combatant,
    resolvedImage,
    isLocked,
    concealHp,
    concealWill,
    hpThemeClass,
    hpTitle,
    hasToken,
    onAdjustHp,
    onAdjustWill,
    handleAdjustHp,
    handleAdjustWill,
    onOpenSheet
}) => {
    const pcData = useCharacterStore((s) => s.pcData);
    const inPc = Boolean(combatant.isInPc || isCombatantInPc(combatant, pcData));

    return (
        <div className="bo-avatar-stat-stack">
            {/* Top: HP Stepper */}
            <div
                className={`bo-stat-stepper bo-stat-stepper--hp ${hpThemeClass}`}
                title={concealHp ? 'HP: Hidden by GM' : hpTitle}
            >
                <button
                    type="button"
                    className="bo-stat-step-btn"
                    disabled={concealHp || isLocked}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (concealHp || isLocked) return;
                        if (onAdjustHp) onAdjustHp(combatant.id, -1);
                        else handleAdjustHp(-1);
                    }}
                    title={concealHp ? 'HP Hidden by GM' : 'Decrease HP'}
                    aria-label="Decrease HP"
                >
                    <Minus size={8} />
                </button>
                <span className="bo-stat-stepper-val">{concealHp ? '?' : (combatant.hpCurr ?? 0)}</span>
                <button
                    type="button"
                    className="bo-stat-step-btn"
                    disabled={concealHp || isLocked}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (concealHp || isLocked) return;
                        if (onAdjustHp) onAdjustHp(combatant.id, 1);
                        else handleAdjustHp(1);
                    }}
                    title={concealHp ? 'HP Hidden by GM' : 'Increase HP'}
                    aria-label="Increase HP"
                >
                    <Plus size={8} />
                </button>
            </div>

            {/* Center: Avatar Thumbnail */}
            <div
                className={`bo-avatar-thumb ${onOpenSheet && !isLocked && !inPc ? 'bo-avatar-thumb--clickable' : ''}`}
                onClick={() => {
                    if (isLocked || inPc) return;
                    onOpenSheet?.(combatant);
                }}
                title={
                    isLocked
                        ? 'This sheet is hidden by the GM'
                        : inPc
                          ? 'Stored in PC — Send out to battle to view sheet'
                          : onOpenSheet
                            ? hasToken
                                ? `Open sheet for ${combatant.name || 'combatant'}`
                                : `No token linked for ${combatant.name || 'combatant'} - click to view instructions`
                            : undefined
                }
                role={onOpenSheet && !isLocked && !inPc ? 'button' : undefined}
                tabIndex={onOpenSheet && !isLocked && !inPc ? 0 : undefined}
                onKeyDown={(e) => {
                    if (onOpenSheet && !isLocked && !inPc && (e.key === 'Enter' || e.key === ' ')) {
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

            {/* Bottom: Will Stepper */}
            <div
                className="bo-stat-stepper bo-stat-stepper--will"
                title={
                    concealWill
                        ? 'Will: Hidden by GM'
                        : `Will: ${combatant.willCurr ?? 0}${combatant.willMax ? ` / ${combatant.willMax}` : ''}`
                }
            >
                <button
                    type="button"
                    className="bo-stat-step-btn"
                    disabled={concealWill || isLocked}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (concealWill || isLocked) return;
                        if (onAdjustWill) onAdjustWill(combatant.id, -1);
                        else handleAdjustWill(-1);
                    }}
                    title={concealWill ? 'Will Hidden by GM' : 'Decrease Will'}
                    aria-label="Decrease Will"
                >
                    <Minus size={8} />
                </button>
                <span className="bo-stat-stepper-val">{concealWill ? '?' : (combatant.willCurr ?? 0)}</span>
                <button
                    type="button"
                    className="bo-stat-step-btn"
                    disabled={concealWill || isLocked}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (concealWill || isLocked) return;
                        if (onAdjustWill) onAdjustWill(combatant.id, 1);
                        else handleAdjustWill(1);
                    }}
                    title={concealWill ? 'Will Hidden by GM' : 'Increase Will'}
                    aria-label="Increase Will"
                >
                    <Plus size={8} />
                </button>
            </div>
        </div>
    );
};
