import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Copy, Check, AlertTriangle, Radio, Swords } from 'lucide-react';
import type { CustomFieldEffect } from '../../store/storeTypes';
import { checkConditionTagCollision } from './homebrewFieldEffectUtils';
import { ALL_MOVES, loadLocalDataset } from '../../utils/api/api';
import { useCharacterStore } from '../../store/useCharacterStore';

interface HomebrewFieldEffectTriggerSectionProps {
    effect: CustomFieldEffect;
    otherEffects: CustomFieldEffect[];
    onUpdate: <K extends keyof CustomFieldEffect>(field: K, value: CustomFieldEffect[K]) => void;
}

export function HomebrewFieldEffectTriggerSection({
    effect,
    otherEffects,
    onUpdate
}: HomebrewFieldEffectTriggerSectionProps) {
    const [moveInput, setMoveInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [canonicalMoves, setCanonicalMoves] = useState<string[]>(ALL_MOVES);

    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const role = useCharacterStore((state) => state.role);

    useEffect(() => {
        let isMounted = true;
        loadLocalDataset().then(() => {
            if (isMounted) {
                setCanonicalMoves([...ALL_MOVES]);
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    const moveSuggestions = useMemo(() => {
        const customNames = roomCustomMoves.filter((m) => role === 'GM' || !m.gmOnly).map((m) => m.name);
        return Array.from(new Set([...canonicalMoves, ...customNames])).sort();
    }, [canonicalMoves, roomCustomMoves, role]);

    const triggerMoves = effect.triggerMoves || [];

    const handleAddMoves = (raw: string) => {
        if (!raw.trim()) return;
        const incoming = raw
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean);
        if (incoming.length === 0) return;

        const currentLower = new Set(triggerMoves.map((m) => m.toLowerCase()));
        const nextMoves = [...triggerMoves];

        for (const move of incoming) {
            if (!currentLower.has(move.toLowerCase())) {
                currentLower.add(move.toLowerCase());
                nextMoves.push(move);
            }
        }

        if (nextMoves.length !== triggerMoves.length) {
            onUpdate('triggerMoves', nextMoves);
        }
        setMoveInput('');
    };

    const handleRemoveMove = (moveToRemove: string) => {
        const nextMoves = triggerMoves.filter((m) => m.toLowerCase() !== moveToRemove.toLowerCase());
        onUpdate('triggerMoves', nextMoves);
    };

    const activeTag = effect.conditionTag?.trim() || effect.name.trim() || 'condition';
    const collision = checkConditionTagCollision(activeTag, effect.id, otherEffects);

    const handleCopyTemplate = async () => {
        const template = `[@ ${activeTag}]`;
        try {
            await navigator.clipboard.writeText(template);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard fallback
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    return (
        <div className="hb-fe-modal__section hb-fe-trigger-section">
            {/* Associated Trigger Moves */}
            <div className="hb-fe-trigger-block">
                <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Swords size={14} /> Associated Trigger Moves
                </label>
                <div className="hb-fe-card__tags-row" style={{ minHeight: '30px' }}>
                    {triggerMoves.length === 0 ? (
                        <span className="text-subtext" style={{ fontStyle: 'italic' }}>
                            No trigger moves linked yet. Specify moves below to enable 1-click activation in the roll
                            log.
                        </span>
                    ) : (
                        triggerMoves.map((m) => (
                            <span key={m} className="hb-fe-tag-pill hb-fe-move-pill">
                                {m}
                                <button
                                    type="button"
                                    className="hb-fe-tag-pill__remove"
                                    onClick={() => handleRemoveMove(m)}
                                    title={`Remove ${m}`}
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))
                    )}
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                        type="text"
                        list={`hb-trigger-moves-${effect.id}`}
                        className="bo-input bo-input--underline text-label"
                        placeholder="e.g. Acid Rain, Corrosive Rain (comma-separated)"
                        value={moveInput}
                        onChange={(e) => setMoveInput(e.target.value)}
                        onBlur={() => {
                            if (moveInput.trim()) {
                                handleAddMoves(moveInput);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddMoves(moveInput);
                            }
                        }}
                    />
                    <datalist id={`hb-trigger-moves-${effect.id}`}>
                        {moveSuggestions.map((name) => (
                            <option key={name} value={name} />
                        ))}
                    </datalist>
                    <button
                        type="button"
                        className="action-button action-button--dark"
                        style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAddMoves(moveInput)}
                    >
                        <Plus size={12} /> Add Move
                    </button>
                </div>
            </div>

            {/* Condition Tag Identifier */}
            <div className="hb-fe-trigger-block" style={{ marginTop: '12px' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '6px'
                    }}
                >
                    <label className="text-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Radio size={14} /> Condition Tag Identifier
                    </label>
                    <button
                        type="button"
                        className={`action-button ${copied ? 'action-button--theme' : 'action-button--secondary'}`}
                        style={{
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={handleCopyTemplate}
                        title={`Copy tag template [@ ${activeTag}] to clipboard`}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied Template!' : `Copy Tag Template [@ ${activeTag}]`}
                    </button>
                </div>

                <input
                    type="text"
                    className="bo-input bo-input--underline text-label"
                    value={effect.conditionTag ?? ''}
                    onChange={(e) => onUpdate('conditionTag', e.target.value)}
                    placeholder={`Defaults to "${effect.name.trim() || 'effect name'}" if left blank`}
                />
                <span className="text-subtext" style={{ fontSize: '0.72rem', display: 'block', marginTop: '2px' }}>
                    Used for conditional tag modifiers on abilities, traits, and held items (e.g.{' '}
                    <code>[@ {activeTag}]</code>).
                </span>

                {/* Collision Advisory Warning */}
                {collision.collides && (
                    <div className="hb-fe-advisory-warning">
                        <AlertTriangle size={14} className="hb-fe-advisory-warning__icon" />
                        <span>
                            <strong>Advisory:</strong> Tag key <code>@{activeTag}</code> collides with{' '}
                            {collision.source} (<em>{collision.matchedName}</em>). Tag conditions will match both
                            effects.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
