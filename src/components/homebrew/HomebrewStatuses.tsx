import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomStatus } from '../../store/storeTypes';
import { HomebrewStatusCard } from './HomebrewStatusCard';
import './Homebrew.css';

export function HomebrewStatuses() {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const roomCustomStatuses = useCharacterStore((state) => state.roomCustomStatuses);
    const addCustomStatus = useCharacterStore((state) => state.addCustomStatus);
    const removeCustomStatus = useCharacterStore((state) => state.removeCustomStatus);
    const duplicateCustomStatus = useCharacterStore((state) => state.duplicateCustomStatus);
    const overwriteCustomStatusData = useCharacterStore((state) => state.overwriteCustomStatusData);
    const mergeCustomStatusData = useCharacterStore((state) => state.mergeCustomStatusData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomStatus[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const visibleStatuses = roomCustomStatuses.filter((status) => role === 'GM' || !status.gmOnly);
    const filteredStatuses = visibleStatuses.filter((status) =>
        status.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        const dataString = JSON.stringify(visibleStatuses, null, 2);
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.href = url;
        linkElement.download = 'pokerole_custom_statuses.json';
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
                    OBR.notification.show('Invalid Custom Statuses file.', 'ERROR');
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
                Create Custom Status Conditions. Once created, they will automatically appear in the condition dropdown
                menu on the Round Tracker.
            </p>

            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="🔍 Search Statuses..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input"
                />
                {canEdit && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            addCustomStatus();
                        }}
                        className="action-button action-button--dark homebrew-list__create-btn"
                    >
                        + Create New
                    </button>
                )}
            </div>

            <div className="homebrew-list__scroll-area">
                {filteredStatuses.length === 0 ? (
                    <div className="homebrew-list__empty">
                        {visibleStatuses.length === 0 ? 'No custom statuses yet.' : 'No statuses match your search.'}
                    </div>
                ) : (
                    filteredStatuses.map((status) => (
                        <HomebrewStatusCard
                            key={status.id}
                            status={status}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomStatus(status.id)}
                            onDuplicate={() => duplicateCustomStatus(status.id)}
                        />
                    ))
                )}
            </div>

            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    💾 Export Statuses
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            📂 Import Statuses
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
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Statuses.{' '}
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
                                    mergeCustomStatusData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomStatusData(importData);
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
