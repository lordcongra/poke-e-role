import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomMove } from '../../store/storeTypes';
import { HomebrewMoveCard } from './HomebrewMoveCard';
import { POKEMON_TYPES, TYPE_COLORS } from '../../data/constants';
import './Homebrew.css';

export function HomebrewMoves() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomMoves = useCharacterStore((state) => state.roomCustomMoves);
    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const addCustomMove = useCharacterStore((state) => state.addCustomMove);
    const removeCustomMove = useCharacterStore((state) => state.removeCustomMove);
    const overwriteCustomMoveData = useCharacterStore((state) => state.overwriteCustomMoveData);
    const mergeCustomMoveData = useCharacterStore((state) => state.mergeCustomMoveData);

    const filteredTypes = roomCustomTypes.filter((type) => role === 'GM' || !type.gmOnly);
    const allTypes = [...POKEMON_TYPES, ...filteredTypes.map((type) => type.name)];
    const allTypeColors = {
        ...TYPE_COLORS,
        ...Object.fromEntries(filteredTypes.map((type) => [type.name, type.color]))
    };

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomMove[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const visibleMoves = roomCustomMoves.filter((move) => role === 'GM' || !move.gmOnly);
    const filteredMoves = visibleMoves.filter((move) => move.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleExport = () => {
        const dataString = JSON.stringify(visibleMoves, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_moves.json';
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (fileEvent) => {
            try {
                const imported = JSON.parse(fileEvent.target?.result as string);
                if (Array.isArray(imported)) {
                    setImportData(imported);
                } else if (OBR.isAvailable) {
                    OBR.notification.show('Invalid Custom Moves file.', 'ERROR');
                }
            } catch (error) {
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc">
                Create custom moves. These will appear in the move dropdowns and automatically populate their formulas
                when selected.
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="🔍 Search Moves..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input"
                />
                {canEdit && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            addCustomMove();
                        }}
                        className="action-button action-button--dark homebrew-list__create-btn"
                    >
                        + Create New
                    </button>
                )}
            </div>

            <div className="homebrew-list__scroll-area">
                {filteredMoves.length === 0 ? (
                    <div className="homebrew-list__empty">
                        {visibleMoves.length === 0 ? 'No custom moves yet.' : 'No moves match your search.'}
                    </div>
                ) : (
                    filteredMoves.map((move) => (
                        <HomebrewMoveCard
                            key={move.id}
                            move={move}
                            allTypes={allTypes}
                            allTypeColors={allTypeColors}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomMove(move.id)}
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    💾 Export Moves
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            📂 Import Moves
                        </button>
                        <input
                            type="file"
                            ref={fileReference}
                            onChange={handleImport}
                            className="homebrew-file-input"
                            accept=".json"
                        />
                    </>
                )}
            </div>

            {importData && (
                <div className="homebrew-import__overlay">
                    <div className="homebrew-import__content">
                        <h3 className="homebrew-import__title">⚠️ Confirm Import</h3>
                        <p className="homebrew-import__text">
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Moves.{' '}
                            <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div className="homebrew-import__actions">
                            <button
                                onClick={() => setImportData(null)}
                                className="action-button action-button--dark homebrew-import__btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeCustomMoveData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomMoveData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--red homebrew-import__btn"
                            >
                                Overwrite
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
