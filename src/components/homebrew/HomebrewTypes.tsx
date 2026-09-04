import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomType } from '../../store/storeTypes';
import { POKEMON_TYPES } from '../../data/constants';
import { HomebrewTypeEditor } from './HomebrewTypeEditor';
import { isStandaloneMode } from '../../utils/storageAdapter';
import { downloadJson } from '../../utils/fileSystemHelpers';
import { Pencil, Copy, X, Save, FolderOpen, AlertTriangle } from 'lucide-react';
import './HomebrewTypes.css';

export function HomebrewTypes() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const roomCustomTypes = useCharacterStore((state) => state.roomCustomTypes);
    const addCustomType = useCharacterStore((state) => state.addCustomType);
    const updateCustomType = useCharacterStore((state) => state.updateCustomType);
    const removeCustomType = useCharacterStore((state) => state.removeCustomType);
    const duplicateCustomType = useCharacterStore((state) => state.duplicateCustomType);
    const overwriteCustomTypeData = useCharacterStore((state) => state.overwriteCustomTypeData);
    const mergeCustomTypeData = useCharacterStore((state) => state.mergeCustomTypeData);

    const visibleTypes = roomCustomTypes.filter((customType) => role === 'GM' || !customType.gmOnly);
    const allOptions = [...POKEMON_TYPES.filter((t) => t !== ''), ...visibleTypes.map((customType) => customType.name)];

    const [editingType, setEditingType] = useState<CustomType | null>(null);
    const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);

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
        downloadJson(visibleTypes, 'pokerole_custom_types.json');
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
                console.error('[HomebrewTypes] Failed to parse types JSON:', error);
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-types__container">
            <p className="homebrew-types__description text-subtext">
                {editingType ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Pencil size={14} /> Editing {editingType.name}
                    </span>
                ) : (
                    'Create custom typings and define their combat matchups. These will appear in the Typing dropdowns.'
                )}
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
                    <div className="homebrew-types__empty-list text-subtext" style={{ fontStyle: 'italic' }}>
                        No custom types added yet.
                    </div>
                ) : (
                    visibleTypes.map((customType) => (
                        <div key={customType.name} className="homebrew-types__list-item">
                            <span
                                onClick={() => canEdit && setEditingType(customType)}
                                className={`homebrew-types__list-badge text-theme-header ${canEdit ? 'homebrew-types__list-badge--editable' : ''}`}
                                style={{ background: customType.color }}
                                title={canEdit ? 'Click to edit' : ''}
                            >
                                {customType.name} {canEdit && <Pencil size={12} style={{ marginLeft: '4px' }} />}
                            </span>
                            {canEdit && (
                                <div className="homebrew-types__list-actions">
                                    <button
                                        type="button"
                                        onClick={() => duplicateCustomType(customType.name)}
                                        className="homebrew-types__list-duplicate"
                                        title="Duplicate Type"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Copy size={16} color="var(--text-main)" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTypeId(customType.name)}
                                        className="homebrew-types__list-delete"
                                        title="Delete Type"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
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
                    <Save size={16} /> Export Types
                </button>
                {canEdit && (
                    <>
                        <button
                            type="button"
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-types__footer-btn"
                        >
                            <FolderOpen size={16} /> Import Types
                        </button>
                        <input
                            type="file"
                            ref={fileReference}
                            onChange={handleImport}
                            className="homebrew-types__file-input"
                            accept=".json"
                        />
                    </>
                )}
            </div>

            {deleteTypeId && (
                <div className="homebrew-types__modal-overlay">
                    <div className="homebrew-types__modal-content">
                        <h3
                            className="homebrew-types__modal-title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Deletion
                        </h3>
                        <p className="homebrew-types__modal-text text-subtext">
                            Are you sure you want to delete the Type "{deleteTypeId}"?
                        </p>
                        <div className="homebrew-types__modal-actions">
                            <button
                                type="button"
                                onClick={() => setDeleteTypeId(null)}
                                className="action-button action-button--dark homebrew-types__modal-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    removeCustomType(deleteTypeId);
                                    setDeleteTypeId(null);
                                }}
                                className="action-button action-button--red homebrew-types__modal-btn"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {importData && (
                <div className="homebrew-types__modal-overlay">
                    <div className="homebrew-types__modal-content">
                        <h3
                            className="homebrew-types__modal-title text-title-primary"
                            style={{
                                color: 'var(--semantic-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <AlertTriangle size={20} /> Confirm Import
                        </h3>
                        <p className="homebrew-types__modal-text text-subtext">
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
                                className="action-button action-button--secondary homebrew-types__modal-btn"
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
