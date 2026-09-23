import { useEffect, useState } from 'react';
import { Zap, Tag, XCircle, Power, Shield, RotateCcw, Check, Sparkles } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getKnownAbility, getAbilityBenefitSummary } from '../../data/abilities/knownAbilities';
import { fetchAbilityData } from '../../utils/api';
import './AbilityMenuModal.css';

interface AbilityMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenTagBuilder: () => void;
}

interface AbilityDetail {
    name: string;
    effect?: string;
    desc?: string;
    summary?: string;
    tags?: string;
}

export function AbilityMenuModal({ isOpen, onClose, onOpenTagBuilder }: AbilityMenuModalProps) {
    const currentAbility = useCharacterStore((state) => state.identity.ability || '');
    const availableAbilities = useCharacterStore((state) => state.identity.availableAbilities || []);
    const previousNativeAbility = useCharacterStore((state) => state.identity.previousNativeAbility || '');
    const abilityActive = useCharacterStore((state) => state.identity.abilityActive ?? true);
    const abilityBoostActive = useCharacterStore((state) => state.identity.abilityBoostActive ?? false);
    const abilityTags = useCharacterStore((state) => state.identity.abilityTags || '');
    const rank = useCharacterStore((state) => state.identity.rank);
    const hpCurr = useCharacterStore((state) => state.health.hpCurr);
    const hpMax = useCharacterStore((state) => state.health.hpMax);
    const roomCustomAbilities = useCharacterStore((state) => state.roomCustomAbilities || []);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [detailsMap, setDetailsMap] = useState<Record<string, AbilityDetail>>({});
    const [overrideInput, setOverrideInput] = useState('');

    const isHalfHp = (hpCurr || 0) <= Math.floor(Math.max(1, hpMax || 1) / 2);

    // Native species abilities list
    const nativeList = availableAbilities.length > 0 ? availableAbilities : currentAbility ? [currentAbility] : [];

    // Current ability is an override if native abilities exist and current does not match any
    const isOverride = Boolean(
        currentAbility &&
        nativeList.length > 0 &&
        !nativeList.some((a) => a.toLowerCase().trim() === currentAbility.toLowerCase().trim())
    );

    // Load details for native abilities and active override
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const allToLoad = Array.from(new Set([...nativeList, currentAbility].filter(Boolean)));

        allToLoad.forEach((abName) => {
            const cleanName = abName.replace(/\s*\(HA\)$/i, '').trim();
            const known = getKnownAbility(cleanName, rank);

            // Check room custom abilities first
            const custom = roomCustomAbilities.find((c) => c.name.trim().toLowerCase() === cleanName.toLowerCase());

            if (custom) {
                if (isMounted) {
                    const customTags = `${custom.effect || ''} ${custom.description || ''}`.trim();
                    setDetailsMap((prev) => ({
                        ...prev,
                        [abName]: {
                            name: abName,
                            effect: custom.effect,
                            desc: custom.description,
                            summary: known?.summary || custom.effect || custom.description,
                            tags: known?.tags || customTags
                        }
                    }));
                }
                return;
            }

            // Fetch from API / dataset
            fetchAbilityData(cleanName)
                .then((data) => {
                    if (!isMounted) return;
                    const safeData = data as Record<string, unknown> | null;
                    setDetailsMap((prev) => ({
                        ...prev,
                        [abName]: {
                            name: abName,
                            effect: typeof safeData?.Effect === 'string' ? safeData.Effect : undefined,
                            desc: typeof safeData?.Description === 'string' ? safeData.Description : undefined,
                            summary: known?.summary,
                            tags: known?.tags
                        }
                    }));
                })
                .catch(() => {
                    if (isMounted && known) {
                        setDetailsMap((prev) => ({
                            ...prev,
                            [abName]: {
                                name: abName,
                                summary: known.summary,
                                tags: known.tags
                            }
                        }));
                    }
                });
        });

        return () => {
            isMounted = false;
        };
    }, [isOpen, nativeList.join(','), currentAbility, rank, roomCustomAbilities]);

    if (!isOpen) return null;

    const handleSelectBattleActive = (abName: string) => {
        setIdentity('ability', abName);
    };

    const handleRevertNative = () => {
        const fallback = nativeList[0] || '';
        const target =
            previousNativeAbility &&
            nativeList.some((a) => a.toLowerCase().trim() === previousNativeAbility.toLowerCase().trim())
                ? previousNativeAbility
                : fallback;
        if (target) {
            setIdentity('ability', target);
        }
    };

    const handleApplyOverride = (overrideName: string) => {
        const clean = overrideName.trim();
        if (!clean) return;
        setIdentity('ability', clean);
        setOverrideInput('');
    };

    const activeDetail = detailsMap[currentAbility];
    const cleanCurrentAbility = currentAbility.replace(/\s*\(HA\)$/i, '').trim();
    const activeKnown = getKnownAbility(cleanCurrentAbility, rank);
    const customMatch = roomCustomAbilities.find(
        (ca) => ca.name.trim().toLowerCase() === cleanCurrentAbility.toLowerCase()
    );
    const customTags = customMatch ? `${customMatch.effect || ''} ${customMatch.description || ''}`.trim() : '';
    const effectiveTags = activeKnown
        ? activeKnown.tags
        : customMatch
          ? abilityTags || customTags
          : (abilityTags.includes('[Str +1]') || abilityTags.includes('[Str +2]')) &&
              cleanCurrentAbility !== 'Huge Power' &&
              cleanCurrentAbility !== 'Pure Power'
            ? ''
            : abilityTags;
    const activeBenefit = getAbilityBenefitSummary(currentAbility, effectiveTags, rank, isHalfHp, abilityBoostActive);
    const hasBoostTag = effectiveTags.toLowerCase().includes('@ boost');

    return (
        <div className="ability-modal__overlay">
            <div className="ability-modal__content">
                {/* Modal Header */}
                <div className="ability-modal__header">
                    <div className="ability-modal__title-wrap">
                        <Zap size={18} />
                        <h3 className="text-title-primary" style={{ margin: 0 }}>
                            Ability Hub
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ability-modal__btn-close"
                        aria-label="Close Ability Hub"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                {/* Roleplay Out-of-Combat Banner */}
                <div className="ability-modal__rp-banner">
                    <Shield size={16} />
                    <span>
                        <strong>Pokerole Dual Abilities:</strong> In battle, 1 ability is active at a time. Outside of
                        battle, both abilities are considered active for roleplay and exploration checks.
                    </span>
                </div>

                {/* Active Battle Override Card (e.g. Mummy) */}
                {isOverride && (
                    <div className="ability-modal__card ability-modal__card--override">
                        <div className="ability-modal__card-header">
                            <div className="ability-modal__card-title-group">
                                <span className="ability-modal__card-title">{currentAbility}</span>
                                <span className="ability-modal__override-badge">
                                    <Sparkles size={11} /> Battle Override
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRevertNative}
                                className="action-button action-button--dark"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.78rem'
                                }}
                                title="Revert to native species ability"
                            >
                                <RotateCcw size={12} /> Revert to Native
                            </button>
                        </div>

                        {/* Status Toggle & Applied Benefit */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}
                        >
                            <span className="text-subtext" style={{ fontSize: '0.82rem' }}>
                                State: <strong>{abilityActive ? 'Active on Sheet' : 'Turned Off'}</strong>
                                {activeBenefit && abilityActive && ` (${activeBenefit})`}
                            </span>
                            <button
                                type="button"
                                onClick={() => setIdentity('abilityActive', !abilityActive)}
                                className={`action-button ${abilityActive ? 'action-button--theme' : 'action-button--dark'}`}
                                style={{ padding: '2px 8px', fontSize: '0.78rem' }}
                            >
                                <Power size={12} /> {abilityActive ? 'Turn Off' : 'Activate'}
                            </button>
                        </div>

                        {/* Tags */}
                        {effectiveTags && <div className="ability-modal__tags-box">{effectiveTags}</div>}

                        {/* Override Rules & Effect */}
                        {(activeDetail?.effect || activeDetail?.desc || activeKnown?.summary) && (
                            <div className="ability-modal__desc-box">
                                {activeDetail?.effect && (
                                    <p style={{ margin: '0 0 4px 0' }}>
                                        <strong>Effect:</strong> {activeDetail.effect}
                                    </p>
                                )}
                                {activeKnown?.summary && !activeDetail?.effect && (
                                    <p style={{ margin: '0 0 4px 0' }}>
                                        <strong>Summary:</strong> {activeKnown.summary}
                                    </p>
                                )}
                                {activeDetail?.desc && (
                                    <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.85 }}>{activeDetail.desc}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Native Species Abilities List */}
                <div className="ability-modal__cards-list">
                    {nativeList.map((abName, idx) => {
                        const isBattleActive = currentAbility.toLowerCase().trim() === abName.toLowerCase().trim();
                        const clean = abName.replace(/\s*\(HA\)$/i, '').trim();
                        const known = getKnownAbility(clean, rank);
                        const detail = detailsMap[abName];
                        const safeAbilityTags =
                            clean.toLowerCase() === 'super luck' && abilityTags.includes('[High Crit]')
                                ? abilityTags.replace(/\[\s*high crit(?:ical)?\s*\]/gi, '[Stacking High Crit]').trim()
                                : abilityTags;
                        const displayedTags = isBattleActive ? safeAbilityTags || known?.tags : known?.tags;

                        let slotLabel = `Ability ${idx + 1}`;
                        if (abName.includes('(HA)') || idx === 2) {
                            slotLabel = 'Hidden Ability';
                        }

                        return (
                            <div
                                key={abName}
                                className={`ability-modal__card ${isBattleActive ? 'ability-modal__card--active' : ''}`}
                            >
                                <div className="ability-modal__card-header">
                                    <div className="ability-modal__card-title-group">
                                        <span className="ability-modal__card-title">{abName}</span>
                                        <span className="ability-modal__slot-badge">{slotLabel}</span>
                                        {isBattleActive && (
                                            <span className="ability-modal__active-badge">
                                                <Check size={11} /> Battle Active
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Button: Set Battle Active or Toggle Power */}
                                    {isBattleActive ? (
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setIdentity('abilityActive', !abilityActive)}
                                                className={`action-button ${
                                                    abilityActive ? 'action-button--theme' : 'action-button--dark'
                                                }`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '0.78rem',
                                                    padding: '3px 8px'
                                                }}
                                                title="Toggle ability active or inactive"
                                            >
                                                <Power size={12} /> {abilityActive ? 'Turn Off' : 'Activate'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSelectBattleActive(abName)}
                                            className="action-button action-button--dark"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.78rem',
                                                padding: '3px 8px'
                                            }}
                                            title={`Make ${abName} the active battle ability`}
                                        >
                                            <Zap size={12} /> Set as Battle Active
                                        </button>
                                    )}
                                </div>

                                {/* Active Benefit Note */}
                                {isBattleActive && activeBenefit && abilityActive && (
                                    <div
                                        className="text-subtext"
                                        style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}
                                    >
                                        Applied Benefit: <strong>{activeBenefit}</strong>
                                    </div>
                                )}

                                {/* Boost Trigger Toggle for Active Ability */}
                                {isBattleActive && hasBoostTag && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            background: 'rgba(0,0,0,0.2)',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <span className="text-subtext" style={{ fontSize: '0.8rem' }}>
                                            Trigger Boost: <strong>{abilityBoostActive ? 'Active' : 'Inactive'}</strong>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIdentity('abilityBoostActive', !abilityBoostActive)}
                                            className={`action-button ${abilityBoostActive ? 'action-button--theme' : 'action-button--dark'}`}
                                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                        >
                                            <Power size={11} />{' '}
                                            {abilityBoostActive ? 'Deactivate Boost' : 'Activate Boost'}
                                        </button>
                                    </div>
                                )}

                                {/* Tags */}
                                {displayedTags && <div className="ability-modal__tags-box">{displayedTags}</div>}

                                {/* Effect & Description */}
                                {(detail?.effect || detail?.desc || known?.summary) && (
                                    <div className="ability-modal__desc-box">
                                        {detail?.effect && (
                                            <p style={{ margin: '0 0 4px 0' }}>
                                                <strong>Effect:</strong> {detail.effect}
                                            </p>
                                        )}
                                        {known?.summary && !detail?.effect && (
                                            <p style={{ margin: '0 0 4px 0' }}>
                                                <strong>Summary:</strong> {known.summary}
                                            </p>
                                        )}
                                        {detail?.desc && (
                                            <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.85 }}>
                                                {detail.desc}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Temporary Override Section */}
                <div className="ability-modal__override-drawer">
                    <span
                        className="text-label"
                        style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                    >
                        Temporary Battle Override
                    </span>
                    <span className="text-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        If this Pokémon's ability was changed in battle (e.g. infected by Mummy, or an ability copied
                        from a foe):
                    </span>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={() => handleApplyOverride('Mummy')}
                            className="ability-modal__chip"
                            title="Set ability to Mummy"
                        >
                            + Mummy
                        </button>
                        <input
                            type="text"
                            className="identity-grid__input text-label"
                            placeholder="Type override ability (e.g. Simple, Levitate)..."
                            value={overrideInput}
                            onChange={(e) => setOverrideInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleApplyOverride(overrideInput);
                                }
                            }}
                            style={{ flex: 1, padding: '4px 8px', fontSize: '0.85rem' }}
                        />
                        <button
                            type="button"
                            onClick={() => handleApplyOverride(overrideInput)}
                            className="action-button action-button--theme"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        >
                            Apply
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="ability-modal__actions">
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onOpenTagBuilder();
                        }}
                        className="action-button action-button--dark"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Tag size={14} /> Edit Tags
                    </button>
                    <button type="button" onClick={onClose} className="action-button action-button--theme">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
