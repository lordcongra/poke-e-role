import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { HomebrewTypes } from './HomebrewTypes';
import { HomebrewAbilities } from './HomebrewAbilities';
import { HomebrewMoves } from './HomebrewMoves';
import { HomebrewPokemon } from './HomebrewPokemon';
import { HomebrewItems } from './HomebrewItems';
import { HomebrewForms } from './HomebrewForms';
import type { CustomType, CustomAbility, CustomMove, CustomPokemon, CustomItem, CustomForm } from '../../store/storeTypes';
import './Homebrew.css';

export function HomebrewModal({ onClose }: { onClose: () => void }) {
    const role = useCharacterStore((state) => state.role);
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = role === 'GM' || access === 'Full';

    const [activeTab, setActiveTab] = useState<'types' | 'abilities' | 'moves' | 'pokemon' | 'items' | 'forms'>('types');
    const overwriteAllHomebrewData = useCharacterStore((state) => state.overwriteAllHomebrewData);
    const mergeAllHomebrewData = useCharacterStore((state) => state.mergeAllHomebrewData);

    const fileRef = useRef<HTMLInputElement>(null);
    const [importAllData, setImportAllData] = useState<{
        types: CustomType[];
        abs: CustomAbility[];
        moves: CustomMove[];
        mons: CustomPokemon[];
        items: CustomItem[];
        forms: CustomForm[];
    } | null>(null);

    const handleExportAll = () => {
        const state = useCharacterStore.getState();
        const exportData = {
            customTypes: role === 'GM' ? state.roomCustomTypes : [],
            customAbilities: role === 'GM' ? state.roomCustomAbilities : [],
            customMoves: role === 'GM' ? state.roomCustomMoves : [],
            customPokemon: role === 'GM' ? state.roomCustomPokemon : [],
            customItems: role === 'GM' ? state.roomCustomItems : [],
            customForms: role === 'GM' ? state.roomCustomForms : []
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pokerole_homebrew_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const imported = JSON.parse(ev.target?.result as string);
                if (
                    imported &&
                    typeof imported === 'object' &&
                    (imported.customTypes ||
                        imported.customAbilities ||
                        imported.customMoves ||
                        imported.customPokemon ||
                        imported.customItems ||
                        imported.customForms)
                ) {
                    setImportAllData({
                        types: imported.customTypes || [],
                        abs: imported.customAbilities || [],
                        moves: imported.customMoves || [],
                        mons: imported.customPokemon || [],
                        items: imported.customItems || [],
                        forms: imported.customForms || []
                    });
                } else {
                    if (OBR.isAvailable) OBR.notification.show('Invalid Homebrew Backup file.', 'ERROR');
                }
            } catch (err) {
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileRef.current) fileRef.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-modal__overlay">
            <div className="homebrew-modal__content">
                <div className="homebrew-modal__header">
                    <div className="homebrew-modal__title-row">
                        <h3 className="homebrew-modal__title">🛠️ Homebrew Workshop</h3>
                        <button onClick={onClose} className="homebrew-modal__close-btn">
                            X
                        </button>
                    </div>
                    <div className="homebrew-modal__tabs">
                        <button
                            onClick={() => setActiveTab('types')}
                            className={`homebrew-modal__tab ${activeTab === 'types' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Types
                        </button>
                        <button
                            onClick={() => setActiveTab('abilities')}
                            className={`homebrew-modal__tab ${activeTab === 'abilities' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Abilities
                        </button>
                        <button
                            onClick={() => setActiveTab('moves')}
                            className={`homebrew-modal__tab ${activeTab === 'moves' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Moves
                        </button>
                        <button
                            onClick={() => setActiveTab('pokemon')}
                            className={`homebrew-modal__tab ${activeTab === 'pokemon' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Pokémon
                        </button>
                        <button
                            onClick={() => setActiveTab('items')}
                            className={`homebrew-modal__tab ${activeTab === 'items' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Items
                        </button>
                        <button
                            onClick={() => setActiveTab('forms')}
                            className={`homebrew-modal__tab ${activeTab === 'forms' ? 'homebrew-modal__tab--active' : ''}`}
                        >
                            Forms
                        </button>
                    </div>
                </div>

                <div className="homebrew-modal__body">
                    {activeTab === 'types' && <HomebrewTypes />}
                    {activeTab === 'abilities' && <HomebrewAbilities />}
                    {activeTab === 'moves' && <HomebrewMoves />}
                    {activeTab === 'pokemon' && <HomebrewPokemon />}
                    {activeTab === 'items' && <HomebrewItems />}
                    {activeTab === 'forms' && <HomebrewForms />}
                </div>

                <div className="homebrew-modal__footer">
                    <span className="homebrew-modal__footer-text">Changes automatically save to the Room.</span>
                    <div className="homebrew-modal__footer-actions">
                        <button
                            onClick={handleExportAll}
                            className="action-button action-button--dark homebrew-modal__footer-btn"
                        >
                            💾 Backup All
                        </button>
                        {canEdit && (
                            <>
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="action-button action-button--dark homebrew-modal__footer-btn"
                                >
                                    📂 Restore All
                                </button>
                                <input
                                    type="file"
                                    ref={fileRef}
                                    onChange={handleImportAll}
                                    className="homebrew-file-input"
                                    accept=".json"
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {importAllData && (
                <div className="homebrew-import__overlay">
                    <div className="homebrew-import__content">
                        <h3 className="homebrew-import__title">⚠️ Confirm Restore</h3>
                        <p className="homebrew-import__text">
                            How would you like to import this data? <b>Overwrite</b> will delete all existing Workshop
                            items. <b>Add / Merge</b> will safely combine them, updating any items with matching names.
                        </p>
                        <div className="homebrew-import__actions">
                            <button
                                onClick={() => setImportAllData(null)}
                                className="action-button action-button--dark homebrew-import__btn"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    mergeAllHomebrewData(
                                        importAllData.types,
                                        importAllData.abs,
                                        importAllData.moves,
                                        importAllData.mons,
                                        importAllData.items,
                                        importAllData.forms
                                    );
                                    setImportAllData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteAllHomebrewData(
                                        importAllData.types,
                                        importAllData.abs,
                                        importAllData.moves,
                                        importAllData.mons,
                                        importAllData.items,
                                        importAllData.forms
                                    );
                                    setImportAllData(null);
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