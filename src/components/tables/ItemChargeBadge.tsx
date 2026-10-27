import React, { memo } from 'react';
import type { InventoryItem } from '../../store/entityTypes';
import { useCharacterStore } from '../../store/useCharacterStore';
import { ItemChargesBadge } from '../ui/ItemChargesBadge';
import { RotateCcw } from 'lucide-react';

interface ItemChargeBadgeProps {
    item: InventoryItem;
    effectiveCharges: {
        hasCharges: boolean;
        charges: number;
        maxCharges: number;
    };
    mode?: 'compact' | 'visual';
    showRecharge?: boolean;
    className?: string;
}

export const ItemChargeBadge = memo(function ItemChargeBadge({
    item,
    effectiveCharges,
    mode = 'compact',
    showRecharge = true,
    className = ''
}: ItemChargeBadgeProps) {
    const updateInventoryItem = useCharacterStore((state) => state.updateInventoryItem);

    if (!effectiveCharges.hasCharges) return null;

    const canRecharge = showRecharge && effectiveCharges.charges < effectiveCharges.maxCharges;

    const handleRecharge = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateInventoryItem(item.id, 'charges', effectiveCharges.maxCharges);
    };

    return (
        <div
            className={`item-charge-badge-container ${className}`.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
        >
            <ItemChargesBadge mode={mode} charges={effectiveCharges.charges} maxCharges={effectiveCharges.maxCharges} />
            {canRecharge && (
                <button
                    type="button"
                    className="action-button action-button--ghost action-button--xs inventory-item__icon-btn"
                    onClick={handleRecharge}
                    title={`Recharge: Restore to ${effectiveCharges.maxCharges} charges`}
                    aria-label={`Recharge ${item.name || 'item'} to ${effectiveCharges.maxCharges} charges`}
                    style={{ padding: '2px', height: 'auto', minWidth: 'unset', color: 'var(--primary)' }}
                >
                    <RotateCcw size={12} />
                </button>
            )}
        </div>
    );
});
