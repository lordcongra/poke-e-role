import React from 'react';
import { X } from 'lucide-react';

export interface CombatantStatusCellProps {
    combatantId: string;
    statusList: string[];
    combinedStatusOptions: string[];
    isLocked: boolean;
    onUpdateStatusItem: (index: number, val: string) => void;
    onRemoveStatus: (index: number) => void;
    onAddStatus: (chosen: string) => void;
}

export const CombatantStatusCell: React.FC<CombatantStatusCellProps> = ({
    combatantId,
    statusList,
    combinedStatusOptions,
    isLocked,
    onUpdateStatusItem,
    onRemoveStatus,
    onAddStatus
}) => {
    return (
        <td className="bo-cell bo-cell--status">
            <div className="bo-status-cell-column">
                {statusList.map((st, sIdx) => (
                    <div key={sIdx} className="bo-status-item-row">
                        <input
                            type="text"
                            list={`bo-status-list-${combatantId}`}
                            className="bo-input bo-input--status text-label"
                            value={st}
                            onChange={(e) => onUpdateStatusItem(sIdx, e.target.value)}
                            placeholder="Status..."
                            title={`Status condition ${sIdx + 1}`}
                            aria-label={`Status ${sIdx + 1}`}
                            disabled={isLocked}
                        />
                        {!isLocked && (statusList.length > 1 || (st !== 'Healthy' && st.trim() !== '')) ? (
                            <button
                                type="button"
                                className="bo-status-item-delete-btn"
                                onClick={() => onRemoveStatus(sIdx)}
                                title={`Clear ${st}`}
                                aria-label={`Delete ${st}`}
                            >
                                <X size={10} />
                            </button>
                        ) : null}
                    </div>
                ))}
                {!isLocked && (
                    <div className="bo-status-add-row">
                        <select
                            className="bo-status-quick-dropdown"
                            value=""
                            onChange={(e) => {
                                onAddStatus(e.target.value);
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
                )}
                <datalist id={`bo-status-list-${combatantId}`}>
                    {combinedStatusOptions.map((opt) => (
                        <option key={opt} value={opt} />
                    ))}
                </datalist>
            </div>
        </td>
    );
};
