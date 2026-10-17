import { useState, useEffect } from 'react';
import type { InventoryItem } from '../../../store/storeTypes';
import type { ItemTargetCandidate } from '../../../utils/items/itemTargeting';
import { getBaseItemEffect } from '../../../utils/items/itemUsageEffects';
import { useItemArt } from '../../../utils/graphics/itemArtCatalog';
import { imageManager } from '../../../utils/graphics/imageManager';
import { STATUS_COLORS } from '../../../data/constants';
import { Heart, Package, User, Check, XCircle } from 'lucide-react';
import './ItemTargetPromptModal.css';

interface ItemTargetPromptModalProps {
    item: InventoryItem;
    candidates: ItemTargetCandidate[];
    onSelectTarget: (target: ItemTargetCandidate) => void;
    onClose: () => void;
}

export function ItemTargetPromptModal({ item, candidates, onSelectTarget, onClose }: ItemTargetPromptModalProps) {
    const knownArt = useItemArt(item.name);
    const effectiveImageUrl = item.imageUrl && item.imageUrl !== 'none' ? item.imageUrl : knownArt;
    const [resolvedImg, setResolvedImg] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        if (effectiveImageUrl && effectiveImageUrl !== 'none') {
            imageManager.getImageUrl(effectiveImageUrl).then((url) => {
                if (isMounted) setResolvedImg(url);
            });
        }
        return () => {
            isMounted = false;
        };
    }, [effectiveImageUrl]);

    const baseEffect = getBaseItemEffect(item.name || '');
    const healHp = item.healHp ?? baseEffect?.healHp;
    const healWill = item.healWill ?? baseEffect?.healWill;
    const cures = item.cures ?? baseEffect?.cures;

    const summaryParts: string[] = [];
    if (healHp) summaryParts.push(`Heals ${healHp >= 99 ? 'all' : healHp} HP`);
    if (healWill) summaryParts.push(`Restores ${healWill >= 99 ? 'all' : healWill} Will`);
    if (cures && cures.length > 0) summaryParts.push(`Cures ${cures.join(', ')}`);
    const effectSummary = summaryParts.length > 0 ? summaryParts.join(' • ') : 'Restorative item';

    return (
        <div className="item-target-modal__overlay" onClick={onClose}>
            <div className="item-target-modal__content" onClick={(e) => e.stopPropagation()}>
                <div className="item-target-modal__header">
                    <div className="item-target-modal__item-info">
                        <div className="item-target-modal__item-icon-wrap">
                            {resolvedImg ? (
                                <img
                                    src={resolvedImg}
                                    alt={item.name || 'Item'}
                                    className="item-target-modal__item-img"
                                />
                            ) : (
                                <Package size={24} className="item-target-modal__item-fallback-icon" />
                            )}
                        </div>
                        <div>
                            <h3 className="item-target-modal__title text-title-primary">Use {item.name || 'Item'}</h3>
                            <div className="item-target-modal__item-effect text-subtext">{effectSummary}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="item-target-modal__close-icon-btn"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                <div className="item-target-modal__instructions text-label">Choose a target to receive this item:</div>

                <div className="item-target-modal__candidate-list">
                    {candidates.map((candidate) => {
                        const hpPct = Math.min(100, Math.max(0, (candidate.hp / (candidate.maxHp || 1)) * 100));
                        const willPct = Math.min(100, Math.max(0, (candidate.will / (candidate.maxWill || 1)) * 100));

                        return (
                            <div
                                key={candidate.id}
                                className={`item-target-card ${
                                    candidate.isTrainer ? 'item-target-card--trainer' : 'item-target-card--pokemon'
                                }`}
                                onClick={() => onSelectTarget(candidate)}
                            >
                                <div className="item-target-card__avatar-col">
                                    {candidate.avatarUrl ? (
                                        <img
                                            src={candidate.avatarUrl}
                                            alt={candidate.name}
                                            className="item-target-card__avatar-img"
                                        />
                                    ) : (
                                        <div className="item-target-card__avatar-fallback">
                                            {candidate.isTrainer ? <User size={20} /> : <Heart size={20} />}
                                        </div>
                                    )}
                                </div>

                                <div className="item-target-card__main-col">
                                    <div className="item-target-card__title-row">
                                        <span className="item-target-card__name text-title-primary">
                                            {candidate.name}
                                        </span>
                                        <span className="item-target-card__tag text-subtext">
                                            {candidate.isTrainer ? 'Trainer' : candidate.species || 'Pokémon'}
                                        </span>
                                    </div>

                                    <div className="item-target-card__bars">
                                        <div className="item-target-card__bar-row">
                                            <span className="text-label item-target-card__bar-label">HP</span>
                                            <div className="item-target-card__bar-track">
                                                <div
                                                    className="item-target-card__bar-fill item-target-card__bar-fill--hp"
                                                    style={{ width: `${hpPct}%` }}
                                                />
                                            </div>
                                            <span className="text-subtext item-target-card__bar-val">
                                                {candidate.hp}/{candidate.maxHp}
                                            </span>
                                        </div>

                                        <div className="item-target-card__bar-row">
                                            <span className="text-label item-target-card__bar-label">Will</span>
                                            <div className="item-target-card__bar-track">
                                                <div
                                                    className="item-target-card__bar-fill item-target-card__bar-fill--will"
                                                    style={{ width: `${willPct}%` }}
                                                />
                                            </div>
                                            <span className="text-subtext item-target-card__bar-val">
                                                {candidate.will}/{candidate.maxWill}
                                            </span>
                                        </div>
                                    </div>

                                    {candidate.statuses && candidate.statuses.length > 0 && (
                                        <div className="item-target-card__statuses">
                                            {candidate.statuses.map((st) => {
                                                const isHealthy = st.name === 'Healthy';
                                                const matchedColor = STATUS_COLORS[st.name];
                                                return (
                                                    <span
                                                        key={st.id || st.name}
                                                        className={`item-target-card__status-badge ${
                                                            isHealthy ? 'item-target-card__status-badge--healthy' : ''
                                                        }`}
                                                        style={
                                                            matchedColor && !isHealthy
                                                                ? {
                                                                      backgroundColor: matchedColor.bg,
                                                                      color: matchedColor.text
                                                                  }
                                                                : undefined
                                                        }
                                                    >
                                                        {st.name === 'Custom...' && st.customName
                                                            ? st.customName
                                                            : st.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <div className="item-target-card__action-col">
                                    <button
                                        type="button"
                                        className="action-button action-button--theme item-target-card__select-btn text-theme-header"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectTarget(candidate);
                                        }}
                                        title={`Apply ${item.name} to ${candidate.name}`}
                                    >
                                        <Check size={14} /> Select
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="item-target-modal__actions">
                    <button
                        type="button"
                        className="action-button action-button--dark item-target-modal__cancel-btn text-theme-header"
                        onClick={onClose}
                    >
                        <XCircle size={16} /> Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
