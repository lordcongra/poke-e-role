import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomForm } from '../../store/storeTypes';
import { HomebrewFormCard } from './HomebrewFormCard';
import './Homebrew.css';

export function HomebrewForms() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomForms = useCharacterStore((state) => state.roomCustomForms);
    const addCustomForm = useCharacterStore((state) => state.addCustomForm);
    const removeCustomForm = useCharacterStore((state) => state.removeCustomForm);
    const overwriteCustomFormData = useCharacterStore((state) => state.overwriteCustomFormData);
    const mergeCustomFormData = useCharacterStore((state) => state.mergeCustomFormData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomForm[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const visibleForms = roomCustomForms.filter((form) => role === 'GM' || !form.gmOnly);
    const filteredForms = visibleForms.filter((form) => form.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleExport = () => {
        const dataString = JSON.stringify(visibleForms, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_forms.json';
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
                    OBR.notification.show('Invalid Custom Forms file.', 'ERROR');
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
                Design specific mechanical templates for form shifts (Mega Evolutions, Stance Changes, Custom Forms). Players can select these when transforming.
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="🔍 Search Forms..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input"
                />
                {canEdit && (
                    <>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                addCustomForm(false);
                            }}
                            className="action-button action-button--dark homebrew-list__create-btn"
                        >
                            + Blank Form
                        </button>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                addCustomForm(true); // Triggers the Mega Template defaults!
                            }}
                            className="action-button action-button--red homebrew-list__create-btn"
                        >
                            ✨ Add Mega
                        </button>
                    </>
                )}
            </div>

            <div className="homebrew-list__scroll-area">
                {filteredForms.length === 0 ? (
                    <div className="homebrew-list__empty">
                        {visibleForms.length === 0 ? 'No custom forms yet.' : 'No forms match your search.'}
                    </div>
                ) : (
                    filteredForms.map((form) => (
                        <HomebrewFormCard
                            key={form.id}
                            form={form}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomForm(form.id)}
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    💾 Export Forms
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            📂 Import Forms
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
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Forms.{' '}
                            <b>Add / Merge</b> will safely combine them.
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
                                    mergeCustomFormData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomFormData(importData);
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