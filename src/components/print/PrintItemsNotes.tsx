import type { InventoryItem, PassiveItem, PrintConfig } from '../../store/storeTypes';

interface PrintItemsNotesProps {
    inventory: InventoryItem[];
    passives?: PassiveItem[];
    notes: string;
    config: PrintConfig;
}

export function PrintItemsNotes({ inventory, passives = [], notes, config }: PrintItemsNotesProps) {
    const showItems = !config.hideItems && (!config.autoHideEmptySections || inventory.length > 0 || config.blankItems);
    const showPassives =
        !config.hidePassives &&
        ((passives.length > 0 && !config.autoHideEmptySections) ||
            (passives.length > 0 && config.autoHideEmptySections) ||
            config.blankPassives);
    const showNotes = !config.hideNotes && (!config.autoHideEmptySections || notes.trim().length > 0);

    if (!showItems && !showPassives && !showNotes) {
        return null;
    }

    const totalItemBoxes = Math.max(8, inventory?.length || 0);

    return (
        <>
            {/* Items Section */}
            {showItems && (
                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Items</h4>
                    <div className="print-sheet__items-grid">
                        {Array.from({ length: totalItemBoxes }).map((_, i) => {
                            const item = !config.blankItems && inventory ? inventory[i] : null;
                            return (
                                <div key={i} className="print-sheet__item-box">
                                    {item ? (
                                        <div className="print-sheet__item-content">
                                            <span className="print-sheet__item-name">
                                                <strong>{item.name}</strong>
                                                {item.qty && item.qty > 1 ? ` (x${item.qty})` : ''}
                                                {item.active ? ' [Equipped]' : ''}
                                            </span>
                                            {item.desc && !config.hideMoveDesc && (
                                                <span className="print-sheet__item-desc">{item.desc}</span>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Passives Section */}
            {showPassives && (
                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Passives</h4>
                    <div className="print-sheet__items-grid">
                        {config.blankPassives || passives.length === 0 ? (
                            <>
                                <div className="print-sheet__item-box" />
                                <div className="print-sheet__item-box" />
                                <div className="print-sheet__item-box" />
                                <div className="print-sheet__item-box" />
                            </>
                        ) : (
                            passives.map((passive) => (
                                <div key={passive.id} className="print-sheet__item-box">
                                    <div className="print-sheet__item-content">
                                        <span className="print-sheet__item-name">
                                            <strong>{passive.name}</strong>
                                            {passive.active ? ' [Active]' : ''}
                                        </span>
                                        {passive.desc && <span className="print-sheet__item-desc">{passive.desc}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Notes Section */}
            {showNotes && (
                <div className="print-sheet__section">
                    <h4 className="print-sheet__section-title">Notes</h4>
                    <div className="print-sheet__notes-container">
                        {notes && notes.trim() ? (
                            <div className="print-sheet__notes-text">{notes}</div>
                        ) : (
                            <>
                                <div className="print-sheet__note-line" />
                                <div className="print-sheet__note-line" />
                                <div className="print-sheet__note-line" />
                                <div className="print-sheet__note-line" />
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
