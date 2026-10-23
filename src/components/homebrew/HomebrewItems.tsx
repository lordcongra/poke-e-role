import { useState, useRef, useEffect, useMemo } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { useCharacterStore } from '../../store/useCharacterStore';
import { loadLocalDataset } from '../../utils/api/api';
import type { CustomItem } from '../../store/storeTypes';
import { HomebrewItemCard } from './HomebrewItemCard';
import { HomebrewAccordionSection } from './HomebrewAccordionSection';
import { HomebrewCategoryFilterPills } from './HomebrewCategoryFilterPills';
import {
    getCustomItemClassification,
    groupCustomItemsByAccordion,
    getDistinctCategoryPills
} from './homebrewItemUtils';
import { isStandaloneMode } from '../../utils/sync/storageAdapter';
import { downloadJson } from '../../utils/common/fileSystemHelpers';
import { Plus, Save, FolderOpen, AlertTriangle, Layers, LayoutList, ChevronDown, ChevronUp } from 'lucide-react';
import './Homebrew.css';
import './HomebrewItems.css';

export function HomebrewItems() {
    const storeRole = useCharacterStore((state) => state.role);
    const role = isStandaloneMode ? 'GM' : storeRole;
    const access = useCharacterStore((state) => state.identity.homebrewAccess);
    const canEdit = isStandaloneMode || role === 'GM' || access === 'Full';

    const roomCustomItems = useCharacterStore((state) => state.roomCustomItems);
    const addCustomItem = useCharacterStore((state) => state.addCustomItem);
    const removeCustomItem = useCharacterStore((state) => state.removeCustomItem);
    const duplicateCustomItem = useCharacterStore((state) => state.duplicateCustomItem);
    const overwriteCustomItemData = useCharacterStore((state) => state.overwriteCustomItemData);
    const mergeCustomItemData = useCharacterStore((state) => state.mergeCustomItemData);

    const fileReference = useRef<HTMLInputElement>(null);
    const [importData, setImportData] = useState<CustomItem[] | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [viewMode, setViewMode] = useState<'accordion' | 'flat'>('accordion');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    useEffect(() => {
        loadLocalDataset().then((index) => {
            if (!index) return;
            const categories = new Set<string>();
            Object.values(index.items).forEach((pocketObj) => {
                Object.keys(pocketObj).forEach((cat) => categories.add(cat));
            });
            roomCustomItems.forEach((i) => categories.add(i.category || 'Misc'));
            setAvailableCategories(Array.from(categories).sort());
        });
    }, [roomCustomItems]);

    const availableCustomGroups = useMemo(() => {
        return Array.from(
            new Set(
                roomCustomItems
                    .map((i) => {
                        const { topLevelGroup, isCustomPocket } = getCustomItemClassification(i);
                        return isCustomPocket ? topLevelGroup : null;
                    })
                    .filter(Boolean) as string[]
            )
        ).sort();
    }, [roomCustomItems]);

    const availableSubCategories = useMemo(() => {
        return Array.from(
            new Set(roomCustomItems.map((i) => i.subCategory?.trim()).filter(Boolean) as string[])
        ).sort();
    }, [roomCustomItems]);

    const visibleItems = useMemo(
        () => roomCustomItems.filter((item) => role === 'GM' || !item.gmOnly),
        [roomCustomItems, role]
    );

    const categoryPills = useMemo(() => getDistinctCategoryPills(visibleItems), [visibleItems]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return visibleItems.filter((item) => {
            if (selectedCategory !== 'All') {
                const { topLevelGroup } = getCustomItemClassification(item);
                if (topLevelGroup !== selectedCategory) return false;
            }
            if (query && !item.name.toLowerCase().includes(query)) {
                return false;
            }
            return true;
        });
    }, [visibleItems, selectedCategory, searchQuery]);

    const accordionSections = useMemo(() => groupCustomItemsByAccordion(filteredItems), [filteredItems]);

    const handleExpandAll = () => {
        const next: Record<string, boolean> = {};
        accordionSections.forEach((s) => {
            next[s.accordionKey] = true;
        });
        setExpandedGroups(next);
    };

    const handleCollapseAll = () => {
        const next: Record<string, boolean> = {};
        accordionSections.forEach((s) => {
            next[s.accordionKey] = false;
        });
        setExpandedGroups(next);
    };

    const handleExport = () => {
        downloadJson(visibleItems, 'pokerole_custom_items.json');
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
                    OBR.notification.show('Invalid Custom Items file.', 'ERROR');
                }
            } catch (error) {
                console.error('[HomebrewItems] Failed to parse items JSON:', error);
                if (OBR.isAvailable) OBR.notification.show('Failed to parse JSON.', 'ERROR');
            }
            if (fileReference.current) fileReference.current.value = '';
        };
        reader.readAsText(file);
    };

    return (
        <div className="homebrew-list__container">
            <p className="homebrew-list__desc text-subtext">
                Create custom items. These will appear in the Bag dropdown, automatically loading their tags and
                descriptions when selected!
            </p>

            <div className="homebrew-items__toolbar">
                <div className="homebrew-list__search-row">
                    <input
                        type="text"
                        placeholder="Search Items..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="homebrew-list__search-input"
                    />
                    <button
                        type="button"
                        onClick={handleExport}
                        className="action-button action-button--dark action-button--xs"
                        title="Export Items JSON"
                    >
                        <Save size={13} /> Export
                    </button>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => fileReference.current?.click()}
                            className="action-button action-button--dark action-button--xs"
                            title="Import Items JSON"
                        >
                            <FolderOpen size={13} /> Import
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('All');
                                addCustomItem();
                                setExpandedGroups((prev) => ({ ...prev, Custom: true }));
                            }}
                            className="action-button action-button--dark homebrew-list__create-btn"
                        >
                            <Plus size={16} /> Create New
                        </button>
                    )}
                </div>

                <HomebrewCategoryFilterPills
                    pills={categoryPills}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                />

                <div className="homebrew-controls-row">
                    <div className="homebrew-view-toggles" role="group" aria-label="View Mode">
                        <button
                            type="button"
                            onClick={() => setViewMode('accordion')}
                            className={`homebrew-toggle-btn ${viewMode === 'accordion' ? 'homebrew-toggle-btn--active' : ''}`}
                            title="Grouped Accordion View"
                        >
                            <Layers size={14} /> Accordion
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('flat')}
                            className={`homebrew-toggle-btn ${viewMode === 'flat' ? 'homebrew-toggle-btn--active' : ''}`}
                            title="Flat Cards View"
                        >
                            <LayoutList size={14} /> Flat Cards
                        </button>
                    </div>

                    {viewMode === 'accordion' && accordionSections.length > 0 && (
                        <div className="homebrew-accordion-actions">
                            <button
                                type="button"
                                onClick={handleExpandAll}
                                className="homebrew-accordion-toggle-all"
                                title="Expand all category sections"
                            >
                                <ChevronDown size={14} /> Expand All
                            </button>
                            <button
                                type="button"
                                onClick={handleCollapseAll}
                                className="homebrew-accordion-toggle-all"
                                title="Collapse all category sections"
                            >
                                <ChevronUp size={14} /> Collapse All
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <datalist id="homebrew-categories-list">
                {availableCategories.map((cat) => (
                    <option key={cat} value={cat} />
                ))}
            </datalist>
            <datalist id="homebrew-custom-groups-list">
                {availableCustomGroups.map((grp) => (
                    <option key={grp} value={grp} />
                ))}
            </datalist>
            <datalist id="homebrew-subcategories-list">
                {availableSubCategories.map((sub) => (
                    <option key={sub} value={sub} />
                ))}
            </datalist>

            <div className="homebrew-list__scroll-area">
                {filteredItems.length === 0 ? (
                    <div className="homebrew-list__empty text-subtext" style={{ fontStyle: 'italic' }}>
                        {visibleItems.length === 0 ? 'No custom items yet.' : 'No items match your search.'}
                    </div>
                ) : viewMode === 'accordion' ? (
                    accordionSections.map((sec) => (
                        <HomebrewAccordionSection
                            key={sec.accordionKey}
                            title={sec.accordionKey}
                            items={sec.items}
                            isOpen={expandedGroups[sec.accordionKey] !== false}
                            onToggle={() =>
                                setExpandedGroups((prev) => ({
                                    ...prev,
                                    [sec.accordionKey]: prev[sec.accordionKey] === false ? true : false
                                }))
                            }
                            role={role}
                            canEdit={canEdit}
                            onRemoveItem={removeCustomItem}
                            onDuplicateItem={duplicateCustomItem}
                        />
                    ))
                ) : (
                    filteredItems.map((item) => (
                        <HomebrewItemCard
                            key={item.id}
                            item={item}
                            role={role}
                            canEdit={canEdit}
                            onRemove={() => removeCustomItem(item.id)}
                            onDuplicate={() => duplicateCustomItem(item.id)}
                        />
                    ))
                )}
            </div>

            {canEdit && (
                <input
                    type="file"
                    ref={fileReference}
                    onChange={handleImport}
                    className="homebrew-file-input"
                    accept=".json"
                />
            )}

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
                            How would you like to import this data? <b>Overwrite</b> will delete your existing Items.{' '}
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
                                    mergeCustomItemData(importData);
                                    setImportData(null);
                                }}
                                className="action-button homebrew-import__btn homebrew-import__btn--merge"
                            >
                                Add / Merge
                            </button>
                            <button
                                onClick={() => {
                                    overwriteCustomItemData(importData);
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
