import { useEffect, useState } from 'react';
import { Zap, Tag, XCircle, Power } from 'lucide-react';
import { useCharacterStore } from '../../store/useCharacterStore';
import { getKnownAbility, getAbilityBenefitSummary } from '../../data/abilities/knownAbilities';
import { fetchAbilityData } from '../../utils/api';
import './AbilityMenuModal.css';

interface AbilityMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenTagBuilder: () => void;
}

export function AbilityMenuModal({ isOpen, onClose, onOpenTagBuilder }: AbilityMenuModalProps) {
    const ability = useCharacterStore((state) => state.identity.ability);
    const abilityActive = useCharacterStore((state) => state.identity.abilityActive ?? true);
    const abilityTags = useCharacterStore((state) => state.identity.abilityTags || '');
    const rank = useCharacterStore((state) => state.identity.rank);
    const setIdentity = useCharacterStore((state) => state.setIdentity);

    const [datasetText, setDatasetText] = useState<{ effect?: string; desc?: string } | null>(null);

    const known = getKnownAbility(ability, rank);
    const benefit = getAbilityBenefitSummary(ability, abilityTags, rank);

    useEffect(() => {
        if (!isOpen || !ability) {
            setDatasetText(null);
            return;
        }

        let isMounted = true;
        fetchAbilityData(ability)
            .then((data) => {
                if (!isMounted || !data) return;
                const safeData = data as Record<string, unknown>;
                setDatasetText({
                    effect: typeof safeData.Effect === 'string' ? safeData.Effect : undefined,
                    desc: typeof safeData.Description === 'string' ? safeData.Description : undefined
                });
            })
            .catch(() => {
                // Ignore load errors safely
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, ability]);

    if (!isOpen) return null;

    const toggleActive = () => {
        setIdentity('abilityActive', !abilityActive);
    };

    return (
        <div className="ability-modal__overlay">
            <div className="ability-modal__content">
                <div className="ability-modal__header">
                    <div className="ability-modal__title-wrap">
                        <Zap size={18} />
                        <h3 className="text-title-primary" style={{ margin: 0 }}>
                            {ability || 'Ability Manager'}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ability-modal__btn-close"
                        aria-label="Close Ability Menu"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                <div
                    className={`ability-modal__status-box ${
                        abilityActive ? 'ability-modal__status-box--active' : ''
                    }`}
                >
                    <div className="ability-modal__status-info">
                        <span className="ability-modal__status-label text-subtext">Activation Status</span>
                        <span
                            className={`ability-modal__status-state ${
                                abilityActive
                                    ? 'ability-modal__status-state--active'
                                    : 'ability-modal__status-state--inactive'
                            }`}
                        >
                            {abilityActive ? 'Active on Sheet' : 'Inactive (Turned Off)'}
                        </span>
                        {benefit && abilityActive && (
                            <span className="text-subtext" style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                                Applied Effect: {benefit}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={toggleActive}
                        className={`action-button ${
                            abilityActive ? 'action-button--theme' : 'action-button--dark'
                        }`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Power size={14} /> {abilityActive ? 'Turn Off' : 'Activate'}
                    </button>
                </div>

                <div className="ability-modal__section">
                    <span className="ability-modal__section-title text-label">Mechanical Tags</span>
                    <div className="ability-modal__tags-box">
                        {abilityTags ? abilityTags : <span className="ability-modal__tags-empty">No tags assigned</span>}
                    </div>
                </div>

                {(known?.summary || datasetText?.effect || datasetText?.desc) && (
                    <div className="ability-modal__section">
                        <span className="ability-modal__section-title text-label">Pokerole Rules & Description</span>
                        <div className="ability-modal__desc-box">
                            {datasetText?.effect && (
                                <p style={{ margin: '0 0 6px 0' }}>
                                    <b>Effect:</b> {datasetText.effect}
                                </p>
                            )}
                            {known?.summary && !datasetText?.effect && (
                                <p style={{ margin: '0 0 6px 0' }}>
                                    <b>Summary:</b> {known.summary}
                                </p>
                            )}
                            {datasetText?.desc && (
                                <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.85 }}>{datasetText.desc}</p>
                            )}
                        </div>
                    </div>
                )}

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
