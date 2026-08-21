import { useState } from 'react';
import type { Item } from '@owlbear-rodeo/sdk';
import { X } from 'lucide-react';
import './AddCombatantModal.css';

export interface StandaloneCharOption {
    id: string;
    name: string;
    image: string;
    rawMetadata?: Record<string, unknown>;
}

export interface ObrCharOption {
    id: string;
    name: string;
    item: Item;
}

interface AddCombatantModalProps {
    isStandaloneMode: boolean;
    availableStandaloneChars: StandaloneCharOption[];
    availableObrChars: ObrCharOption[];
    onClose: () => void;
    onAddStandalone: (char: StandaloneCharOption) => void;
    onAddObr: (item: Item) => void;
}

export function AddCombatantModal({
    isStandaloneMode,
    availableStandaloneChars,
    availableObrChars,
    onClose,
    onAddStandalone,
    onAddObr
}: AddCombatantModalProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStandaloneChars = availableStandaloneChars
        .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const filteredObrChars = availableObrChars
        .filter((c) => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const noResults =
        (isStandaloneMode && filteredStandaloneChars.length === 0) ||
        (!isStandaloneMode && filteredObrChars.length === 0);

    return (
        <div className="init-tracker__modal-overlay" onClick={onClose}>
            <div className="init-tracker__modal" onClick={(e) => e.stopPropagation()}>
                <div className="init-tracker__modal-header">
                    <h3 className="text-title-primary" style={{ margin: 0 }}>
                        Add Combatant
                    </h3>
                    <button type="button" className="init-tracker__modal-close" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search names..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="init-tracker__modal-search form-input--transparent text-label"
                    autoFocus
                />

                <div className="init-tracker__modal-list">
                    {isStandaloneMode &&
                        filteredStandaloneChars.map((char) => (
                            <div
                                key={char.id}
                                className="init-tracker__modal-item text-label"
                                onClick={() => onAddStandalone(char)}
                            >
                                {char.name}
                            </div>
                        ))}

                    {!isStandaloneMode &&
                        filteredObrChars.map((char) => (
                            <div
                                key={char.id}
                                className="init-tracker__modal-item text-label"
                                onClick={() => onAddObr(char.item)}
                            >
                                {char.name}
                            </div>
                        ))}

                    {noResults && (
                        <div className="text-subtext" style={{ padding: '8px', textAlign: 'center' }}>
                            No matching characters found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
