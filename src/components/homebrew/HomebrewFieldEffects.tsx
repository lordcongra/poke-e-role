import { useState, useRef } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import type { CustomFieldEffect, FieldEffectCategory } from '../../store/storeTypes';
import { HomebrewFieldEffectCard } from './HomebrewFieldEffectCard';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { downloadJson } from '../../utils/common/fileSystemHelpers';
import { Plus, Save, FolderOpen, AlertTriangle } from 'lucide-react';
import './Homebrew.css';
import './HomebrewFieldEffect.css';

export function HomebrewFieldEffects() {
    const storeRole = useCharacterStore((state) => state.role);
    const role = isStandaloneMode ? 'GM' : storeRole;
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const roomCustomFieldEffects = useCharacterStore((state) => state.roomCustomFieldEffects);
    const addCustomFieldEffect = useCharacterStore((state) => state.addCustomFieldEffect);
    const removeCustomFieldEffect = useCharacterStore((state) => state.removeCustomFieldEffect);
    const duplicateCustomFieldEffect = useCharacterStore((state) => state.duplicateCustomFieldEffect);
    const overwriteCustomFieldEffectData = useCharacterStore((state) => state.overwriteCustomFieldEffectData);
    const mergeCustomFieldEffectData = useCharacterStore((state) => state.mergeCustomFieldEffectData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomFieldEffect[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'all' | FieldEffectCategory>('all');

    const visibleEffects = roomCustomFieldEffects.filter((effect) => role === 'GM' || !effect.gmOnly);
    const filteredEffects = visibleEffects.filter((effect) => {
        const matchesCategory = selectedCategory === 'all' || effect.category === selectedCategory;
        const matchesSearch =
            effect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (effect.tags && effect.tags.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (effect.description && effect.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const handleExport = () => {
        downloadJson(visibleEffects, 'pokerole_custom_field_effects.json');
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
                    OBR.notification.show('Invalid Custom Field Effects file.', 'ERROR');
                }
            } catch (error) {
                console.error('[HomebrewFieldEffects] Failed to parse JSON:', error);
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc text-subtext">
                Create Custom Weather, Terrain, and Battlefield Conditions with combat tags. Once created, they appear
                in the Battlefield Organizer preset chips and automatically sync to all players.
            </p>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className={`action-button ${selectedCategory === 'all' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => setSelectedCategory('all')}
                >
                    All Effects
                </button>
                <button
                    type="button"
                    className={`action-button ${selectedCategory === 'weather' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => setSelectedCategory('weather')}
                >
                    Weathers
                </button>
                <button
                    type="button"
                    className={`action-button ${selectedCategory === 'terrain' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => setSelectedCategory('terrain')}
                >
                    Terrains
                </button>
                <button
                    type="button"
                    className={`action-button ${selectedCategory === 'field' ? 'action-button--theme' : 'action-button--dark'}`}
                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                    onClick={() => setSelectedCategory('field')}
                >
                    Field Effects
                </button>
            </div>

            {/* Search & Create Row */}
            <div className="homebrew-list__search-row">
                <input
                    type="text"
                    placeholder="Search Weather & Field Effects..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="homebrew-list__search-input text-label"
                />
                {canEdit && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            addCustomFieldEffect({
                                category: selectedCategory === 'all' ? 'weather' : selectedCategory
                            });
                        }}
                        className="action-button action-button--dark homebrew-list__create-btn"
                    >
                        <Plus size={16} /> Create New
                    </button>
                )}
            </div>

            {/* Scroll Area */}
            <div className="homebrew-list__scroll-area">
                {filteredEffects.length === 0 ? (
                    <div className="homebrew-list__empty text-subtext" style={{ fontStyle: 'italic' }}>
                        {visibleEffects.length === 0
                            ? 'No custom weather or field effects yet.'
                            : 'No effects match your search.'}
                    </div>
                ) : (
                    filteredEffects.map((effect) => (
                        <HomebrewFieldEffectCard
                            key={effect.id}
                            effect={effect}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomFieldEffect(effect.id)}
                            onDuplicate={() => duplicateCustomFieldEffect(effect.id)}
                        />
                    ))
                )}
            </div>

            {/* Footer Import / Export */}
            <div className="homebrew-list__footer">
                <button onClick={handleExport} className="action-button action-button--dark homebrew-list__footer-btn">
                    <Save size={16} /> Export Effects
                </button>
                {canEdit && (
                    <>
                        <button
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark homebrew-list__footer-btn"
                        >
                            <FolderOpen size={16} /> Import Effects
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

            {/* Import Confirmation Modal */}
            {importData && (
                <div className="homebrew-import__overlay">
                    <div className="homebrew-import__content">
                        <h3
                            className="homebrew-import__title text-title-primary"
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
                        <p className="homebrew-import__text text-subtext">
                            How would you like to import this data? <b>Overwrite</b> will delete your existing custom
                            field effects. <b>Add / Merge</b> will safely combine them, updating any items with matching
                            names.
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
                                    mergeCustomFieldEffectData(importData);
                                    setImportData(null);
                                }}
                                className="action-button action-button--secondary homebrew-import__btn"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomFieldEffectData(importData);
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
