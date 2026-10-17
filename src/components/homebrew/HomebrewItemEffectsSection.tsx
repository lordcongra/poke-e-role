import { useState } from 'react';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomItem } from '../../store/entityTypes';
import { CORE_CURABLE_STATUSES } from '../../utils/items/itemCharges';
import { ChevronDown, ChevronUp, Battery, Heart, Zap, ShieldAlert } from 'lucide-react';

interface HomebrewItemEffectsSectionProps {
    item: CustomItem;
    canEdit: boolean;
}

export function HomebrewItemEffectsSection({ item, canEdit }: HomebrewItemEffectsSectionProps) {
    const updateCustomItem = useCharacterStore((state) => state.updateCustomItem);
    const roomCustomStatuses = useCharacterStore((state) => state.roomCustomStatuses);

    const hasConfigured = Boolean(
        (typeof item.charges === 'number' && item.charges > 0) ||
        item.healHp ||
        item.healWill ||
        (item.cures && item.cures.length > 0)
    );
    const [isExpanded, setIsExpanded] = useState(() => hasConfigured);

    const handleChargesChange = (raw: string) => {
        if (!canEdit) return;
        const trimmed = raw.trim();
        const num = trimmed === '' ? undefined : parseInt(trimmed, 10);
        if (num === undefined || isNaN(num) || num <= 0) {
            updateCustomItem(item.id, 'charges', undefined);
            updateCustomItem(item.id, 'maxCharges', undefined);
        } else {
            updateCustomItem(item.id, 'charges', num);
            updateCustomItem(item.id, 'maxCharges', num);
        }
    };

    const handleEffectNum = (field: 'healHp' | 'healWill', raw: string) => {
        if (!canEdit) return;
        const trimmed = raw.trim();
        const num = trimmed === '' ? undefined : Math.max(0, parseInt(trimmed, 10) || 0);
        updateCustomItem(item.id, field, num);
    };

    const handleToggleCure = (statusName: string) => {
        if (!canEdit) return;
        const current = item.cures || [];
        const isSelected = current.some((c) => c.toLowerCase() === statusName.toLowerCase());
        const updated = isSelected
            ? current.filter((c) => c.toLowerCase() !== statusName.toLowerCase())
            : [...current, statusName];
        updateCustomItem(item.id, 'cures', updated.length > 0 ? updated : undefined);
    };

    const activeCustomNames = (roomCustomStatuses || [])
        .map((s) => s.name?.trim())
        .filter(
            (n): n is string => Boolean(n) && !CORE_CURABLE_STATUSES.some((c) => c.toLowerCase() === n.toLowerCase())
        );
    const allStatusPills: string[] = [...CORE_CURABLE_STATUSES, ...activeCustomNames];

    return (
        <div className="homebrew-item-effects">
            <button
                type="button"
                className="homebrew-item-effects__toggle text-subtext"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="homebrew-item-effects__toggle-title">
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>Item Effects & Charges</span>
                </span>
                {hasConfigured && (
                    <span className="homebrew-item-effects__badge" title="Has charges or effects configured">
                        Configured
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="homebrew-item-effects__body">
                    <div className="homebrew-item-effects__fields-grid">
                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Battery size={12} /> Default Charges
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.charges ?? ''}
                                placeholder="0 (Single-use)"
                                disabled={!canEdit}
                                onChange={(e) => handleChargesChange(e.target.value)}
                            />
                        </label>

                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Heart size={12} style={{ color: 'var(--semantic-danger)' }} /> Heal HP
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.healHp ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={(e) => handleEffectNum('healHp', e.target.value)}
                            />
                        </label>

                        <label className="homebrew-item-effects__field">
                            <span className="homebrew-item-effects__field-label text-subtext">
                                <Zap size={12} style={{ color: 'var(--primary)' }} /> Heal Will
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={99}
                                className="homebrew-item-effects__input text-subtext"
                                value={item.healWill ?? ''}
                                placeholder="0"
                                disabled={!canEdit}
                                onChange={(e) => handleEffectNum('healWill', e.target.value)}
                            />
                        </label>
                    </div>

                    <div className="homebrew-item-effects__cures-section">
                        <span className="homebrew-item-effects__cures-title text-subtext">
                            <ShieldAlert size={12} /> Cures Statuses:
                        </span>
                        <div className="homebrew-item-effects__pills-container">
                            {allStatusPills.map((st) => {
                                const isSelected = (item.cures || []).some((c) => c.toLowerCase() === st.toLowerCase());
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        disabled={!canEdit}
                                        className={`homebrew-item-effects__pill ${
                                            isSelected ? 'homebrew-item-effects__pill--selected' : ''
                                        }`}
                                        onClick={() => handleToggleCure(st)}
                                    >
                                        {st}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
