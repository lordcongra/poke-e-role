import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../store/useCharacterStore';
import type { CustomType } from '../store/storeTypes';
import { POKEMON_TYPES } from '../data/constants';
import { HomebrewTypeEditor } from './HomebrewTypeEditor';
import './HomebrewTypes.css';

export function HomebrewTypes() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const addCustomType = useCharacterStore((state) => state.addCustomType);
    const updateCustomType = useCharacterStore((state) => state.updateCustomType);
    const removeCustomType = useCharacterStore((state) => state.removeCustomType);
    const overwriteCustomTypeData = useCharacterStore((state) => state.overwriteCustomTypeData);
    const mergeCustomTypeData = useCharacterStore((state) => state.mergeCustomTypeData);

    const visibleTypes = roomCustomTypes.filter((customType) => role === 'GM' || !customType.gmOnly);
    const allOptions = [...POKEMON_TYPES.filter((t) => t !== ''), ...visibleTypes.map((customType) => customType.name)];

    const [editingType, setEditingType] = useState<CustomType | null>(null);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomType[] | null>(null);

    const handleSaveType = (oldName: string | null, newType: CustomType) => {
        if (oldName) {
            updateCustomType(oldName, newType);
        } else {
            addCustomType(newType);
        }
        setEditingType(null);
    };

    const handleExport = () => {
        const dataString = JSON.stringify(visibleTypes, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_types.json';
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
                if (Array.isArray(imported)) setImportData(imported);
                else if (OBR.isAvailable) OBR.notification.show('Invalid Custom Types file.', 'ERROR');
            } catch (error) {
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-types__container">
            <p className="homebrew-types__description">
                {editingType
                    ? `✏️ Editing ${editingType.name}`
                    : 'Create custom typings and define their combat matchups. These will appear in the Typing dropdowns.'}
            </p>

            <HomebrewTypeEditor
                editingType={editingType}
                allOptions={allOptions}
                canEdit={canEdit}
                role={role}
                onSave={handleSaveType}
                onCancel={() => setEditingType(null)}
            />

            <div className="homebrew-types__list-section">
                {visibleTypes.length === 0 ? (
                    <div className="homebrew-types__empty-list">No custom types added yet.</div>
                ) : (
                    visibleTypes.map((customType) => (
                        <div key={customType.name} className="homebrew-types__list-item">
                            <span
                                onClick={() => canEdit && setEditingType(customType)}
                                className={`homebrew-types__list-badge ${canEdit ? 'homebrew-types__list-badge--editable' : ''}`}
                                style={{ background: customType.color }}
                                title={canEdit ? 'Click to edit' : ''}
                            >
                                {customType.name} {canEdit && '✏️'}
                            </span>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => removeCustomType(customType.name)}
                                    className="homebrew-types__list-delete"
                                    title="Delete"
                                >
                                    X
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="homebrew-types__footer">
                <button
                    type="button"
                    onClick={handleExport}
                    className="action-button action-button--dark homebrew-types__footer-btn"
                >
                    💾 Export Types
                </button>
                {canEdit && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-types__footer-btn"
                        >
                            📂 Import Types
                        </button>
                        <input
                            type="file"
                            ref={fileReference}
                            onChange={handleImport}
                            style={{ display: 'none' }}
                            accept=".json"
                        />
                    </>
                )}
            </div>

            {importData && (
                <div className="homebrew-types__modal-overlay">
                    <div className="homebrew-types__modal-content">
                        <h3 className="homebrew-types__modal-title">⚠️ Confirm Import</h3>
                        <p className="homebrew-types__modal-text">
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Types.{' '}
                            <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div className="homebrew-types__modal-actions">
                            <button
                                type="button"
                                onClick={() => setImportData(null)}
                                className="action-button action-button--dark homebrew-types__modal-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    mergeCustomTypeData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-types__modal-btn homebrew-types__modal-btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    overwriteCustomTypeData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--red homebrew-types__modal-btn"
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
